import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { getCommerceMode, getLocalCatalog } from "@/lib/commerce/catalog";
import { CHECKOUT_COOKIE, checkoutIntentMatches, readCheckoutIntent, signCheckoutIntent, type CheckoutIntent } from "@/lib/commerce/checkout-session";
import { assertCheckoutConfigured, reserveCheckoutIntent } from "@/lib/commerce/order-service";
import { assertStoreRequest, CommerceError, publicCommerceError, resolveOneOfOneItems } from "@/lib/commerce/one-of-one";
import { readStoreJson, secureServiceUrl } from "@/lib/commerce/http-security";
import { ordersDatabase, usesPostgresOrders } from "@/lib/commerce/postgres-orders";

function withIntent(response: NextResponse, intent: CheckoutIntent | null) {
  if (intent) response.cookies.set(CHECKOUT_COOKIE, signCheckoutIntent(intent, process.env.COMMERCE_SESSION_SECRET!), {
    httpOnly: true, sameSite: "lax", secure: true, path: "/",
    maxAge: Math.max(1, Math.ceil((intent.expiresAt - Date.now()) / 1000)),
  });
  return response;
}

export async function POST(request: Request) {
  let savedIntent: CheckoutIntent | null = null;
  try {
    assertStoreRequest(request);
    if (getCommerceMode() !== "local") throw new CommerceError("checkout_unavailable", 409);
    const body = await readStoreJson(request);
    const products = resolveOneOfOneItems(body?.items, getLocalCatalog());
    const amount = products.reduce((sum, product) => sum + product.price, 0);
    const skus = products.map((product) => product.sku);
    assertCheckoutConfigured();
    const siteUrl = secureServiceUrl(process.env.NEXT_PUBLIC_SITE_URL);
    if (usesPostgresOrders()) {
      // Shipping is not silently charged later: the buyer must confirm prior coordination.
      if (body.deliveryAcknowledged !== true) throw new CommerceError("invalid_cart", 400);
      const cookie = request.headers.get("cookie")?.split(";").map(part => part.trim()).find(part => part.startsWith(`${CHECKOUT_COOKIE}=`))?.slice(CHECKOUT_COOKIE.length + 1);
      const supplied = typeof body.resumeToken === "string" ? body.resumeToken : undefined;
      const previous = [supplied, cookie]
        .map(value => readCheckoutIntent(value, process.env.COMMERCE_SESSION_SECRET!))
        .find(intent => intent && checkoutIntentMatches(intent, skus, amount));
      // A checkout for a different bag must never trap a returning shopper. Only
      // resume a signed intent when it represents this exact selection.
      if (previous && !(await ordersDatabase().settled(previous.reference))) {
        const resume = await ordersDatabase().resume(previous);
        if (resume) return withIntent(NextResponse.json({ init_point: resume, resume_token: signCheckoutIntent(previous, process.env.COMMERCE_SESSION_SECRET!) },
          { headers: { "Cache-Control": "private, no-store" } }), previous);
      }
    }
    const paymentExpiresAt = Date.now() + 30 * 60 * 1000;
    const intent = {
      reference: `MNGT-${randomUUID()}`,
      amount,
      currency: "ARS" as const,
      skus,
      expiresAt: paymentExpiresAt,
    };
    await reserveCheckoutIntent(intent, products, paymentExpiresAt);
    savedIntent = intent;
    const response = await fetch("https://api.mercadopago.com/checkout/preferences", {
      method: "POST", cache: "no-store", redirect: "error",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}` },
      body: JSON.stringify({
        items: products.map((product) => ({ id: product.sku, title: product.name, quantity: 1, currency_id: "ARS", unit_price: product.price,
          description: "Pieza única. Entrega previamente coordinada con MANGATA; envío no incluido.", picture_url: new URL(product.image, siteUrl).toString() })),
        back_urls: {
          success: new URL("/checkout/success", siteUrl).toString(),
          failure: new URL("/checkout/failure", siteUrl).toString(),
          pending: new URL("/checkout/pending", siteUrl).toString(),
        },
        notification_url: new URL("/api/mp/webhook", siteUrl).toString(),
        auto_return: "approved", statement_descriptor: "MANGATA",
        external_reference: intent.reference,
        expires: true,
        expiration_date_to: new Date(paymentExpiresAt).toISOString(),
      }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) {
      // A definite client rejection cannot have created a usable preference.
      // Keep ambiguous provider/server failures reserved until reconciliation.
      if (response.status >= 400 && response.status < 500 && usesPostgresOrders()) {
        await ordersDatabase().releaseUnstarted(intent.reference);
        savedIntent = null;
      }
      throw new CommerceError("checkout_unavailable", 502);
    }
    const data = await response.json() as { id?: string; init_point?: string; sandbox_init_point?: string };
    const target = process.env.MANGATA_PAYMENT_ENV === "test" ? data.sandbox_init_point ?? data.init_point : data.init_point;
    const paymentUrl = target ? new URL(target) : null;
    if (!paymentUrl || paymentUrl.protocol !== "https:" || paymentUrl.username || paymentUrl.password || paymentUrl.port ||
      !/(^|\.)mercadopago\.(com\.ar|com|com\.br|cl|com\.mx|com\.co|com\.pe|com\.uy)$/.test(paymentUrl.hostname)) {
      throw new CommerceError("checkout_unavailable", 502);
    }
    if (usesPostgresOrders()) await ordersDatabase().savePreference(intent.reference, data.id ?? "", paymentUrl.toString());
    return withIntent(NextResponse.json({ init_point: paymentUrl.toString(), resume_token: signCheckoutIntent(intent, process.env.COMMERCE_SESSION_SECRET!) },
      { headers: { "Cache-Control": "private, no-store" } }), intent);
  } catch (error) {
    return withIntent(NextResponse.json(publicCommerceError(error), { status: error instanceof CommerceError ? error.status : 503, headers: { "Cache-Control": "private, no-store" } }), savedIntent);
  }
}
