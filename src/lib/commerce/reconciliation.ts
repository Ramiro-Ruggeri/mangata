import { ordersDatabase } from "./postgres-orders";
import { fetchMercadoPagoPayment } from "./payment-webhook";

// Recovery when provider webhooks are delayed or missed. Search is not proof of
// payment: fetch each canonical resource and validate its merchant/environment.
export async function reconcileOutstandingPayments() {
  const token = process.env.MP_ACCESS_TOKEN;
  if (!token) throw new Error("provider_unavailable");
  const db = ordersDatabase();
  let checked = 0;
  for (const intent of await db.candidates()) {
    let offset = 0;
    for (;;) {
      const query = new URLSearchParams({ external_reference: intent.reference, limit: "50", offset: String(offset) });
      const response = await fetch(`https://api.mercadopago.com/v1/payments/search?${query}`, {
        headers: { Authorization: `Bearer ${token}` }, cache: "no-store", redirect: "error", signal: AbortSignal.timeout(8000),
      });
      if (!response.ok) throw new Error("provider_unavailable");
      const page = await response.json() as { results?: Array<{ id?: number | string }>; paging?: { total?: number } };
      if (!Array.isArray(page.results) || !Number.isSafeInteger(page.paging?.total) || page.paging!.total! > 200) throw new Error("provider_response_invalid");
      for (const result of page.results) {
        const payment = await fetchMercadoPagoPayment(String(result.id));
        if (!payment || payment.external_reference !== intent.reference) throw new Error("payment_validation_failed");
        await db.reconcile(payment);
      }
      offset += page.results.length;
      if (offset >= page.paging!.total!) break;
      if (!page.results.length) throw new Error("provider_pagination_failed");
    }
    // Never free a unique garment just because its checkout timer expired.
    await db.checked(intent.reference);
    checked++;
  }
  return { checked, ...await db.status() };
}
