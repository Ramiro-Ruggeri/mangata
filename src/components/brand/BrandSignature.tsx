import Image from "next/image";

/** Original raster symbol, unchanged. The adjacent name is UI typography, not a reconstructed logo. */
export function BrandSignature({ symbolOnly = false }: { symbolOnly?: boolean }) {
  return <span className={`brand-signature ${symbolOnly ? "brand-signature-symbol" : ""}`}>
    <Image src="/brand/logoAnimacionMANGATA.png" width={40} height={40} sizes="40px" alt={symbolOnly ? "MANGATA" : ""} />
    {!symbolOnly && <span>MANGATA</span>}
  </span>;
}
