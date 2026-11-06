import type { StoreProduct } from "@/lib/commerce/types";

export type TribalAsset = { id: string; productId: number; ratio: number; circles: Array<{ x: number; y: number; r: number }> };

const REST = [
  { height: 72, restX: 2, restAngle: -8 },
  { height: 62, restX: 20, restAngle: 12 },
  { height: 66, restX: 38, restAngle: -14 },
  { height: 74, restX: 56, restAngle: 9 },
  { height: 58, restX: 72, restAngle: -6 },
  { height: 64, restX: 84, restAngle: 16 },
];

/** Only shapes whose garment is still in the store: every piece must lead somewhere real. */
export function resolveScenePieces(assets: TribalAsset[], products: StoreProduct[]) {
  const usable = assets.flatMap(asset => {
    const product = products.find(item => item.id === String(asset.productId));
    return product ? [{ ...asset, product }] : [];
  });
  if (!usable.length) return [];
  return REST.map((rest, index) => ({
    ...usable[index % usable.length],
    ...rest,
  }));
}

type SceneWindow = {
  matchMedia(query: string): { matches: boolean };
  navigator: { connection?: { saveData?: boolean }; deviceMemory?: number; hardwareConcurrency?: number };
};

/** Reduced motion, data saving and weak devices keep the equivalent static composition. */
export function shouldAnimateScene(scope: SceneWindow) {
  if (scope.matchMedia("(prefers-reduced-motion: reduce)").matches) return false;
  const { connection, deviceMemory, hardwareConcurrency } = scope.navigator;
  if (connection?.saveData) return false;
  if (deviceMemory !== undefined && deviceMemory < 2) return false;
  return hardwareConcurrency === undefined || hardwareConcurrency >= 2;
}
