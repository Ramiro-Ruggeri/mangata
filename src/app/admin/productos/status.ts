import type { AdminProduct } from "@/lib/admin/store";

export function pieceStatus(piece: Pick<AdminProduct, "is_draft" | "active" | "state" | "manual_sale">) {
  if (piece.is_draft) return { label: "Borrador", tone: "muted" };
  if (!piece.active) return { label: "Archivada", tone: "muted" };
  if (piece.state === "sold") return { label: piece.manual_sale ? "Vendida (manual)" : "Vendida", tone: "sold" };
  if (piece.state === "reserved") return { label: "Alguien está pagando", tone: "warn" };
  if (piece.state === "review") return { label: "A revisar", tone: "warn" };
  return { label: "Disponible", tone: "ok" };
}
