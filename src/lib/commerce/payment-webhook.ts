import { createHmac, timingSafeEqual } from "node:crypto";
import type { ProviderPayment } from "./checkout-session";

export function verifyMercadoPagoSignature({ signature, requestId, dataId, secret, now = Date.now() }: {
  signature: string | null; requestId: string | null; dataId: string; secret: string; now?: number;
}) {
  if (!signature || !requestId || !secret || !/^\d{1,32}$/.test(dataId) || !/^[\w-]{1,128}$/.test(requestId)) return false;
  const parts = Object.fromEntries(signature.split(",").map((part) => part.trim().split("=")));
  if (!/^\d{10,13}$/.test(parts.ts ?? "") || !/^[a-f0-9]{64}$/i.test(parts.v1 ?? "")) return false;
  const timestamp = Number(parts.ts) * (parts.ts.length <= 10 ? 1000 : 1);
  if (Math.abs(now - timestamp) > 5 * 60 * 1000) return false;
  const manifest = `id:${dataId};request-id:${requestId};ts:${parts.ts};`;
  const expected = createHmac("sha256", secret).update(manifest).digest();
  const actual = Buffer.from(parts.v1, "hex");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export async function fetchMercadoPagoPayment(paymentId: string): Promise<ProviderPayment | null> {
  const token = process.env.MP_ACCESS_TOKEN?.trim();
  if (!token || !/^\d{1,32}$/.test(paymentId)) return null;
  const response = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
    redirect: "error",
    signal: AbortSignal.timeout(8_000),
  });
  if (!response.ok) return null;
  const payment = await response.json() as ProviderPayment;
  return String(payment.id) === paymentId ? payment : null;
}
