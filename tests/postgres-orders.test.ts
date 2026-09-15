import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { Pool } from "pg";
import { PostgresOrders } from "../src/lib/commerce/postgres-orders";
import type { CheckoutIntent, ProviderPayment } from "../src/lib/commerce/checkout-session";
import type { StoreProduct } from "../src/lib/commerce/types";

test("real PostgreSQL: atomic one-of-one stock and idempotent payment lifecycle", async t => {
  const connectionString = process.env.MANGATA_TEST_DATABASE_URL;
  assert.ok(connectionString, "A dedicated test database is required; never run this suite against production.");
  assert.match(new URL(connectionString).pathname, /^\/mangata_test_[a-z0-9_]+$/);
  const pool = new Pool({ connectionString, max: 8 });
  const db = new PostgresOrders(pool);
  const skuPrefix = randomUUID();
  const products: StoreProduct[] = Array.from({ length: 9 }, (_, i) => ({ id: String(i), sku: `${skuPrefix}-${i}`,
    name: `Test ${i}`, price: 10000 + i * 1000, slug: `test-${i}`, category: "Prendas", description: "Test only",
    image: "/test.webp", images: ["/test.webp"], isNew: false, inventory: { isInStock: true, manageStock: true }, source: "local" }));
  const intent = (items: StoreProduct[]): CheckoutIntent => ({ reference: `MNGT-${randomUUID()}`, amount: items.reduce((sum, p) => sum + p.price, 0),
    currency: "ARS", skus: items.map(p => p.sku), expiresAt: Date.now() + 3600000 });
  const payment = (order: CheckoutIntent, id: string, status = "approved", time = Date.now()): ProviderPayment => ({ id,
    external_reference: order.reference, transaction_amount: order.amount, currency_id: "ARS", status, date_last_updated: new Date(time).toISOString() });
  try {
    await pool.query(readFileSync(new URL("../deploy/commerce-schema.sql", import.meta.url), "utf8"));
    await db.seed(products);
    await t.test("two concurrent buyers: exactly one reserves a SKU", async () => {
      const a = intent([products[0]]), b = intent([products[0]]);
      const results = await Promise.allSettled([db.reserve(a, [products[0]], a.expiresAt), db.reserve(b, [products[0]], b.expiresAt)]);
      assert.equal(results.filter(r => r.status === "fulfilled").length, 1);
      assert.equal(results.filter(r => r.status === "rejected").length, 1);
      assert.equal((await pool.query("SELECT count(*)::int AS n FROM checkout_intents WHERE reference=ANY($1)", [[a.reference, b.reference]])).rows[0].n, 1);
      assert.equal((await db.availability([products[0]]))[0].inventory.isInStock, false);
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
    await t.test("catalog seeding preserves sold/reserved state", async () => {
      await db.seed(products);
      assert.equal((await db.availability([products[2]]))[0].inventory.isInStock, false);
      assert.equal((await db.availability([products[5]]))[0].inventory.isInStock, false);
      assert.equal((await db.availability([products[8]]))[0].inventory.isInStock, true);
    });
  } finally { await pool.end(); }
});
