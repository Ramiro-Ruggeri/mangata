import { NextResponse } from "next/server";
import sharp from "sharp";
import { adminStore, currentAdmin } from "@/lib/admin/server";

const MAX_BYTES = 12 * 1024 * 1024;

/** Re-encoding keeps only pixels: SVG, scripts and the phone's location data never get through. */
export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin || new URL(origin).host !== request.headers.get("host")) return NextResponse.json({ error: "origin" }, { status: 403 });
  const admin = await currentAdmin();
  if (!admin) return NextResponse.json({ error: "session" }, { status: 401 });
  if (Number(request.headers.get("content-length") ?? 0) > MAX_BYTES) return NextResponse.json({ error: "size" }, { status: 413 });
  const input = Buffer.from(await request.arrayBuffer());
  if (!input.length || input.length > MAX_BYTES) return NextResponse.json({ error: "size" }, { status: 413 });
  try {
    const source = sharp(input, { limitInputPixels: 60_000_000 });
    const { format } = await source.metadata();
    if (!format || !["jpeg", "png", "webp", "heif", "avif"].includes(format)) return NextResponse.json({ error: "type" }, { status: 415 });
    const { data, info } = await source.rotate().resize({ width: 1800, height: 1800, fit: "inside", withoutEnlargement: true }).webp({ quality: 84 }).toBuffer({ resolveWithObject: true });
    const id = await adminStore().savePhoto(admin, { bytes: data, width: info.width, height: info.height });
    return NextResponse.json({ url: `/media/${id}` });
  } catch {
    return NextResponse.json({ error: "type" }, { status: 415 });
  }
}
