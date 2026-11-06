import { databasePool } from "@/lib/commerce/postgres-orders";

/** A photo never changes under its id, so browsers and the image optimizer may keep it forever. */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) return new Response(null, { status: 404 });
  const { rows: [row] } = await databasePool().query("SELECT bytes FROM catalog_images WHERE id=$1", [id]);
  if (!row) return new Response(null, { status: 404 });
  return new Response(new Uint8Array(row.bytes), { headers: { "Content-Type": "image/webp", "Cache-Control": "public, max-age=31536000, immutable", "X-Content-Type-Options": "nosniff" } });
}
