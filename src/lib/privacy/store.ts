import { CONSENT_KEY, createConsent, parseConsent } from "./consent";

const listeners = new Set<() => void>();
// Used only if persistence fails. A reload starts denied again in that case.
let memoryChoice: string | null | undefined;

export function getConsentSnapshot(): string | null {
  if (typeof window === "undefined") return null;
  let raw: string | null;
  if (memoryChoice !== undefined) raw = memoryChoice;
  else {
    try { raw = window.localStorage.getItem(CONSENT_KEY); }
    catch { raw = null; }
  }
  return parseConsent(raw) ? raw : null;
}

// Empty string is a hydration sentinel, never an accepted choice.
export function getServerConsentSnapshot() { return ""; }
export function hasAnalyticsConsent() { return parseConsent(getConsentSnapshot())?.analytics === true; }

export function subscribeConsent(listener: () => void) {
  listeners.add(listener);
  const onStorage = (event: StorageEvent) => {
    if (event.key === CONSENT_KEY || event.key === null) { memoryChoice = undefined; listener(); }
  };
  const onVisible = () => { if (document.visibilityState === "visible") listener(); };
  window.addEventListener("storage", onStorage);
  document.addEventListener("visibilitychange", onVisible);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
    document.removeEventListener("visibilitychange", onVisible);
  };
}

export function writeConsent(analytics: boolean) {
  const raw = JSON.stringify(createConsent(analytics));
  let persisted = false;
  if (typeof window !== "undefined") {
    try { window.localStorage.setItem(CONSENT_KEY, raw); memoryChoice = undefined; persisted = true; }
    catch { memoryChoice = raw; }
  }
  listeners.forEach((listener) => listener());
  return persisted;
}

export function refreshConsent() {
  if (!getConsentSnapshot()) {
    memoryChoice = undefined;
    try { window.localStorage.removeItem(CONSENT_KEY); } catch { /* Optional measurement remains denied. */ }
  }
  listeners.forEach((listener) => listener());
}
