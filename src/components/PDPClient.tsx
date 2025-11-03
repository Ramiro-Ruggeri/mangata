"use client";

/**
 * PDP — MANGATA (dark, PRO)
 * - UI/UX cliente: galería, CTA, qty, carrito (localStorage), JSON-LD
 * - La metadata SEO está en src/app/producto/[id]/page.tsx (server)
 */

import { useMemo, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import type { Product } from "@/lib/products";

/* ============ UTIL: carrito (localStorage) ============ */
const CART_KEY = "mngt_cart_v1";
type CartItem = { id: number; name: string; price: number; qty: number };

function getCart(): CartItem[] {
  try {
    const raw = localStorage.getItem(CART_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}
function setCart(items: CartItem[]) {
  localStorage.setItem(CART_KEY, JSON.stringify(items));
  window.dispatchEvent(new Event("storage"));
}
function addToCart(p: Product, qty = 1) {
  const items = getCart();
  const i = items.findIndex((it) => it.id === p.id);
  if (i >= 0) items[i].qty += qty;
  else items.push({ id: p.id, name: p.name, price: p.price, qty });
  setCart(items);
}

const money = (n: number) =>
  n.toLocaleString("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  });

/* ============ CLIENT PAGE ============ */
export default function PDPClient({ product }: { product: Product }) {
  const router = useRouter();

  // Cantidad
  const [qty, setQty] = useState(1);
  const inc = () => setQty((n) => Math.min(9, n + 1));
  const dec = () => setQty((n) => Math.max(1, n - 1));

  // Galería
  const gallery = useMemo(() => {
    // ✅ Cambio importante: fallback ahora usa PNG (coincide con tu convención)
    const basePng = `/products/${product.id}/cover.png`;
    if (product.images?.length) return product.images;
    if (product.img) return [product.img];
    return [basePng];
  }, [product]);

  const [current, setCurrent] = useState(0);

  // JSON-LD
  const jsonLd = useMemo(() => {
    const imgs = gallery.map((g) =>
      g.startsWith("/") ? `https://mangata.ar${g}` : g
    );
    return {
      "@context": "https://schema.org",
      "@type": "Product",
      name: product.name,
      image: imgs,
      brand: { "@type": "Brand", name: "MANGATA" },
      offers: {
        "@type": "Offer",
        priceCurrency: "ARS",
        price: product.price,
        availability: product.inStock
          ? "https://schema.org/InStock"
          : "https://schema.org/OutOfStock",
        url: `https://mangata.ar/producto/${product.id}`,
      },
    };
  }, [product, gallery]);

  const discounted = product.transferDiscount
    ? Math.round(product.price * (1 - (product.transferDiscount || 0)))
    : null;

  // ✅ WhatsApp: mensaje humano, sin links, con saludo y pedido claro
  const waText = useMemo(() => {
    const saludo = "Hola Mangata, quiero comprar este artículo:";
    const nombre = `• ${product.name}`;
    const cierre =
      "¿Me pasan los pasos para pagar y coordinar el envío? ¡Gracias!";
    return encodeURIComponent([saludo, nombre, "", cierre].join("\n"));
  }, [product.name]);

  return (
    <main className="min-h-[100svh] bg-neutral-950 text-neutral-100">
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="mx-auto max-w-[1400px] px-5 py-8 md:py-10">
        <BackButton onClick={() => router.back()} />

        <div className="mt-6 grid gap-8 md:grid-cols-2">
          {/* Galería */}
          <section className="order-2 md:order-1">
            <div className="relative rounded-2xl overflow-hidden bg-neutral-900">
              <motion.div
                key={current}
                initial={{ opacity: 0.6, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4 }}
                className="relative aspect-[4/5]"
              >
                <Image
                  src={gallery[current]}
                  alt={product.name}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, 50vw"
                  priority
                />
              </motion.div>

              {gallery.length > 1 && (
                <div className="absolute bottom-3 left-0 right-0 flex items-center justify-center gap-2 px-3">
                  <div className="flex gap-2 overflow-auto rounded-full bg-black/30 p-1 backdrop-blur">
                    {gallery.map((src, i) => (
                      <button
                        key={i}
                        onClick={() => setCurrent(i)}
                        className={`relative h-12 w-10 overflow-hidden rounded-lg border transition ${
                          current === i
                            ? "border-white/80"
                            : "border-white/20 hover:border-white/50"
                        }`}
                        aria-label={`Ver imagen ${i + 1}`}
                      >
                        <Image
                          src={src}
                          alt=""
                          fill
                          className="object-cover"
                          sizes="60px"
                        />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* Info */}
          <section className="order-1 md:order-2">
            <h1 className="text-3xl md:text-4xl font-[family-name:var(--font-display)] text-white">
              {product.name}
            </h1>

            <div className="mt-3 text-white/90 text-lg">
              {money(product.price)}
            </div>
            {discounted && (
              <div className="text-white/60 text-sm">
                {money(discounted)} con Transferencia
              </div>
            )}

            <p className="mt-6 text-sm text-white/75 max-w-prose">
              {product.description ||
                "Pieza de diseño y upcycling. Tiradas cortas. Cada prenda es única."}
            </p>

            <div className="mt-6 flex items-center gap-3">
              <span className="text-sm text-white/70">Cantidad</span>
              <div className="inline-flex items-center rounded-full border border-white/20">
                <button
                  onClick={dec}
                  className="px-3 py-1.5 text-white/80 hover:bg-white/10"
                  aria-label="Disminuir cantidad"
                >
                  –
                </button>
                <input
                  value={qty}
                  onChange={(e) => {
                    const n = Number(e.target.value) || 1;
                    setQty(Math.min(9, Math.max(1, n)));
                  }}
                  className="w-10 bg-transparent text-center outline-none text-white/90"
                  inputMode="numeric"
                  aria-label="Cantidad"
                />
                <button
                  onClick={inc}
                  className="px-3 py-1.5 text-white/80 hover:bg-white/10"
                  aria-label="Aumentar cantidad"
                >
                  +
                </button>
              </div>
            </div>

            <div className="mt-5 flex flex-wrap gap-3">
              <button
                onClick={() => addToCart(product, qty)}
                disabled={!product.inStock}
                className={`inline-flex items-center rounded-full border px-5 py-2 text-sm transition ${
                  product.inStock
                    ? "border-white/25 text-white/90 hover:bg-white/10"
                    : "border-white/15 text-white/40 cursor-not-allowed"
                }`}
              >
                Agregar al carrito
              </button>

              <a
                // ✅ Mensaje humano y simple (solo nombre del artículo)
                href={`https://wa.me/5493885195631?text=${waText}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center rounded-full border border-white/20 px-5 py-2 text-sm text-white/80 hover:text-white hover:border-white/40"
                aria-label="Abrir WhatsApp para comprar"
                title="Escribir por WhatsApp"
              >
                WhatsApp
              </a>
            </div>

            <div className="mt-6 text-xs text-white/60 space-x-2">
              <span>{product.inStock ? "En stock" : "Sin stock"}</span>
              <span>·</span>
              <span>{product.category}</span>
              {product.isNew && (
                <>
                  <span>·</span>
                  <span>Nuevo</span>
                </>
              )}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}

/* ============ UI: BackButton (pill) ============ */
function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-2 rounded-full border border-white/20 px-4 py-2 text-sm text-white/85 hover:bg-white/10"
      aria-label="Volver"
      title="Volver"
    >
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="currentColor"
        aria-hidden="true"
      >
        <path d="M15.41 7.41 14 6l-6 6 6 6 1.41-1.41L10.83 12z" />
      </svg>
      Volver
    </button>
  );
}
