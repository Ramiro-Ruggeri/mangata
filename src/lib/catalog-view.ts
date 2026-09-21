import type { StoreProduct } from "./commerce/types";

export const normalizeSearch = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("es");

export function matchesCategory(product: StoreProduct, category: string) {
  if (category === "Todas") return true;
  // Material explicitly named in the existing product data; foil/canesú are not fabrics.
  if (category === "Denim") return /\b(denim|jean|jeans|vaquero)\b/.test(normalizeSearch(`${product.name} ${product.description}`));
  return product.category === category;
}

export function searchProducts(products: StoreProduct[], query: string) {
  const terms = normalizeSearch(query.trim()).split(/\s+/).filter(Boolean);
  return products.filter(product => {
    const text = normalizeSearch(`${product.name} ${product.category} ${product.sku} ${product.description}`);
    return terms.every(term => text.includes(term));
  });
}
