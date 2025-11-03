// src/components/CartDrawer.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";

/** Config básica */
const CART_KEY = "mngt_cart_v1";
type CartItem = { id: number; name: string; price: number; qty: number };

function money(n: number) {
  return n.toLocaleString("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  });
}

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
  // notificar a otros tabs/componentes
  window.dispatchEvent(new Event("storage"));
}

/** Props del Drawer */
type CartDrawerProps = {
  open: boolean;
  onClose: () => void;
  /** Teléfono para WhatsApp sin +, ej "5493885195631" */
  whatsappPhone?: string;
};

export default function CartDrawer({
  open,
  onClose,
  whatsappPhone = "5493885195631",
}: CartDrawerProps) {
  const [items, setItems] = useState<CartItem[]>([]);
  const firstFocusRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);

  // cargar carrito y escuchar cambios globales
  useEffect(() => {
    const refresh = () => setItems(getCart());
    refresh();
    window.addEventListener("storage", refresh);
    return () => window.removeEventListener("storage", refresh);
  }, []);

  // focus al abrir
  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => firstFocusRef.current?.focus(), 40);
    return () => clearTimeout(t);
  }, [open]);

  // cerrar con ESC
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // click fuera
  const onOverlayMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!panelRef.current) return;
    if (!panelRef.current.contains(e.target as Node)) onClose();
  };

  // acciones
  const inc = (id: number) => {
    const next = items.map((it) =>
      it.id === id ? { ...it, qty: it.qty + 1 } : it
    );
    setItems(next);
    setCart(next);
  };
  const dec = (id: number) => {
    const next = items
      .map((it) =>
        it.id === id ? { ...it, qty: Math.max(1, it.qty - 1) } : it
      )
      .filter(Boolean) as CartItem[];
    setItems(next);
    setCart(next);
  };
  const removeItem = (id: number) => {
    const next = items.filter((it) => it.id !== id);
    setItems(next);
    setCart(next);
  };
  const clearAll = () => {
    setItems([]);
    setCart([]);
  };

  const subtotal = useMemo(
    () => items.reduce((acc, it) => acc + it.price * it.qty, 0),
    [items]
  );

  // WhatsApp link
  const waText = useMemo(() => {
    const lines = [
      "Hola! Quiero finalizar esta compra en MANGATA:",
      ...items.map(
        (it) => `• ${it.name} x${it.qty} — ${money(it.price * it.qty)}`
      ),
      `Subtotal: ${money(subtotal)}`,
      "",
      "¿Cómo seguimos? 🙌",
    ];
    return encodeURIComponent(lines.join("\n"));
  }, [items, subtotal]);

  const waHref = `https://wa.me/${whatsappPhone}?text=${waText}`;

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Overlay */}
          <motion.div
            key="cart_overlay"
            className="fixed inset-0 z-[95] bg-black/50 backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onMouseDown={onOverlayMouseDown}
          />

          {/* Panel */}
          <motion.aside
            key="cart_panel"
            ref={panelRef}
            className="fixed right-0 top-0 bottom-0 z-[100] w-[88vw] max-w-[420px] bg-neutral-950 text-neutral-100 border-l border-white/10 shadow-2xl grid grid-rows-[auto,1fr,auto]"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "tween", duration: 0.22 }}
            role="dialog"
            aria-modal="true"
            aria-label="Carrito"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
              <div className="text-sm tracking-wider">Tu carrito</div>
              <div className="flex items-center gap-2">
                {items.length > 0 && (
                  <button
                    className="text-xs text-white/60 hover:text-white/90 px-2 py-1 rounded hover:bg-white/5"
                    onClick={clearAll}
                  >
                    Vaciar
                  </button>
                )}
                <button
                  ref={firstFocusRef}
                  onClick={onClose}
                  className="p-2 rounded hover:bg-white/5"
                  aria-label="Cerrar carrito"
                  title="Cerrar"
                >
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    aria-hidden="true"
                  >
                    <path d="M18.3 5.71 12 12l6.3 6.29-1.41 1.42L10.59 13.4 4.29 19.7 2.88 18.29 9.17 12 2.88 5.71 4.29 4.29l6.3 6.3 6.29-6.3z" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Lista */}
            <div className="overflow-y-auto px-3 py-3">
              {items.length === 0 ? (
                <div className="h-full grid place-items-center text-white/60 text-sm">
                  Tu carrito está vacío.
                </div>
              ) : (
                <ul className="space-y-3">
                  {items.map((it) => {
                    const cover = `/products/${it.id}/cover.jpg`; // fallback de tu Home
                    return (
                      <li
                        key={it.id}
                        className="flex gap-3 rounded-xl border border-white/10 p-2"
                      >
                        <div className="relative w-[84px] shrink-0 aspect-[4/5] overflow-hidden rounded-lg bg-neutral-900">
                          <Image
                            src={cover}
                            alt={it.name}
                            fill
                            className="object-cover"
                            sizes="84px"
                            unoptimized
                          />
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <h4 className="text-sm text-white/90 truncate">
                              {it.name}
                            </h4>
                            <button
                              onClick={() => removeItem(it.id)}
                              className="p-1 rounded hover:bg-white/5 text-white/60 hover:text-white/90"
                              aria-label="Quitar"
                              title="Quitar"
                            >
                              <svg
                                width="18"
                                height="18"
                                viewBox="0 0 24 24"
                                fill="currentColor"
                              >
                                <path d="M6 19c0 1.1.9 2 2 2h8a2 2 0 0 0 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" />
                              </svg>
                            </button>
                          </div>

                          <div className="mt-1 text-xs text-white/60">
                            {money(it.price)} c/u
                          </div>

                          <div className="mt-2 flex items-center justify-between">
                            <div className="inline-flex items-center rounded-full border border-white/15 overflow-hidden">
                              <button
                                className="px-3 py-1.5 text-sm hover:bg-white/5"
                                onClick={() => dec(it.id)}
                                aria-label="Disminuir"
                              >
                                −
                              </button>
                              <span className="px-3 py-1.5 text-sm select-none">
                                {it.qty}
                              </span>
                              <button
                                className="px-3 py-1.5 text-sm hover:bg-white/5"
                                onClick={() => inc(it.id)}
                                aria-label="Aumentar"
                              >
                                +
                              </button>
                            </div>

                            <div className="text-sm font-medium">
                              {money(it.price * it.qty)}
                            </div>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            {/* Totales + acciones */}
            <div className="border-t border-white/10 p-4 space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-white/70">Subtotal</span>
                <span className="font-medium">{money(subtotal)}</span>
              </div>
              <p className="text-xs text-white/50">
                * Envíos y medios de pago se coordinan luego. Podés finalizar
                por WhatsApp o avanzar a pagar.
              </p>

              <div className="grid gap-2">
                <a
                  href={waHref}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center justify-center rounded-md bg-green-500 hover:bg-green-600 text-white text-sm px-4 py-2.5 transition"
                >
                  Finalizar por WhatsApp
                </a>
                <button
                  onClick={() => alert("Integrar con MP/Checkout aquí 🧩")}
                  className="rounded-md border border-white/20 text-white/90 hover:bg-white/10 text-sm px-4 py-2.5"
                >
                  Ir a pagar
                </button>
              </div>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
