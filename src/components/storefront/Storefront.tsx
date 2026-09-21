"use client";

import Image from "next/image";
import { BrandSignature } from "@/components/brand/BrandSignature";
import { useExperience } from "@/components/experience/ExperienceProvider";
import { useRevealOnView } from "@/components/experience/useRevealOnView";
import { useNativeDialog } from "@/components/ui/useNativeDialog";
import Link from "next/link";
import { AnimatePresence, MotionConfig, motion } from "framer-motion";
import { ArrowDown, ArrowRight, ArrowUp, ArrowUpRight, Check, ChevronDown, CircleCheck, CreditCard, LockKeyhole, Menu, MessageCircle, PackageCheck, Plus, Search, ShoppingBag, SlidersHorizontal, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useCart } from "@/components/commerce/CartProvider";
import { trackCommerceEvent } from "@/lib/analytics";
import type { CatalogResult, CatalogSource, CommerceMode, StoreProduct } from "@/lib/commerce/types";
import { SITE, whatsappHref } from "@/config/site";
import "./storefront.css";

const INSTAGRAM = SITE.instagram;
const WHATSAPP = whatsappHref("Hola MANGATA, quiero consultar por una pieza.");
const WHATSAPP_DROP = whatsappHref("Hola MANGATA, ¿cuándo sale el próximo drop?");
const WHATSAPP_MEASURES = whatsappHref("Hola MANGATA, vi una pieza en la web y quiero consultar sus medidas.");
const money = (value: number) => new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(value);
const clean = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("es");

function selectProduct(product: StoreProduct, source: string) {
  trackCommerceEvent("select_item", { currency: "ARS", value: product.price, item_id: product.sku, item_name: product.name, item_category: product.category, source });
}

function Wordmark() {
  return <BrandSignature />;
}

function Dialog({ open, onClose, label, children, className = "" }: { open: boolean; onClose: () => void; label: string; children: ReactNode; className?: string }) {
  const ref = useNativeDialog(open);
  return <dialog ref={ref} className={`mg-dialog ${className}`} aria-label={label} onCancel={(event) => { event.preventDefault(); onClose(); }} onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}><div className="mg-dialog-content">{children}</div></dialog>;
}

function Header({ onSearch }: { onSearch: () => void }) {
  const { activeOverlay, openOverlay, closeOverlay } = useExperience();
  const menuOpen = activeOverlay === "menu";
  const setMenuOpen = (value: boolean) => value ? openOverlay("menu") : closeOverlay("menu");
  const { count, openCart } = useCart();
  return <>
    <div className="mg-announcement"><span>Prendas recuperadas. Intervenidas en Córdoba.</span><a href={INSTAGRAM} target="_blank" rel="noreferrer">@mangata.upcy <ArrowUpRight size={12} /></a></div>
    <header className="mg-header">
      <Link href="/" className="mg-brand" aria-label="MANGATA, inicio"><Wordmark /></Link>
      <nav className="mg-desktop-nav" aria-label="Navegación principal"><a href="#coleccion">La colección</a><a href="#manifiesto">Cómo lo hacemos</a><a href="#ayuda">Hablemos</a></nav>
      <div className="mg-header-actions">
        <button onClick={onSearch} className="mg-icon-button" aria-label="Buscar una pieza"><Search size={20} strokeWidth={1.5} /></button>
        <button onClick={openCart} className="mg-cart-button" aria-label={`Abrir bolsa, ${count} ${count === 1 ? "pieza" : "piezas"}`}><ShoppingBag size={19} strokeWidth={1.5} /><span className="mg-bag-label">Bolsa</span><span key={count} className="mg-cart-count" data-filled={count > 0}>{count}</span></button>
        <button onClick={() => setMenuOpen(true)} className="mg-icon-button mg-menu-toggle" aria-label="Abrir menú"><Menu size={22} strokeWidth={1.5} /></button>
      </div>
    </header>
    <Dialog open={menuOpen} onClose={() => setMenuOpen(false)} label="Menú de MANGATA" className="mg-menu-dialog">
      <div className="mg-dialog-heading"><Wordmark /><button className="mg-icon-button" onClick={() => setMenuOpen(false)} aria-label="Cerrar menú"><X /></button></div>
      <nav className="mg-mobile-nav" aria-label="Navegación móvil">{[["La colección", "#coleccion"], ["Cómo lo hacemos", "#manifiesto"], ["Hablemos", "#ayuda"]].map(([label, href]) => <a key={href} href={href} onClick={() => setMenuOpen(false)}>{label}<ArrowUpRight /></a>)}</nav>
      <p className="mg-menu-note">Recuperada acá.<br />Para seguir con vos.</p>
      <a className="mg-inline-link" href={INSTAGRAM} target="_blank" rel="noreferrer">Instagram <ArrowUpRight size={16} /></a>
    </Dialog>
  </>;
}

function SearchDialog({ products, open, onClose }: { products: StoreProduct[]; open: boolean; onClose: () => void }) {
  const [query, setQuery] = useState("");
  const result = useMemo(() => products.filter((product) => clean(`${product.name} ${product.category} ${product.sku}`).includes(clean(query.trim()))), [products, query]);
  useEffect(() => {
    if (!open || query.trim().length < 2) return;
    const timer = window.setTimeout(() => trackCommerceEvent("search", { search_length: query.trim().length, result_count: result.length, source: "header" }), 600);
    return () => window.clearTimeout(timer);
  }, [open, query, result.length]);
  return <Dialog open={open} onClose={onClose} label="Buscar en MANGATA" className="mg-search-dialog">
    <div className="mg-dialog-heading"><span className="mg-eyebrow">Buscá tu próxima pieza</span><button className="mg-icon-button" onClick={onClose} aria-label="Cerrar búsqueda"><X /></button></div>
    <label className="mg-search-input"><Search size={23} /><input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Denim, foil, accesorios…" aria-label="Buscar por nombre, categoría o SKU" /></label>
    <p className="mg-search-count" role="status">{query ? `${result.length} ${result.length === 1 ? "pieza encontrada" : "piezas encontradas"}` : "Algunas para empezar"}</p>
    <div className="mg-search-results">{result.slice(0, 8).map((product) => <Link key={product.id} href={`/producto/${product.id}`} onClick={() => { selectProduct(product, "search"); onClose(); }}><div className="mg-search-thumb"><Image src={product.image} fill alt="" sizes="72px" /></div><span><strong>{product.name}</strong><small>{product.category}{!product.inventory.isInStock ? " · No disponible" : ""}</small></span><b>{money(product.price)}</b><ArrowUpRight size={18} /></Link>)}</div>
    {!result.length && <div className="mg-search-empty"><p>No encontramos esa pieza.</p><button className="mg-inline-link" onClick={() => setQuery("")}>Ver una selección <ArrowRight size={17} /></button></div>}
  </Dialog>;
}

function Hero({ products }: { products: StoreProduct[] }) {
  const featured = products.find((product) => product.name === "Bermuda Tribal" && product.inventory.isInStock) ?? products.find((product) => product.inventory.isInStock) ?? products[0];
  return <section className="mg-hero" id="inicio" aria-labelledby="hero-title">
    <div className="mg-hero-copy">
      <span className="mg-eyebrow"><i /> Streetwear recuperado</span>
      <h1 id="hero-title">Diseñado<br />para <em>vos.</em></h1>
      <p>Piezas únicas de diseño y upcycling,<br /> hechas a mano.</p>
      <a href="#coleccion" className="mg-button mg-button-light">Ver las piezas <ArrowDown size={18} /></a>
      <span className="mg-hero-footnote"><CircleCheck size={13} strokeWidth={2} aria-hidden="true" /> Fotos reales. Hecho a mano en Córdoba.</span>
    </div>
    {featured && <div className="mg-hero-visual">
      <Link className="mg-hero-photo" data-photo-surface={featured.image.startsWith("/catalog/") ? "light" : undefined} href={`/producto/${featured.id}`} aria-label={`Ver ${featured.name}`} onClick={() => selectProduct(featured, "hero")}><Image src={featured.image} alt={featured.name} fill preload sizes="(max-width: 700px) 50vw, (max-width: 1135px) 46vw, 520px" /></Link>
      <Link className="mg-hero-product" href={`/producto/${featured.id}`} onClick={() => selectProduct(featured, "hero_label")}><span><small>La pieza de portada</small><strong>{featured.name}</strong></span><span>{money(featured.price)} <ArrowUpRight size={22} /></span></Link>
    </div>}
    <div className="mg-hero-bottom"><span>Seguí dándole una historia a tus prendas.</span><a href="#manifiesto">El trabajo detrás <ArrowUpRight size={14} /></a></div>
  </section>;
}

function PurchaseNotes() {
  const { checkoutReady, mode, openCart } = useCart();
  const mercadoPagoReady = checkoutReady && mode === "local";
  return <section className="mg-purchase-notes" aria-label="Información para comprar">
    <a href="#ayuda"><PackageCheck size={23} strokeWidth={1.4} aria-hidden="true" /><span><strong>Entrega a coordinar</strong><small>Consultá envío o retiro en Córdoba.</small></span></a>
    {mercadoPagoReady ? <button type="button" onClick={openCart}><span className="mg-trust-icon" aria-hidden="true"><LockKeyhole size={23} strokeWidth={1.4} /><CircleCheck size={13} strokeWidth={2.3} /></span><span><strong>Pago protegido</strong><small>Checkout seguro de Mercado Pago.</small></span></button> : <div><CreditCard size={23} strokeWidth={1.4} aria-hidden="true" /><span><strong>Precios en pesos argentinos</strong><small>El envío se coordina antes de comprar.</small></span></div>}
    <a href={WHATSAPP} target="_blank" rel="noopener noreferrer" aria-label="Contactar a MANGATA por WhatsApp (se abre en otra pestaña)"><MessageCircle size={23} strokeWidth={1.4} aria-hidden="true" /><span><strong>Atención por WhatsApp</strong><small>{SITE.whatsappDisplay}</small></span></a>
  </section>;
}

function ProductCard({ product }: { product: StoreProduct }) {
  const { addItem, items, syncState } = useCart();
  const [pending, setPending] = useState(false);
  const [secondaryRequested, setSecondaryRequested] = useState(false);
  const [secondaryLoaded, setSecondaryLoaded] = useState(false);
  const inBag = items.some((item) => item.sku === product.sku);
  const secondary = product.images[1];
  const add = async () => { setPending(true); try { await addItem(product); } finally { setPending(false); } };
  return <motion.article data-scroll-anchor={`product-${product.id}`} layout="position" initial={false} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: .22 }} className="mg-product-card">
    <div className="mg-product-media" data-photo-surface={product.image.startsWith("/catalog/") ? "light" : undefined}>
      <Link href={`/producto/${product.id}`} className="mg-product-photo" aria-label={`Ver ${product.name}`} onPointerEnter={(event) => { if (event.pointerType === "mouse" && secondary) setSecondaryRequested(true); }} onClick={() => selectProduct(product, "collection")}>
        <Image src={product.image} alt={product.name} fill loading="lazy" sizes="(max-width: 700px) calc((100vw - 52px) / 2), (max-width: 1024px) 31vw, (max-width: 1440px) 23vw, 315px" className="mg-image-primary" />
        {secondary && secondaryRequested && <Image src={secondary} fill alt="" loading="lazy" sizes="(max-width: 700px) calc((100vw - 52px) / 2), (max-width: 1024px) 31vw, (max-width: 1440px) 23vw, 315px" className={`mg-image-secondary ${secondaryLoaded ? "is-ready" : ""}`} onLoad={() => setSecondaryLoaded(true)} />}
      </Link>
      {product.isNew && product.inventory.isInStock && <span className="mg-new-label">Recién intervenida</span>}
      {!product.inventory.isInStock && <span className="mg-unavailable-label">{product.source === "local-fallback" || product.inventory.availability === "unconfirmed" ? "Consultar disponibilidad" : ["reserved", "review"].includes(product.inventory.availability ?? "") ? "En proceso de compra" : "Agotada"}</span>}
      <Link href={`/producto/${product.id}`} className="mg-view-piece" aria-label={`Ver detalles de ${product.name}`} onClick={() => selectProduct(product, "collection_detail")}><ArrowUpRight size={18} /></Link>
    </div>
    <div className="mg-product-info"><span className="mg-product-category">{product.category}</span><Link href={`/producto/${product.id}`} onClick={() => selectProduct(product, "collection_name")}><h3>{product.name}</h3></Link><div className="mg-product-prices"><strong>{money(product.price)}</strong>{product.compareAtPrice && <del>{money(product.compareAtPrice)}</del>}</div>{product.transferPrice && <p className="mg-transfer-price">{money(product.transferPrice)} por transferencia</p>}</div>
    <button className={`mg-add-button ${inBag ? "is-added" : ""}`} onClick={add} disabled={!product.inventory.isInStock || pending || syncState === "syncing"} aria-label={`${inBag ? "Ver" : "Sumar"} ${product.name} ${inBag ? "en" : "a"} la bolsa`}><span>{pending ? "Sumando…" : inBag ? "En tu bolsa" : "Sumar a la bolsa"}</span>{inBag ? <Check size={16} /> : <Plus size={16} />}</button>
  </motion.article>;
}

function Catalog({ products, source }: { products: StoreProduct[]; source: CatalogSource }) {
  const sectionRef = useRef<HTMLElement>(null);
  const { catalogView: view, setCatalogView: setView } = useExperience();
  const { category, sort, onlyAvailable, limit } = view;
  const updateView = (patch: Partial<typeof view>) => setView((current) => ({ ...current, ...patch }));
  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      trackCommerceEvent("view_item_list", { currency: "ARS", item_count: products.length, source });
      observer.disconnect();
    }, { threshold: .1 });
    observer.observe(section);
    return () => observer.disconnect();
  }, [products.length, source]);
  const filtered = useMemo(() => {
    const result = products.filter((product) => (!onlyAvailable || product.inventory.isInStock) && (category === "Todas" || (category === "Denim" ? /denim|jean|foil|canesu/.test(clean(`${product.name} ${product.description}`)) : product.category === category)));
    if (sort === "price-low") return result.sort((a, b) => a.price - b.price);
    if (sort === "price-high") return result.sort((a, b) => b.price - a.price);
    if (sort === "new") return result.sort((a, b) => Number(b.isNew) - Number(a.isNew));
    const curated = ["Bermuda Tribal", "Bandoo Moñito", "Blazer Cuadrillé", "Bermuda Oscuridad", "Camisa Crop Cuadrillé", "Boxy Black", "Buzo Alitas", "Camisa Jappon"];
    return result.sort((a, b) => {
      const aRank = curated.indexOf(a.name), bRank = curated.indexOf(b.name);
      return (aRank === -1 ? 999 : aRank) - (bRank === -1 ? 999 : bRank);
    });
  }, [products, category, onlyAvailable, sort]);
  return <section ref={sectionRef} id="coleccion" className="mg-collection mg-shell" aria-labelledby="collection-title">
    <div className="mg-collection-heading" data-reveal><div><span className="mg-eyebrow">La colección</span><h2 id="collection-title">Prendas con<br /><em>huella.</em></h2></div><div className="mg-collection-context"><p>Prendas y accesorios exclusivos,<br /> diseñados e intervenidos a mano.</p>{source === "local" && <aside className="mg-opening-note" aria-label="Precios de apertura"><span className="mg-opening-dot" aria-hidden="true" /><span><strong>Precios de apertura</strong><small>Ya están aplicados.</small></span></aside>}</div></div>
    {source === "local-fallback" && <p className="mg-catalog-notice" role="status">Estamos revisando la disponibilidad de las piezas. Podés verlas y consultarnos por WhatsApp.</p>}
    <div className="mg-catalog-controls"><div className="mg-category-tabs" role="group" aria-label="Filtrar colección">{["Todas", "Denim", "Prendas", "Accesorios"].map((name) => <button key={name} aria-pressed={category === name} className={category === name ? "is-active" : ""} onClick={() => updateView({ category: name, limit: 8 })}>{name}</button>)}</div><label className="mg-sort"><SlidersHorizontal size={15} /><select aria-label="Ordenar piezas" value={sort} onChange={(event) => updateView({ sort: event.target.value, limit: 8 })}><option value="selection">Nuestra selección</option><option value="new">Recién intervenidas</option><option value="price-low">Menor precio</option><option value="price-high">Mayor precio</option></select><ChevronDown size={13} /></label></div>
    <div className="mg-catalog-summary"><p role="status">{filtered.length} {filtered.length === 1 ? "pieza" : "piezas"}</p><label><input type="checkbox" checked={onlyAvailable} onChange={(event) => updateView({ onlyAvailable: event.target.checked, limit: 8 })} /> Sólo disponibles</label></div>
    <div className="mg-product-grid"><AnimatePresence mode="popLayout">{filtered.slice(0, limit).map((product) => <ProductCard key={product.id} product={product} />)}</AnimatePresence></div>
    {!filtered.length && <div className="mg-empty"><h3>Por acá no quedan piezas.</h3><button className="mg-inline-link" onClick={() => updateView({ category: "Todas", onlyAvailable: false })}>Volver a ver la colección <ArrowRight size={17} /></button></div>}
    {filtered.length > limit && <div className="mg-load-more"><button className="mg-button mg-button-outline" onClick={() => updateView({ limit: limit + 8 })}>Ver más piezas <Plus size={18} /></button><span>Mostrando {Math.min(limit, filtered.length)} de {filtered.length}</span></div>}
  </section>;
}

function CraftStory() {
  return <section id="manifiesto" className="mg-story" aria-labelledby="story-title">
    <div className="mg-story-image"><Image src="/campaign/rework-still-life-v2.webp" alt="Composición conceptual de denim recuperado, bordes deshilachados y metal" fill quality={85} sizes="(max-width: 700px) 100vw, (max-width: 1400px) 52vw, 720px" /><span>Estudio de materiales · campaña conceptual</span></div>
    <div className="mg-story-copy" data-reveal><span className="mg-eyebrow">Hecho de lo que ya existe</span><h2 id="story-title">MANGATA nace de una forma distinta de mirar lo que ya existe.</h2><p>El nombre viene del reflejo de la luna sobre el agua: una huella de luz que aparece y muta con el movimiento.</p><p>Esa idea atraviesa nuestra forma de diseñar. Recuperamos prendas y materiales que ya existen y los transformamos en algo nuevo: mezclamos texturas, intervenimos, desarmamos, reconstruimos y probamos otras formas de vestir.</p><p>MANGATA es una marca autogestiva de diseño y upcycling, trabajada 100% a mano. Cada pieza se desarrolla de manera individual y no repetimos diseños ni molderías.</p><p>Creemos en una moda más consciente, donde le damos valor a lo que quedó en desuso.</p><p>No buscamos que todas las prendas sean iguales. Buscamos que cada una encuentre su propia forma de brillar y que vos brilles con ella.</p><a href={INSTAGRAM} target="_blank" rel="noreferrer" className="mg-inline-link">Mirá el proceso en Instagram <ArrowUpRight size={18} /></a><div className="mg-craft-signature"><span>MANGATA</span><small>Recuperada e intervenida en Córdoba.</small></div></div>
  </section>;
}

function Help() {
  return <section id="ayuda" className="mg-help mg-shell" aria-labelledby="help-title"><div className="mg-help-intro"><span className="mg-eyebrow">Antes de elegir</span><h2 id="help-title">Que te guste.<br /><em>Que sea para vos.</em></h2><p>Si tenés dudas sobre una pieza, te ayudamos a resolverlas antes de comprar.</p><a className="mg-button mg-button-dark" href={WHATSAPP} target="_blank" rel="noreferrer">Hablemos por WhatsApp <MessageCircle size={19} /></a></div><div className="mg-faq"><details><summary>¿Cómo sé si me va a quedar?<Plus size={18} /></summary><p>Desde cada ficha podés pedirnos las medidas exactas por WhatsApp. El mensaje ya incluye la pieza que estás mirando, así la ubicamos enseguida.</p></details><details><summary>¿Qué pieza voy a recibir?<Plus size={18} /></summary><p>Cada publicación corresponde a una pieza única. La prenda que ves disponible es la que vas a recibir.</p></details><details><summary>¿Cómo coordino el envío o retiro?<Plus size={18} /></summary><p>Escribinos con la pieza y tu localidad para consultar las opciones de entrega o coordinar un retiro en Córdoba.</p></details><details><summary>¿Querés ver más detalles de una pieza?<Plus size={18} /></summary><p>Si necesitás fotos, medidas o querés consultar algún detalle antes de comprar, escribime.</p></details></div></section>;
}

function Footer() {
  return <footer className="mg-footer" aria-label="MANGATA: colección y contacto">
    <div className="mg-footer-top mg-shell">
      <div className="mg-footer-intro" data-reveal>
        <span className="mg-eyebrow">Seguimos por acá</span>
        <h2>¿Te quedó algo<br /><em>en la cabeza?</em></h2>
        <p>Volvé a mirarlo. Si dudás con el calce, lo vemos con vos antes de que elijas.</p>
        <a href="#coleccion" className="mg-button mg-button-lilac mg-footer-collection" onClick={() => trackCommerceEvent("footer_navigation", { source: "footer_collection" })}>Volver a la colección <ArrowUp size={18} aria-hidden="true" /></a>
      </div>
      <div className="mg-footer-support" data-reveal>
        <a href={WHATSAPP_MEASURES} target="_blank" rel="noopener noreferrer" className="mg-footer-assist" aria-label="Consultar medidas por WhatsApp (se abre en otra pestaña)" onClick={() => trackCommerceEvent("measurement_inquiry", { source: "footer" })}>
          <span className="mg-footer-assist-icon"><MessageCircle size={20} strokeWidth={1.5} aria-hidden="true" /></span>
          <span><strong>¿Cómo te va a quedar?</strong><small>Pedinos las medidas por WhatsApp.</small></span>
          <ArrowUpRight size={19} aria-hidden="true" />
        </a>
        <a href={WHATSAPP_DROP} target="_blank" rel="noopener noreferrer" className="mg-footer-assist" aria-label="Preguntar por el próximo drop por WhatsApp (se abre en otra pestaña)" onClick={() => trackCommerceEvent("drop_inquiry", { source: "footer" })}>
          <span className="mg-footer-assist-icon"><Plus size={20} strokeWidth={1.5} aria-hidden="true" /></span>
          <span><strong>Lo que estamos preparando</strong><small>Preguntanos por el próximo drop.</small></span>
          <ArrowUpRight size={19} aria-hidden="true" />
        </a>
        <nav className="mg-footer-nav" aria-label="Explorar MANGATA">
          <a href="#manifiesto">Cómo lo hacemos</a>
          <a href="#ayuda">Antes de comprar</a>
        </nav>
      </div>
    </div>
    <div className="mg-footer-word" aria-hidden="true">MANGATA</div>
    <div className="mg-footer-bottom mg-shell">
      <span>© {new Date().getFullYear()} MANGATA · Córdoba, Argentina</span>
      <nav aria-label="Contacto y redes">
        <a href={INSTAGRAM} target="_blank" rel="noopener noreferrer">Instagram <ArrowUpRight size={13} aria-hidden="true" /></a>
        <a href={WHATSAPP} target="_blank" rel="noopener noreferrer">WhatsApp · {SITE.whatsappDisplay} <ArrowUpRight size={13} aria-hidden="true" /></a>
        <a href="mailto:mangataclothing777@gmail.com">Email <ArrowUpRight size={13} aria-hidden="true" /></a>
      </nav>
    </div>
  </footer>;
}

export default function Storefront({ initialProducts, mode, source: initialSource }: { initialProducts: StoreProduct[]; mode: CommerceMode; source: CatalogSource }) {
  const storefrontRef = useRef<HTMLDivElement>(null);
  useRevealOnView(storefrontRef);
  const [products, setProducts] = useState(initialProducts);
  const [source, setSource] = useState(initialSource);
  const { activeOverlay, openOverlay, closeOverlay } = useExperience();
  const searchOpen = activeOverlay === "search";
  const setSearchOpen = (value: boolean) => value ? openOverlay("search") : closeOverlay("search");
  useEffect(() => {
    const refresh = async () => {
      try {
        const response = await fetch("/api/store/catalog", { cache: "no-store", signal: AbortSignal.timeout(10_000) });
        if (!response.ok) return;
        const catalog = await response.json() as CatalogResult;
        setProducts(catalog.products);
        setSource(catalog.source);
      } catch { /* Checkout always revalidates authoritative stock. */ }
    };
    const interval = window.setInterval(refresh, 60_000);
    return () => window.clearInterval(interval);
  }, [mode]);
  return <MotionConfig reducedMotion="user"><div ref={storefrontRef} className="mg-storefront"><a className="skip-link" href="#coleccion">Saltar a la colección</a><Header onSearch={() => setSearchOpen(true)} /><SearchDialog products={products} open={searchOpen} onClose={() => setSearchOpen(false)} /><main><Hero products={products} /><PurchaseNotes /><Catalog products={products} source={source} /><CraftStory /><Help /></main><Footer /></div></MotionConfig>;
}
