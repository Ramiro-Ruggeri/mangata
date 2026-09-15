import type { StoreProduct } from "./types";

type SavedLine = { id: string; sku: string; name: string; price: number; image: string; qty: number };

/** Refresh a saved local bag from current server data, never from historical prices. */
export function refreshLocalCart<T extends SavedLine>(items: T[], products: StoreProduct[]): T[] {
  const available = new Map(products.filter((product) => product.source === "local" &&
    (product.inventory.isInStock || ["reserved", "review", "unconfirmed"].includes(product.inventory.availability ?? ""))).map((product) => [product.sku, product]));
  const seen = new Set<string>();
  return items.flatMap((item) => {
    const current = available.get(item.sku);
    if (!current || current.id !== item.id || seen.has(item.sku)) return [];
    seen.add(item.sku);
    return [{ ...item, id: current.id, name: current.name, price: current.price, image: current.image, qty: 1 }];
  });
}
