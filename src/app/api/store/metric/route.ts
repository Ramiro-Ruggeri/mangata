import { COUNTED, countEvent, trafficSource, type CountedEvent } from "@/lib/admin/metrics";
import { databasePool, usesPostgresOrders } from "@/lib/commerce/postgres-orders";

const BOTS = /bot|crawl|spider|slurp|headless|lighthouse|preview|facebookexternalhit/i;
const LIMIT_PER_MINUTE = 120;
let window = { minute: 0, seen: new Map<string, number>() };

/** Kept in memory for one minute and never written anywhere. */
function overLimit(ip: string) {
  const minute = Math.floor(Date.now() / 60_000);
  if (window.minute !== minute) window = { minute, seen: new Map() };
  const count = (window.seen.get(ip) ?? 0) + 1;
  window.seen.set(ip, count);
  return count > LIMIT_PER_MINUTE;
}

const done = () => new Response(null, { status: 204 });

/** Adds one to a daily counter. Stores no address, cookie or identifier, and a failure never reaches the visitor. */
export async function POST(request: Request) {
  const host = request.headers.get("host") ?? "";
  const origin = request.headers.get("origin");
  if (!usesPostgresOrders() || !origin || new URL(origin).host !== host) return done();
  if (BOTS.test(request.headers.get("user-agent") ?? "") || overLimit(request.headers.get("x-real-ip") ?? "")) return done();
  try {
    const body = JSON.parse((await request.text()).slice(0, 300)) as { event?: string; sku?: string; referrer?: string };
    if (!COUNTED.includes(body.event as CountedEvent)) return done();
    const event = body.event as CountedEvent;
    const dimension = event === "page_view" ? trafficSource(String(body.referrer ?? "").slice(0, 200), host)
      : ["product_view", "add_to_cart"].includes(event) && /^MNGT-[\w-]{1,40}$/.test(String(body.sku)) ? String(body.sku) : "";
    await countEvent(databasePool(), event, dimension);
  } catch { /* Counting never gets in the way of shopping. */ }
  return done();
}
