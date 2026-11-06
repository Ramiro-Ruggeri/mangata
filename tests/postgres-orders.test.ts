import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { Pool } from "pg";
import { getLocalCatalog, visibleProducts } from "../src/lib/commerce/catalog";
import { PostgresOrders } from "../src/lib/commerce/postgres-orders";
import type { CheckoutIntent, ProviderPayment } from "../src/lib/commerce/checkout-session";
import type { StoreProduct } from "../src/lib/commerce/types";

const sql = (file: string) => readFileSync(new URL(`../deploy/${file}`, import.meta.url), "utf8");

test("real PostgreSQL: atomic one-of-one stock and idempotent payment lifecycle", async t => {
  const connectionString = process.env.MANGATA_TEST_DATABASE_URL;
  assert.ok(connectionString, "A dedicated test database is required; never run this suite against production.");
  assert.match(new URL(connectionString).pathname, /^\/mangata_test_[a-z0-9_]+$/);
  const pool = new Pool({ connectionString, max: 8 });
  const db = new PostgresOrders(pool);
  const skuPrefix = randomUUID();
  const products: StoreProduct[] = Array.from({ length: 13 }, (_, i) => ({ id: String(1001 + i), sku: `${skuPrefix}-${i}`,
    name: `Test ${i}`, price: 10000 + i * 1000, slug: `test-${i}`, category: "Prendas", description: "Test only",
    image: "/test.webp", images: ["/test.webp"], isNew: false, inventory: { isInStock: true, manageStock: true }, source: "local" }));
  const intent = (items: StoreProduct[]): CheckoutIntent => ({ reference: `MNGT-${randomUUID()}`, amount: items.reduce((sum, p) => sum + p.price, 0),
    currency: "ARS", skus: items.map(p => p.sku), expiresAt: Date.now() + 3600000 });
  const payment = (order: CheckoutIntent, id: string, status = "approved", time = Date.now()): ProviderPayment => ({ id,
    external_reference: order.reference, transaction_amount: order.amount, currency_id: "ARS", status, date_last_updated: new Date(time).toISOString() });
  try {
    // The name assertion above guarantees this can only reset a disposable test database.
    await pool.query("DROP SCHEMA public CASCADE; CREATE SCHEMA public;");
    await pool.query(`DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='mangata_app') THEN CREATE ROLE mangata_app; END IF; END $$`);
    await pool.query(sql("commerce-schema.sql"));

    // Same shape as production before Fase B: the 26 pieces in version 1, one of them already sold.
    const real = getLocalCatalog();
    for (const p of real) await pool.query("INSERT INTO inventory(sku,name,price_cents) VALUES($1,$2,$3)", [p.sku, p.name, p.price * 100]);
    const soldReference = `MNGT-${randomUUID()}`;
    await pool.query(`INSERT INTO checkout_intents(reference,amount_cents,currency,items,status,expires_at,approved_payment_id)
      VALUES($1,700000,'ARS','[]','approved',now(),'real-sale')`, [soldReference]);
    await pool.query("UPDATE inventory SET state='sold',held_reference=$1 WHERE sku='MNGT-037'", [soldReference]);

    await pool.query(sql("migrations/002-catalog.up.sql"));
    await t.test("migration: refuses to run twice and stays additive", async () => {
      await assert.rejects(pool.query(sql("migrations/002-catalog.up.sql")));
      await pool.query("ROLLBACK").catch(() => undefined);
      assert.equal((await pool.query("SELECT count(*)::int AS n FROM inventory")).rows[0].n, real.length);
    });
    await t.test("import: the real catalog keeps its sold piece and reads back identically", async () => {
      const first = await db.importCatalog(real);
      assert.deepEqual(first, { products: 26, inventoryCreated: 0, catalogCreated: 26, drift: [] });
      const sold = (await pool.query("SELECT state,held_reference FROM inventory WHERE sku='MNGT-037'")).rows[0];
      assert.deepEqual(sold, { state: "sold", held_reference: soldReference });
      const read = visibleProducts(await db.catalogRows());
      const strip = (p: StoreProduct) => ({ ...p, inventory: undefined, transferPrice: undefined });
      assert.deepEqual(read.map(strip), real.map(strip));
      assert.deepEqual(read.filter(p => !p.inventory.isInStock).map(p => p.sku), ["MNGT-037"]);
      assert.equal(read.find(p => p.sku === "MNGT-037")!.inventory.availability, "sold");
    });
    await t.test("import: re-running never overwrites edits, prices or archives", async () => {
      await pool.query("UPDATE inventory SET price_cents=price_cents+100, active=false WHERE sku='MNGT-001'");
      await pool.query("UPDATE catalog_products SET description='Editado por Emilia' WHERE sku='MNGT-003'");
      const again = await db.importCatalog(real);
      assert.deepEqual(again, { products: 26, inventoryCreated: 0, catalogCreated: 0, drift: ["MNGT-001"] });
      const rows = await db.catalogRows();
      assert.equal(rows.find(r => r.sku === "MNGT-001")!.active, false);
      assert.equal(rows.find(r => r.sku === "MNGT-003")!.description, "Editado por Emilia");
      assert.equal(visibleProducts(rows).some(p => p.sku === "MNGT-001"), false, "archived pieces leave the store");
      await pool.query("UPDATE inventory SET price_cents=price_cents-100, active=true WHERE sku='MNGT-001'");
    });
    await t.test("import: leaves pieces the code does not list untouched", async () => {
      await db.importCatalog(real.slice(1));
      assert.equal((await pool.query("SELECT active FROM inventory WHERE sku=$1", [real[0].sku])).rows[0].active, true);
    });
    await t.test("permissions: the app can edit the catalog but not delete from it", async () => {
      // One privilege per call: a comma list is true when any of them is held.
      const { rows: [can] } = await pool.query(`SELECT has_table_privilege('mangata_app','catalog_products','SELECT') AS read,
        has_table_privilege('mangata_app','catalog_products','INSERT') AS insert,
        has_table_privilege('mangata_app','catalog_products','UPDATE') AS update,
        has_table_privilege('mangata_app','catalog_products','DELETE') AS remove`);
      assert.deepEqual(can, { read: true, insert: true, update: true, remove: false });
    });

    await db.importCatalog(products);
    await t.test("two concurrent buyers: exactly one reserves a SKU", async () => {
      const a = intent([products[0]]), b = intent([products[0]]);
      const results = await Promise.allSettled([db.reserve(a, [products[0]], a.expiresAt), db.reserve(b, [products[0]], b.expiresAt)]);
      assert.equal(results.filter(r => r.status === "fulfilled").length, 1);
      assert.equal(results.filter(r => r.status === "rejected").length, 1);
      assert.equal((await pool.query("SELECT count(*)::int AS n FROM checkout_intents WHERE reference=ANY($1)", [[a.reference, b.reference]])).rows[0].n, 1);
      assert.equal((await db.availability([products[0]]))[0].inventory.isInStock, false);
    });
    await t.test("distinct shoppers can reserve different pieces concurrently", async () => {
      const selected = products.slice(9, 13);
      const intents = selected.map(product => intent([product]));
      const results = await Promise.allSettled(intents.map((checkout, index) => db.reserve(checkout, [selected[index]], checkout.expiresAt)));
      assert.equal(results.filter(result => result.status === "fulfilled").length, selected.length);
    });
    await t.test("failed multi-item reserve rolls back all stock and intent", async () => {
      const a = intent([products[0], products[1]]);
      await assert.rejects(db.reserve(a, [products[0], products[1]], a.expiresAt));
      assert.equal((await db.availability([products[1]]))[0].inventory.isInStock, true);
      assert.equal((await pool.query("SELECT 1 FROM checkout_intents WHERE reference=$1", [a.reference])).rowCount, 0);
    });
    await t.test("price tampering is rejected against durable inventory", async () => {
      const fake = { ...products[1], price: 1 }; const a = intent([fake]);
      await assert.rejects(db.reserve(a, [fake], a.expiresAt));
      assert.equal((await db.availability([products[1]]))[0].inventory.isInStock, true);
    });
    await t.test("retry same intent and preference does not duplicate stock/order", async () => {
      const a = intent([products[2]]);
      await Promise.all([db.reserve(a, [products[2]], a.expiresAt), db.reserve(a, [products[2]], a.expiresAt)]);
      await db.savePreference(a.reference, `${skuPrefix}-pref`, "https://www.mercadopago.com.ar/checkout/v1/redirect?pref_id=test");
      assert.ok(await db.resume(a));
      const p = payment(a, `${Date.now()}1`);
      const results = await Promise.all([db.reconcile(p), db.reconcile(p)]);
      assert.deepEqual(results.sort(), ["duplicate", "processed"]);
      assert.equal(await db.recorded(p), true);
      assert.equal(await db.settled(a.reference), true);
      assert.equal((await pool.query("SELECT 1 FROM orders WHERE reference=$1", [a.reference])).rowCount, 1);
      assert.equal((await db.availability([products[2]]))[0].inventory.availability, "sold");
      await db.reconcile(payment(a, String(p.id), "pending", Date.now() + 1000));
      assert.equal(await db.recorded(p), true);
      await db.reconcile(payment(a, String(p.id), "refunded", Date.now() + 2000));
      assert.equal(await db.recorded(p), false);
      assert.equal((await db.availability([products[2]]))[0].inventory.isInStock, false);
      await db.reconcile(payment(a, String(p.id), "approved", Date.now() + 3000));
      assert.equal(await db.recorded(p), false, "a refunded payment cannot resurrect an order");
    });
    await t.test("late approval is safe: expiration alone never frees a unique garment", async () => {
      const a = intent([products[3]]); await db.reserve(a, [products[3]], a.expiresAt);
      await pool.query("UPDATE checkout_intents SET expires_at=now()-interval '1 minute' WHERE reference=$1", [a.reference]);
      await db.checked(a.reference);
      assert.equal((await db.availability([products[3]]))[0].inventory.isInStock, false);
      const p = payment(a, `${Date.now()}2`); await db.reconcile(p);
      assert.equal(await db.recorded(p), true);
    });
    await t.test("an unstarted or expired checkout releases stock only without a payment", async () => {
      const unstarted = intent([products[6]]); await db.reserve(unstarted, [products[6]], unstarted.expiresAt);
      assert.equal(await db.releaseUnstarted(unstarted.reference), true);
      assert.equal((await db.availability([products[6]]))[0].inventory.isInStock, true);

      const expired = intent([products[6]]); await db.reserve(expired, [products[6]], expired.expiresAt);
      await pool.query("UPDATE checkout_intents SET expires_at=now()-interval '6 minutes' WHERE reference=$1", [expired.reference]);
      assert.equal(await db.releaseExpiredUnpaid(expired.reference), true);
      assert.equal((await db.availability([products[6]]))[0].inventory.isInStock, true);

      const pending = intent([products[7]]); await db.reserve(pending, [products[7]], pending.expiresAt);
      await pool.query("UPDATE checkout_intents SET expires_at=now()-interval '6 minutes' WHERE reference=$1", [pending.reference]);
      await db.reconcile(payment(pending, `${Date.now()}7`, "pending"));
      assert.equal(await db.releaseExpiredUnpaid(pending.reference), false);
      assert.equal((await db.availability([products[7]]))[0].inventory.isInStock, false);
    });
    await t.test("second payment creates a review, never a second fulfillment", async () => {
      const a = intent([products[4]]); await db.reserve(a, [products[4]], a.expiresAt);
      const first = payment(a, `${Date.now()}3`); const second = payment(a, `${Date.now()}4`);
      await db.reconcile(first); await db.reconcile(second);
      assert.equal(await db.recorded(second), false);
      assert.equal((await pool.query("SELECT 1 FROM orders WHERE reference=$1", [a.reference])).rowCount, 1);
      assert.equal((await pool.query("SELECT status FROM checkout_intents WHERE reference=$1", [a.reference])).rows[0].status, "manual_review");
    });
    await t.test("wrong amount/currency cannot mark an order paid", async () => {
      const a = intent([products[5]]); await db.reserve(a, [products[5]], a.expiresAt);
      await assert.rejects(db.reconcile({ ...payment(a, `${Date.now()}5`), transaction_amount: 1 }));
      await assert.rejects(db.reconcile({ ...payment(a, `${Date.now()}6`), currency_id: "USD" }));
    });
    await t.test("catalog import preserves sold/reserved state", async () => {
      await db.importCatalog(products);
      assert.equal((await db.availability([products[2]]))[0].inventory.isInStock, false);
      assert.equal((await db.availability([products[5]]))[0].inventory.isInStock, false);
      assert.equal((await db.availability([products[8]]))[0].inventory.isInStock, true);
    });
    await t.test("a reservation charges the price stored in the database", async () => {
      await pool.query("UPDATE inventory SET price_cents=9900000 WHERE sku=$1", [products[8].sku]);
      const edited = visibleProducts(await db.catalogRows()).find(p => p.sku === products[8].sku)!;
      assert.equal(edited.price, 99000);
      const stale = intent([products[8]]);
      await assert.rejects(db.reserve(stale, [products[8]], stale.expiresAt), "the old price is refused");
      const current = intent([edited]);
      await db.reserve(current, [edited], current.expiresAt);
      assert.equal((await db.availability([edited]))[0].inventory.availability, "reserved");
    });
    await t.test("rollback: down and up keep stock, orders and payments", async () => {
      const snapshot = async () => (await pool.query(`SELECT
        (SELECT json_agg(i ORDER BY sku) FROM inventory i) AS inventory,
        (SELECT json_agg(o ORDER BY reference) FROM orders o) AS orders,
        (SELECT json_agg(p ORDER BY payment_id) FROM payments p) AS payments`)).rows[0];
      const version = async () => (await pool.query("SELECT value FROM commerce_meta WHERE key='schema_version'")).rows[0].value;
      const before = await snapshot();
      assert.equal(await version(), "2");
      await pool.query(sql("migrations/002-catalog.down.sql"));
      assert.equal(await version(), "1");
      assert.equal((await pool.query("SELECT to_regclass('catalog_products') AS t")).rows[0].t, null);
      assert.deepEqual(await snapshot(), before);
      await pool.query(sql("migrations/002-catalog.up.sql"));
      assert.equal(await version(), "2");
      assert.deepEqual(await snapshot(), before);
      assert.deepEqual(await db.catalogRows(), [], "an empty catalog falls back to the code seed");
    });
  } finally { await pool.end(); }
});
