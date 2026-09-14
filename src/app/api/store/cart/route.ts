import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { addEverShopCartItem, createEverShopCart, removeEverShopCartItem, withCartLock } from "@/lib/commerce/cart-server";
import { getCommerceMode, getLocalCatalog } from "@/lib/commerce/catalog";
import { fetchEverShopCatalog } from "@/lib/commerce/evershop";
import { assertStoreRequest, CommerceError, publicCommerceError, resolveOneOfOneItems } from "@/lib/commerce/one-of-one";
import { readStoreJson } from "@/lib/commerce/http-security";

const CART_COOKIE = "mangata_evershop_cart";

function errorResponse(error: unknown) {
  return NextResponse.json(publicCommerceError(error), { status: error instanceof CommerceError ? error.status : 502, headers: { "Cache-Control": "private, no-store" } });
}

export async function GET() {
  return NextResponse.json({ connected: getCommerceMode() === "evershop" }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  try {
    assertStoreRequest(request);
    const body = await readStoreJson(request);
    const sku = typeof body?.sku === "string" ? body.sku.trim() : "";
    if (!sku || sku.length > 128) throw new CommerceError("invalid_cart", 400);
    const remote = getCommerceMode() === "evershop";
    const products = remote ? await fetchEverShopCatalog(true) : getLocalCatalog();
    const [product] = resolveOneOfOneItems([{ sku }], products);
    if (!remote) return NextResponse.json({ synced: true, product }, { headers: { "Cache-Control": "private, no-store" } });
    const existingCartId = (await cookies()).get(CART_COOKIE)?.value;
    const result = existingCartId
      ? await withCartLock(existingCartId, () => addEverShopCartItem(existingCartId, sku))
      : await createEverShopCart(sku);
    // An unavailable existing cart is never silently replaced with a new one.
    const response = NextResponse.json({ synced: true, itemId: result.itemId, count: result.count, product }, { headers: { "Cache-Control": "private, no-store" } });
    response.cookies.set(CART_COOKIE, result.cartId, {
      httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 30, path: "/",
    });
    return response;
  } catch (error) { return errorResponse(error); }
}

export async function DELETE(request: Request) {
  try {
    assertStoreRequest(request);
    if (getCommerceMode() !== "evershop") return NextResponse.json({ synced: true }, { headers: { "Cache-Control": "private, no-store" } });
    const cartId = (await cookies()).get(CART_COOKIE)?.value;
    const itemId = new URL(request.url).searchParams.get("itemId") ?? "";
    if (!cartId || !itemId) throw new CommerceError("invalid_cart", 400);
    await withCartLock(cartId, () => removeEverShopCartItem(cartId, itemId));
    return NextResponse.json({ synced: true }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) { return errorResponse(error); }
}
