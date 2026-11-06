import { Shell, when } from "../ui";
import { adminStore, requireAdmin } from "@/lib/admin/server";

const KINDS: Record<string, string> = { alta: "alta", edicion: "edición", publicacion: "publicación", archivo: "archivo", venta_manual: "venta manual", reposicion: "volvió a la venta", inicial: "estado inicial", sistema: "automático", pedido: "pedido" };
const STATES: Record<string, string> = { available: "disponible", reserved: "reservada", sold: "vendida", review: "a revisar" };

export default async function Movements() {
  await requireAdmin();
  const moves = await adminStore().movements(100);
  return <Shell title="Historial de stock">
    {!moves.length && <p className="adm-empty">Sin movimientos.</p>}
    <ul className="adm-history">{moves.map(move => <li key={move.id}><time>{when(move.at)}</time> <b>{move.name}</b>: {move.from_state ? `${STATES[move.from_state]} → ` : ""}{STATES[move.to_state]} · {KINDS[move.kind] ?? move.kind}{move.reason ? ` · ${move.reason}` : ""}{move.actor ? ` · ${move.actor}` : ""}</li>)}</ul>
  </Shell>;
}
