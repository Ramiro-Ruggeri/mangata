import { createHmac, timingSafeEqual } from "node:crypto";

export const CHECKOUT_COOKIE = "mangata_checkout_intent";
export const CHECKOUT_TTL_SECONDS = 60 * 60 * 48;

export type CheckoutIntent = {
  reference: string;
  amount: number;
  currency: "ARS";
  skus: string[];
  expiresAt: number;
};

export function signCheckoutIntent(intent: CheckoutIntent, secret: string) {
  if (secret.length < 32) throw new Error("Checkout signing key unavailable");
  const payload = Buffer.from(JSON.stringify(intent)).toString("base64url");
  const signature = createHmac("sha256", secret).update(payload).digest("base64url");
  return `${payload}.${signature}`;
}

export function readCheckoutIntent(value: string | undefined, secret: string, now = Date.now()): CheckoutIntent | null {
  if (!value || value.length > 4096 || secret.length < 32) return null;
  const [payload, signature, extra] = value.split(".");
  if (!payload || !signature || extra) return null;
  const expected = createHmac("sha256", secret).update(payload).digest();
  const actual = Buffer.from(signature, "base64url");
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return null;
  try {
    const intent = JSON.parse(Buffer.from(payload, "base64url").toString()) as CheckoutIntent;
    if (!/^MNGT-[a-f0-9-]{36}$/.test(intent.reference) || intent.currency !== "ARS" ||
      !Number.isFinite(intent.amount) || intent.amount <= 0 ||
      !Number.isFinite(intent.expiresAt) || intent.expiresAt <= now ||
      !Array.isArray(intent.skus) || intent.skus.length === 0 || intent.skus.length > 50 ||
      intent.skus.some((sku) => typeof sku !== "string" || !sku || sku.length > 128) ||
      new Set(intent.skus).size !== intent.skus.length) return null;
    return intent;
  } catch { return null; }
}

export type ProviderPayment = {
  id?: string | number;
  status?: string;
  external_reference?: string;
  currency_id?: string;
  transaction_amount?: number;
  date_last_updated?: string;
  collector_id?: number;
  live_mode?: boolean;
};

export function paymentMatchesIntent(payment: ProviderPayment, intent: CheckoutIntent): boolean {
  return payment.status === "approved" &&
    payment.external_reference === intent.reference &&
    payment.currency_id === intent.currency &&
    typeof payment.transaction_amount === "number" &&
    Math.round(payment.transaction_amount * 100) === Math.round(intent.amount * 100);
}
