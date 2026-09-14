import type { CheckoutIntent, ProviderPayment } from "./checkout-session";
import { CommerceError } from "./one-of-one";
import type { StoreProduct } from "./types";
import { secureServiceUrl } from "./http-security";

function serviceConfig() {
  const base = process.env.MANGATA_ORDER_SERVICE_URL?.trim();
  const token = process.env.MANGATA_ORDER_SERVICE_TOKEN?.trim();
  if (!base || !token) throw new CommerceError("checkout_unavailable", 503);
  const url = secureServiceUrl(base);
  return { base: url.toString().replace(/\/$/, ""), token };
}

async function orderServiceRequest(path: string, body: unknown, idempotencyKey: string) {
  const { base, token } = serviceConfig();
  const response = await fetch(`${base}${path}`, {
    method: "POST", cache: "no-store", redirect: "error",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, "Idempotency-Key": idempotencyKey },
    body: JSON.stringify(body), signal: AbortSignal.timeout(8_000),
  });
  if (response.status === 409) throw new CommerceError("stock_unavailable");
  if (!response.ok) throw new CommerceError("checkout_unavailable", 503);
  return response.json() as Promise<Record<string, unknown>>;
}

export function assertCheckoutConfigured() {
  serviceConfig();
  if (!process.env.MP_ACCESS_TOKEN?.trim() || !process.env.MP_WEBHOOK_SECRET?.trim() || (process.env.COMMERCE_SESSION_SECRET?.length ?? 0) < 32) {
    throw new CommerceError("checkout_unavailable", 503);
  }
}

// The service must atomically persist the intent and reserve one unit per SKU.
// A successful HTTP response alone is not accepted as proof of persistence.
export async function reserveCheckoutIntent(intent: CheckoutIntent, products: StoreProduct[], expiresAt: number) {
  const result = await orderServiceRequest("/intents", {
    reference: intent.reference, currency: intent.currency, amount: intent.amount,
    expiresAt: new Date(expiresAt).toISOString(),
    items: products.map((product) => ({ sku: product.sku, quantity: 1, unitPrice: product.price })),
  }, intent.reference);
  if (result.reference !== intent.reference || result.persisted !== true || result.stockReserved !== true) {
    throw new CommerceError("checkout_unavailable", 503);
  }
}

export async function reconcilePayment(payment: ProviderPayment) {
  const paymentId = String(payment.id ?? "");
  const reference = payment.external_reference;
  if (!/^\d{1,32}$/.test(paymentId) || !reference?.startsWith("MNGT-") || !payment.status) {
    throw new CommerceError("checkout_unavailable", 503);
  }
  const key = `mercadopago:${paymentId}:${payment.status}`;
  const result = await orderServiceRequest("/payments", {
    provider: "mercadopago", paymentId, reference, status: payment.status,
    amount: payment.transaction_amount, currency: payment.currency_id,
  }, key);
  if (result.paymentId !== paymentId || result.reference !== reference || result.persisted !== true ||
    (result.result !== "processed" && result.result !== "duplicate")) {
    throw new CommerceError("checkout_unavailable", 503);
  }
}

export async function isPaymentRecorded(payment: ProviderPayment): Promise<boolean> {
  const { base, token } = serviceConfig();
  const paymentId = String(payment.id ?? "");
  if (!/^\d{1,32}$/.test(paymentId)) return false;
  const response = await fetch(`${base}/payments/${paymentId}`, {
    cache: "no-store", redirect: "error", headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(8_000),
  });
  if (!response.ok) return false;
  const result = await response.json() as Record<string, unknown>;
  return result.paymentId === paymentId && result.reference === payment.external_reference &&
    result.persisted === true && result.status === "approved" && result.currency === payment.currency_id &&
    result.amount === payment.transaction_amount;
}
