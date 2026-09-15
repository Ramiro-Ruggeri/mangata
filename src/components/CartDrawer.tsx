"use client";

import Image from "next/image";
import { AnimatePresence, motion, useIsPresent, useReducedMotion } from "framer-motion";
import { Check, MessageCircle, ShieldCheck, ShoppingBag, Trash2, X } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { BrandSignature } from "@/components/brand/BrandSignature";
import { useCart } from "@/components/commerce/CartProvider";
import { trackCommerceEvent } from "@/lib/analytics";
import { motionTokens } from "@/lib/experience/interaction";
import { whatsappHref } from "@/config/site";

const money = (value: number) =>
  new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(value);

function CartLayer({ children }: { children: ReactNode }) {
  const present = useIsPresent();
  return <div className="cart-layer" inert={!present} aria-hidden={!present || undefined}>{children}</div>;
}

export default function CartDrawer() {
  const [deliverySelection, setDeliverySelection] = useState("");
  const {
    items,
    subtotal,
    open,
    mode,
    syncState,
    syncMessage,
    closeCart,
    restoreCartFocus,
    removeItem,
    clear,
    checkout,
    checkoutReady,
  } = useCart();
  const selectionKey = JSON.stringify(items.map(item => [item.sku, item.price]).sort());
  const deliveryAcknowledged = deliverySelection === selectionKey && items.length > 0;
  const inquiryMessage = `Hola MANGATA, quiero consultar por estas piezas:\n${items.map((item) => `${item.name} (${item.sku})`).join("\n")}\n¿Siguen disponibles?`;
  const inquiryUrl = whatsappHref(inquiryMessage);
  const closeRef = useRef<HTMLButtonElement>(null);
  const reducedMotion = useReducedMotion();
  const panelRef = useRef<HTMLElement>(null);
  const metricsRef = useRef({ subtotal, itemCount: items.length });

  useEffect(() => {
    metricsRef.current = { subtotal, itemCount: items.length };
  }, [items.length, subtotal]);

  useEffect(() => {
    if (!open) return;
    trackCommerceEvent("view_cart", {
      currency: "ARS",
      value: metricsRef.current.subtotal,
      item_count: metricsRef.current.itemCount,
    });
    closeRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeCart();
        return;
      }
      if (event.key !== "Tab") return;
      const focusable = Array.from(
        panelRef.current?.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ) ?? [],
      ).filter((element) => element.getAttribute("aria-hidden") !== "true" && element.getClientRects().length > 0);
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (!panelRef.current?.contains(document.activeElement)) {
        event.preventDefault();
        first.focus();
      } else if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [closeCart, open]);

  return (
    <AnimatePresence onExitComplete={restoreCartFocus}>
      {open && (
        <CartLayer>
          <motion.button
            aria-label="Cerrar carrito"
            className="cart-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeCart}
          />
          <motion.aside
            ref={panelRef}
            aria-label="Tu selección"
            aria-modal="true"
            className="cart-panel"
            initial={{ x: reducedMotion ? 0 : "100%" }}
            animate={{ x: 0 }}
            exit={{ x: reducedMotion ? 0 : "100%" }}
            transition={{ duration: reducedMotion ? 0 : motionTokens.overlay, ease: motionTokens.ease }}
            role="dialog"
          >
            <header className="cart-header">
              <div>
                <BrandSignature symbolOnly />
                <h2>Tu bolsa <sup>{items.length}</sup></h2>
              </div>
              <button ref={closeRef} className="icon-button" onClick={closeCart} aria-label="Cerrar">
                <X size={19} strokeWidth={1.5} />
              </button>
            </header>

            <div className="cart-body">
              {items.length === 0 ? (
                <div className="cart-empty">
                  <ShoppingBag size={34} strokeWidth={1.2} />
                  <p>Todavía no elegiste una pieza.</p>
                  <button className="text-link" onClick={closeCart}>Explorar colección</button>
                </div>
              ) : (
                <ul className="cart-list">
                  {items.map((item) => (
                    <li className="cart-line" key={item.id}>
                      <div className="cart-line-image">
                        <Image src={item.image} alt="" fill sizes="96px" className="object-contain" />
                      </div>
                      <div className="cart-line-copy">
                        <div className="cart-line-top">
                          <div>
                            <span>{item.sku}</span>
                            <h3>{item.name}</h3>
                          </div>
                          <button disabled={syncState === "syncing"} onClick={() => removeItem(item.id)} aria-label={`Quitar ${item.name}`}>
                            <Trash2 size={15} strokeWidth={1.4} />
                          </button>
                        </div>
                        <div className="cart-line-bottom">
                          <span className="one-of-one">Única unidad</span>
                          <strong>{money(item.price * item.qty)}</strong>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {items.length > 0 && <footer className="cart-footer">
              {syncState === "error" && <p className="cart-error" role="alert">{syncMessage}</p>}
              {syncState === "synced" && syncMessage && <p className="cart-note" role="status">{syncMessage}</p>}
              <div className="cart-sync" role="status" aria-live="polite">
                <span className={`status-dot ${syncState}`} />
                {mode === "evershop" && checkoutReady
                  ? syncState === "syncing" ? "Verificando disponibilidad…" : "Disponibilidad sujeta a confirmación al pagar"
                  : "La bolsa no reserva stock"}
                {syncState === "synced" && <Check size={13} />}
              </div>
              <div className="cart-total"><span>Subtotal</span><strong>{money(subtotal)}</strong></div>
              <p className="cart-note">{checkoutReady && mode === "local" ? "Este pago incluye sólo las prendas. El envío o retiro se coordina y paga aparte; no está incluido en el total." : checkoutReady ? "Revisá el total y las opciones de entrega antes de pagar." : "Por ahora coordinamos la compra por WhatsApp."}</p>
              {checkoutReady && mode === "local" && <label className="cart-delivery-confirm"><input type="checkbox" checked={deliveryAcknowledged} onChange={event => setDeliverySelection(event.target.checked ? selectionKey : "")} /><span>Ya coordiné el envío o retiro.</span></label>}
              {checkoutReady && mode === "local" && <a className="text-link" href={whatsappHref("Hola MANGATA, quiero coordinar el envío o retiro antes de pagar mi selección.")} target="_blank" rel="noopener noreferrer">Coordinar entrega</a>}
              {checkoutReady ? (
                <button className="magnetic-button cart-checkout" disabled={!items.length || syncState === "syncing" || (mode === "local" && !deliveryAcknowledged)} onClick={() => checkout(deliveryAcknowledged)}>
                  <span>{syncState === "syncing" ? "Revisando tu bolsa…" : mode === "local" ? "Pagar con Mercado Pago" : "Ir a pagar de forma segura"}</span><span>↗</span>
                </button>
              ) : items.length > 0 && syncState !== "syncing" ? (
                <a className="magnetic-button cart-checkout" href={inquiryUrl} target="_blank" rel="noopener noreferrer" aria-label="Consultar mi selección por WhatsApp (se abre en otra pestaña)" onClick={() => trackCommerceEvent("checkout_inquiry", { currency: "ARS", value: subtotal, item_count: items.length, source: "bag" })}>
                  <span>Consultar mi selección</span><MessageCircle size={20} strokeWidth={1.5} />
                </a>
              ) : (
                <button className="magnetic-button cart-checkout" disabled><span>{syncState === "syncing" ? "Revisando tu bolsa…" : "Consultar mi selección"}</span><MessageCircle size={20} strokeWidth={1.5} /></button>
              )}
              <div className="cart-assurance">{checkoutReady ? <ShieldCheck size={14} strokeWidth={1.4} /> : <MessageCircle size={14} strokeWidth={1.4} />}<span>{checkoutReady ? "Completás el pago en una página segura." : "Se abre WhatsApp con tus piezas elegidas."}</span></div>
              {syncState === "error" && <a className="text-link" href={whatsappHref("Hola MANGATA, necesito ayuda para comprar.")} target="_blank" rel="noreferrer"><MessageCircle size={15} /> Consultar por WhatsApp</a>}
              {items.length > 0 && <button className="cart-clear" disabled={syncState === "syncing"} onClick={clear}>Vaciar selección</button>}
            </footer>}
          </motion.aside>
        </CartLayer>
      )}
    </AnimatePresence>
  );
}
