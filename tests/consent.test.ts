import test from "node:test";
import assert from "node:assert/strict";
import { CONSENT_KEY, CONSENT_TTL_MS, createConsent, parseConsent } from "../src/lib/privacy/consent";
import { getConsentSnapshot, hasAnalyticsConsent } from "../src/lib/privacy/store";
import { savePrivacyChoice } from "../src/lib/privacy/actions";
import { clearCommerceAnalytics, trackCommerceEvent, trackVerifiedPurchase } from "../src/lib/analytics";

test("consent is explicit, versioned and distinguishes rejection from no choice", () => {
  const now = Date.now();
  assert.equal(parseConsent(null, now), null);
  assert.equal(parseConsent(JSON.stringify(createConsent(false, now)), now)?.analytics, false);
  assert.equal(parseConsent(JSON.stringify(createConsent(true, now)), now)?.analytics, true);
  assert.equal(createConsent(false, now).expiresAt, now + CONSENT_TTL_MS);
});

test("consent fails closed for expired, future, changed version, malformed and extended records", () => {
  const now = Date.now();
  const valid = createConsent(true, now);
  const invalid = [null, "", "{", "null", "[]", JSON.stringify({ ...valid, version: 0 }),
    JSON.stringify({ ...valid, analytics: "true" }), JSON.stringify({ ...valid, decidedAt: now + 1 }),
    JSON.stringify({ ...valid, expiresAt: valid.expiresAt + 1 }), JSON.stringify({ analytics: true }), " ".repeat(513)];
  for (const raw of invalid) assert.equal(parseConsent(raw, now), null);
  assert.equal(parseConsent(JSON.stringify(valid), valid.expiresAt), null);
  assert.equal(parseConsent(JSON.stringify(valid), valid.expiresAt - 1)?.analytics, true);
});

class MemoryStorage implements Storage {
  private values = new Map<string, string>();
  get length() { return this.values.size; }
  clear() { this.values.clear(); }
  getItem(key: string) { return this.values.get(key) ?? null; }
  key(index: number) { return [...this.values.keys()][index] ?? null; }
  removeItem(key: string) { this.values.delete(key); }
  setItem(key: string, value: string) { this.values.set(key, String(value)); }
}

test("analytics never creates a queue, event, purchase marker or request before consent; revocation is selective", () => {
  const previousWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
  const localStorage = new MemoryStorage();
  const sessionStorage = new MemoryStorage();
  const events: Event[] = [];
  let requests = 0;
  const previousFetch = globalThis.fetch;
  const browser: { localStorage: Storage; sessionStorage: Storage; dataLayer?: Array<Record<string, unknown>>; dispatchEvent: (event: Event) => boolean } = {
    localStorage, sessionStorage, dispatchEvent: (event) => { events.push(event); return true; },
  };
  Object.defineProperty(globalThis, "window", { configurable: true, value: browser });
  globalThis.fetch = (async () => { requests++; throw new Error("Unexpected measurement request"); }) as typeof fetch;
  try {
    assert.equal(hasAnalyticsConsent(), false);
    assert.equal(trackCommerceEvent("view_item", { item_id: "MNGT-003" }), false);
    assert.equal(trackCommerceEvent("footer_navigation", { source: "footer_collection" }), false);
    assert.equal(trackCommerceEvent("measurement_inquiry", { source: "footer" }), false);
    assert.equal(trackCommerceEvent("drop_inquiry", { source: "footer" }), false);
    trackVerifiedPurchase("not-consented", 1000, 1);
    assert.equal(browser.dataLayer, undefined);
    assert.equal(events.length, 0);
    assert.equal(sessionStorage.length, 0);
    assert.equal(requests, 0);

    assert.equal(savePrivacyChoice(false), true);
    assert.equal(parseConsent(getConsentSnapshot())?.analytics, false);
    assert.equal(trackCommerceEvent("search", { search_length: 5 }), false);
    assert.equal(events.length, 0);

    savePrivacyChoice(true);
    assert.equal(hasAnalyticsConsent(), true);
    assert.equal(events.length, 0, "accepting does not replay earlier actions");
    assert.equal(trackCommerceEvent("add_to_cart", { item_id: "MNGT-003" }), true);
    assert.equal(events.length, 1);
    trackVerifiedPurchase("approved-after-consent", 1000, 1);
    trackVerifiedPurchase("approved-after-consent", 1000, 1);
    assert.equal(events.length, 2, "verified purchase is deduplicated only after consent");
    assert.equal(sessionStorage.getItem("mangata_purchase_approved-after-consent"), "1");

    localStorage.setItem("mangata_cart_v2", "[real-bag]");
    sessionStorage.setItem("unrelated", "keep");
    browser.dataLayer!.push({ event: "unrelated", event_source: "another-app" });
    savePrivacyChoice(false);
    assert.equal(hasAnalyticsConsent(), false);
    assert.deepEqual(browser.dataLayer, [{ event: "unrelated", event_source: "another-app" }]);
    assert.equal(sessionStorage.getItem("mangata_purchase_approved-after-consent"), null);
    assert.equal(sessionStorage.getItem("unrelated"), "keep");
    assert.equal(localStorage.getItem("mangata_cart_v2"), "[real-bag]");
    trackVerifiedPurchase("new-but-revoked", 1000, 1);
    assert.equal(events.length, 2);
    assert.equal(requests, 0);

    localStorage.setItem(CONSENT_KEY, JSON.stringify(createConsent(true, Date.now() - CONSENT_TTL_MS - 1)));
    assert.equal(hasAnalyticsConsent(), false);
    assert.equal(trackCommerceEvent("view_cart"), false);
    localStorage.setItem(CONSENT_KEY, "broken-record");
    assert.equal(hasAnalyticsConsent(), false);
  } finally {
    clearCommerceAnalytics();
    if (previousWindow) Object.defineProperty(globalThis, "window", previousWindow);
    else Reflect.deleteProperty(globalThis, "window");
    globalThis.fetch = previousFetch;
  }
});

test("blocked persistence keeps the explicit choice in memory and can still be revoked", () => {
  const previousWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
  const localStorage = new MemoryStorage();
  const sessionStorage = new MemoryStorage();
  const realSet = localStorage.setItem.bind(localStorage);
  localStorage.setItem = () => { throw new Error("Storage denied"); };
  const browser = { localStorage, sessionStorage };
  Object.defineProperty(globalThis, "window", { configurable: true, value: browser });
  try {
    assert.equal(savePrivacyChoice(true), false);
    assert.equal(hasAnalyticsConsent(), true);
    assert.equal(localStorage.getItem(CONSENT_KEY), null);
    assert.equal(savePrivacyChoice(false), false);
    assert.equal(hasAnalyticsConsent(), false);
  } finally {
    // Reset the module's in-memory fallback through the same successful-write API.
    localStorage.setItem = realSet;
    savePrivacyChoice(false);
    if (previousWindow) Object.defineProperty(globalThis, "window", previousWindow);
    else Reflect.deleteProperty(globalThis, "window");
  }
});
