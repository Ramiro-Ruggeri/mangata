import { usesPostgresOrders } from "@/lib/commerce/postgres-orders";
import { onStockChange } from "@/lib/commerce/stock-events";

const HEARTBEAT_MS = 20_000;

/** Says only that something changed. The visitor then asks the catalog, which remains the single source of truth. */
export async function GET(request: Request) {
  // 204 tells the browser not to reconnect.
  if (!usesPostgresOrders()) return new Response(null, { status: 204 });
  const encoder = new TextEncoder();
  let stop = () => {};
  const stream = new ReadableStream({
    start(controller) {
      const send = (text: string) => { try { controller.enqueue(encoder.encode(text)); } catch { stop(); } };
      const unsubscribe = onStockChange(() => send("data: changed\n\n"));
      if (!unsubscribe) { controller.close(); return; }
      send("retry: 5000\n\n");
      const heartbeat = setInterval(() => send(": sigue\n\n"), HEARTBEAT_MS);
      stop = () => {
        clearInterval(heartbeat);
        unsubscribe();
        request.signal.removeEventListener("abort", stop);
      };
      request.signal.addEventListener("abort", stop);
    },
    cancel() { stop(); },
  });
  return new Response(stream, { headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache, no-transform", "X-Accel-Buffering": "no" } });
}
