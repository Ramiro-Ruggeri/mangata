import type { StoreProduct } from "./types";
import { secureServiceUrl } from "./http-security";

const CATALOG_QUERY = `
  query MangataCatalog($filters: [FilterInput]) {
    products(filters: $filters) {
      items {
        productId
        uuid
        name
        sku
        description
        metaDescription
        urlKey
        image { url alt }
        gallery { url alt }
        inventory { isInStock manageStock }
        price {
          regular { value text }
          special { value text }
        }
        category { name }
      }
      total
    }
  }
`;

const PRODUCT_QUERY = `
  query MangataProduct($id: ID) {
    product(id: $id) {
      productId
      uuid
      name
      sku
      description
      metaDescription
      urlKey
      image { url alt }
      gallery { url alt }
      inventory { isInStock manageStock }
      price {
        regular { value text }
        special { value text }
      }
      category { name }
    }
  }
`;

type EverShopPrice = { value?: number | string; text?: string };

type EverShopProduct = {
  productId?: number | string;
  uuid?: string;
  name?: string;
  sku?: string;
  description?: unknown;
  metaDescription?: string | null;
  urlKey?: string | null;
  image?: { url?: string | null; alt?: string | null } | null;
  gallery?: Array<{ url?: string | null; alt?: string | null } | null> | null;
  inventory?: { isInStock?: boolean; manageStock?: number | boolean } | null;
  price?: { regular?: EverShopPrice; special?: EverShopPrice } | null;
  category?: { name?: string | null } | null;
};

type GraphQLResponse<T> = {
  data?: T;
  errors?: Array<{ message?: string }>;
};

function baseUrl() {
  return secureServiceUrl(process.env.EVERSHOP_BASE_URL).toString().replace(/\/$/, "");
}

function absoluteAsset(url: string | null | undefined) {
  if (!url) return "/og/og-default.jpg";
  if (/^https?:\/\//i.test(url)) return url;
  return new URL(url.startsWith("/") ? url : `/${url}`, `${baseUrl()}/`).toString();
}

function plainText(value: unknown): string {
  if (typeof value === "string") {
    return value
      .replace(/<[^>]*>/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }
  if (Array.isArray(value)) {
    return value.map(plainText).filter(Boolean).join(" ").trim();
  }
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    const preferred = [record.text, record.html, record.caption, record.value]
      .map(plainText)
      .filter(Boolean)
      .join(" ");
    if (preferred) return preferred;
    return Object.values(record).map(plainText).filter(Boolean).join(" ").trim();
  }
  return "";
}

function priceValue(value: number | string | undefined) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeProduct(product: EverShopProduct): StoreProduct {
  const regular = priceValue(product.price?.regular?.value);
  const special = priceValue(product.price?.special?.value);
  const gallery = (product.gallery ?? [])
    .map((item) => item?.url)
    .filter((item): item is string => Boolean(item))
    .map(absoluteAsset);
  const mainImage = absoluteAsset(product.image?.url ?? gallery[0]);
  const images = Array.from(new Set([mainImage, ...gallery]));
  const id = String(product.productId ?? product.uuid ?? product.sku ?? "");
  const name = product.name?.trim() || "Pieza MANGATA";
  const description =
    plainText(product.description) ||
    product.metaDescription?.trim() ||
    "Pieza de diseño recuperada y transformada por MANGATA.";

  return {
    id,
    uuid: product.uuid,
    sku: product.sku?.trim() || `MNGT-${id}`,
    name,
    slug: product.urlKey?.trim() || id,
    description,
    price: special > 0 && special < regular ? special : regular,
    compareAtPrice: special > 0 && special < regular ? regular : undefined,
    image: mainImage,
    images,
    category: product.category?.name?.trim() || "Piezas",
    isNew: false,
    inventory: {
      isInStock: product.inventory?.isInStock ?? false,
      manageStock: Boolean(product.inventory?.manageStock),
    },
    source: "evershop",
  };
}

export async function requestEverShop<T>(
  query: string,
  variables?: Record<string, unknown>,
  fresh = false,
): Promise<T> {
  const token = process.env.EVERSHOP_STOREFRONT_TOKEN?.trim();
  const response = await fetch(`${baseUrl()}/api/graphql`, {
    method: "POST",
    redirect: "error",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ query, variables }),
    ...(fresh ? { cache: "no-store" as const } : { next: { revalidate: 60, tags: ["mangata-catalog"] } }),
    signal: AbortSignal.timeout(8_000),
  });

  if (!response.ok) {
    throw new Error(`EverShop respondió ${response.status}`);
  }

  const payload = (await response.json()) as GraphQLResponse<T>;
  if (payload.errors?.length) {
    throw new Error(payload.errors.map((error) => error.message).join("; "));
  }
  if (!payload.data) throw new Error("EverShop devolvió una respuesta vacía");
  return payload.data;
}

export async function fetchEverShopCatalog(fresh = false): Promise<StoreProduct[]> {
  const data = await requestEverShop<{
    products?: { items?: Array<EverShopProduct | null> | null } | null;
  }>(CATALOG_QUERY, {
    filters: [{ key: "limit", operation: "eq", value: "100" }],
  }, fresh);

  return (data.products?.items ?? [])
    .filter((item): item is EverShopProduct => Boolean(item))
    .map(normalizeProduct)
    .filter((product) => product.id && product.price > 0);
}

export async function fetchEverShopProduct(id: string): Promise<StoreProduct | null> {
  const data = await requestEverShop<{ product?: EverShopProduct | null }>(
    PRODUCT_QUERY,
    { id },
  );
  return data.product ? normalizeProduct(data.product) : null;
}

export function getEverShopBaseUrl() {
  return baseUrl();
}
