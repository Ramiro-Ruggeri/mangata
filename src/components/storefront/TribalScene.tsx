/** MANGATA's own tribals, large and still. Decorative: no garment carries them, so they link nowhere. */
export function TribalScene() {
  return <section className="mg-tribal" aria-labelledby="tribal-title">
    <div className="mg-tribal-copy mg-shell">
      <span className="mg-eyebrow">Reflejo sobre el agua</span>
      <h2 id="tribal-title">Mezclamos.<br /><em>Transformamos.</em></h2>
    </div>
    <div className="mg-tribal-field" data-reveal aria-hidden="true">
      <span className="mg-tribal-piece mg-tribal-reflejo" />
      <span className="mg-tribal-piece mg-tribal-cruz" />
    </div>
  </section>;
}
