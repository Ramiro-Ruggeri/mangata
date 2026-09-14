import { products as legacyProducts } from "@/lib/products";
import { fetchEverShopCatalog, fetchEverShopProduct } from "./evershop";
import type { CatalogResult, CommerceMode, StoreProduct } from "./types";

export function getCommerceMode(): CommerceMode {
  return process.env.MANGATA_COMMERCE_MODE === "evershop"
    ? "evershop"
    : "local";
}

function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function optimizedImagePath(value: string) {
  return value.replace(/\.(png|jpe?g)$/i, ".webp");
}

export function getLocalCatalog(): StoreProduct[] {
  return [...legacyProducts]
    .sort((a, b) => (a.order ?? a.id) - (b.order ?? b.id))
    .map((product) => {
      const image = optimizedImagePath(product.img || `/products/${product.id}/cover.png`);
      const images = Array.from(
        new Set([image, ...(product.images ?? []).map(optimizedImagePath)]),
      );
      return {
        id: String(product.id),
        sku: product.sku ?? `MNGT-${String(product.id).padStart(3, "0")}`,
        name: product.name,
        slug: slugify(product.name),
        description:
          product.description ||
          "Pieza única recuperada, intervenida y terminada a mano.",
        price: product.price,
        transferPrice: product.transferDiscount
          ? Math.round(product.price * (1 - product.transferDiscount))
          : undefined,
        image,
        images,
        category: product.category,
        isNew: Boolean(product.isNew),
        inventory: {
          isInStock: product.inStock !== false,
          manageStock: true,
        },
        source: "local" as const,
      };
    });
}

export async function getCatalog(): Promise<CatalogResult> {
  const mode = getCommerceMode();
  const syncedAt = new Date().toISOString();

  if (mode === "local") {
    return { products: getLocalCatalog(), source: "local", mode, syncedAt };
  }

  try {
    const products = await fetchEverShopCatalog();
    if (!products.length) throw new Error("el catálogo remoto está vacío");
    return { products, source: "evershop", mode, syncedAt };
  } catch {
    // Provider errors may embed request data or credentials. Log only a stable operational code.
    console.error("[commerce] catalog_unavailable");
    return {
      products: getLocalCatalog().map((product) => ({
        ...product,
        id: `fallback-${product.id}`,
        inventory: { ...product.inventory, isInStock: false },
        source: "local-fallback" as const,
      })),
      source: "local-fallback",
      mode,
      syncedAt,
      warning: "Estamos revisando la disponibilidad. Escribinos por la pieza que te interesa.",
    };
  }
}

export async function getProduct(id: string): Promise<StoreProduct | null> {
  if (getCommerceMode() === "evershop") {
    if (id.startsWith("fallback-")) {
      const localId = id.slice("fallback-".length);
      const product = getLocalCatalog().find((item) => item.id === localId);
      return product
        ? {
            ...product,
            id,
            inventory: { ...product.inventory, isInStock: false },
            source: "local-fallback",
          }
        : null;
    }
    try {
      return await fetchEverShopProduct(id);
    } catch {
      console.error("[commerce] product_unavailable");
      return null;
    }
  }
  return getLocalCatalog().find((product) => product.id === id) ?? null;
}
