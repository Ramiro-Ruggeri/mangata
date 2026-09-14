export default function ProductLoading() {
  return <main className="store-loading" aria-busy="true"><span className="store-loading-label" role="status">Cargando la pieza…</span><div className="store-loading-layout" aria-hidden="true"><div className="store-loading-photo" /><div className="store-loading-copy"><div /><div /><div /><div /></div></div></main>;
}
