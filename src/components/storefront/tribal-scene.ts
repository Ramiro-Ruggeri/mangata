import type { StoreProduct } from "@/lib/commerce/types";

export type TribalAsset = { id: string; productId: number; ratio: number };

/** Only shapes whose garment is still in the store: every piece must lead somewhere real. */
export function resolveScenePieces(assets: TribalAsset[], products: StoreProduct[]) {
  return assets.flatMap(asset => {
    const product = products.find(item => item.id === String(asset.productId));
    return product ? [{ ...asset, product }] : [];
  });
}
