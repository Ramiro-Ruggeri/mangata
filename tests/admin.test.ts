import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { Pool } from "pg";
import { getLocalCatalog, visibleProducts } from "../src/lib/commerce/catalog";
import { PostgresOrders } from "../src/lib/commerce/postgres-orders";
import { AdminAuth, MAX_ACCOUNT_FAILURES, MAX_IP_ATTEMPTS } from "../src/lib/admin/auth";
import { AdminError, AdminStore, type ProductInput } from "../src/lib/admin/store";
import { base32Encode, matchTotp, openSecret, totpAt } from "../src/lib/admin/crypto";

const sql = (file: string) => readFileSync(new URL(`../deploy/${file}`, import.meta.url), "utf8");
const ROOT = "x".repeat(40);
const PASSWORD = "una-frase-larga-de-prueba";
const input = (over: Partial<ProductInput> = {}): ProductInput => ({ name: "Pieza de prueba", priceCents: 1_500_000, description: "Descripción",
  category: "Prendas", measurements: [{ label: "Largo", value: "70 cm" }], images: ["/media/" + "a".repeat(32) + ".webp"], isNew: true, costCents: 400_000, ...over });

test("panel on real PostgreSQL", async t => {
  const connectionString = process.env.MANGATA_TEST_DATABASE_URL;
  assert.ok(connectionString, "A dedicated test database is required; never run this suite against production.");
  assert.match(new URL(connectionString).pathname, /^\/mangata_test_[a-z0-9_]+$/);
  const pool = new Pool({ connectionString, max: 8 });
  const auth = new AdminAuth(pool, ROOT);
  const store = new AdminStore(pool);
  const orders = new PostgresOrders(pool);
  const count = async (query: string, values: unknown[] = []) => (await pool.query(query, values)).rows[0].n as number;
  let admin = { id: 0, email: "" };

  const codeFor = async (email: string, offsetSteps = 0) => {
    const { rows: [row] } = await pool.query("SELECT COALESCE(totp_secret_enc,pending_totp_enc) AS s FROM admin_users WHERE email=$1", [email]);
    return totpAt(openSecret(row.s, ROOT), Math.floor(Date.now() / 30000) + offsetSteps);
  };
  const freshAccount = async () => {
    const email = `e${randomUUID().slice(0, 8)}@mangata.test`;
    const { token } = await auth.invite(email);
    await auth.beginActivation(token, PASSWORD);
    const done = await auth.confirmActivation(token, await codeFor(email));
    assert.ok("recoveryCodes" in done);
    await pool.query("UPDATE admin_users SET totp_last_step=0 WHERE email=$1", [email]);
    return { email, codes: (done as { recoveryCodes: string[] }).recoveryCodes };
  };
  const signIn = async (email: string) => {
    const pending = await auth.login(email, PASSWORD, randomUUID());
    assert.ok(pending);
    const session = await auth.verifySecondFactor(pending, await codeFor(email));
    assert.ok(session);
    return session;
  };

  try {
    await pool.query("DROP SCHEMA public CASCADE; CREATE SCHEMA public;");
    await pool.query(`DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='mangata_app') THEN CREATE ROLE mangata_app; END IF; END $$`);
    await pool.query(sql("commerce-schema.sql"));
    await pool.query(sql("migrations/002-catalog.up.sql"));
    await pool.query("GRANT USAGE ON SCHEMA public TO mangata_app; GRANT SELECT,INSERT,UPDATE ON ALL TABLES IN SCHEMA public TO mangata_app");
    await orders.importCatalog(getLocalCatalog());
    const soldReference = `MNGT-${randomUUID()}`;
    await pool.query(`INSERT INTO checkout_intents(reference,amount_cents,currency,items,status,expires_at,approved_payment_id) VALUES($1,700000,'ARS','[]','approved',now(),'p-real')`, [soldReference]);
    await pool.query("UPDATE inventory SET state='sold',held_reference=$1 WHERE sku='MNGT-037'", [soldReference]);
    const beforeMigration = (await pool.query("SELECT sku,name,price_cents,state,active,held_reference FROM inventory ORDER BY sku")).rows;

    await pool.query(sql("migrations/003-admin.up.sql"));

    await t.test("migration: existing stock untouched, history starts with one row per piece", async () => {
      assert.deepEqual((await pool.query("SELECT sku,name,price_cents,state,active,held_reference FROM inventory ORDER BY sku")).rows, beforeMigration);
      assert.equal(await count("SELECT count(*)::int AS n FROM stock_movements WHERE kind='inicial'"), 26);
      await assert.rejects(pool.query(sql("migrations/003-admin.up.sql")), /expected schema_version 2/);
      await pool.query("ROLLBACK").catch(() => undefined);
    });

    await t.test("migration: down and up round trip keeps commerce rows", async () => {
      await pool.query(sql("migrations/003-admin.down.sql"));
      assert.deepEqual((await pool.query("SELECT sku,name,price_cents,state,active,held_reference FROM inventory ORDER BY sku")).rows, beforeMigration);
      assert.equal((await pool.query("SELECT value FROM commerce_meta WHERE key='schema_version'")).rows[0].value, "2");
      await pool.query(sql("migrations/003-admin.up.sql"));
    });

    await t.test("role: application cannot rewrite the ledgers nor delete anything", async () => {
      const client = await pool.connect();
      try {
        await client.query("SET ROLE mangata_app");
        for (const statement of ["UPDATE audit_log SET action='x'", "DELETE FROM audit_log", "TRUNCATE audit_log",
          "UPDATE stock_movements SET kind='x'", "DELETE FROM stock_movements", "DELETE FROM catalog_products", "DELETE FROM inventory", "DELETE FROM admin_sessions"]) {
          await assert.rejects(client.query(statement), /permission denied/, statement);
        }
        await client.query("SELECT nextval('catalog_product_id_seq')");
      } finally { await client.query("RESET ROLE"); client.release(); }
    });

    await t.test("totp: RFC 6238 vectors, drift window and malformed codes", () => {
      const secret = Buffer.from("12345678901234567890");
      assert.equal(totpAt(secret, Math.floor(59 / 30)), "287082");
      assert.equal(totpAt(secret, Math.floor(1111111109 / 30)), "081804");
      assert.equal(totpAt(secret, Math.floor(1234567890 / 30)), "005924");
      assert.equal(base32Encode(secret), "GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ");
      const at = 1234567890_000;
      assert.equal(matchTotp(secret, totpAt(secret, Math.floor(at / 30000) - 1), at), Math.floor(at / 30000) - 1);
      assert.equal(matchTotp(secret, totpAt(secret, Math.floor(at / 30000) + 2), at), null);
      assert.equal(matchTotp(secret, "12345", at), null);
      assert.equal(matchTotp(secret, "abcdef", at), null);
    });

    await t.test("activation: nothing works until a code proves the app; secrets are not stored in clear", async () => {
      const email = `a${randomUUID().slice(0, 8)}@mangata.test`;
      const { token } = await auth.invite(email.toUpperCase());
      assert.equal(await auth.login(email, PASSWORD, randomUUID()), null);
      assert.deepEqual(await auth.beginActivation(token, "corta"), { error: "password", problem: "Usá al menos 12 caracteres." });
      const begun = await auth.beginActivation(token, PASSWORD);
      assert.ok("key" in begun);
      assert.equal(await auth.login(email, PASSWORD, randomUUID()), null, "a pending password must not log in");
      assert.deepEqual(await auth.confirmActivation(token, "000000"), { error: "code" });
      const done = await auth.confirmActivation(token, await codeFor(email));
      assert.ok("recoveryCodes" in done);
      assert.deepEqual(await auth.confirmActivation(token, await codeFor(email)), { error: "invite" }, "an invite works once");
      const { rows: [row] } = await pool.query("SELECT * FROM admin_users WHERE email=$1", [email]);
      assert.ok(!JSON.stringify(row).includes((begun as { key: string }).key));
      assert.ok(!JSON.stringify(row).includes(PASSWORD));
      assert.ok(!JSON.stringify(row).includes((done as { recoveryCodes: string[] }).recoveryCodes[0]));
      assert.equal(row.invite_hash, null);
    });

    await t.test("activation: an expired invite and a garbage token do nothing", async () => {
      const email = `b${randomUUID().slice(0, 8)}@mangata.test`;
      const { token } = await auth.invite(email);
      await pool.query("UPDATE admin_users SET invite_expires_at=now()-interval '1 second' WHERE email=$1", [email]);
      assert.deepEqual(await auth.beginActivation(token, PASSWORD), { error: "invite" });
      assert.deepEqual(await auth.beginActivation("x", PASSWORD), { error: "invite" });
      assert.equal(await auth.inviteEmail(token), null);
    });

    await t.test("login: needs both factors, and a pending session opens nothing", async () => {
      const { email } = await freshAccount();
      const ip = randomUUID();
      assert.equal(await auth.login(email, "contraseña-equivocada", ip), null);
      assert.equal(await auth.login("nadie@mangata.test", PASSWORD, ip), null);
      const pending = await auth.login(email, PASSWORD, ip);
      assert.ok(pending);
      assert.equal(await auth.identify(pending), null);
      assert.equal(await auth.verifySecondFactor(pending, "000000"), null);
      const session = await auth.verifySecondFactor(pending, await codeFor(email));
      assert.ok(session);
      assert.notEqual(session, pending, "the token changes when the second factor passes");
      assert.equal((await auth.identify(session))?.email, email);
      assert.equal(await auth.identify(pending), null);
      assert.equal(await auth.verifySecondFactor(pending, await codeFor(email)), null);
    });

    await t.test("login: the same code cannot be used twice, even at once", async () => {
      const { email } = await freshAccount();
      const code = await codeFor(email);
      const [a, b] = await Promise.all([auth.login(email, PASSWORD, randomUUID()), auth.login(email, PASSWORD, randomUUID())]);
      const results = await Promise.all([auth.verifySecondFactor(a!, code), auth.verifySecondFactor(b!, code)]);
      assert.equal(results.filter(Boolean).length, 1);
      const third = await auth.login(email, PASSWORD, randomUUID());
      assert.equal(await auth.verifySecondFactor(third!, code), null);
    });

    await t.test("lockout: account locks on repeated failures, then even the right password fails", async () => {
      const { email } = await freshAccount();
      for (let i = 0; i < MAX_ACCOUNT_FAILURES; i++) assert.equal(await auth.login(email, "incorrecta-numero-" + i, randomUUID()), null);
      assert.equal(await auth.login(email, PASSWORD, randomUUID()), null);
      await pool.query("UPDATE admin_users SET locked_until=now()-interval '1 second' WHERE email=$1", [email]);
      assert.ok(await auth.login(email, PASSWORD, randomUUID()));
    });

    await t.test("lockout: guessing codes locks the account and revokes the pending session", async () => {
      const { email } = await freshAccount();
      const pending = await auth.login(email, PASSWORD, randomUUID());
      for (let i = 0; i < MAX_ACCOUNT_FAILURES; i++) assert.equal(await auth.verifySecondFactor(pending!, "000000"), null);
      assert.equal(await auth.pendingSessionValid(pending!), false);
      assert.equal(await auth.verifySecondFactor(pending!, await codeFor(email)), null);
    });

    await t.test("throttle: one address cannot keep trying, and it does not block another", async () => {
      const { email } = await freshAccount();
      const ip = randomUUID();
      for (let i = 0; i < MAX_IP_ATTEMPTS; i++) await pool.query(`INSERT INTO admin_login_throttle(ip_hash,attempts) VALUES(encode(sha256($1::bytea),'hex'),$2)
        ON CONFLICT(ip_hash) DO UPDATE SET attempts=$2`, [ip, i + 1]);
      assert.equal(await auth.login(email, PASSWORD, ip), null, "right password, throttled address");
      assert.ok(await auth.login(email, PASSWORD, randomUUID()));
    });

    await t.test("recovery code: replaces the app once", async () => {
      const { email, codes } = await freshAccount();
      const first = await auth.login(email, PASSWORD, randomUUID());
      const session = await auth.verifySecondFactor(first!, codes[0].toLowerCase().replaceAll("-", " "));
      assert.ok(session);
      const second = await auth.login(email, PASSWORD, randomUUID());
      assert.equal(await auth.verifySecondFactor(second!, codes[0]), null);
      assert.equal(await count("SELECT jsonb_array_length(recovery_hashes)::int AS n FROM admin_users WHERE email=$1", [email]), 7);
    });

    await t.test("sessions: logout, expiry, idle time, disabled user and re-activation all end access", async () => {
      const { email } = await freshAccount();
      const ending = async (run: (session: string) => Promise<unknown>) => {
        await pool.query("UPDATE admin_users SET totp_last_step=0 WHERE email=$1", [email]);
        const session = await signIn(email);
        assert.ok(await auth.identify(session));
        await run(session);
        assert.equal(await auth.identify(session), null);
      };
      await ending(session => auth.logout(session));
      await ending(() => pool.query("UPDATE admin_sessions SET expires_at=now()-interval '1 second' WHERE user_id=(SELECT id FROM admin_users WHERE email=$1)", [email]));
      await ending(() => pool.query("UPDATE admin_sessions SET last_seen_at=now()-interval '13 hours' WHERE user_id=(SELECT id FROM admin_users WHERE email=$1)", [email]));
      await ending(async () => {
        const { token } = await auth.invite(email);
        await auth.beginActivation(token, PASSWORD);
        const { rows: [{ pending_totp_enc: pending }] } = await pool.query("SELECT pending_totp_enc FROM admin_users WHERE email=$1", [email]);
        const step = Math.floor(Date.now() / 30000);
        await auth.confirmActivation(token, totpAt(openSecret(pending, ROOT), step));
      });
      await ending(() => auth.disable(email));
      assert.equal(await auth.login(email, PASSWORD, randomUUID()), null);
    });

    const { email } = await freshAccount();
    admin = (await auth.identify(await signIn(email)))!;

    await t.test("products: a new piece is a hidden draft until published, then archived without losing it", async () => {
      const id = await store.createProduct(admin, input());
      assert.ok(id >= 1000, "never reuses a published or retired id");
      const inStore = async () => visibleProducts(await orders.catalogRows()).some(p => p.id === String(id));
      assert.equal(await inStore(), false);
      assert.equal((await store.getProduct(id))!.is_draft, true);
      await store.publish(admin, id);
      assert.equal(await inStore(), true);
      await store.archive(admin, id);
      assert.equal(await inStore(), false);
      const archived = await store.getProduct(id);
      assert.equal(archived!.is_draft, false);
      assert.equal(archived!.active, false);
    });

    await t.test("products: an edit reaches the store and the audit log records what changed", async () => {
      const id = await store.createProduct(admin, input());
      await store.publish(admin, id);
      const { version } = (await store.getProduct(id))!;
      await store.updateProduct(admin, id, version, input({ name: "Nombre nuevo", priceCents: 2_000_000 }));
      const row = visibleProducts(await orders.catalogRows()).find(p => p.id === String(id))!;
      assert.equal(row.name, "Nombre nuevo");
      assert.equal(row.price, 20000);
      const { rows: [entry] } = await pool.query("SELECT actor_email,detail FROM audit_log WHERE action='editar_producto' AND entity_id=$1", [String(id)]);
      assert.equal(entry.actor_email, email);
      assert.deepEqual(Object.keys(entry.detail).sort(), ["name", "price_cents"]);
      assert.deepEqual(entry.detail.price_cents, { before: 1500000, after: 2000000 });
    });

    await t.test("products: a stale screen cannot overwrite a newer change", async () => {
      const id = await store.createProduct(admin, input());
      const { version } = (await store.getProduct(id))!;
      await store.updateProduct(admin, id, version, input({ name: "Primero" }));
      await assert.rejects(store.updateProduct(admin, id, version, input({ name: "Viejo" })), (e: AdminError) => e.code === "conflict");
      assert.equal((await store.getProduct(id))!.name, "Primero");
    });

    await t.test("products: the cost never appears in what the store reads", async () => {
      const id = await store.createProduct(admin, input({ costCents: 123_456 }));
      await store.publish(admin, id);
      const rows = await orders.catalogRows();
      assert.ok(!("cost_cents" in rows[0]));
      assert.ok(!JSON.stringify(visibleProducts(rows)).includes("123456"));
      assert.ok(!JSON.stringify(visibleProducts(rows)).includes("1234.56"));
    });

    await t.test("products: duplicate starts as a hidden draft with its own stock", async () => {
      const id = await store.createProduct(admin, input());
      await store.publish(admin, id);
      const copy = await store.duplicateProduct(admin, id);
      const row = (await store.getProduct(copy))!;
      assert.equal(row.is_draft, true);
      assert.equal(row.state, "available");
      assert.notEqual(row.sku, (await store.getProduct(id))!.sku);
    });

    const published = async () => { const id = await store.createProduct(admin, input()); await store.publish(admin, id); return { id, sku: (await store.getProduct(id))!.sku }; };
    const checkoutIntent = (sku: string, amount = 15000) => ({ reference: `MNGT-${randomUUID()}`, amount, currency: "ARS" as const, skus: [sku], expiresAt: Date.now() + 1_800_000 });
    const asProduct = async (id: number) => visibleProducts(await orders.catalogRows()).find(p => p.id === String(id))!;

    await t.test("stock: a manual sale takes the piece off sale, and voiding it needs a reason and leaves a trail", async () => {
      const { id, sku } = await published();
      const reference = await store.recordManualSale(admin, id, { amountCents: 1_200_000, channel: "transferencia", note: "Pagó por alias" });
      assert.equal((await store.getProduct(id))!.state, "sold");
      assert.equal((await asProduct(id)).inventory.isInStock, false);
      await assert.rejects(store.recordManualSale(admin, id, { amountCents: 1, channel: "otro", note: "" }), (e: AdminError) => e.code === "not_available");
      await assert.rejects(orders.reserve(checkoutIntent(sku), [await asProduct(id)], Date.now() + 1000));
      await store.returnToSale(admin, id, "Se arrepintió");
      assert.equal((await store.getProduct(id))!.state, "available");
      const { rows: [sale] } = await pool.query("SELECT voided_at,void_reason FROM manual_sales WHERE reference=$1", [reference]);
      assert.ok(sale.voided_at);
      assert.equal(sale.void_reason, "Se arrepintió");
      const { rows: moves } = await pool.query("SELECT kind,reason,to_state,actor_id FROM stock_movements WHERE sku=$1 ORDER BY id", [sku]);
      assert.deepEqual(moves.map(m => m.kind), ["alta", "publicacion", "venta_manual", "reposicion"]);
      assert.equal(moves[3].reason, "Se arrepintió");
      assert.equal(moves[3].actor_id, admin.id);
    });

    await t.test("stock: of a buyer and a manual sale racing for the last piece, exactly one wins", async () => {
      for (let round = 0; round < 15; round++) {
        const { id, sku } = await published();
        const product = await asProduct(id);
        const outcomes = await Promise.allSettled([
          orders.reserve(checkoutIntent(sku), [product], Date.now() + 1_800_000),
          store.recordManualSale(admin, id, { amountCents: 1_500_000, channel: "whatsapp", note: "" }),
        ]);
        assert.equal(outcomes.filter(o => o.status === "fulfilled").length, 1, `round ${round}`);
      }
    });

    await t.test("stock: a piece someone is paying for cannot be sold, archived or put back on sale", async () => {
      const { id, sku } = await published();
      const intent = checkoutIntent(sku);
      await orders.reserve(intent, [await asProduct(id)], Date.now() + 1_800_000);
      const inCheckout = (e: AdminError) => e.code === "in_checkout";
      await assert.rejects(store.recordManualSale(admin, id, { amountCents: 1, channel: "otro", note: "" }), inCheckout);
      await assert.rejects(store.archive(admin, id), inCheckout);
      await assert.rejects(store.returnToSale(admin, id, "x"), inCheckout);
      assert.equal((await store.getProduct(id))!.held_reference, intent.reference);
    });

    await t.test("stock: a paid piece cannot go back on sale; after a refund it can, deliberately", async () => {
      const { id, sku } = await published();
      const intent = checkoutIntent(sku);
      await orders.reserve(intent, [await asProduct(id)], Date.now() + 1_800_000);
      const paymentId = String(Date.now());
      const payment = (status: string, at: number) => ({ id: paymentId, external_reference: intent.reference, transaction_amount: 15000, currency_id: "ARS", status, date_last_updated: new Date(at).toISOString() });
      const start = Date.now();
      assert.equal(await orders.reconcile(payment("approved", start)), "processed");
      assert.equal((await store.getProduct(id))!.state, "sold");
      await assert.rejects(store.returnToSale(admin, id, "x"), (e: AdminError) => e.code === "has_payment");
      await orders.reconcile(payment("refunded", start + 1000));
      assert.equal((await store.getProduct(id))!.state, "sold", "a refund never restocks by itself");
      await store.returnToSale(admin, id, "Prenda devuelta y revisada");
      assert.equal((await store.getProduct(id))!.state, "available");
      assert.equal(await count("SELECT count(*)::int AS n FROM orders WHERE reference=$1 AND status='refunded'", [intent.reference]), 1, "the order history stays");
      const { rows } = await pool.query("SELECT kind FROM stock_movements WHERE sku=$1 ORDER BY id", [sku]);
      assert.deepEqual(rows.map(r => r.kind), ["alta", "publicacion", "sistema", "sistema", "reposicion"]);
    });

    await t.test("stock: the real sale from before the panel stays locked", async () => {
      const row = (await store.listProducts()).find(p => p.sku === "MNGT-037")!;
      assert.equal(row.state, "sold");
      await assert.rejects(store.returnToSale(admin, row.id, "x"), (e: AdminError) => e.code === "has_payment");
    });

    await t.test("orders: fulfillment moves without touching the payment status the webhook relies on", async () => {
      const { id, sku } = await published();
      const intent = checkoutIntent(sku);
      await orders.reserve(intent, [await asProduct(id)], Date.now() + 1_800_000);
      const payment = { id: String(Date.now() + 7), external_reference: intent.reference, transaction_amount: 15000, currency_id: "ARS", status: "approved", date_last_updated: new Date().toISOString() };
      await orders.reconcile(payment);
      await store.setFulfillment(admin, intent.reference, "enviado", "Correo, seguimiento 123");
      const { rows: [order] } = await pool.query("SELECT status,fulfillment,internal_note FROM orders WHERE reference=$1", [intent.reference]);
      assert.deepEqual(order, { status: "paid", fulfillment: "enviado", internal_note: "Correo, seguimiento 123" });
      assert.equal(await orders.recorded(payment), true);
      await assert.rejects(store.setFulfillment(admin, "MNGT-inexistente", "enviado", ""), (e: AdminError) => e.code === "not_found");
    });

    await t.test("overview: counts real rows, separates manual sales and uses the Argentine day", async () => {
      await pool.query("UPDATE orders SET status='refunded' WHERE status='paid'");
      await pool.query("UPDATE manual_sales SET voided_at=now() WHERE voided_at IS NULL");
      const { id } = await published();
      await store.recordManualSale(admin, id, { amountCents: 900_000, channel: "efectivo", note: "" });
      const today = await store.overview();
      assert.equal(today.web_today_cents, 0);
      assert.equal(today.manual_today_cents, 900_000);
      assert.equal(today.manual_today_count, 1);
      // 02:00 UTC is still the previous day in Argentina.
      const { rows: [{ now_ar }] } = await pool.query("SELECT (now() AT TIME ZONE 'America/Argentina/Cordoba')::date::text AS now_ar");
      await pool.query(`UPDATE manual_sales SET created_at=($1::date + time '02:00') AT TIME ZONE 'UTC' WHERE voided_at IS NULL`, [now_ar]);
      assert.equal((await store.overview()).manual_today_count, 0, "02:00 UTC belongs to yesterday in Argentina");
      await orders.markReconciled();
      assert.ok((await store.overview()).last_reconcile_at);
    });

    await t.test("reconciliation: manual sales never look like overdue or abandoned payments", async () => {
      const { id } = await published();
      await store.recordManualSale(admin, id, { amountCents: 1000, channel: "otro", note: "" });
      await pool.query("UPDATE checkout_intents SET checked_at=now()-interval '1 day' WHERE status='manual_sale'");
      assert.equal((await orders.status()).overdue, (await count(`SELECT count(*)::int AS n FROM checkout_intents WHERE status NOT IN ('approved','cancelled','manual_sale') AND checked_at<now()-interval '15 minutes'`)));
      assert.ok(!(await orders.candidates()).some(c => c.reference.includes("manual")));
      const candidates = await orders.candidates();
      const manual = await pool.query("SELECT reference FROM checkout_intents WHERE status='manual_sale'");
      assert.ok(!candidates.some(c => manual.rows.some(m => m.reference === c.reference)));
    });

    await t.test("migration: refuses to drop recorded manual sales", async () => {
      await assert.rejects(pool.query(sql("migrations/003-admin.down.sql")), /manual sales exist/);
      await pool.query("ROLLBACK").catch(() => undefined);
    });
  } finally {
    await pool.query("ROLLBACK").catch(() => undefined);
    await pool.end();
  }
});
