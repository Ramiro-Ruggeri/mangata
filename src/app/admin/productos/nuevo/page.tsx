import { createProduct } from "../../actions";
import { Notice, Shell } from "../../ui";
import { ProductForm } from "../ProductForm";
import { adminStore, requireAdmin } from "@/lib/admin/server";

export default async function NewProduct({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  await requireAdmin();
  const { error } = await searchParams;
  return <Shell title="Nueva pieza">
    <Notice error={error} />
    <p className="adm-foot">Se guarda como borrador. No se ve en la tienda hasta que la publiques.</p>
    <ProductForm action={createProduct} categories={await adminStore().categories()} submit="Guardar borrador"
      values={{ name: "", price: "", description: "", category: "", measurements: "", isNew: true, cost: "", images: [] }} />
  </Shell>;
}
