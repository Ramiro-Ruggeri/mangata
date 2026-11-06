import Link from "next/link";
import { Shell, money } from "../ui";
import { metricsReport } from "@/lib/admin/metrics";
import { requireAdmin } from "@/lib/admin/server";
import { databasePool } from "@/lib/commerce/postgres-orders";

const PERIODS = [7, 30, 90];
const SOURCE: Record<string, string> = { directo: "Directo o sin dato", instagram: "Instagram", tiktok: "TikTok", facebook: "Facebook", buscadores: "Buscadores", ia: "Asistentes de IA", otros: "Otros sitios" };
const STATE: Record<string, string> = { available: "Disponible", reserved: "Pagando", sold: "Vendida", review: "A revisar" };

function Change({ now, before }: { now: number; before: number }) {
  if (!before) return <span>Sin ventas en el período anterior</span>;
  const percent = Math.round((now - before) / before * 100);
  return <span>{percent > 0 ? "+" : ""}{percent}% contra el período anterior</span>;
}

export default async function Metrics({ searchParams }: { searchParams: Promise<{ dias?: string }> }) {
  await requireAdmin();
  const asked = Number((await searchParams).dias);
  const days = PERIODS.includes(asked) ? asked : 30;
  const data = await metricsReport(databasePool(), days);
  const { current, previous, funnel } = data;
  const steps = [["Páginas vistas", funnel.page_view], ["Vieron una pieza", funnel.product_view], ["Sumaron a la bolsa", funnel.add_to_cart], ["Fueron a pagar", funnel.begin_checkout], ["Pagos web confirmados", current.web_count]] as const;
  return <Shell title="Métricas">
    <div className="adm-chips">{PERIODS.map(value => <Link key={value} href={`/admin/metricas?dias=${value}`} aria-current={days === value ? "true" : undefined}>{value} días</Link>)}</div>
    <div className="adm-stats">
      <div><small>Ventas web</small><strong>{money(current.web_cents)}</strong><span>{current.web_count} confirmadas por Mercado Pago</span><span><Change now={current.web_cents} before={previous.web_cents} /></span></div>
      <div><small>Ventas manuales</small><strong>{money(current.manual_cents)}</strong><span>{current.manual_count} cargadas por vos</span><span><Change now={current.manual_cents} before={previous.manual_cents} /></span></div>
    </div>
    {data.margin.sold > 0 && <p className="adm-foot">Margen: {money(data.margin.cents)}, sobre {data.margin.covered} de {data.margin.sold} piezas vendidas con costo cargado. No descuenta comisiones ni envíos.</p>}

    <h2 className="adm-h2">Del interés a la compra</h2>
    <ul className="adm-list adm-static">{steps.map(([label, value]) => <li key={label}><span>{label}</span><b>{value}</b></li>)}</ul>
    <p className="adm-foot">Consultas por WhatsApp: {funnel.whatsapp_click}. Clics en la campaña: {funnel.announcement_click}.</p>

    <h2 className="adm-h2">De dónde llegan</h2>
    {!data.sources.length ? <p className="adm-empty">Todavía no hay visitas contadas.</p> : <ul className="adm-list adm-static">{data.sources.map(item => <li key={item.dimension}><span>{SOURCE[item.dimension] ?? item.dimension}</span><b>{item.total}</b></li>)}</ul>}

    <h2 className="adm-h2">Piezas</h2>
    <div className="adm-table"><table>
      <thead><tr><th>Pieza</th><th>Vistas</th><th>A la bolsa</th><th>Ventas</th></tr></thead>
      <tbody>{data.pieces.map(piece => <tr key={piece.sku}><td>{piece.name}<small>{STATE[piece.state] ?? piece.state}</small></td><td>{piece.viewed}</td><td>{piece.added}</td><td>{piece.sold}</td></tr>)}</tbody>
    </table></div>
    <p className="adm-foot">{data.countingSince ? `Las visitas se cuentan desde el ${data.countingSince.split("-").reverse().join("/")}.` : "Las visitas empiezan a contarse con la primera que llegue."} Son cantidades anónimas: no identifican personas, así que no hay visitantes únicos. Los días son de Argentina.</p>
  </Shell>;
}
