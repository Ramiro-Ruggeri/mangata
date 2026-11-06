import { updateOrder } from "../actions";
import { Notice, Shell, money, when } from "../ui";
import { adminStore, requireAdmin } from "@/lib/admin/server";
import { FULFILLMENT } from "@/lib/admin/store";

const ORIGIN: Record<string, string> = { web: "Web", manual: "Manual" };
const STEP: Record<string, string> = { pendiente: "Pendiente", preparando: "Preparando", enviado: "Enviado", entregado: "Entregado" };

export default async function Orders({ searchParams }: { searchParams: Promise<{ error?: string; ok?: string }> }) {
  await requireAdmin();
  const { error, ok } = await searchParams;
  const orders = await adminStore().listOrders();
  return <Shell title="Pedidos">
    <Notice error={error} ok={ok} />
    {!orders.length && <p className="adm-empty">Todavía no hay pedidos.</p>}
    <ul className="adm-orders">{orders.map(order => {
      const items = order.items as Array<{ name: string }>;
      const voided = order.status === "anulada";
      return <li key={order.reference} className="adm-card">
        <p className="adm-order-head"><em data-tone={order.origin === "web" ? "ok" : "muted"}>{voided ? "Anulada" : ORIGIN[order.origin]}</em><time>{when(order.created_at)}</time></p>
        <strong>{items.map(item => item.name).join(", ")}</strong>
        <p>{money(order.amount_cents)}{order.origin === "manual" ? ` · ${order.payment_status}` : ""}</p>
        {!voided && <form action={updateOrder.bind(null, order.reference)} className="adm-form">
          <label>Estado<select name="fulfillment" defaultValue={order.fulfillment}>{FULFILLMENT.map(step => <option key={step} value={step}>{STEP[step]}</option>)}</select></label>
          <label>Nota interna<input name="note" defaultValue={order.note} maxLength={500} /></label>
          <button className="adm-secondary">Guardar</button>
        </form>}
      </li>;
    })}</ul>
  </Shell>;
}
