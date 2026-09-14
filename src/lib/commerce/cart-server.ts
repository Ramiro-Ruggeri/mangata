import { getEverShopBaseUrl, requestEverShop } from "./evershop";
import { CommerceError } from "./one-of-one";

type CartItemWire = {
  uuid?: string;
  cart_item_id?: string | number;
  qty?: number;
};

type CartWireResponse = {
  data?: {
    cartId?: string;
    count?: number;
    item?: CartItemWire;
    items?: CartItemWire[];
  };
  error?: { message?: string } | string;
};

function safeIdentifier(value: string) {
  if (!/^[a-zA-Z0-9_-]{1,128}$/.test(value)) {
    throw new Error("Identificador de carrito inválido");
  }
  return value;
}

export async function everShopRest(
  path: string,
  init: RequestInit,
): Promise<CartWireResponse> {
  const response = await fetch(`${getEverShopBaseUrl()}${path}`, {
    ...init,
    cache: "no-store",
    redirect: "error",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(process.env.EVERSHOP_STOREFRONT_TOKEN ? { Authorization: `Bearer ${process.env.EVERSHOP_STOREFRONT_TOKEN}` } : {}),
      ...init.headers,
    },
    signal: AbortSignal.timeout(8_000),
  });
  const payload = (await response.json().catch(() => ({}))) as CartWireResponse;
  if (!response.ok || payload.error) {
    throw new CommerceError("cart_unavailable", 502);
  }
  return payload;
}

export async function createEverShopCart(sku: string) {
  const payload = await everShopRest("/api/carts", {
    method: "POST",
    body: JSON.stringify({ items: [{ sku, qty: 1 }] }),
  });
  const cartId = payload.data?.cartId;
  const item = payload.data?.items?.[0];
  if (!cartId || !item || item.qty !== 1) throw new CommerceError("cart_unavailable", 502);
  return {
    cartId: safeIdentifier(cartId),
    itemId: safeIdentifier(String(item.uuid ?? item.cart_item_id ?? "")),
    count: Number(payload.data?.count ?? 1),
  };
}

export async function addEverShopCartItem(
  cartId: string,
  sku: string,
) {
  const safeCartId = safeIdentifier(cartId);
  const cart = await getEverShopCart(safeCartId);
  const existing = cart.items.find((item) => item.productSku === sku);
  if (existing) return { cartId: safeCartId, itemId: existing.uuid, count: cart.items.length };
  const payload = await everShopRest(`/api/cart/${safeCartId}/items`, {
    method: "POST",
    body: JSON.stringify({ sku, qty: 1 }),
  });
  const item = payload.data?.item;
  if (!item || item.qty !== 1) throw new CommerceError("stock_unavailable");
  return {
    cartId: safeCartId,
    itemId: safeIdentifier(String(item.uuid ?? item.cart_item_id ?? "")),
    count: Number(payload.data?.count ?? 1),
  };
}

export async function removeEverShopCartItem(cartId: string, itemId: string) {
  return everShopRest(
    `/api/cart/${safeIdentifier(cartId)}/items/${safeIdentifier(itemId)}`,
    { method: "DELETE" },
  );
}

type RemoteCart = {
  uuid: string;
  status: number;
  items: Array<{ uuid: string; productSku: string; qty: number; errors?: string[] }>;
};

export function assertOneOfOneCart(cart: RemoteCart | null | undefined): asserts cart is RemoteCart {
  if (!cart || cart.status !== 1 || !Array.isArray(cart.items)) throw new CommerceError("cart_unavailable");
  const skus = new Set<string>();
  for (const item of cart.items) {
    if (!item || !item.uuid || !item.productSku || item.qty !== 1 || item.errors?.length || skus.has(item.productSku)) {
      throw new CommerceError("stock_unavailable");
    }
    skus.add(item.productSku);
  }
}

export async function getEverShopCart(cartId: string): Promise<RemoteCart> {
  const data = await requestEverShop<{ cart?: RemoteCart }>(
    `query MangataCart($id: String!) { cart(id: $id) { uuid status items { uuid productSku qty errors } } }`,
    { id: safeIdentifier(cartId) }, true,
  );
  assertOneOfOneCart(data.cart);
  if (data.cart.uuid !== cartId) throw new CommerceError("cart_unavailable");
  return data.cart;
}

// Serializes requests within this process. Cross-instance uniqueness remains a database invariant in EverShop.
const cartOperations = new Map<string, Promise<unknown>>();
export async function withCartLock<T>(cartId: string, operation: () => Promise<T>): Promise<T> {
  const previous = cartOperations.get(cartId) ?? Promise.resolve();
  const next = previous.catch(() => undefined).then(operation);
  cartOperations.set(cartId, next);
  try { return await next; }
  finally { if (cartOperations.get(cartId) === next) cartOperations.delete(cartId); }
}
