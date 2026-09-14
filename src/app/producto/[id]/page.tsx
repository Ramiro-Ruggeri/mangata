// src/app/producto/[id]/page.tsx
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";
import PDPClient from "@/components/PDPClient";
import { getProduct } from "@/lib/commerce/catalog";
import { getSiteUrl } from "@/config/site-url";

type Params = { id: string };
type Props = { params: Promise<Params> };
const loadProduct = cache(getProduct);
const siteUrl = getSiteUrl();

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const product = await loadProduct(id);

  if (!product) {
    return {
      title: "Pieza no encontrada",
      description: "La pieza que buscás no existe o fue retirada.",
      robots: { index: false, follow: true },
    };
  }
  const productUrl = `/producto/${product.id}`;
  return {
    title: product.name,
    description: product.description ?? "Pieza única de upcycling por MANGATA.",
    robots: product.source === "local-fallback" ? { index: false, follow: true } : undefined,
    alternates: { canonical: productUrl },
    openGraph: {
      title: `${product.name} · MANGATA`,
      description: product.description,
      type: "website",
      url: productUrl,
      images: [{ url: product.image, alt: product.name }],
    },
    twitter: {
      card: "summary_large_image",
      title: `${product.name} · MANGATA`,
      description: product.description,
      images: [product.image],
    },
  };
}

export default async function Page({ params }: Props) {
  const { id } = await params;
  const product = await loadProduct(id);
  if (!product) notFound();
  const productUrl = new URL(`/producto/${product.id}`, siteUrl).toString();
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Product",
        name: product.name,
        sku: product.sku,
        url: productUrl,
        image: Array.from(new Set([product.image, ...product.images])).map((image) => new URL(image, siteUrl).toString()),
        description: product.description,
        category: product.category,
        brand: { "@type": "Brand", name: "MANGATA" },
        offers: {
          "@type": "Offer",
          url: productUrl,
          priceCurrency: "ARS",
          price: product.price,
          seller: { "@type": "Organization", name: "MANGATA" },
          availability: product.inventory.isInStock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
        },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Inicio", item: siteUrl },
          { "@type": "ListItem", position: 2, name: "Colección", item: new URL("/#coleccion", siteUrl).toString() },
          { "@type": "ListItem", position: 3, name: product.name, item: productUrl },
        ],
      },
    ],
  };
  return <>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
    <PDPClient key={product.id} product={product} />
  </>;
}
