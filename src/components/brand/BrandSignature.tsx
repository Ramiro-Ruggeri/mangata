/** MANGATA's own symbol, traced to a vector. Its letters are cut out, so it has no edge on any background. */
export function BrandSignature({ symbolOnly = false }: { symbolOnly?: boolean }) {
  return <span className={`brand-signature ${symbolOnly ? "brand-signature-symbol" : ""}`}>
    <i className="mangata-mark" role={symbolOnly ? "img" : undefined} aria-label={symbolOnly ? "MANGATA" : undefined} aria-hidden={symbolOnly ? undefined : true} />
    {!symbolOnly && <span>MANGATA</span>}
  </span>;
}
