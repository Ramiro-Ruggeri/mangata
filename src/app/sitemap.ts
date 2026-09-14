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
      lastModified: new Date(catalog.syncedAt),
      changeFrequency: "weekly" as const,
      priority: 0.8,
      images: [product.image.startsWith("http") ? product.image : `${siteUrl}${product.image}`],
    }));

  return [
    {
      url: siteUrl,
      lastModified: new Date(catalog.syncedAt),
      changeFrequency: "weekly",
      priority: 1,
    },
    ...products,
  ];
}
