import Link from "next/link";
import { notFound } from "next/navigation";
import { archiveProduct, duplicateProduct, publishProduct, putBackOnSale, recordSale, saveProduct } from "../../actions";
import { Notice, Shell, money, when } from "../../ui";
import { ProductForm } from "../ProductForm";
import { pieceStatus } from "../status";
import { adminStore, requireAdmin } from "@/lib/admin/server";

const STATES: Record<string, string> = { available: "disponible", reserved: "reservada", sold: "vendida", review: "a revisar" };

export default async function Product({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string; ok?: string }> }) {
  await requireAdmin();
  const id = Number((await params).id);
  if (!Number.isInteger(id)) notFound();
  const store = adminStore();
  const piece = await store.getProduct(id);
  if (!piece) notFound();
  const { error, ok } = await searchParams;
  const status = pieceStatus(piece);
  const canSell = piece.state === "available";
  const history = await store.movements(10, piece.sku);
  const pesos = (cents: number | null) => cents == null ? "" : String(Math.round(cents / 100));

  return <Shell title={piece.name} action={<em className="adm-status" data-tone={status.tone}>{status.label}</em>}>
    <Notice error={error} ok={ok} />
    {canSell && <details className="adm-card" open={!piece.is_draft && piece.active}>
      <summary>La vendí por otro lado</summary>
      <p>Al registrarla deja de poder comprarse en la web, para no venderla dos veces.</p>
      <form action={recordSale.bind(null, id)} className="adm-form">
        <label>Cuánto cobraste, en pesos<input name="amount" inputMode="numeric" defaultValue={pesos(piece.price_cents)} required /></label>
        <label>Por dónde<select name="channel" defaultValue="whatsapp"><option value="whatsapp">WhatsApp</option><option value="transferencia">Transferencia</option><option value="efectivo">Efectivo</option><option value="otro">Otro</option></select></label>
        <label>Nota<input name="note" maxLength={500} /></label>
        <button className="adm-primary">Registrar venta</button>
      </form>
    </details>}
    {(piece.state === "sold" || piece.state === "review") && <details className="adm-card">
      <summary>Volver a ponerla a la venta</summary>
      <form action={putBackOnSale.bind(null, id)} className="adm-form">
        <label>Motivo<input name="reason" required maxLength={300} placeholder="Por ejemplo: se canceló la venta" /></label>
        <button className="adm-secondary">Volver a la venta</button>
      </form>
    </details>}

    <div className="adm-actions">
      {(piece.is_draft || !piece.active) && <form action={publishProduct.bind(null, id)}><button className="adm-primary">Publicar</button></form>}
      {piece.active && !piece.is_draft && <Link className="adm-secondary" href={`/producto/${id}`} target="_blank">Ver en la tienda</Link>}
      <form action={duplicateProduct.bind(null, id)}><button className="adm-secondary">Duplicar</button></form>
      {piece.active && <form action={archiveProduct.bind(null, id)}><button className="adm-secondary">Archivar</button></form>}
    </div>

    <ProductForm action={saveProduct.bind(null, id, piece.version)} categories={await store.categories()} submit="Guardar cambios"
      values={{ name: piece.name, price: pesos(piece.price_cents), description: piece.description, category: piece.category, isNew: piece.is_new, cost: pesos(piece.cost_cents), images: piece.images,
        measurements: piece.measurements.map(item => `${item.label}: ${item.value}`).join("\n") }} />

    <h2 className="adm-h2">Historial</h2>
    <ul className="adm-history">{history.map(move => <li key={move.id}><time>{when(move.at)}</time> {move.from_state ? `${STATES[move.from_state]} → ` : ""}{STATES[move.to_state]}{move.reason ? ` · ${move.reason}` : ""}{move.actor ? ` · ${move.actor}` : ""}</li>)}</ul>
    <p className="adm-foot">Precio actual: {money(piece.price_cents)}</p>
  </Shell>;
}
