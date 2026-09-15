import { Pool, type PoolClient } from "pg";
import type { CheckoutIntent, ProviderPayment } from "./checkout-session";
import type { StoreProduct } from "./types";
import { CommerceError } from "./one-of-one";

let pool: Pool | undefined;
export const usesPostgresOrders = () => process.env.MANGATA_ORDER_STORAGE === "postgres";

export function assertDatabaseConfigured() {
  const url = new URL(process.env.MANGATA_DATABASE_URL ?? "");
  // Plaintext database traffic is confined to the private Docker network on this VPS.
  if (url.protocol !== "postgresql:" || url.hostname !== "mangata_db" || url.pathname !== "/mangata" ||
    !url.username || url.password.length < 32 || url.search || url.hash || (url.port && url.port !== "5432")) {
    throw new CommerceError("checkout_unavailable", 503);
  }
}

export function ordersDatabase() {
  assertDatabaseConfigured();
  if (!pool) {
    pool = new Pool({ connectionString: process.env.MANGATA_DATABASE_URL, max: 5, connectionTimeoutMillis: 3000,
      idleTimeoutMillis: 10_000, statement_timeout: 5000, query_timeout: 8000, application_name: "mangata" });
    pool.on("error", () => console.error("[commerce] database_connection_error"));
  }
  return new PostgresOrders(pool);
}

function cents(value: number) {
  const result = Math.round(value * 100);
  if (!Number.isFinite(value) || value <= 0 || !Number.isSafeInteger(result)) throw new CommerceError("invalid_cart", 400);
  return result;
}

export class PostgresOrders {
  constructor(private db: Pool) {}

  private async transaction<T>(run: (client: PoolClient) => Promise<T>) {
    const client = await this.db.connect();
    try {
      await client.query("BEGIN");
      await client.query("SET LOCAL lock_timeout = '4s'");
      const result = await run(client);
      await client.query("COMMIT");
      return result;
    } catch (error) {
      await client.query("ROLLBACK").catch(() => undefined);
      throw error;
    } finally { client.release(); }
  }

  async seed(products: StoreProduct[]) {
    return this.transaction(async (client) => {
      for (const p of [...products].sort((a, b) => a.sku.localeCompare(b.sku))) {
        await client.query(`INSERT INTO inventory(sku,name,price_cents,active) VALUES($1,$2,$3,$4)
          ON CONFLICT(sku) DO UPDATE SET name=EXCLUDED.name, active=EXCLUDED.active,
          price_cents=CASE WHEN inventory.state='available' THEN EXCLUDED.price_cents ELSE inventory.price_cents END`,
        [p.sku, p.name, cents(p.price), p.inventory.isInStock]);
      }
      await client.query("UPDATE inventory SET active=false WHERE NOT(sku=ANY($1::text[]))", [products.map(p => p.sku)]);
      return products.length;
    });
  }

  async availability(products: StoreProduct[]) {
    const { rows } = await this.db.query("SELECT sku,state,active,price_cents FROM inventory WHERE sku=ANY($1::text[])", [products.map(p => p.sku)]);
    return products.map(product => {
      const row = rows.find(item => item.sku === product.sku);
      const state = row?.state as "available" | "reserved" | "sold" | "review" | undefined;
      const consistent = !!row && row.active && Number(row.price_cents) === cents(product.price);
      return { ...product, inventory: { ...product.inventory,
        isInStock: consistent && state === "available", availability: consistent ? state : "unconfirmed" as const } };
    });
  }

  async reserve(intent: CheckoutIntent, products: StoreProduct[], expiresAt: number) {
    if (!/^MNGT-[a-f0-9-]{36}$/.test(intent.reference) || intent.currency !== "ARS" || !products.length ||
      new Set(products.map(p => p.sku)).size !== products.length ||
      products.reduce((sum, p) => sum + cents(p.price), 0) !== cents(intent.amount) ||
      JSON.stringify([...intent.skus].sort()) !== JSON.stringify(products.map(p => p.sku).sort())) {
      throw new CommerceError("invalid_cart", 400);
    }
    const items = products.map(p => ({ sku: p.sku, name: p.name, quantity: 1, unitPrice: p.price })).sort((a, b) => a.sku.localeCompare(b.sku));
    return this.transaction(async (client) => {
      await client.query(`INSERT INTO checkout_intents(reference,amount_cents,currency,items,expires_at)
        VALUES($1,$2,'ARS',$3,$4) ON CONFLICT(reference) DO NOTHING`,
      [intent.reference, cents(intent.amount), JSON.stringify(items), new Date(expiresAt)]);
      const { rows: [existing] } = await client.query("SELECT * FROM checkout_intents WHERE reference=$1 FOR UPDATE", [intent.reference]);
      const identity = (lines: typeof items) => JSON.stringify(lines.map(p => [p.sku, p.quantity, p.unitPrice]).sort());
      if (Number(existing.amount_cents) !== cents(intent.amount) || identity(existing.items) !== identity(items) ||
        new Date(existing.expires_at).getTime() <= Date.now() || !["reserved", "preference_created"].includes(existing.status)) {
        throw new CommerceError("checkout_unavailable", 409);
      }
      // Consistent order avoids deadlocks when two buyers request overlapping baskets.
      const { rows } = await client.query("SELECT * FROM inventory WHERE sku=ANY($1::text[]) ORDER BY sku FOR UPDATE", [items.map(p => p.sku)]);
      if (rows.length !== items.length || rows.some(row => !row.active ||
        Number(row.price_cents) !== cents(items.find(p => p.sku === row.sku)!.unitPrice) ||
        (row.state !== "available" && !(row.state === "reserved" && row.held_reference === intent.reference)))) {
        throw new CommerceError("stock_unavailable", 409);
      }
      await client.query("UPDATE inventory SET state='reserved',held_reference=$1 WHERE sku=ANY($2::text[])", [intent.reference, items.map(p => p.sku)]);
    });
  }

  async savePreference(reference: string, preferenceId: string, paymentUrl: string) {
    const url = new URL(paymentUrl);
    if (!preferenceId || preferenceId.length > 150 || url.protocol !== "https:" || url.username || url.password || url.port ||
      !/^(www\.|sandbox\.)?mercadopago\.com\.ar$/.test(url.hostname)) throw new CommerceError("checkout_unavailable", 503);
    const result = await this.db.query(`UPDATE checkout_intents SET preference_id=$2,payment_url=$3,
      status=CASE WHEN status='reserved' THEN 'preference_created' ELSE status END
      WHERE reference=$1 AND (preference_id IS NULL OR preference_id=$2) RETURNING reference`, [reference, preferenceId, url.toString()]);
    if (result.rowCount !== 1) throw new CommerceError("checkout_unavailable", 503);
  }

  async resume(intent: CheckoutIntent) {
    const { rows: [row] } = await this.db.query(`SELECT amount_cents,items,payment_url FROM checkout_intents
      WHERE reference=$1 AND expires_at>now() AND status='preference_created'`, [intent.reference]);
    if (!row || Number(row.amount_cents) !== cents(intent.amount) || !row.payment_url ||
      JSON.stringify(row.items.map((p: {sku:string}) => p.sku).sort()) !== JSON.stringify([...intent.skus].sort())) return null;
    return row.payment_url as string;
  }

  async releaseUnstarted(reference: string) {
    return this.transaction(async (client) => {
      const { rows: [intent] } = await client.query("SELECT status,preference_id,approved_payment_id FROM checkout_intents WHERE reference=$1 FOR UPDATE", [reference]);
      if (!intent || intent.status !== "reserved" || intent.preference_id || intent.approved_payment_id) return false;
      if ((await client.query("SELECT 1 FROM payments WHERE reference=$1 LIMIT 1", [reference])).rowCount) return false;
      await client.query("UPDATE inventory SET state='available',held_reference=NULL WHERE held_reference=$1 AND state='reserved'", [reference]);
      await client.query("UPDATE checkout_intents SET status='cancelled',review_reason='preference_not_created',checked_at=now() WHERE reference=$1", [reference]);
      return true;
    });
  }

  async releaseExpiredUnpaid(reference: string) {
    return this.transaction(async (client) => {
      const { rows: [intent] } = await client.query("SELECT status,expires_at,approved_payment_id FROM checkout_intents WHERE reference=$1 FOR UPDATE", [reference]);
      if (!intent || intent.approved_payment_id || new Date(intent.expires_at).getTime() > Date.now() - 5 * 60_000 ||
        !["reserved", "preference_created", "manual_review"].includes(intent.status)) return false;
      const blocking = await client.query(`SELECT 1 FROM payments WHERE reference=$1
        AND status IN ('approved','pending','in_process','authorized','in_mediation') LIMIT 1`, [reference]);
      if (blocking.rowCount) return false;
      await client.query("UPDATE inventory SET state='available',held_reference=NULL WHERE held_reference=$1 AND state='reserved'", [reference]);
      await client.query("UPDATE checkout_intents SET status='cancelled',review_reason='expired_without_payment',checked_at=now() WHERE reference=$1", [reference]);
      return true;
    });
  }

  async settled(reference: string) {
    return (await this.db.query("SELECT 1 FROM checkout_intents WHERE reference=$1 AND approved_payment_id IS NOT NULL", [reference])).rowCount === 1;
  }

  async reconcile(payment: ProviderPayment) {
    const id = String(payment.id ?? ""), reference = payment.external_reference;
    const states = ["approved", "pending", "in_process", "authorized", "in_mediation", "rejected", "cancelled", "refunded", "charged_back"];
    const updated = new Date(payment.date_last_updated ?? "");
    if (!/^\d{1,32}$/.test(id) || !reference || !states.includes(payment.status ?? "") ||
      !Number.isFinite(updated.getTime()) || payment.currency_id !== "ARS" || typeof payment.transaction_amount !== "number") {
      throw new CommerceError("checkout_unavailable", 503);
    }
    return this.transaction(async (client) => {
      const { rows: [intent] } = await client.query("SELECT * FROM checkout_intents WHERE reference=$1 FOR UPDATE", [reference]);
      if (!intent || Number(intent.amount_cents) !== cents(payment.transaction_amount!) || intent.currency !== payment.currency_id) {
        throw new CommerceError("checkout_unavailable", 503);
      }
      const { rows: [old] } = await client.query("SELECT * FROM payments WHERE payment_id=$1 FOR UPDATE", [id]);
      if (old && old.reference !== reference) throw new CommerceError("checkout_unavailable", 503);
      if (old && (new Date(old.provider_updated_at).getTime() > updated.getTime() ||
        (new Date(old.provider_updated_at).getTime() === updated.getTime() && old.status === payment.status))) return "duplicate";
      // Never roll a terminal/approved payment back to pending because of event ordering.
      if (old && ["approved", "refunded", "charged_back"].includes(old.status) &&
        ["pending", "in_process", "authorized", "rejected", "cancelled"].includes(payment.status!)) return "duplicate";
      if (old && ["refunded", "charged_back"].includes(old.status) && payment.status === "approved") {
        await client.query("UPDATE checkout_intents SET status='manual_review',review_reason='terminal_payment_changed' WHERE reference=$1", [reference]);
        return "processed";
      }
      await client.query(`INSERT INTO payments(payment_id,reference,status,amount_cents,currency,provider_updated_at)
        VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT(payment_id) DO UPDATE SET status=EXCLUDED.status,
        provider_updated_at=EXCLUDED.provider_updated_at,recorded_at=now()`,
      [id, reference, payment.status, cents(payment.transaction_amount!), payment.currency_id, updated]);
      await client.query("INSERT INTO payment_events(payment_id,status,provider_updated_at) VALUES($1,$2,$3) ON CONFLICT DO NOTHING", [id, payment.status, updated]);
      if (payment.status === "approved") {
        const skus = intent.items.map((p: {sku:string}) => p.sku);
        const { rows: stock } = await client.query("SELECT sku,state,held_reference FROM inventory WHERE sku=ANY($1::text[]) ORDER BY sku FOR UPDATE", [skus]);
        const conflict = (intent.approved_payment_id && intent.approved_payment_id !== id) || stock.length !== skus.length ||
          stock.some(row => row.held_reference !== reference || !["reserved", "sold", "review"].includes(row.state));
        if (conflict) {
          await client.query("UPDATE checkout_intents SET status='manual_review',review_reason='duplicate_or_unavailable_payment',checked_at=now() WHERE reference=$1", [reference]);
          return "processed"; // Payment is recorded; operator must resolve/refund, never fulfill twice.
        }
        await client.query("UPDATE inventory SET state='sold' WHERE held_reference=$1", [reference]);
        await client.query(`INSERT INTO orders(reference,payment_id,amount_cents,currency,items) VALUES($1,$2,$3,$4,$5)
          ON CONFLICT(reference) DO NOTHING`, [reference, id, intent.amount_cents, intent.currency, JSON.stringify(intent.items)]);
        await client.query("UPDATE checkout_intents SET status='approved',approved_payment_id=$2,review_reason=NULL,checked_at=now() WHERE reference=$1", [reference, id]);
      } else if (["refunded", "charged_back", "in_mediation"].includes(payment.status!)) {
        await client.query("UPDATE orders SET status=$2 WHERE reference=$1 AND payment_id=$3", [reference, payment.status, id]);
        await client.query("UPDATE checkout_intents SET status='manual_review',review_reason=$2,checked_at=now() WHERE reference=$1", [reference, payment.status]);
        // Returned garments require a physical inspection, not automatic restocking.
      } else if (!intent.approved_payment_id) {
        await client.query("UPDATE checkout_intents SET status=$2,checked_at=now() WHERE reference=$1", [reference,
          ["pending", "in_process", "authorized"].includes(payment.status!) ? "pending" : "manual_review"]);
      }
      return "processed";
    });
  }

  async recorded(payment: ProviderPayment) {
    const { rows } = await this.db.query(`SELECT 1 FROM orders o JOIN payments p USING(payment_id)
      WHERE o.payment_id=$1 AND o.reference=$2 AND p.status='approved' AND o.status='paid'
      AND o.amount_cents=$3 AND o.currency=$4`, [String(payment.id), payment.external_reference, cents(payment.transaction_amount ?? 0), payment.currency_id]);
    return rows.length === 1;
  }

  async candidates() {
    return (await this.db.query(`SELECT reference,expires_at FROM checkout_intents
      WHERE status IN ('reserved','preference_created','pending','manual_review')
      AND checked_at<now()-interval '4 minutes' AND created_at>now()-interval '180 days'
      ORDER BY checked_at LIMIT 25`)).rows as Array<{ reference: string; expires_at: Date }>;
  }

  async checked(reference: string) {
    await this.db.query("UPDATE checkout_intents SET checked_at=now() WHERE reference=$1", [reference]);
  }

  async status() {
    const { rows: [row] } = await this.db.query(`SELECT
      (SELECT count(*)::int FROM inventory WHERE active) AS products,
      (SELECT count(*)::int FROM orders) AS orders,
      (SELECT count(*)::int FROM checkout_intents WHERE status='manual_review') AS reviews,
      (SELECT count(*)::int FROM checkout_intents WHERE status NOT IN ('approved','cancelled') AND checked_at<now()-interval '15 minutes') AS overdue`);
    return row;
  }
}
