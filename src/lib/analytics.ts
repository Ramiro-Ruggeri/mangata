"use client";

import { hasAnalyticsConsent } from "./privacy/store";

export type CommerceEventName =
  | "view_item_list"
  | "select_item"
  | "view_item"
  | "add_to_cart"
  | "view_cart"
  | "begin_checkout"
  | "purchase"
  | "search"
  | "measurement_inquiry"
  | "checkout_inquiry"
  | "footer_navigation"
  | "drop_inquiry"
  | "stock_error"
  | "checkout_error";

export type CommerceEventPayload = {
  currency?: "ARS";
  value?: number;
  item_id?: string;
  item_name?: string;
  item_category?: string;
  item_count?: number;
  source?: string;
  transaction_id?: string;
  search_length?: number;
  result_count?: number;
  error_code?: "invalid_cart" | "stock_unavailable" | "checkout_unavailable" | "cart_unavailable" | "network_error";
};

declare global {
  interface Window {
    dataLayer?: Array<Record<string, unknown>>;
  }
}

export function trackCommerceEvent(
  event: CommerceEventName,
  payload: CommerceEventPayload = {},
) {
  if (typeof window === "undefined") return false;
  if (!hasAnalyticsConsent()) { clearCommerceAnalytics(); return false; }
  const detail: Record<string, unknown> = { event, event_source: "mangata" };
  const keys: Array<keyof CommerceEventPayload> = [
    "currency", "value", "item_id", "item_name", "item_category", "item_count", "source",
    "transaction_id", "search_length", "result_count", "error_code",
  ];
  for (const key of keys) {
    const value = payload[key];
    if (typeof value === "number" && Number.isFinite(value)) detail[key] = value;
    else if (typeof value === "string") detail[key] = value.slice(0, 160);
  }
  window.dataLayer ??= [];
  window.dataLayer.push(detail);
  // This is a bounded local instrumentation buffer, not an installed analytics service.
  let owned = window.dataLayer.filter((entry) => entry.event_source === "mangata").length;
  for (let index = 0; owned > 100 && index < window.dataLayer.length;) {
    if (window.dataLayer[index].event_source === "mangata") { window.dataLayer.splice(index, 1); owned--; }
    else index++;
  }
  window.dispatchEvent(new CustomEvent("mangata:commerce", { detail }));
  return true;
}

const trackedPurchases = new Set<string>();
export function clearCommerceAnalytics() {
  trackedPurchases.clear();
  if (typeof window === "undefined") return;
  if (Array.isArray(window.dataLayer)) {
    for (let index = window.dataLayer.length - 1; index >= 0; index--) {
      if (window.dataLayer[index].event_source === "mangata") window.dataLayer.splice(index, 1);
    }
  }
  try {
    const storage = window.sessionStorage;
    for (let index = storage.length - 1; index >= 0; index--) {
      const key = storage.key(index);
      if (key?.startsWith("mangata_purchase_")) storage.removeItem(key);
    }
  } catch { /* Browser storage can be disabled; in-memory state has still been cleared. */ }
}

export function trackVerifiedPurchase(transactionId: string, value: number, itemCount: number) {
  if (typeof window === "undefined") return;
  if (!hasAnalyticsConsent()) { clearCommerceAnalytics(); return; }
  if (trackedPurchases.has(transactionId)) return;
  const key = `mangata_purchase_${transactionId}`;
  try { if (window.sessionStorage.getItem(key)) return; } catch { /* Storage may be blocked. */ }
  if (!trackCommerceEvent("purchase", { transaction_id: transactionId, currency: "ARS", value, item_count: itemCount })) return;
  trackedPurchases.add(transactionId);
  try { window.sessionStorage.setItem(key, "1"); } catch { /* In-memory dedup remains active. */ }
}
