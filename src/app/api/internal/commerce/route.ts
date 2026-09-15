import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { getLocalCatalog } from "@/lib/commerce/catalog";
import { ordersDatabase, usesPostgresOrders } from "@/lib/commerce/postgres-orders";
import { reconcileOutstandingPayments } from "@/lib/commerce/reconciliation";

export async function POST(request: Request) {
  const secret = process.env.COMMERCE_OPS_TOKEN ?? "";
  const expected = Buffer.from(`Bearer ${secret}`);
  const supplied = Buffer.from(request.headers.get("authorization") ?? "");
  const reply = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
  if (secret.length < 32 || supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) return reply({ error: "not_found" }, 404);
  if (!usesPostgresOrders()) return reply({ error: "not_configured" }, 503);
  try {
    const action = new URL(request.url).searchParams.get("action");
    if (action === "seed") return reply({ products: await ordersDatabase().seed(getLocalCatalog()) });
    if (action === "status") return reply(await ordersDatabase().status());
    if (action === "reconcile") return reply(await reconcileOutstandingPayments());
    return reply({ error: "invalid_action" }, 400);
  } catch {
    console.error("[commerce] operation_failed");
    return reply({ error: "operation_failed" }, 503);
  }
}
