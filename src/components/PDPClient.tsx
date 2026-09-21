"use client";

import Image from "next/image";
import { BrandSignature } from "@/components/brand/BrandSignature";
import { useExperience } from "@/components/experience/ExperienceProvider";
import { useNativeDialog } from "@/components/ui/useNativeDialog";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowLeft, ArrowRight, ArrowUpRight, Check, ChevronLeft, ChevronRight, LockKeyhole, MessageCircle, Plus, ShoppingBag, X, ZoomIn } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useCart } from "@/components/commerce/CartProvider";
import { trackCommerceEvent } from "@/lib/analytics";
import type { StoreProduct } from "@/lib/commerce/types";
import { whatsappHref } from "@/config/site";
import { productImageView } from "@/lib/product-images";
import "./product/product.css";

const money = (value: number) => new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(value);

export default function PDPClient({ product }: { product: StoreProduct }) {
  const [current, setCurrent] = useState(0);
  const { activeOverlay, openOverlay, closeOverlay } = useExperience();
  const zoomOpen = activeOverlay === "zoom";
  const setZoomOpen = (value: boolean) => value ? openOverlay("zoom") : closeOverlay("zoom");
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState("");
  const [failedImage, setFailedImage] = useState<string | null>(null);
  const [imageAttempt, setImageAttempt] = useState(0);
  const dialogRef = useNativeDialog(zoomOpen);
  const mobileBuyRef = useRef<HTMLDivElement>(null);
  const addPending = useRef(false);
  const reducedMotion = useReducedMotion();
  const { items, count, openCart, addItem, checkoutReady, mode } = useCart();
  const gallery = useMemo(() => Array.from(new Set([product.image, ...product.images].filter(Boolean))), [product.image, product.images]);
  const activeImage = gallery[current] || product.image;
  // Manual recovery uses the source WebP: bypass a failed optimizer/cache without relaxing its URL rules.
  const imageSrc = imageAttempt ? `${activeImage}${activeImage.includes("?") ? "&" : "?"}retry=${imageAttempt}` : activeImage;
  const retryImage = () => { setFailedImage(null); setImageAttempt(value => value + 1); };
  const inBag = items.some((item) => item.sku === product.sku);
  const stockUnconfirmed = product.source === "local-fallback" || product.inventory.availability === "unconfirmed";
  const reserved = ["reserved", "review"].includes(product.inventory.availability ?? "");
  const available = product.inventory.isInStock && !stockUnconfirmed;
  const accessory = product.category === "Accesorios";
  const deliveryHref = whatsappHref(`Hola MANGATA, quiero coordinar el envío o retiro de ${product.name} (${product.sku}). Mi localidad es: `);
  const measurementHref = whatsappHref(`Hola MANGATA, ¿me pasan las medidas de ${product.name} (${product.sku})?`);
  const helpHref = whatsappHref(`Hola MANGATA, quiero consultar por ${product.name} (${product.sku}).`);

  useEffect(() => {
    trackCommerceEvent("view_item", { currency: "ARS", value: product.price, item_id: product.sku, item_name: product.name, item_category: product.category });
  }, [product.category, product.name, product.price, product.sku]);

  useEffect(() => {
    const bar = mobileBuyRef.current;
    if (!bar) return;
    const measure = () => document.documentElement.style.setProperty("--mobile-purchase-height", `${getComputedStyle(bar).position === "fixed" ? Math.ceil(bar.getBoundingClientRect().height) : 0}px`);
    const observer = new ResizeObserver(measure);
    observer.observe(bar);
    window.addEventListener("resize", measure, { passive: true });
    measure();
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
      document.documentElement.style.removeProperty("--mobile-purchase-height");
    };
  }, []);

  const handleAdd = async () => {
    if (inBag) { openCart(); return; }
    if (!available || addPending.current) return;
    addPending.current = true;
    setAdding(true);
    setAddError("");
    try {
      const success = await addItem(product);
      if (!success) setAddError("No pudimos sumar la pieza. Volvé a intentarlo.");
    } catch {
      setAddError("No pudimos sumar la pieza. Volvé a intentarlo.");
    } finally {
      addPending.current = false;
      setAdding(false);
    }
  };
  const changeImage = (direction: number) => setCurrent((index) => (index + direction + gallery.length) % gallery.length);
  const buttonText = adding ? "Sumando…" : inBag ? "Ver mi bolsa" : available ? "Sumar a la bolsa" : stockUnconfirmed ? "Stock sin confirmar" : reserved ? "Pieza en proceso de compra" : "Pieza agotada";

  return (
    <main className="product-page">
      <a className="product-skip" href="#product-purchase">Ir a la información de compra</a>
      <header className="product-header">
        <Link href="/#coleccion" className="product-header-back" aria-label="Volver a la colección"><ArrowLeft size={19} strokeWidth={1.5} aria-hidden="true" /><span>Colección</span></Link>
        <Link href="/" className="product-wordmark" aria-label="MANGATA, inicio"><BrandSignature /></Link>
        <button className="product-header-bag" onClick={openCart} aria-label={`Abrir bolsa, ${count} ${count === 1 ? "pieza" : "piezas"}`}><ShoppingBag size={19} strokeWidth={1.5} aria-hidden="true" /><span>Bolsa</span><span className="product-bag-count">{count}</span></button>
      </header>

      <nav className="product-breadcrumb" aria-label="Ruta de navegación">
        <Link href="/">Inicio</Link><ChevronRight size={12} aria-hidden="true" /><Link href="/#coleccion">Colección</Link><ChevronRight size={12} aria-hidden="true" /><span aria-current="page">{product.name}</span>
      </nav>

      <div className="product-content">
        <div className="product-heading">
          <div className="product-heading-top"><span>{product.category}</span><span className="product-sku">{product.sku}</span></div>
          <h1>{product.name}</h1>
          <div className="product-price-row"><strong>{money(product.price)}</strong>{product.compareAtPrice != null && product.compareAtPrice > product.price && <del>{money(product.compareAtPrice)}</del>}</div>
          {product.transferPrice != null && product.transferPrice < product.price && <p className="product-transfer"><span>{money(product.transferPrice)}</span> por transferencia</p>}
        </div>

        <section className="product-gallery" aria-label={`Fotos de ${product.name}`}>
          <div className="product-image-stage" data-photo-surface={activeImage.startsWith("/catalog/") ? "light" : undefined}>
            <button className="product-image-open" onClick={() => setZoomOpen(true)} aria-label={`Ampliar foto de ${product.name}`} aria-haspopup="dialog">
              <AnimatePresence initial={false} mode="wait"><motion.div key={activeImage} className="product-image-motion" initial={{ opacity: reducedMotion ? 1 : 0 }} animate={{ opacity: 1 }} exit={{ opacity: reducedMotion ? 1 : 0 }} transition={{ duration: reducedMotion ? 0 : 0.2 }}>
                <Image key={imageAttempt} src={imageSrc} unoptimized={imageAttempt > 0} alt={`${product.name}, ${productImageView(activeImage, current).toLowerCase()}`} fill loading="eager" fetchPriority={current === 0 ? "high" : "auto"} sizes="(max-width: 800px) 100vw, (max-width: 1500px) 56vw, 820px" onError={() => setFailedImage(activeImage)} onLoad={() => setFailedImage(failed => failed === activeImage ? null : failed)} />
              </motion.div></AnimatePresence>
              <span className="product-zoom-hint"><ZoomIn size={16} strokeWidth={1.5} aria-hidden="true" /><span>Ver de cerca</span></span>
            </button>
            {failedImage === activeImage && <div className="product-image-error" role="status"><p>No pudimos cargar esta foto.</p><button onClick={retryImage}>Volver a cargar</button></div>}
            {gallery.length > 1 && <div className="product-gallery-controls"><button onClick={() => changeImage(-1)} aria-label="Foto anterior"><ChevronLeft size={20} aria-hidden="true" /></button><span aria-live="polite" aria-atomic="true">{current + 1} de {gallery.length}</span><button onClick={() => changeImage(1)} aria-label="Foto siguiente"><ChevronRight size={20} aria-hidden="true" /></button></div>}
          </div>
          {gallery.length > 1 && <div className="product-thumbnails" aria-label="Elegir foto">{gallery.map((image, index) => <button key={image} className={current === index ? "is-selected" : ""} onClick={() => setCurrent(index)} aria-label={`Ver ${productImageView(image, index).toLowerCase()} de ${product.name}`} aria-pressed={current === index}><Image src={image} alt="" fill sizes="76px" /><span className="product-thumbnail-label">{productImageView(image, index)}</span></button>)}</div>}
        </section>

        <section className="product-purchase" id="product-purchase" aria-label="Información y compra" tabIndex={-1}>
          <p className={`product-availability ${available ? "is-available" : ""}`}><span aria-hidden="true" />{stockUnconfirmed ? "Consultanos para confirmar disponibilidad" : available ? "Disponible · única unidad" : reserved ? "Esta pieza está en proceso de compra. Consultanos." : "Esta pieza ya no está disponible"}</p>
          {product.description && <p className="product-description">{product.description}</p>}
          <p className="product-delivery-note">Precio en pesos argentinos. El envío no está incluido. <a href="#product-delivery">Ver cómo coordinarlo</a>.</p>
          <button className="product-add" disabled={(!available && !inBag) || adding} aria-busy={adding} onClick={handleAdd}><span>{buttonText}</span>{inBag ? <Check size={20} strokeWidth={1.6} aria-hidden="true" /> : <Plus size={20} strokeWidth={1.6} aria-hidden="true" />}</button>
          <p className="product-add-status" role="status" aria-live="polite">{addError || (inBag ? "La pieza está en tu bolsa. El stock se confirma al comprar." : "El stock se confirma al comprar.")}</p>
          <a className="product-measurement" href={measurementHref} target="_blank" rel="noopener noreferrer" onClick={() => trackCommerceEvent("measurement_inquiry", { item_id: product.sku, item_category: product.category, source: "product_page" })}>
            <MessageCircle size={23} strokeWidth={1.35} aria-hidden="true" /><span><strong>{accessory ? "¿Qué tamaño tiene?" : "¿Dudas con el calce?"}</strong><small>{accessory ? "Consultá las dimensiones de este accesorio." : "Pedinos las medidas de esta pieza."}</small></span><ArrowUpRight size={20} strokeWidth={1.5} aria-hidden="true" />
          </a>
        </section>

        <div className="product-details">
          <div className="product-delivery" id="product-delivery" tabIndex={-1}>
            <h2>Pago y entrega</h2>
            {checkoutReady && mode === "local" && <p className="product-payment-note"><LockKeyhole size={16} aria-hidden="true" /> Pagás en el checkout de Mercado Pago.</p>}
            <p>La web cobra sólo la pieza. El envío se acuerda y paga aparte. Consultá las opciones para tu localidad o coordiná un retiro en Córdoba antes de pagar.</p>
            <a href={deliveryHref} target="_blank" rel="noopener noreferrer">Coordinar entrega <ArrowUpRight size={15} aria-hidden="true" /></a>
          </div>
          <details><summary>Antes de comprar <Plus size={17} strokeWidth={1.5} aria-hidden="true" /></summary><p>Consultanos por {accessory ? "las dimensiones" : "el calce"}, los cuidados o la entrega. En el mensaje ya va el nombre de esta pieza para que podamos ayudarte.</p><a href={helpHref} target="_blank" rel="noopener noreferrer">Hablar con MANGATA <ArrowUpRight size={15} aria-hidden="true" /></a></details>
          <Link className="product-continue" href="/#coleccion"><span>{available ? "Seguir viendo la colección" : "Ver otras piezas de la colección"}</span><ArrowRight size={20} strokeWidth={1.4} aria-hidden="true" /></Link>
        </div>
      </div>

      <footer className="product-footer"><Link href="/">MANGATA</Link><span>Upcycling desde Córdoba.</span><a href="https://www.instagram.com/mangata.upcy" target="_blank" rel="noopener noreferrer">Instagram <ArrowUpRight size={14} aria-hidden="true" /></a></footer>

      <div ref={mobileBuyRef} className={`product-mobile-buy ${activeOverlay ? "is-obscured" : ""}`} inert={!!activeOverlay}>
        <div><span>{product.name}</span><strong>{money(product.price)}</strong></div><button disabled={(!available && !inBag) || adding} aria-busy={adding} onClick={handleAdd}>{buttonText}{available && !adding && <ArrowUpRight size={18} aria-hidden="true" />}</button>
      </div>

      <dialog ref={dialogRef} className="product-image-dialog" aria-label={`Vista ampliada de ${product.name}`} onCancel={(event) => { event.preventDefault(); setZoomOpen(false); }} onClick={(event) => { if (event.target === event.currentTarget) setZoomOpen(false); }} onKeyDown={(event) => {
        if (gallery.length < 2) return;
        if (event.key === "ArrowLeft") { event.preventDefault(); changeImage(-1); }
        if (event.key === "ArrowRight") { event.preventDefault(); changeImage(1); }
      }}>
        {zoomOpen && <>
          <div className="product-dialog-top"><span>{product.name}</span><button onClick={() => setZoomOpen(false)} aria-label="Cerrar vista ampliada" autoFocus><X size={24} strokeWidth={1.5} aria-hidden="true" /></button></div>
          <div className="product-dialog-photo"><Image key={imageAttempt} src={imageSrc} unoptimized={imageAttempt > 0} alt={`${product.name}, ${productImageView(activeImage, current).toLowerCase()}, ampliada`} fill sizes="100vw" onError={() => setFailedImage(`zoom:${activeImage}`)} onLoad={() => setFailedImage(failed => failed === `zoom:${activeImage}` ? null : failed)} />{failedImage === `zoom:${activeImage}` && <div className="product-image-error" role="status"><p>No pudimos cargar esta foto.</p><button onClick={retryImage}>Volver a cargar</button></div>}</div>
          {gallery.length > 1 && <div className="product-dialog-controls"><button onClick={() => changeImage(-1)} aria-label="Foto anterior"><ChevronLeft size={22} aria-hidden="true" /></button><span aria-live="polite">{current + 1} de {gallery.length}</span><button onClick={() => changeImage(1)} aria-label="Foto siguiente"><ChevronRight size={22} aria-hidden="true" /></button></div>}
        </>}
      </dialog>
    </main>
  );
}
