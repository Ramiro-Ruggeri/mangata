/** Browser side of the live stock: one connection per page, closed while the tab is hidden. */
type Listener = () => void;
const listeners = new Set<Listener>();
let source: EventSource | null = null;

// A small random wait, so one sale does not make every open store ask at the same instant.
const announce = () => { window.setTimeout(() => listeners.forEach((listener) => listener()), Math.random() * 400); };

function open() {
  if (source || typeof EventSource === "undefined") return;
  source = new EventSource("/api/store/stock/events");
  source.onmessage = announce;
}

function close() {
  source?.close();
  source = null;
}

function onVisibility() {
  if (document.visibilityState === "hidden") { close(); return; }
  open();
  announce();
}

export function subscribeToStock(listener: Listener) {
  listeners.add(listener);
  if (listeners.size === 1) {
    if (document.visibilityState !== "hidden") open();
    document.addEventListener("visibilitychange", onVisibility);
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size) return;
    close();
    document.removeEventListener("visibilitychange", onVisibility);
  };
}
