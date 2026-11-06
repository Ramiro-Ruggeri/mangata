import { Shell, money, when } from "../ui";
import { adminStore, requireAdmin } from "@/lib/admin/server";

const STATUS: Record<string, string> = { approved: "Aprobado", pending: "Pendiente", in_process: "En revisión", authorized: "Autorizado", in_mediation: "En mediación", rejected: "Rechazado", cancelled: "Cancelado", refunded: "Devuelto", charged_back: "Contracargo" };
const names = (items: unknown) => (items as Array<{ name: string }>).map(item => item.name).join(", ");

/** Read only. Refunds stay in Mercado Pago until they are tested in sandbox. */
export default async function Payments() {
  await requireAdmin();
  const store = adminStore();
  const [payments, problems] = await Promise.all([store.listPayments(), store.problems()]);
  return <Shell title="Pagos">
    <p className="adm-foot">Lo que informa Mercado Pago. Acá no se mueve plata: los reembolsos se hacen desde Mercado Pago.</p>
    {problems.length > 0 && <><h2 className="adm-h2">Para revisar</h2>
      <ul className="adm-orders">{problems.map(item => <li key={item.reference} className="adm-card"><strong>{names(item.items)}</strong><p>{money(item.amount_cents)} · {item.review_reason ?? item.status} · {when(item.created_at)}</p></li>)}</ul></>}
    <h2 className="adm-h2">Todos</h2>
    {!payments.length && <p className="adm-empty">Todavía no hay pagos.</p>}
    <ul className="adm-orders">{payments.map(payment => <li key={payment.payment_id} className="adm-card">
      <p className="adm-order-head"><em data-tone={payment.status === "approved" ? "ok" : "warn"}>{STATUS[payment.status] ?? payment.status}</em><time>{when(payment.provider_updated_at)}</time></p>
      <strong>{names(payment.items)}</strong>
      <p>{money(payment.amount_cents)}</p>
    </li>)}</ul>
  </Shell>;
}
