import Storefront from "@/components/storefront/Storefront";
import { getCatalog } from "@/lib/commerce/catalog";

export default async function HomePage() {
  const catalog = await getCatalog();
  return (
    <Storefront
      initialProducts={catalog.products}
      mode={catalog.mode}
      source={catalog.source}
    />
  );
}
