import Link from "next/link";
import { adminStore, requireAdmin } from "@/lib/admin/server";
import { Shell, money, when } from "./ui";

export default async function AdminHome() {
  await requireAdmin();
  const data = await adminStore().overview();
  return <Shell title="Hoy">
    <div className="adm-stats">
      <div><small>Ventas web</small><strong>{money(data.web_today_cents)}</strong><span>{data.web_today_count} confirmadas por Mercado Pago</span></div>
      <div><small>Ventas manuales</small><strong>{money(data.manual_today_cents)}</strong><span>{data.manual_today_count} cargadas por vos</span></div>
    </div>
    <ul className="adm-list">
      <li><Link href="/admin/pedidos"><span>Pedidos por preparar</span><b>{data.to_prepare}</b></Link></li>
      <li><Link href="/admin/productos"><span>Piezas disponibles</span><b>{data.available}</b></Link></li>
      <li><Link href="/admin/productos"><span>Alguien pagando ahora</span><b>{data.in_checkout}</b></Link></li>
      <li><Link href="/admin/productos"><span>Borradores</span><b>{data.drafts}</b></Link></li>
      <li><Link href="/admin/pagos" className={data.problems ? "adm-alert" : ""}><span>Pagos para revisar</span><b>{data.problems}</b></Link></li>
    </ul>
    {data.last_reconcile_at && <p className="adm-foot">Pagos controlados con Mercado Pago por última vez: {when(data.last_reconcile_at)}.</p>}
    <p className="adm-foot"><Link href="/admin/movimientos">Ver historial de stock</Link></p>
  </Shell>;
}
