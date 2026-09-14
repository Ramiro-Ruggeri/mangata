"use client";

import { createContext, useCallback, useContext, useMemo, useRef, useState, useSyncExternalStore } from "react";
import type { CommerceMode, StoreProduct } from "@/lib/commerce/types";
import CartDrawer from "@/components/CartDrawer";
import { useExperience } from "@/components/experience/ExperienceProvider";
import { trackCommerceEvent } from "@/lib/analytics";
import type { CommerceError } from "@/lib/commerce/one-of-one";

const CART_KEY = "mangata_cart_v2";
const LEGACY_CART_KEY = "mngt_cart_v1";
export type CartLine = {
  id: string; sku: string; name: string; price: number; image: string; qty: number; remoteItemId?: string;
};
type SyncState = "error" | "idle" | "syncing" | "synced";
type ErrorCode = CommerceError["code"] | "network_error";
type SyncPayload = { error?: string; code?: ErrorCode; itemId?: string; url?: string; init_point?: string; product?: StoreProduct };
type CartContextValue = {
  items: CartLine[]; count: number; subtotal: number; open: boolean; mode: CommerceMode;
  syncState: SyncState; syncMessage?: string;
  checkoutReady: boolean;
  addItem: (product: StoreProduct) => Promise<boolean>;
  removeItem: (id: string) => Promise<void>;
  clear: () => Promise<void>;
  clearPurchased: (skus: string[]) => void;
  checkout: () => Promise<void>;
  openCart: () => void; closeCart: () => void; restoreCartFocus: () => void;
};
const EMPTY_CART: CartLine[] = [];
let cartSnapshot: CartLine[] = EMPTY_CART;
let cartHydrated = false;
const cartListeners = new Set<() => void>();

function safeParseCart(raw: string | null): CartLine[] {
  if (!raw) return EMPTY_CART;
  try {
    const value = JSON.parse(raw) as Array<Partial<CartLine> & { id?: number | string }>;
    if (!Array.isArray(value)) return EMPTY_CART;
    const unique = new Map<string, CartLine>();
    for (const item of value.slice(0, 50)) {
      if (!item || item.id == null || !item.name || !Number.isFinite(Number(item.price)) || Number(item.price) <= 0) continue;
      const sku = typeof item.sku === "string" ? item.sku : `MNGT-${String(item.id).padStart(3, "0")}`;
      unique.set(sku, {
        id: String(item.id), sku, name: String(item.name), price: Number(item.price),
        image: typeof item.image === "string" ? item.image.replace(/\.(png|jpe?g)$/i, ".webp") : `/products/${item.id}/cover.webp`,
        qty: 1, remoteItemId: typeof item.remoteItemId === "string" ? item.remoteItemId : undefined,
      });
    }
    return [...unique.values()];
  } catch { return EMPTY_CART; }
}

function loadBrowserCart() {
  if (typeof window === "undefined") return EMPTY_CART;
  try { return safeParseCart(window.localStorage.getItem(CART_KEY) || window.localStorage.getItem(LEGACY_CART_KEY)); }
  catch { return cartSnapshot; }
}
function emitCart() { cartListeners.forEach((listener) => listener()); }
function writeCart(items: CartLine[]) {
  cartSnapshot = items;
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(CART_KEY, JSON.stringify(items));
      window.localStorage.removeItem(LEGACY_CART_KEY);
    } catch { /* Keep the bag usable when browser storage is blocked. */ }
  }
  emitCart();
}
function subscribeCart(listener: () => void) {
  cartListeners.add(listener);
  if (typeof window !== "undefined" && !cartHydrated) {
    cartHydrated = true; cartSnapshot = loadBrowserCart(); queueMicrotask(emitCart);
  }
  const onStorage = (event: StorageEvent) => {
    if (event.key === CART_KEY || event.key === LEGACY_CART_KEY) { cartSnapshot = loadBrowserCart(); emitCart(); }
  };
  window.addEventListener("storage", onStorage);
  return () => { cartListeners.delete(listener); window.removeEventListener("storage", onStorage); };
}
class CartRequestError extends Error {
  constructor(public code: ErrorCode) { super(code); }
}
const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children, mode, checkoutReady }: { children: React.ReactNode; mode: CommerceMode; checkoutReady: boolean }) {
  const items = useSyncExternalStore(subscribeCart, () => cartSnapshot, () => EMPTY_CART);
  const { activeOverlay, openOverlay, closeOverlay } = useExperience();
  const open = activeOverlay === "cart";
  const [syncState, setSyncState] = useState<SyncState>("idle");
  const [syncMessage, setSyncMessage] = useState<string>();
  const operations = useRef<Promise<unknown>>(Promise.resolve());
  const cartTrigger = useRef<HTMLElement | null>(null);
  const openCart = useCallback(() => {
    // Capture the trigger before inert removes focus from the page content.
    if (document.documentElement.dataset.activeOverlay !== "cart") cartTrigger.current = document.activeElement as HTMLElement | null;
    openOverlay("cart");
  }, [openOverlay]);
  const closeCart = useCallback(() => closeOverlay("cart"), [closeOverlay]);
  const restoreCartFocus = useCallback(() => {
    requestAnimationFrame(() => {
      if (document.documentElement.dataset.activeOverlay) return;
      const trigger = cartTrigger.current;
      const usable = (element: HTMLElement | null): element is HTMLElement => !!element?.isConnected && !element.matches(":disabled") && !element.closest("[inert]") && getComputedStyle(element).visibility !== "hidden" && element.getClientRects().length > 0;
      const fallback = document.querySelector<HTMLElement>('button[aria-label^="Abrir bolsa"]');
      if (usable(trigger)) trigger.focus({ preventScroll: true });
      else if (usable(fallback)) fallback.focus({ preventScroll: true });
    });
  }, []);
  const enqueue = useCallback(<T,>(operation: () => Promise<T>): Promise<T> => {
    const next = operations.current.catch(() => undefined).then(operation);
    operations.current = next;
    return next;
  }, []);
  const runSync = useCallback(async (request: RequestInit & { url?: string }): Promise<SyncPayload> => {
    setSyncState("syncing"); setSyncMessage(undefined);
    let response: Response;
    try {
      response = await fetch(request.url || "/api/store/cart", {
        ...request, headers: { "Content-Type": "application/json", ...request.headers }, signal: AbortSignal.timeout(15_000),
      });
    } catch { throw new CartRequestError("network_error"); }
    const payload = await response.json().catch(() => ({})) as SyncPayload;
    if (!response.ok) {
      const accepted: ErrorCode[] = ["invalid_cart", "stock_unavailable", "checkout_unavailable", "cart_unavailable"];
      throw new CartRequestError(payload.code && accepted.includes(payload.code) ? payload.code : "checkout_unavailable");
    }
    setSyncState("synced");
    return payload;
  }, []);
  const showError = useCallback((error: unknown, event: "stock_error" | "checkout_error" = "stock_error") => {
    const code = error instanceof CartRequestError ? error.code : "network_error";
    const message = code === "stock_unavailable"
      ? "Esta pieza ya no está disponible. Revisá la colección o escribinos para ayudarte."
      : code === "invalid_cart"
        ? "Revisá tu bolsa antes de seguir."
        : event === "checkout_error"
          ? "No pudimos abrir el pago. Tu bolsa sigue guardada; intentá de nuevo o escribinos."
          : "No pudimos actualizar tu bolsa. Intentá de nuevo en un momento.";
    setSyncState("error"); setSyncMessage(message);
    trackCommerceEvent(event, { error_code: code, source: "bag" });
  }, []);

  const addItem = useCallback((product: StoreProduct) => {
    openCart();
    return enqueue(async () => {
      if (!product.inventory.isInStock || product.source === "local-fallback") {
        showError(new CartRequestError("stock_unavailable"));
        return false;
      }
      if (cartSnapshot.some((item) => item.sku === product.sku)) return true;
      try {
        const payload = await runSync({ method: "POST", body: JSON.stringify({ sku: product.sku }) });
        const current = payload.product;
        if (!current || current.sku !== product.sku) throw new CartRequestError("cart_unavailable");
        writeCart([...cartSnapshot.filter((item) => item.sku !== current.sku), {
          id: current.id, sku: current.sku, name: current.name, price: current.price,
          image: current.image, qty: 1, remoteItemId: payload.itemId,
        }]);
        trackCommerceEvent("add_to_cart", {
          currency: "ARS", value: current.price, item_id: current.sku, item_name: current.name, item_category: current.category,
        });
        return true;
      } catch (error) { showError(error); return false; }
    });
  }, [enqueue, openCart, runSync, showError]);

  const removeItem = useCallback((id: string) => enqueue(async () => {
    const line = cartSnapshot.find((item) => item.id === id);
    if (!line) return;
    try {
      if (mode === "evershop" && line.remoteItemId) {
        await runSync({ method: "DELETE", url: `/api/store/cart?itemId=${encodeURIComponent(line.remoteItemId)}` });
      }
      writeCart(cartSnapshot.filter((item) => item.id !== id));
      setSyncMessage(undefined); setSyncState("idle");
    } catch (error) { showError(error); }
  }), [enqueue, mode, runSync, showError]);

  const clear = useCallback(() => enqueue(async () => {
    try {
      // Commit each successful removal independently; partial failures cannot restore deleted remote lines.
      for (const line of [...cartSnapshot]) {
        if (mode === "evershop" && line.remoteItemId) {
          await runSync({ method: "DELETE", url: `/api/store/cart?itemId=${encodeURIComponent(line.remoteItemId)}` });
        }
        writeCart(cartSnapshot.filter((item) => item.sku !== line.sku));
      }
      setSyncMessage(undefined); setSyncState("idle");
    } catch (error) { showError(error); }
  }), [enqueue, mode, runSync, showError]);

  const clearPurchased = useCallback((skus: string[]) => {
    // Only invoked with SKUs from the server-verified receipt; unrelated newer selections remain.
    if (!cartHydrated) { cartHydrated = true; cartSnapshot = loadBrowserCart(); }
    writeCart(cartSnapshot.filter((item) => !skus.includes(item.sku)));
  }, []);

  const checkout = useCallback(() => enqueue(async () => {
    if (!checkoutReady || !cartSnapshot.length) return;
    try {
      const payload = await runSync(mode === "evershop"
        ? { method: "POST", url: "/api/store/checkout", body: JSON.stringify({ skus: cartSnapshot.map((item) => item.sku) }) }
        : { method: "POST", url: "/api/mp", body: JSON.stringify({ items: cartSnapshot.map((item) => ({ id: item.id, sku: item.sku, qty: 1 })) }) });
      const destination = mode === "evershop" ? payload.url : payload.init_point;
      if (!destination || new URL(destination).protocol !== "https:") throw new CartRequestError("checkout_unavailable");
      trackCommerceEvent("begin_checkout", { currency: "ARS", value: cartSnapshot.reduce((sum, item) => sum + item.price, 0), item_count: cartSnapshot.length });
      window.location.assign(destination);
    } catch (error) { showError(error, "checkout_error"); }
  }), [checkoutReady, enqueue, mode, runSync, showError]);

  const value = useMemo<CartContextValue>(() => ({
    items, count: items.length, subtotal: items.reduce((sum, item) => sum + item.price, 0),
    open, mode, syncState, syncMessage, checkoutReady, addItem, removeItem, clear, clearPurchased, checkout, openCart, closeCart, restoreCartFocus,
  }), [items, open, mode, syncState, syncMessage, checkoutReady, addItem, removeItem, clear, clearPurchased, checkout, openCart, closeCart, restoreCartFocus]);
  return <CartContext.Provider value={value}><div inert={open}>{children}</div><CartDrawer /></CartContext.Provider>;
}

export function useCart() {
  const value = useContext(CartContext);
  if (!value) throw new Error("useCart debe usarse dentro de CartProvider");
  return value;
}
