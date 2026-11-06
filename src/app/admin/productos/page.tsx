import Image from "next/image";
import Link from "next/link";
import { adminStore, requireAdmin } from "@/lib/admin/server";
import type { AdminProduct } from "@/lib/admin/store";
import { Shell, money } from "../ui";
import { pieceStatus } from "./status";

const FILTERS = [["todas", "Todas"], ["disponibles", "Disponibles"], ["vendidas", "Vendidas"], ["borradores", "Borradores"], ["archivadas", "Archivadas"]] as const;
const matches = (piece: AdminProduct, filter: string) => filter === "disponibles" ? piece.active && piece.state === "available"
  : filter === "vendidas" ? piece.state === "sold" : filter === "borradores" ? piece.is_draft : filter === "archivadas" ? !piece.active && !piece.is_draft : true;

export default async function Products({ searchParams }: { searchParams: Promise<{ ver?: string; q?: string }> }) {
  await requireAdmin();
  const { ver = "todas", q = "" } = await searchParams;
  const term = q.trim().toLowerCase();
  const pieces = (await adminStore().listProducts()).filter(piece => matches(piece, ver) && (!term || piece.name.toLowerCase().includes(term)));
  return <Shell title="Piezas" action={<Link className="adm-primary adm-small" href="/admin/productos/nuevo">Nueva</Link>}>
    <form className="adm-search"><input type="hidden" name="ver" value={ver} /><input name="q" defaultValue={q} placeholder="Buscar por nombre" aria-label="Buscar por nombre" /></form>
    <div className="adm-chips">{FILTERS.map(([key, label]) => <Link key={key} href={`/admin/productos?ver=${key}`} aria-current={ver === key ? "true" : undefined}>{label}</Link>)}</div>
    {!pieces.length && <p className="adm-empty">No hay piezas para mostrar acá.</p>}
    <ul className="adm-pieces">{pieces.map(piece => {
      const status = pieceStatus(piece);
      return <li key={piece.id}><Link href={`/admin/productos/${piece.id}`}>
        <span className="adm-thumb">{piece.images[0] && <Image src={piece.images[0]} alt="" fill sizes="64px" />}</span>
        <span><strong>{piece.name}</strong><small>{money(piece.price_cents)}</small></span>
        <em data-tone={status.tone}>{status.label}</em>
      </Link></li>;
    })}</ul>
  </Shell>;
}
