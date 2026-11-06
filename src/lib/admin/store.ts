import { randomUUID } from "node:crypto";
import type { Pool, PoolClient } from "pg";
import type { AdminIdentity } from "./auth";
import type { CatalogRow } from "@/lib/commerce/postgres-orders";

export class AdminError extends Error {
  constructor(public code: "conflict" | "not_found" | "not_available" | "in_checkout" | "has_payment" | "invalid_state" | "no_photo") { super(code); }
}

export type ProductInput = {
  name: string;
  priceCents: number;
  description: string;
  category: string;
  measurements: Array<{ label: string; value: string }>;
  images: string[];
  isNew: boolean;
  costCents: number | null;
};

export type AdminProduct = Omit<CatalogRow, "price_cents"> & {
  price_cents: number; cost_cents: number | null; is_draft: boolean; version: string; held_reference: string | null; expires_at: Date | null; manual_sale: boolean;
};

export type SaleChannel = "transferencia" | "whatsapp" | "efectivo" | "otro";
export const FULFILLMENT = ["pendiente", "preparando", "enviado", "entregado"] as const;
export type Fulfillment = (typeof FULFILLMENT)[number];

// Statuses after which money may still arrive or is held. A piece in any of them cannot go back on sale.
const LIVE_PAYMENTS = ["approved", "pending", "in_process", "authorized", "in_mediation"];

const PRODUCT_SELECT = `SELECT c.id,c.sku,c.description,c.category,c.measurements,c.images,c.is_new,c.cost_cents::float8 AS cost_cents,c.is_draft,c.updated_at::text AS version,
  i.name,i.price_cents::float8 AS price_cents,i.state,i.active,i.held_reference,ci.expires_at,
  (ms.reference IS NOT NULL AND ms.voided_at IS NULL) AS manual_sale
  FROM catalog_products c JOIN inventory i USING(sku)
  LEFT JOIN checkout_intents ci ON ci.reference=i.held_reference
  LEFT JOIN manual_sales ms ON ms.reference=i.held_reference`;

export class AdminStore {
  constructor(private db: Pool) {}

  private async transaction<T>(actor: AdminIdentity, kind: string, reason: string | null, run: (client: PoolClient) => Promise<T>) {
    const client = await this.db.connect();
    try {
      await client.query("BEGIN");
      await client.query("SET LOCAL lock_timeout = '4s'");
      // Read by the stock trigger for this transaction only.
      await client.query("SELECT set_config('mangata.actor',$1,true),set_config('mangata.kind',$2,true),set_config('mangata.reason',$3,true)", [String(actor.id), kind, reason ?? ""]);
      const result = await run(client);
      await client.query("COMMIT");
      return result;
    } catch (error) {
      await client.query("ROLLBACK").catch(() => undefined);
      throw error;
    } finally { client.release(); }
  }

  private audit(client: PoolClient, actor: AdminIdentity, action: string, entity: string, entityId: string, detail: unknown = {}) {
    return client.query("INSERT INTO audit_log(actor_id,actor_email,action,entity,entity_id,detail) VALUES($1,$2,$3,$4,$5,$6)",
      [actor.id, actor.email, action, entity, entityId, JSON.stringify(detail)]);
  }

  async listProducts() {
    return (await this.db.query(`${PRODUCT_SELECT} ORDER BY c.position,c.id`)).rows as AdminProduct[];
  }

  async getProduct(id: number) {
    return ((await this.db.query(`${PRODUCT_SELECT} WHERE c.id=$1`, [id])).rows[0] ?? null) as AdminProduct | null;
  }

  async categories() {
    return (await this.db.query("SELECT DISTINCT category FROM catalog_products ORDER BY 1")).rows.map(r => r.category as string);
  }

  /** New pieces go first and start as drafts: nothing reaches the store without an explicit publish. */
  async createProduct(actor: AdminIdentity, input: ProductInput) {
    return this.transaction(actor, "alta", null, async client => {
      const { rows: [{ id }] } = await client.query("SELECT nextval('catalog_product_id_seq')::int AS id");
      const sku = `MNGT-${id}`;
      await client.query("INSERT INTO inventory(sku,name,price_cents,active) VALUES($1,$2,$3,false)", [sku, input.name, input.priceCents]);
      await client.query(`INSERT INTO catalog_products(id,sku,description,category,measurements,images,is_new,position,cost_cents,is_draft)
        VALUES($1,$2,$3,$4,$5,$6,$7,(SELECT COALESCE(min(position),1)-1 FROM catalog_products),$8,true)`,
      [id, sku, input.description, input.category, JSON.stringify(input.measurements), JSON.stringify(input.images), input.isNew, input.costCents]);
      await this.audit(client, actor, "crear_producto", "product", String(id), { name: input.name, priceCents: input.priceCents });
      return id as number;
    });
  }

  /** `version` rejects a save made from a screen that was opened before someone else's change. */
  async updateProduct(actor: AdminIdentity, id: number, version: string, input: ProductInput) {
    return this.transaction(actor, "edicion", null, async client => {
      const { rows: [before] } = await client.query(`SELECT c.sku,c.updated_at::text AS version,c.description,c.category,c.measurements,c.images,c.is_new,c.cost_cents::float8 AS cost_cents,i.name,i.price_cents::float8 AS price_cents
        FROM catalog_products c JOIN inventory i USING(sku) WHERE c.id=$1 FOR UPDATE OF c,i`, [id]);
      if (!before) throw new AdminError("not_found");
      if (before.version !== version) throw new AdminError("conflict");
      await client.query("UPDATE inventory SET name=$2,price_cents=$3 WHERE sku=$1", [before.sku, input.name, input.priceCents]);
      await client.query(`UPDATE catalog_products SET description=$2,category=$3,measurements=$4,images=$5,is_new=$6,cost_cents=$7,updated_at=now() WHERE id=$1`,
        [id, input.description, input.category, JSON.stringify(input.measurements), JSON.stringify(input.images), input.isNew, input.costCents]);
      const after: Record<string, unknown> = { name: input.name, price_cents: input.priceCents, description: input.description, category: input.category,
        measurements: input.measurements, images: input.images, is_new: input.isNew, cost_cents: input.costCents };
      const changes = Object.fromEntries(Object.keys(after).filter(key => JSON.stringify(before[key]) !== JSON.stringify(after[key]))
        .map(key => [key, { before: before[key], after: after[key] }]));
      await this.audit(client, actor, "editar_producto", "product", String(id), changes);
    });
  }

  async duplicateProduct(actor: AdminIdentity, id: number) {
    const source = await this.getProduct(id);
    if (!source) throw new AdminError("not_found");
    return this.createProduct(actor, { name: `${source.name} (copia)`.slice(0, 120), priceCents: source.price_cents, description: source.description, category: source.category,
      measurements: source.measurements, images: source.images, isNew: source.is_new, costCents: source.cost_cents });
  }

  private async lockedPiece(client: PoolClient, id: number) {
    const { rows: [piece] } = await client.query(`SELECT c.sku,c.is_draft,c.images,i.name,i.price_cents,i.state,i.active,i.held_reference FROM catalog_products c JOIN inventory i USING(sku)
      WHERE c.id=$1 FOR UPDATE OF c,i`, [id]);
    if (!piece) throw new AdminError("not_found");
    return piece;
  }

  async publish(actor: AdminIdentity, id: number) {
    return this.transaction(actor, "publicacion", null, async client => {
      const piece = await this.lockedPiece(client, id);
      if (!piece.images.length) throw new AdminError("no_photo");
      await client.query("UPDATE inventory SET active=true WHERE sku=$1", [piece.sku]);
      await client.query("UPDATE catalog_products SET is_draft=false,updated_at=now() WHERE id=$1", [id]);
      await this.audit(client, actor, "publicar_producto", "product", String(id));
    });
  }

  /** Someone paying for the piece keeps it: their reservation would otherwise settle on a hidden product. */
  async archive(actor: AdminIdentity, id: number) {
    return this.transaction(actor, "archivo", null, async client => {
      const piece = await this.lockedPiece(client, id);
      if (piece.state === "reserved") throw new AdminError("in_checkout");
      await client.query("UPDATE inventory SET active=false WHERE sku=$1", [piece.sku]);
      await client.query("UPDATE catalog_products SET is_draft=false,updated_at=now() WHERE id=$1", [id]);
      await this.audit(client, actor, "archivar_producto", "product", String(id));
    });
  }

  /** Same row lock as checkout's reserve(): of a buyer and this sale, exactly one gets the piece. */
  async recordManualSale(actor: AdminIdentity, id: number, sale: { amountCents: number; channel: SaleChannel; note: string }) {
    return this.transaction(actor, "venta_manual", sale.channel, async client => {
      const piece = await this.lockedPiece(client, id);
      if (piece.state === "reserved") throw new AdminError("in_checkout");
      if (piece.state !== "available") throw new AdminError("not_available");
      const reference = `MNGT-${randomUUID()}`;
      const items = [{ sku: piece.sku, name: piece.name, quantity: 1, unitPrice: sale.amountCents / 100 }];
      await client.query(`INSERT INTO checkout_intents(reference,amount_cents,currency,items,status,expires_at) VALUES($1,$2,'ARS',$3,'manual_sale',now())`,
        [reference, sale.amountCents, JSON.stringify(items)]);
      await client.query("INSERT INTO manual_sales(reference,amount_cents,channel,note,created_by) VALUES($1,$2,$3,$4,$5)",
        [reference, sale.amountCents, sale.channel, sale.note, actor.id]);
      await client.query("UPDATE inventory SET state='sold',held_reference=$2 WHERE sku=$1", [piece.sku, reference]);
      await this.audit(client, actor, "registrar_venta_manual", "product", String(id), { reference, amountCents: sale.amountCents, channel: sale.channel });
      return reference;
    });
  }

  /** The only way back on sale, and only for a piece with no money in play. Always needs a reason. */
  async returnToSale(actor: AdminIdentity, id: number, reason: string) {
    return this.transaction(actor, "reposicion", reason, async client => {
      const piece = await this.lockedPiece(client, id);
      if (piece.state === "available") throw new AdminError("invalid_state");
      if (piece.state === "reserved") throw new AdminError("in_checkout");
      const live = await client.query(`SELECT 1 FROM payments WHERE reference=$1 AND status=ANY($2::text[])
        UNION ALL SELECT 1 FROM checkout_intents WHERE reference=$1 AND (status='approved' OR approved_payment_id IS NOT NULL AND status<>'manual_review') LIMIT 1`, [piece.held_reference, LIVE_PAYMENTS]);
      if (live.rowCount) throw new AdminError("has_payment");
      await client.query("UPDATE manual_sales SET voided_at=now(),voided_by=$2,void_reason=$3 WHERE reference=$1 AND voided_at IS NULL", [piece.held_reference, actor.id, reason]);
      await client.query(`UPDATE checkout_intents SET status='cancelled',review_reason='returned_to_sale',checked_at=now() WHERE reference=$1 AND status IN ('manual_sale','manual_review')`, [piece.held_reference]);
      await client.query("UPDATE inventory SET state='available',held_reference=NULL WHERE sku=$1", [piece.sku]);
      await this.audit(client, actor, "volver_a_vender", "product", String(id), { reason, reference: piece.held_reference });
    });
  }

  /** Photos live in the database, so the existing backup already covers them. */
  async savePhoto(actor: AdminIdentity, photo: { bytes: Buffer; width: number; height: number }) {
    const { rows: [row] } = await this.db.query("INSERT INTO catalog_images(bytes,width,height,created_by) VALUES($1,$2,$3,$4) RETURNING id", [photo.bytes, photo.width, photo.height, actor.id]);
    await this.db.query("INSERT INTO audit_log(actor_id,actor_email,action,entity,entity_id) VALUES($1,$2,'subir_foto','photo',$3)", [actor.id, actor.email, row.id]);
    return row.id as string;
  }

  async movements(limit = 100, sku?: string) {
    return (await this.db.query(`SELECT m.id,m.at,m.sku,i.name,m.from_state,m.to_state,m.from_active,m.to_active,m.kind,m.reason,u.email AS actor
      FROM stock_movements m JOIN inventory i USING(sku) LEFT JOIN admin_users u ON u.id=m.actor_id
      WHERE ($2::text IS NULL OR m.sku=$2) ORDER BY m.id DESC LIMIT $1`, [limit, sku ?? null])).rows;
  }

  /** Web orders are provider-confirmed; manual sales are declared by the owner. They never merge into one total. */
  async listOrders() {
    return (await this.db.query(`SELECT o.reference,'web' AS origin,o.amount_cents::float8 AS amount_cents,o.items,o.status,o.fulfillment,o.internal_note AS note,o.created_at,o.payment_id,p.status AS payment_status
        FROM orders o JOIN payments p USING(payment_id)
      UNION ALL
      SELECT m.reference,'manual',m.amount_cents::float8,ci.items,CASE WHEN m.voided_at IS NULL THEN 'manual' ELSE 'anulada' END,m.fulfillment,m.note,m.created_at,NULL,m.channel
        FROM manual_sales m JOIN checkout_intents ci USING(reference)
      ORDER BY created_at DESC LIMIT 200`)).rows;
  }

  async setFulfillment(actor: AdminIdentity, reference: string, fulfillment: Fulfillment, note: string) {
    return this.transaction(actor, "pedido", null, async client => {
      const result = await client.query("UPDATE orders SET fulfillment=$2,internal_note=$3 WHERE reference=$1", [reference, fulfillment, note]);
      if (!result.rowCount) {
        const manual = await client.query("UPDATE manual_sales SET fulfillment=$2,note=$3 WHERE reference=$1 AND voided_at IS NULL", [reference, fulfillment, note]);
        if (!manual.rowCount) throw new AdminError("not_found");
      }
      await this.audit(client, actor, "actualizar_pedido", "order", reference, { fulfillment });
    });
  }

  async listPayments() {
    return (await this.db.query(`SELECT p.payment_id,p.reference,p.status,p.amount_cents::float8 AS amount_cents,p.currency,p.provider_updated_at,ci.status AS intent_status,ci.review_reason,ci.items
      FROM payments p JOIN checkout_intents ci USING(reference) ORDER BY p.provider_updated_at DESC LIMIT 200`)).rows;
  }

  async problems() {
    return (await this.db.query(`SELECT reference,status,review_reason,amount_cents::float8 AS amount_cents,items,checked_at,created_at FROM checkout_intents
      WHERE status='manual_review' OR (status NOT IN ('approved','cancelled','manual_sale') AND checked_at<now()-interval '15 minutes')
      ORDER BY created_at DESC LIMIT 50`)).rows;
  }

  /** Days are counted in Argentina. No value here is estimated: each one is a count of stored rows. */
  async overview() {
    const { rows: [row] } = await this.db.query(`WITH today AS (SELECT (now() AT TIME ZONE 'America/Argentina/Cordoba')::date AS day) SELECT
      (SELECT COALESCE(sum(o.amount_cents),0)::float8 FROM orders o, today WHERE o.status='paid' AND (o.created_at AT TIME ZONE 'America/Argentina/Cordoba')::date=today.day) AS web_today_cents,
      (SELECT count(*)::int FROM orders o, today WHERE o.status='paid' AND (o.created_at AT TIME ZONE 'America/Argentina/Cordoba')::date=today.day) AS web_today_count,
      (SELECT COALESCE(sum(m.amount_cents),0)::float8 FROM manual_sales m, today WHERE m.voided_at IS NULL AND (m.created_at AT TIME ZONE 'America/Argentina/Cordoba')::date=today.day) AS manual_today_cents,
      (SELECT count(*)::int FROM manual_sales m, today WHERE m.voided_at IS NULL AND (m.created_at AT TIME ZONE 'America/Argentina/Cordoba')::date=today.day) AS manual_today_count,
      ((SELECT count(*) FROM orders WHERE status='paid' AND fulfillment IN ('pendiente','preparando'))+(SELECT count(*) FROM manual_sales WHERE voided_at IS NULL AND fulfillment IN ('pendiente','preparando')))::int AS to_prepare,
      (SELECT count(*)::int FROM inventory WHERE active AND state='available') AS available,
      (SELECT count(*)::int FROM inventory WHERE active AND state='reserved') AS in_checkout,
      (SELECT count(*)::int FROM catalog_products WHERE is_draft) AS drafts,
      (SELECT count(*)::int FROM checkout_intents WHERE status='manual_review' OR (status NOT IN ('approved','cancelled','manual_sale') AND checked_at<now()-interval '15 minutes')) AS problems,
      (SELECT value FROM commerce_meta WHERE key='last_reconcile_at') AS last_reconcile_at`);
    return row;
  }

  async recentAudit(limit = 50) {
    return (await this.db.query("SELECT id,at,actor_email,action,entity,entity_id FROM audit_log ORDER BY id DESC LIMIT $1", [limit])).rows;
  }
}
