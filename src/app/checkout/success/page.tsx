import CheckoutStatus from "@/components/CheckoutStatus";
import { cookies } from "next/headers";
import { CHECKOUT_COOKIE, paymentMatchesIntent, readCheckoutIntent } from "@/lib/commerce/checkout-session";
import { fetchMercadoPagoPayment } from "@/lib/commerce/payment-webhook";
import { isPaymentRecorded } from "@/lib/commerce/order-service";

export const metadata = {
  title: "Estado del pago · Checkout",
};

export default async function SuccessPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const paymentId = Array.isArray(params.payment_id)
    ? params.payment_id[0]
    : params.payment_id;
  const intent = readCheckoutIntent((await cookies()).get(CHECKOUT_COOKIE)?.value, process.env.COMMERCE_SESSION_SECRET ?? "");
  const payment = intent ? await fetchMercadoPagoPayment(paymentId || "").catch(() => null) : null;
  let confirmed = false;
  if (intent && payment && paymentMatchesIntent(payment, intent)) {
    try {
      confirmed = await isPaymentRecorded(payment);
    } catch { /* Retain the bag until the order is durably recorded. */ }
  }

  if (!confirmed || !intent || !payment) {
    return (
      <CheckoutStatus
        state="pending"
        eyebrow="PAGO SIN CONFIRMAR"
        title="Tu pago aún no está confirmado."
        description="Si ya pagaste, no repitas la operación. Revisá el estado en Mercado Pago o escribinos con el comprobante para ayudarte."
      />
    );
  }

  return (
    <CheckoutStatus
      state="success"
      eyebrow="PAGO APROBADO"
      title="Recibimos tu compra."
      description="El pago está aprobado y tu compra quedó registrada. Guardá esta referencia para consultar por tu pedido."
      reference={intent.reference}
      purchase={{ transactionId: String(payment.id), value: intent.amount, skus: intent.skus }}
    />
  );
}
