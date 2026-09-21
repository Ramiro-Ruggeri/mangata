export type CommerceMode = "evershop" | "local";

export type CatalogSource = "evershop" | "local" | "local-fallback";

export type ProductInventory = {
  isInStock: boolean;
  manageStock: boolean;
  availability?: "available" | "reserved" | "sold" | "review" | "unconfirmed";
};

export type StoreProduct = {
  id: string;
  uuid?: string;
  sku: string;
  name: string;
  slug: string;
  description: string;
  measurements?: Array<{ label: string; value: string }>;
  price: number;
  compareAtPrice?: number;
  transferPrice?: number;
  image: string;
  images: string[];
  category: string;
  isNew: boolean;
  inventory: ProductInventory;
  source: CatalogSource;
};

export type CatalogResult = {
  products: StoreProduct[];
  source: CatalogSource;
  mode: CommerceMode;
  syncedAt: string;
  warning?: string;
};

export type EverShopCartLine = {
  itemId: string;
  cartId: string;
  count: number;
};
