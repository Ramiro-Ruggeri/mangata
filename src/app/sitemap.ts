import type { MetadataRoute } from "next";
import { getCatalog } from "@/lib/commerce/catalog";
import { getSiteUrl } from "@/config/site-url";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = getSiteUrl();
  const catalog = await getCatalog();
  const products = catalog.products
    .filter((product) => product.source !== "local-fallback")
    .map((product) => ({
      url: `${siteUrl}/producto/${product.id}`,
      images: [product.image.startsWith("http") ? product.image : `${siteUrl}${product.image}`],
    }));

  // No lastModified until pieces record a real edit date: a generation timestamp would be false.
  return [
    { url: siteUrl },
    { url: `${siteUrl}/cambios` },
    ...products,
  ];
}
