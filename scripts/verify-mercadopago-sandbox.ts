// Explicit opt-in integration check. TEST credentials and an isolated test DB only.
// Never accepts real cards, production tokens, customer details or production stock.
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { Pool } from "pg";
import { PostgresOrders } from "../src/lib/commerce/postgres-orders";
import type { ProviderPayment } from "../src/lib/commerce/checkout-session";
import type { StoreProduct } from "../src/lib/commerce/types";

async function main() {
  const token = process.env.MP_TEST_ACCESS_TOKEN ?? "";
  const connection = process.env.MANGATA_TEST_DATABASE_URL ?? "";
  assert.match(token, /^TEST-[\w-]{20,500}$/);
  assert.match(new URL(connection).pathname, /^\/mangata_test_[a-z0-9_]+$/);
  const pool = new Pool({ connectionString: connection, max: 2 });
  const db = new PostgresOrders(pool);
  async function api(path: string, body?: unknown) {
    const idempotencyKey = randomUUID();
    for (let attempt = 0; attempt < 3; attempt++) {
      const response = await fetch(`https://api.mercadopago.com${path}`, {
      method: body ? "POST" : "GET", redirect: "error",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", "X-Idempotency-Key": idempotencyKey },
      body: body ? JSON.stringify(body) : undefined, signal: AbortSignal.timeout(15000),
    });
      const result = await response.json();
      if (path === "/v1/payments" && response.status === 400 && result.message === "Card Token not found" && attempt < 2) {
        // Bounded sandbox retry, same body and idempotency key; never retry a charge with a new key.
        await new Promise(resolve => setTimeout(resolve, 3000));
        continue;
      }
      if (!response.ok) throw new Error(`Sandbox ${path}: HTTP ${response.status}; code=${result.error ?? result.cause?.[0]?.code ?? "unknown"}; ${String(result.message ?? "").slice(0,200)}`);
      return result;
    }
    throw new Error("Sandbox request retries exhausted");
  }
  try {
    if (process.env.MP_SANDBOX_RECONCILE_EXISTING === "1") {
      const scenarios = new Set<string>();
      const { rows } = await pool.query("SELECT reference FROM checkout_intents WHERE items->0->>'sku' LIKE 'SANDBOX-%' ORDER BY created_at LIMIT 30");
      for (const row of rows) {
        const found = await api(`/v1/payments/search?external_reference=${encodeURIComponent(row.reference)}`);
        for (const candidate of found.results ?? []) {
          assert.match(String(candidate.id), /^\d+$/);
          const payment = await api(`/v1/payments/${candidate.id}`) as ProviderPayment;
          assert.equal(payment.live_mode, false);
          assert.equal(String(payment.collector_id), "1017442384");
          assert.equal(payment.external_reference, row.reference);
          assert.equal(payment.transaction_amount, 100);
          assert.equal(payment.currency_id, "ARS");
          await db.reconcile(payment);
          assert.equal(await db.reconcile(payment), "duplicate");
          assert.equal(await db.recorded(payment), payment.status === "approved");
          const category = ["pending", "in_process"].includes(payment.status ?? "") ? "pending" : payment.status!;
          scenarios.add(category);
          console.log(JSON.stringify({ scenario: category, providerStatus: payment.status, sandbox: true, persisted: true, duplicateSafe: true, reconciledExisting: true }));
        }
        if (["approved", "rejected", "pending"].every(state => scenarios.has(state))) return;
      }
      throw new Error("Existing sandbox results did not cover all three payment states");
    }
    for (const [holder, expected] of [["APRO", "approved"], ["OTHE", "rejected"], ["CONT", "pending"]]) {
      const reference = `MNGT-${randomUUID()}`;
      const sku = `SANDBOX-${randomUUID()}`;
      const product: StoreProduct = { id: sku, sku, name: "MANGATA sandbox validation", price: 100,
        slug: sku, category: "Prendas", description: "Synthetic test only", image: "/test.webp", images: ["/test.webp"],
        isNew: false, inventory: { isInStock: true, manageStock: true }, source: "local" };
      await db.seed([product]);
      await db.reserve({ reference, amount: 100, currency: "ARS", skus: [sku], expiresAt: Date.now() + 3600000 }, [product], Date.now() + 1800000);
      // Official Mercado Pago test card. Never replace with a real card.
      const card = await api("/v1/card_tokens", {
        card_number: "4509953566233704", security_code: "123", expiration_month: 11, expiration_year: 2030,
        cardholder: { name: holder, identification: { type: "DNI", number: "12345678" } },
      });
      assert.equal(typeof card.id, "string");
      // Token creation is eventually visible to the sandbox payment service.
      await new Promise(resolve => setTimeout(resolve, 1500));
      const created = await api("/v1/payments", {
        transaction_amount: 100, token: card.id, description: "MANGATA sandbox — no real purchase",
        installments: 1, payment_method_id: "visa", external_reference: reference,
        payer: { email: "test_payer@example.com", identification: { type: "DNI", number: "12345678" } },
      });
      assert.equal(created.live_mode, false, "Only sandbox payments are permitted");
      assert.match(String(created.id), /^\d+$/);
      const canonical = await api(`/v1/payments/${created.id}`) as ProviderPayment;
      assert.equal(canonical.live_mode, false);
      assert.ok(expected === "pending" ? ["pending", "in_process"].includes(canonical.status ?? "") : canonical.status === expected);
      assert.equal(String(canonical.collector_id), "1017442384");
      assert.equal(canonical.external_reference, reference);
      assert.equal(canonical.currency_id, "ARS");
      assert.equal(canonical.transaction_amount, 100);
      await db.reconcile(canonical);
      assert.equal(await db.reconcile(canonical), "duplicate");
      assert.equal(await db.recorded(canonical), expected === "approved");
      console.log(JSON.stringify({ scenario: expected, providerStatus: canonical.status, sandbox: true, persisted: true, duplicateSafe: true }));
    }
  } finally { await pool.end(); }
}
main().catch(error => { console.error(error instanceof Error ? error.message : "Sandbox verification failed"); process.exitCode = 1; });
