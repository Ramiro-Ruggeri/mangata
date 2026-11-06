import Link from "next/link";
import type { StoreProduct } from "@/lib/commerce/types";
import tribals from "./tribals.json";
import { resolveScenePieces } from "./tribal-scene";

/** Real appliques, large and still, in the denim they were cut from. Each one leads to its garment. */
export function TribalScene({ products }: { products: StoreProduct[] }) {
  const pieces = resolveScenePieces(tribals, products);
  if (!pieces.length) return null;
  return <section className="mg-tribal" aria-labelledby="tribal-title">
    <div className="mg-tribal-copy mg-shell">
      <span className="mg-eyebrow">Reflejo sobre el agua</span>
      <h2 id="tribal-title">Mezclamos.<br /><em>Transformamos.</em></h2>
    </div>
    <div className="mg-tribal-field" data-reveal>
      {pieces.map(piece => <Link key={piece.id} href={`/producto/${piece.product.id}`} className="mg-tribal-piece" data-tribal={piece.id} aria-label={`Ver ${piece.product.name}`} style={{ "--tribal-mask": `url(/tribals/${piece.id}.svg)`, "--tribal-ratio": piece.ratio } as React.CSSProperties} />)}
    </div>
  </section>;
}
