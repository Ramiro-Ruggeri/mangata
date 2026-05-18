"use client";

/**
 * MANGATA — Home DARK
 * - Usa data centralizada desde src/lib/products.ts
 * - Fallback de portada: p.img ?? /products/<id>/cover.jpg
 * - Tema oscuro, hero full-bleed, tarjetas con hover 3D + glow
 * - Header con carrito que abre <CartDrawer />
 * - Mejoras UX/UI: filtros scrollables, paginación “Cargar más”, reduce-motion,
 *   grilla 1 col (<360px), 2 col (mobile), 4 col (desktop) y padding para FAB.
 */

import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useCallback, useRef } from "react";

// DATA centralizada
import { products as allProducts, type Product } from "@/lib/products";

// Drawer (src/components/CartDrawer.tsx)
import CartDrawer from "@/components/CartDrawer";

/* ===================== CONFIG MARCA ===================== */
const BRAND = "MANGATA";
const PAGE_TITLE = "MANGATA — Upcycling Streetwear";
const LOGO_SRC = "/brand/logoAnimacionMANGATA.png";
const LOGO_FX_S = 3.2;

const SOCIALS = {
  instagram: "https://instagram.com/mangata.upcy",
  email: "Mangataclothing777@gmail.com",
  whatsapp: "5492920559780", // sin '+'
  location: "Córdoba, Argentina",
};
const BASE_WA = `https://wa.me/${SOCIALS.whatsapp}?text=Hola%20Mangata%2C%20vi%20la%20web%20y%20me%20interesa%20hacer%20una%20consulta.%20Quiero%20recibir%20info%20sobre%20disponibilidad%2C%20talles%2C%20medios%20de%20pago%20y%20env%C3%ADo.`;

// Si no hay foto de hero: degradé oscuro
const HERO_IMG: string | null = null;

/* ===================== UTIL: dinero ===================== */
const money = (n: number) =>
  n.toLocaleString("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  });

/* ===================== CART (localStorage) ===================== */
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
export function addToCart(p: Product, qty = 1) {
  const items = getCart();
  const i = items.findIndex((it) => it.id === p.id);
  if (i >= 0) items[i].qty += qty;
  else items.push({ id: p.id, name: p.name, price: p.price, qty });
  setCart(items);
}
function getCartCount() {
  return getCart().reduce((acc, it) => acc + it.qty, 0);
}

/* ===================== PAGE ===================== */
export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    document.title = PAGE_TITLE;
  }, []);

  // Respeta "reduce motion" para el splash
  const [fxDuration, setFxDuration] = useState(LOGO_FX_S);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setFxDuration(0);
    }
  }, []);

  // Overlay unificado
  const [showSplash, setShowSplash] = useState(true);
  const [fxPlaying, setFxPlaying] = useState(false);
  const [pendingId, setPendingId] = useState<number | null>(null);

  useEffect(() => {
    if (!showSplash) return;
    const id = setTimeout(() => setShowSplash(false), fxDuration * 1000);
    return () => clearTimeout(id);
  }, [showSplash, fxDuration]);

  // Filtros
  type Tab = "Todos" | "Prendas" | "Accesorios" | "Nuevos";
  const [tab, setTab] = useState<Tab>("Todos");

  const filtered = useMemo(() => {
    const list = allProducts; // si querés ordenar: [...allProducts].sort((a,b)=> (a.order||0)-(b.order||0))
    if (tab === "Todos") return list;
    if (tab === "Nuevos") return list.filter((p) => p.isNew);
    return list.filter((p) => p.category === tab);
  }, [tab]);

  // Paginación “Cargar más”
  const PAGE = 12;
  const [visible, setVisible] = useState(PAGE);
  useEffect(() => {
    // cada vez que cambia el filtro reiniciamos
    setVisible(PAGE);
  }, [tab]);
  const visibleProducts = filtered.slice(0, visible);

  // Click en producto → overlay + push
  const handleProductClick = useCallback((p: Product) => {
    if (!p.inStock) return;
    setPendingId(p.id);
    setFxPlaying(true);
  }, []);
  const onFxEnd = useCallback(() => {
    setFxPlaying(false);
    if (pendingId) router.push(`/producto/${pendingId}`);
  }, [pendingId, router]);

  // Cart badge + Drawer
  const [cartCount, setCartCount] = useState<number>(0);
  const [openCart, setOpenCart] = useState(false);
  useEffect(() => {
    const refresh = () => setCartCount(getCartCount());
    refresh();
    window.addEventListener("storage", refresh);
    return () => window.removeEventListener("storage", refresh);
  }, []);

  return (
    <main className="min-h-[100svh] bg-neutral-950 text-neutral-100 pb-24 md:pb-0">
      {/* ========= OVERLAY (SPLASH) ========= */}
      <AnimatePresence>
        {showSplash && fxDuration > 0 && (
          <FullScreenLogoFX
            logoSrc={LOGO_SRC}
            size={170}
            duration={fxDuration}
            onEnd={() => setShowSplash(false)}
            showEnterButton
          />
        )}
      </AnimatePresence>

      {/* ========= BARRA PROMO ========= */}
      <div className="w-full bg-black text-white text-xs tracking-wide">
        <div className="mx-auto max-w-[1400px] px-5 py-2 text-center">
          3 y 6 CUOTAS SIN INTERÉS · ENVÍO GRATIS DESDE $150.000
        </div>
      </div>

      {/* ========= HEADER ========= */}
      <Header cartCount={cartCount} onCartClick={() => setOpenCart(true)} />

      {/* ========= HERO FULL-BLEED ========= */}
      <section className="relative">
        <div className="relative w-full aspect-[16/7] md:aspect-[21/7] overflow-hidden">
          {HERO_IMG ? (
            <Image
              src={HERO_IMG}
              alt="Hero"
              fill
              className="object-cover"
              sizes="100vw"
              priority
            />
          ) : (
            <>
              <div className="absolute inset-0 bg-gradient-to-b from-neutral-900 via-black to-neutral-950" />
              <div
                className="absolute inset-0 opacity-[0.15] pointer-events-none mix-blend-overlay"
                style={{
                  backgroundImage:
                    "radial-gradient(circle at 25% 25%, rgba(255,255,255,0.15) 0%, transparent 40%), radial-gradient(circle at 75% 75%, rgba(255,255,255,0.08) 0%, transparent 35%)",
                }}
              />
            </>
          )}

          <div className="absolute inset-0 flex items-center justify-center">
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: [0.16, 0.84, 0.44, 1] }}
              className="text-center px-4"
            >
              <h1 className="font-[family-name:var(--font-display)] text-white tracking-[0.28em] text-5xl md:text-8xl font-semibold">
                MANGATA
              </h1>
              <div className="mx-auto mt-4 h-px w-40 md:w-60 bg-gradient-to-r from-transparent via-white/70 to-transparent" />
              <p className="mt-4 text-white/80 text-sm md:text-base max-w-2xl mx-auto">
                Upcycling de alto diseño. Piezas únicas, tiradas cortas.
                Rebeldía, técnica y sostenibilidad.
              </p>
              <div className="mt-7 flex items-center justify-center gap-3">
                <a
                  href="#catalogo"
                  className="inline-flex items-center rounded-full border border-white/30 px-5 py-2 text-xs md:text-sm text-white/90 hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/30 transition"
                >
                  Comprar ahora
                </a>
                <a
                  href={SOCIALS.instagram}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center rounded-full border border-white/20 px-5 py-2 text-xs md:text-sm text-white/70 hover:text-white hover:border-white/40 focus:outline-none focus:ring-2 focus:ring-white/20 transition"
                >
                  Instagram
                </a>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ========= FILTROS ========= */}
      <section className="mx-auto max-w-[1400px] px-5">
        <div className="flex items-center justify-between gap-3 py-6">
          <h2 className="text-lg font-medium font-[family-name:var(--font-display)] text-white">
            Colección
          </h2>

          {/* Contenedor scrollable en mobile */}
          <div className="inline-flex gap-1 rounded-full bg-neutral-900/70 p-1 border border-white/10 overflow-x-auto snap-x">
            {(["Todos", "Prendas", "Accesorios", "Nuevos"] as const).map(
              (t) => (
                <FilterPill
                  key={t}
                  active={tab === t}
                  onClick={() => setTab(t)}
                  label={t}
                />
              )
            )}
          </div>
        </div>
      </section>

      {/* ========= GRID PRODUCTOS ========= */}
      <section id="catalogo" className="mx-auto max-w-[1400px] px-5 pb-20">
        <div className="grid grid-cols-1 min-[360px]:grid-cols-2 md:grid-cols-4 gap-5 md:gap-6">
          {visibleProducts.map((p) => {
            const discounted = p.transferDiscount
              ? Math.round(p.price * (1 - (p.transferDiscount || 0)))
              : null;

            // Portada: usa p.img si existe; si no, /products/<id>/cover.jpg
            const cover = p.img || `/products/${p.id}/cover.jpg`;

            return (
              <motion.article
                key={p.id}
                className={`group cursor-pointer rounded-2xl ${
                  !p.inStock ? "opacity-60 grayscale" : ""
                }`}
                onClick={() => handleProductClick(p)}
                title={p.inStock ? "Ver producto" : "Sin stock"}
                initial={{ opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ duration: 0.45, ease: "easeOut" }}
                whileHover={{ y: -4, rotateX: 0.4, rotateY: -0.4 }}
              >
                <div className="relative rounded-2xl p-[1px] bg-gradient-to-br from-white/10 via-white/0 to-white/10 group-hover:from-white/20 group-hover:to-white/20 transition">
                  <div className="relative aspect-[4/5] overflow-hidden rounded-2xl bg-neutral-900">
                    <Image
                      src={cover}
                      alt={p.name}
                      fill
                      className="object-cover transition-transform duration-600 group-hover:scale-[1.03]"
                      sizes="(max-width: 768px) 50vw, 25vw"
                    />
                    {p.isNew && p.inStock && (
                      <span className="absolute left-3 top-3 rounded-full bg-white/10 backdrop-blur px-2 py-1 text-[11px] font-medium text-white/90 border border-white/20">
                        NUEVO
                      </span>
                    )}
                    {!p.inStock && (
                      <span className="absolute left-3 top-3 rounded-full bg-white text-black px-2 py-1 text-[11px]">
                        SIN STOCK
                      </span>
                    )}
                  </div>
                </div>

                <div className="px-1.5 pt-3">
                  <h3 className="text-[13px] leading-snug text-white/95">
                    {p.name}
                  </h3>
                  <div className="mt-1 text-[13px]">
                    <div className="text-white/90">{money(p.price)}</div>
                    {discounted && (
                      <div className="text-white/60">
                        {money(discounted)} con Transferencia
                      </div>
                    )}
                  </div>
                </div>
              </motion.article>
            );
          })}
        </div>

        {/* Botón Cargar más */}
        {visible < filtered.length && (
          <div className="mt-8 flex justify-center">
            <button
              onClick={() => setVisible((v) => v + PAGE)}
              className="rounded-full border border-white/20 px-5 py-2 text-sm text-white/85 hover:bg-white/10"
            >
              Cargar más
            </button>
          </div>
        )}
      </section>

      {/* ========= STRIP MARCA ========= */}
      <section className="mx-auto max-w-[1400px] px-5 pb-16">
        <div className="rounded-2xl border border-white/10 bg-neutral-900 p-6 md:p-8">
          <h3 className="text-xl font-semibold font-[family-name:var(--font-display)] text-white">
            MANGATA: arte, diseño y libertad
          </h3>
          <p className="mt-2 text-sm text-white/70">
            Nacimos del impulso de dos amigas por crear sin pedir permiso.
            Transformamos retazos y excedentes en prendas que cuentan historias.
            Nuestro nombre evoca el sendero de luna sobre el mar: entre la
            oscuridad, cada pieza encuentra su propio brillo.
          </p>
          <ul className="mt-4 grid gap-3 text-sm text-white/70 md:grid-cols-3">
            <li>
              <b className="text-white/90">Sostenibilidad:</b> upcycling real,
              impacto mínimo.
            </li>
            <li>
              <b className="text-white/90">Exclusividad:</b> piezas únicas y
              series limitadas.
            </li>
            <li>
              <b className="text-white/90">Rebeldía:</b> romper reglas, no el
              planeta.
            </li>
          </ul>
        </div>
      </section>

      {/* ========= FAQ ========= */}
      <section id="faq" className="mx-auto max-w-[1400px] px-5 pb-24">
        <h2 className="text-lg font-medium font-[family-name:var(--font-display)] text-white">
          Preguntas frecuentes
        </h2>
        <ul className="mt-3 text-sm text-white/70 list-disc pl-5 space-y-1">
          <li>Pagos: Mercado Pago, tarjetas y transferencia.</li>
          <li>Envíos: a todo el país. Coordinación por WhatsApp.</li>
          <li>No ofrecemos devoluciones.</li>
        </ul>
      </section>

      {/* ========= FOOTER ========= */}
      <Footer />

      {/* ========= OVERLAY (CLICK PRODUCTO) ========= */}
      <AnimatePresence>
        {fxPlaying && (
          <FullScreenLogoFX
            logoSrc={LOGO_SRC}
            size={170}
            duration={fxDuration || 0.8}
            onEnd={onFxEnd}
          />
        )}
      </AnimatePresence>

      {/* ========= WHATSAPP ========= */}
      <a
        href={BASE_WA}
        target="_blank"
        className="fixed bottom-4 right-4 z-[90] rounded-full bg-green-500/90 hover:bg-green-500 px-4 py-3 text-white shadow-lg"
        aria-label="WhatsApp"
        title="Escribinos por WhatsApp"
      >
        <svg
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="currentColor"
          aria-hidden="true"
        >
          <path d="M12.04 2C6.57 2 2.1 6.47 2.1 11.94c0 2.1.64 4.04 1.73 5.65L2 22l4.55-1.76a9.86 9.86 0 0 0 5.49 1.6c5.47 0 9.94-4.47 9.94-9.94S17.51 2 12.04 2zm5.8 14.2c-.24.68-1.37 1.29-1.9 1.34-.49.05-1.12.07-1.8-.11-.41-.1-.94-.31-1.62-.61-2.85-1.23-4.7-4.1-4.84-4.29-.14-.19-1.16-1.54-1.16-2.94 0-1.4.73-2.08.99-2.37.26-.29.57-.36.76-.36.19 0 .38 0 .55.01.18.01.41-.07.64.49.24.58.82 2 .9 2.14.07.14.12.31.02.5-.1.19-.15.31-.29.49-.14.17-.3.39-.43.52-.14.14-.28.29-.12.57.17.29.76 1.25 1.64 2.04 1.13 1 2.09 1.32 2.38 1.46.29.14.46.12.64-.07.19-.19.74-.86.94-1.15.19-.29.4-.24.67-.14.26.1 1.64.77 1.92.91.28.14.47.21.55.33.08.12.08.7-.16 1.38z" />
        </svg>
      </a>

      {/* ========= CART DRAWER ========= */}
      <CartDrawer open={openCart} onClose={() => setOpenCart(false)} />
    </main>
  );
}

/* ========================================================================== */
/* COMPONENTES UI */
/* ========================================================================== */

/** Pastilla de filtro dark minimal (ahora apta para scroll: snap-start) */
function FilterPill({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`snap-start px-3 py-1.5 text-xs rounded-full transition border ${
        active
          ? "bg-white text-black border-white/90"
          : "text-white/80 hover:text-white border-white/15 hover:border-white/30"
      }`}
      aria-pressed={active}
    >
      {label}
    </button>
  );
}

/** Header minimal dark — con menú hamburguesa + sheet discreto (estilo BYNINIA) */
function Header({
  cartCount,
  onCartClick,
}: {
  cartCount: number;
  onCartClick: () => void;
}) {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const firstLinkRef = useRef<HTMLAnchorElement | null>(null);

  // sombra al scrollear
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // cerrar con ESC
  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  // focus en primer link del panel cuando abre
  useEffect(() => {
    if (menuOpen) {
      const t = setTimeout(() => firstLinkRef.current?.focus(), 50);
      return () => clearTimeout(t);
    }
  }, [menuOpen]);

  // cerrar por click fuera del panel
  const onOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!panelRef.current) return;
    if (!panelRef.current.contains(e.target as Node)) {
      setMenuOpen(false);
    }
  };

  return (
    <header
      className={`sticky top-0 z-40 backdrop-blur ${
        scrolled
          ? "bg-neutral-950/80 border-b border-white/10 shadow-[0_2px_10px_rgba(0,0,0,0.25)]"
          : "bg-neutral-950/60"
      }`}
    >
      <div className="mx-auto max-w-[1400px] px-5 py-3 grid grid-cols-3 items-center">
        {/* Nav izquierda (desktop) */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-[family-name:var(--font-display)] text-white/80">
          <a href="#" className="hover:text-white">
            Inicio
          </a>
          <a href="#catalogo" className="hover:text-white">
            Tienda
          </a>
          <a href="#faq" className="hover:text-white">
            Ayuda
          </a>
        </nav>

        {/* Centro */}
        <a href="#" className="flex items-center justify-center gap-2">
          <InlineLogo size={22} />
          <span className="text-sm tracking-wider font-[family-name:var(--font-display)] text-white/90">
            {BRAND}
          </span>
        </a>

        {/* Acciones */}
        <div className="flex items-center justify-end gap-1 md:gap-4">
          {/* Hamburguesa (solo mobile) */}
          <button
            className="md:hidden p-2 rounded hover:bg-white/5 text-white/85"
            aria-label={menuOpen ? "Cerrar menú" : "Abrir menú"}
            aria-expanded={menuOpen}
            aria-controls="mobile-menu"
            onClick={() => setMenuOpen((v) => !v)}
          >
            {/* ícono simple */}
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="currentColor"
              aria-hidden="true"
            >
              {menuOpen ? (
                <path d="M18.3 5.71 12 12l6.3 6.29-1.41 1.42L10.59 13.4 4.29 19.7 2.88 18.29 9.17 12 2.88 5.71 4.29 4.29l6.3 6.3 6.29-6.3z" />
              ) : (
                <path d="M3 6h18v2H3V6Zm0 5h18v2H3v-2Zm0 5h18v2H3v-2Z" />
              )}
            </svg>
          </button>

          {/* Buscar (placeholder visual) */}
          <button
            className="hidden md:inline-flex p-2 rounded hover:bg-white/5 text-white/80"
            aria-label="Buscar"
            title="Buscar"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              aria-hidden="true"
              fill="currentColor"
            >
              <path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 5 1.5-1.5-5-5zm-6 0C8.01 14 6 11.99 6 9.5S8.01 5 10.5 5 15 7.01 15 9.5 12.99 14 10.5 14z" />
            </svg>
          </button>

          {/* Carrito */}
          <button
            onClick={onCartClick}
            className="relative p-2 rounded hover:bg-white/5 text-white/80"
            aria-label="Carrito"
            title="Abrir carrito"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              aria-hidden="true"
              fill="currentColor"
            >
              <path d="M7 18c-1.1 0-1.99.9-1.99 2S5.9 22 7 22s2-.9 2-2-.9-2-2-2zM17 18c-1.1 0-1.99.9-1.99 2S15.9 22 17 22s2-.9 2-2-.9-2-2-2zM7.17 14h9.36c.75 0 1.41-.41 1.75-1.03l3.58-6.49A1 1 0 0 0 21 5H6.21l-.94-2H1v2h3l3.6 7.59-1.35 2.45C5.52 16.37 6.48 18 8 18h12v-2H8l1.1-2z" />
            </svg>
            {cartCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] rounded-full bg-white text-black text-[10px] grid place-items-center px-1">
                {cartCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Panel móvil: overlay + sheet angosto (discreto) */}
      <AnimatePresence>
        {menuOpen && (
          <>
            {/* Overlay */}
            <motion.div
              key="overlay"
              className="fixed inset-0 z-40 bg-black/50 backdrop-blur-[2px]"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onMouseDown={onOverlayClick}
            />

            {/* Sheet (derecha, 280px) */}
            <motion.div
              key="sheet"
              id="mobile-menu"
              role="dialog"
              aria-modal="true"
              className="fixed right-0 top-0 bottom-0 z-50 w-[78vw] max-w-[280px] bg-neutral-950 border-l border-white/10 shadow-2xl"
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "tween", duration: 0.22 }}
              ref={panelRef}
            >
              <div className="p-4 flex items-center justify-between border-b border-white/10">
                <div className="flex items-center gap-2">
                  <InlineLogo size={18} />
                  <span className="text-xs tracking-wider text-white/80">
                    {BRAND}
                  </span>
                </div>
                <button
                  className="p-2 rounded hover:bg-white/5 text-white/80"
                  aria-label="Cerrar menú"
                  onClick={() => setMenuOpen(false)}
                >
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M18.3 5.71 12 12l6.3 6.29-1.41 1.42L10.59 13.4 4.29 19.7 2.88 18.29 9.17 12 2.88 5.71 4.29 4.29l6.3 6.3 6.29-6.3z" />
                  </svg>
                </button>
              </div>

              <nav className="p-3">
                <a
                  ref={firstLinkRef}
                  onClick={() => setMenuOpen(false)}
                  href="#"
                  className="block rounded-md px-3 py-2 text-sm text-white/90 hover:bg-white/5"
                >
                  Inicio
                </a>
                <a
                  onClick={() => setMenuOpen(false)}
                  href="#catalogo"
                  className="block rounded-md px-3 py-2 text-sm text-white/90 hover:bg-white/5"
                >
                  Tienda
                </a>
                <a
                  onClick={() => setMenuOpen(false)}
                  href="#faq"
                  className="block rounded-md px-3 py-2 text-sm text-white/90 hover:bg-white/5"
                >
                  Ayuda
                </a>

                <div className="mt-3 border-t border-white/10 pt-3 space-y-2">
                  <a
                    href={SOCIALS.instagram}
                    target="_blank"
                    rel="noreferrer"
                    className="block rounded-md px-3 py-2 text-sm text-white/75 hover:bg-white/5"
                    onClick={() => setMenuOpen(false)}
                  >
                    Instagram
                  </a>
                  <a
                    href={`mailto:${SOCIALS.email}`}
                    className="block rounded-md px-3 py-2 text-sm text-white/75 hover:bg-white/5"
                    onClick={() => setMenuOpen(false)}
                  >
                    {SOCIALS.email}
                  </a>
                </div>
              </nav>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </header>
  );
}

/** Footer oscuro (inline en este archivo) */
function Footer() {
  return (
    <footer className="border-t border-white/10 bg-neutral-950">
      <div className="mx-auto max-w-[1400px] px-5 py-10 grid gap-8 md:grid-cols-3">
        <div>
          <div className="flex items-center gap-2">
            <InlineLogo size={20} />
            <span className="text-sm tracking-wider font-[family-name:var(--font-display)] text-white/90">
              MANGATA
            </span>
          </div>
          <p className="mt-3 text-sm text-white/70">
            Mangata redefine la moda desde Córdoba con diseño sostenible y
            upcycling.
          </p>
          <p className="mt-2 text-xs text-white/50">{SOCIALS.location}</p>
        </div>

        <div>
          <h4 className="text-sm font-semibold font-[family-name:var(--font-display)] text-white">
            Explorar
          </h4>
          <ul className="mt-3 space-y-2 text-sm text-white/75">
            <li>
              <a href="#" className="hover:text-white">
                Inicio
              </a>
            </li>
            <li>
              <a href="#catalogo" className="hover:text-white">
                Tienda
              </a>
            </li>
            <li>
              <a href="#faq" className="hover:text-white">
                Ayuda
              </a>
            </li>
            <li>
              <a
                href={SOCIALS.instagram}
                target="_blank"
                rel="noreferrer"
                className="hover:text-white"
              >
                Instagram
              </a>
            </li>
          </ul>
        </div>

        <div>
          <h4 className="text-sm font-semibold font-[family-name:var(--font-display)] text-white">
            Contacto
          </h4>
          <ul className="mt-3 space-y-2 text-sm text-white/75">
            <li>
              <a href={`mailto:${SOCIALS.email}`} className="hover:text-white">
                {SOCIALS.email}
              </a>
            </li>
            <li>
              <a
                href={BASE_WA}
                target="_blank"
                rel="noreferrer"
                className="hover:text-white"
              >
                WhatsApp
              </a>
            </li>
            <li className="text-white/50">Atención: Lun–Vie · 10–18hs</li>
          </ul>
          <a
            href={BASE_WA}
            target="_blank"
            rel="noreferrer"
            className="mt-4 inline-flex items-center rounded-full border border-white/25 px-4 py-2 text-white/85 text-sm hover:bg-white/10"
          >
            Escribinos por WhatsApp
          </a>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="mx-auto max-w-[1400px] px-5 py-4 text-xs text-white/50 flex flex-col md:flex-row items-center justify-between gap-2">
          <span>
            © {new Date().getFullYear()} MANGATA. Piezas únicas — hecho a mano
            en Argentina.
          </span>
          <div className="flex flex-wrap items-center justify-center gap-4"><span className="text-[10px] uppercase tracking-[0.24em] text-white/20 transition hover:text-white/45">RR · ParaSiempreTech 🖤</span>
            <a href="#" className="hover:text-white/80">
              Términos
            </a>
            <a href="#" className="hover:text-white/80">
              Envíos & Cambios
            </a>
            <a href="#" className="hover:text-white/80">
              Privacidad
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}

/* ========================================================================== */
/* LOGOS & FX */
/* ========================================================================== */

function InlineLogo({ size = 24 }: { size?: number }) {
  return (
    <div
      style={{ width: size, height: size }}
      className="relative rounded-full overflow-hidden"
    >
      <Image
        src={LOGO_SRC}
        alt="MANGATA"
        fill
        className="object-cover"
        priority={false}
      />
    </div>
  );
}

function FullScreenLogoFX({
  logoSrc,
  size = 170,
  duration = LOGO_FX_S,
  onEnd,
  showEnterButton = false,
}: {
  logoSrc: string;
  size?: number;
  duration?: number;
  onEnd?: () => void;
  showEnterButton?: boolean;
}) {
  useEffect(() => {
    if (!onEnd || !duration) return;
    const t = setTimeout(onEnd, duration * 1000);
    return () => clearTimeout(t);
  }, [onEnd, duration]);

  return (
    <motion.div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black"
      initial={{ opacity: 1 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.35 }}
    >
      <motion.div
        initial={{ opacity: 0, rotateY: 0, scale: 0.96 }}
        animate={{
          opacity: [0, 1, 1],
          rotateY: [0, 180, 360],
          scale: [0.96, 1, 1],
        }}
        exit={{ opacity: 0 }}
        transition={{
          duration: duration || 0.8,
          ease: [0.16, 0.84, 0.44, 1],
          times: [0, 0.5, 1],
        }}
        style={{ transformStyle: "preserve-3d" }}
        aria-hidden="true"
      >
        <div
          style={{ width: size, height: size }}
          className="relative rounded-full overflow-hidden"
        >
          <Image
            src={logoSrc}
            alt="MANGATA"
            fill
            className="object-cover"
            priority
          />
        </div>
      </motion.div>

      {showEnterButton && (
        <button
          onClick={onEnd}
          className="absolute bottom-10 text-xs tracking-wide rounded-full border border-white/30 px-4 py-1.5 text-white hover:bg-white/10"
        >
          Entrar
        </button>
      )}
    </motion.div>
  );
}




