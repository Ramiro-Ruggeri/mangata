import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getCommerceMode } from "@/lib/commerce/catalog";
import { getEverShopCart, withCartLock } from "@/lib/commerce/cart-server";
import { getEverShopBaseUrl } from "@/lib/commerce/evershop";
import { assertStoreRequest, CommerceError, publicCommerceError } from "@/lib/commerce/one-of-one";
import { readStoreJson } from "@/lib/commerce/http-security";

export async function POST(request: Request) {
  try {
    assertStoreRequest(request);
    if (getCommerceMode() !== "evershop") throw new CommerceError("checkout_unavailable", 409);
    const cartId = (await cookies()).get("mangata_evershop_cart")?.value;
    if (!cartId) throw new CommerceError("invalid_cart", 409);
    const body = await readStoreJson(request);
    if (!Array.isArray(body.skus) || !body.skus.length || body.skus.length > 50 ||
      body.skus.some((sku) => typeof sku !== "string" || !sku.trim() || sku.length > 128)) {
      throw new CommerceError("invalid_cart", 400);
    }
    const skus = new Set(body.skus as string[]);
    if (skus.size !== body.skus.length) throw new CommerceError("invalid_cart", 400);
    const cart = await withCartLock(cartId, () => getEverShopCart(cartId));
    if (cart.items.length !== skus.size || cart.items.some((item) => !skus.has(item.productSku))) {
      throw new CommerceError("cart_unavailable", 409);
    }
    const configured = process.env.EVERSHOP_CHECKOUT_URL?.trim();
    if (!configured) throw new CommerceError("checkout_unavailable", 503);
    const url = new URL(configured);
    if (url.protocol !== "https:" || url.origin !== new URL(getEverShopBaseUrl()).origin || url.username || url.password) {
      throw new CommerceError("checkout_unavailable", 503);
    }
    url.searchParams.set("cart_id", cartId);
    return NextResponse.json({ url: url.toString() }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return NextResponse.json(publicCommerceError(error), { status: error instanceof CommerceError ? error.status : 502, headers: { "Cache-Control": "private, no-store" } });
  }
}
