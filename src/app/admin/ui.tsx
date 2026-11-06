import Link from "next/link";
import { BarChart3, Boxes, Home, LogOut, ReceiptText, Wallet } from "lucide-react";
import { logout } from "./actions";
import { requireAdmin } from "@/lib/admin/server";

export const money = (cents: number) => `$ ${(cents / 100).toLocaleString("es-AR", { maximumFractionDigits: 0 })}`;
export const when = (value: string | Date) => new Date(value).toLocaleString("es-AR", { timeZone: "America/Argentina/Cordoba", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });

const ERRORS: Record<string, string> = {
  login: "El email, la contraseña o el código no son correctos. Si fallaste varias veces, esperá 15 minutos.",
  code: "Ese código no sirve. Probá con el que se ve ahora en tu app.",
  invalid: "Revisá los datos: falta alguno o tiene un formato que no sirve.",
  conflict: "Otra persona o pestaña cambió esta pieza mientras la editabas. Volvé a abrirla para no pisar ese cambio.",
  not_found: "No encontramos esa pieza.",
  not_available: "Esta pieza ya no está disponible.",
  in_checkout: "Alguien está pagando esta pieza ahora. Esperá unos minutos.",
  has_payment: "Esta pieza tiene un pago activo, así que no puede volver a la venta.",
  invalid_state: "Esta pieza ya está disponible.",
  no_photo: "Sumá al menos una foto antes de publicar.",
  reason: "Contá el motivo para volver a ponerla a la venta.",
};
const OK: Record<string, string> = { creado: "Borrador creado. Todavía no se ve en la tienda.", guardado: "Cambios guardados.", publicado: "Ya se ve en la tienda.", archivado: "Archivada: ya no se ve en la tienda.", duplicado: "Copia creada como borrador.", vendida: "Venta registrada. La pieza ya no se puede comprar.", disponible: "La pieza volvió a estar a la venta." };

export function Notice({ error, ok }: { error?: string; ok?: string }) {
  if (error) return <p className="adm-notice adm-notice-error" role="alert">{ERRORS[error] ?? "Algo salió mal. Probá de nuevo."}</p>;
  if (ok && OK[ok]) return <p className="adm-notice" role="status">{OK[ok]}</p>;
  return null;
}

const NAV = [
  { href: "/admin", label: "Inicio", Icon: Home },
  { href: "/admin/productos", label: "Piezas", Icon: Boxes },
  { href: "/admin/pedidos", label: "Pedidos", Icon: ReceiptText },
  { href: "/admin/pagos", label: "Pagos", Icon: Wallet },
  { href: "/admin/metricas", label: "Métricas", Icon: BarChart3 },
];

/** Authorises first: no page body renders for someone without a session. */
export async function Shell({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  await requireAdmin();
  return <>
    <header className="adm-top">
      <Link href="/admin" className="adm-brand"><i className="mangata-mark" aria-hidden="true" /> Panel</Link>
      <form action={logout}><button className="adm-icon" aria-label="Salir"><LogOut size={19} aria-hidden="true" /></button></form>
    </header>
    <main className="adm-main">
      <div className="adm-title"><h1>{title}</h1>{action}</div>
      {children}
    </main>
    <nav className="adm-nav" aria-label="Secciones del panel">
      {NAV.map(({ href, label, Icon }) => <Link key={href} href={href}><Icon size={20} aria-hidden="true" />{label}</Link>)}
    </nav>
  </>;
}
