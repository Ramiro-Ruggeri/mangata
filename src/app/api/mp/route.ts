import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { getCommerceMode, getLocalCatalog } from "@/lib/commerce/catalog";
import { CHECKOUT_COOKIE, CHECKOUT_TTL_SECONDS, signCheckoutIntent } from "@/lib/commerce/checkout-session";
import { assertCheckoutConfigured, reserveCheckoutIntent } from "@/lib/commerce/order-service";
import { assertStoreRequest, CommerceError, publicCommerceError, resolveOneOfOneItems } from "@/lib/commerce/one-of-one";
import { readStoreJson, secureServiceUrl } from "@/lib/commerce/http-security";

export async function POST(request: Request) {
  try {
    assertStoreRequest(request);
    if (getCommerceMode() !== "local") throw new CommerceError("checkout_unavailable", 409);
    const body = await readStoreJson(request);
    const products = resolveOneOfOneItems(body?.items, getLocalCatalog());
    assertCheckoutConfigured();
    const siteUrl = secureServiceUrl(process.env.NEXT_PUBLIC_SITE_URL);
    const intent = {
      reference: `MNGT-${randomUUID()}`,
      amount: products.reduce((total, product) => total + product.price, 0),
      currency: "ARS" as const,
      skus: products.map((product) => product.sku),
      expiresAt: Date.now() + CHECKOUT_TTL_SECONDS * 1000,
    };
    const paymentExpiresAt = Date.now() + 30 * 60 * 1000;
    await reserveCheckoutIntent(intent, products, paymentExpiresAt);
    const response = await fetch("https://api.mercadopago.com/checkout/preferences", {
      method: "POST", cache: "no-store", redirect: "error",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}` },
      body: JSON.stringify({
        items: products.map((product) => ({ id: product.sku, title: product.name, quantity: 1, currency_id: "ARS", unit_price: product.price })),
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
    if (!response.ok) throw new CommerceError("checkout_unavailable", 502);
    const data = await response.json() as { init_point?: string };
    const paymentUrl = data.init_point ? new URL(data.init_point) : null;
    if (!paymentUrl || paymentUrl.protocol !== "https:" || paymentUrl.username || paymentUrl.password || paymentUrl.port ||
      !/(^|\.)mercadopago\.(com\.ar|com|com\.br|cl|com\.mx|com\.co|com\.pe|com\.uy)$/.test(paymentUrl.hostname)) {
      throw new CommerceError("checkout_unavailable", 502);
    }
    const result = NextResponse.json({ init_point: paymentUrl.toString() }, { headers: { "Cache-Control": "no-store" } });
    result.cookies.set(CHECKOUT_COOKIE, signCheckoutIntent(intent, process.env.COMMERCE_SESSION_SECRET!), {
      httpOnly: true, sameSite: "lax", secure: true, path: "/", maxAge: CHECKOUT_TTL_SECONDS,
    });
    return result;
  } catch (error) {
    return NextResponse.json(publicCommerceError(error), { status: error instanceof CommerceError ? error.status : 503, headers: { "Cache-Control": "private, no-store" } });
  }
}
