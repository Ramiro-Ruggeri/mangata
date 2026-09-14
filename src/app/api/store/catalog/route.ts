import { NextResponse } from "next/server";
import { getCatalog } from "@/lib/commerce/catalog";

export async function GET() {
  const catalog = await getCatalog();
  return NextResponse.json(catalog, {
    headers: { "Cache-Control": "private, no-store" },
  });
}
