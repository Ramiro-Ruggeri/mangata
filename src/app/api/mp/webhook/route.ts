import { NextResponse } from "next/server";
import { fetchMercadoPagoPayment, verifyMercadoPagoSignature } from "@/lib/commerce/payment-webhook";
import { reconcilePayment } from "@/lib/commerce/order-service";

export async function POST(request: Request) {
  const secret = process.env.MP_WEBHOOK_SECRET?.trim();
  if (!secret) return NextResponse.json({ received: false }, { status: 503 });
  const url = new URL(request.url);
  const paymentId = url.searchParams.get("data.id") ?? "";
  if (!verifyMercadoPagoSignature({
    signature: request.headers.get("x-signature"), requestId: request.headers.get("x-request-id"), dataId: paymentId, secret,
  })) return NextResponse.json({ received: false }, { status: 401 });

  try {
    // Only the signed resource ID is used; never trust the body status or amount.
    const payment = await fetchMercadoPagoPayment(paymentId);
    if (!payment) return NextResponse.json({ received: false }, { status: 503 });
    if (!payment.external_reference?.startsWith("MNGT-")) return NextResponse.json({ received: true, ignored: true });
    await reconcilePayment(payment);
    // ACK only after the durable adapter confirms processing or a persisted duplicate.
    return NextResponse.json({ received: true });
  } catch {
    return NextResponse.json({ received: false }, { status: 503, headers: { "Retry-After": "60" } });
  }
}
