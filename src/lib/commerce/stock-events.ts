import "server-only";
import { Client } from "pg";

const CHANNEL = "mangata_stock";
const MAX_VISITORS = 500;
const RECONNECT_MS = 5000;

type Listener = () => void;
const listeners = new Set<Listener>();
let client: Client | null = null;
let retry: ReturnType<typeof setTimeout> | undefined;

const announce = () => listeners.forEach((listener) => listener());

/** One database connection for the whole process, however many people have the store open. */
async function connect() {
  if (client || !listeners.size) return;
  const next = new Client({ connectionString: process.env.MANGATA_DATABASE_URL, application_name: "mangata-stock", connectionTimeoutMillis: 3000 });
  client = next;
  const lost = () => {
    if (client !== next) return;
    client = null;
    next.removeAllListeners();
    next.end().catch(() => undefined);
    clearTimeout(retry);
    retry = setTimeout(() => void connect(), RECONNECT_MS);
  };
  next.on("error", lost);
  next.on("end", lost);
  next.on("notification", announce);
  try {
    await next.connect();
    await next.query(`LISTEN ${CHANNEL}`);
    // Anything may have changed while disconnected, so everyone checks again.
    announce();
  } catch {
    lost();
  }
}

/** Returns the way to stop listening, or null when full: the visitor then relies on the periodic refresh. */
export function onStockChange(listener: Listener) {
  if (listeners.size >= MAX_VISITORS) return null;
  listeners.add(listener);
  void connect();
  return () => {
    listeners.delete(listener);
    if (listeners.size) return;
    clearTimeout(retry);
    const current = client;
    client = null;
    current?.removeAllListeners();
    current?.end().catch(() => undefined);
  };
}
