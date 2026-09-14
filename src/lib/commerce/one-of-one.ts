import type { StoreProduct } from "./types";

export class CommerceError extends Error {
  constructor(public code: "invalid_cart" | "stock_unavailable" | "checkout_unavailable" | "cart_unavailable", public status = 409) {
    super(code);
  }
}

export function resolveOneOfOneItems(input: unknown, products: StoreProduct[]): StoreProduct[] {
  if (!Array.isArray(input) || input.length === 0 || input.length > 50) {
    throw new CommerceError("invalid_cart", 400);
  }
  const selected = new Map<string, StoreProduct>();
  for (const entry of input) {
    if (!entry || typeof entry !== "object") throw new CommerceError("invalid_cart", 400);
    const item = entry as Record<string, unknown>;
    const id = typeof item.id === "string" || typeof item.id === "number" ? String(item.id) : undefined;
    const sku = typeof item.sku === "string" ? item.sku.trim() : undefined;
    if ((!id && !sku) || (item.qty !== undefined && Number(item.qty) !== 1)) {
      throw new CommerceError("invalid_cart", 400);
    }
    const product = products.find((candidate) => sku ? candidate.sku === sku : candidate.id === id);
    if (!product || (id && product.id !== id)) throw new CommerceError("invalid_cart", 400);
    if (product.source === "local-fallback" || !product.inventory.isInStock || !Number.isFinite(product.price) || product.price <= 0) {
      throw new CommerceError("stock_unavailable");
    }
    // Duplicate lines (including mixed id/SKU selectors) always resolve to one unit.
    selected.set(product.sku, product);
  }
  return [...selected.values()];
}

export function publicCommerceError(error: unknown) {
  const code = error instanceof CommerceError ? error.code : "checkout_unavailable";
  const messages = {
    invalid_cart: "Revisá las piezas de tu bolsa antes de seguir.",
    stock_unavailable: "Una pieza ya no está disponible. Revisá tu bolsa o escribinos para ayudarte.",
    checkout_unavailable: "No pudimos abrir el pago. Tu bolsa sigue guardada; intentá de nuevo o escribinos.",
    cart_unavailable: "No pudimos actualizar tu bolsa. Intentá de nuevo en un momento.",
  };
  return { code, error: messages[code] };
}

export function assertStoreRequest(request: Request) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) throw new CommerceError("invalid_cart", 403);
  const fetchSite = request.headers.get("sec-fetch-site");
  if (fetchSite === "cross-site" || fetchSite === "same-site") throw new CommerceError("invalid_cart", 403);
  const contentType = request.headers.get("content-type")?.split(";", 1)[0].trim().toLowerCase();
  if (request.method === "POST" && contentType !== "application/json") {
    throw new CommerceError("invalid_cart", 415);
  }
}
