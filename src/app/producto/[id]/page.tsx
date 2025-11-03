// src/app/producto/[id]/page.tsx
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import PDPClient from "@/components/PDPClient";
import { products } from "@/lib/products";

type Params = { id: string };
type Props = { params: Promise<Params> };

// ✅ Metadata por producto (server)
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params; // ← importante
  const product = products.find((p) => p.id === Number(id));

  if (!product) {
    return {
      title: "Producto no encontrado — MANGATA",
      description: "La pieza que buscás no existe o fue retirada.",
    };
  }
  return {
    title: `${product.name} — MANGATA`,
    description: product.description ?? "Pieza única de upcycling por MANGATA.",
  };
}

// ✅ Página (server) que renderiza el cliente
export default async function Page({ params }: Props) {
  const { id } = await params; // ← importante
  const product = products.find((p) => p.id === Number(id));
  if (!product) notFound();
  return <PDPClient product={product} />;
}
