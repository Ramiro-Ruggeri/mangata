import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import sharp from "sharp";

// User-approved deterministic split. Never regenerate, upscale or retouch a garment.
const source = "source-assets/catalog-2026-09/campera-corderoy-corregida.png";
const original = await readFile(source);
const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");
const metadata = await sharp(original).metadata();
if (metadata.width !== 1600 || metadata.height !== 1160) {
  throw new Error("The approved source must be 1600 × 1160; inspect any replacement before cropping.");
}
for (const [label, left] of [["frente", 0], ["dorso", 800]]) {
  const crop = { left, top: 0, width: 800, height: 1160 };
  const target = `public/catalog/2026-09/campera-rituales-${label}.webp`;
  await sharp(original).extract(crop).webp({ lossless: true, effort: 6 }).toFile(target);
  const expected = await sharp(original).extract(crop).removeAlpha().raw().toBuffer();
  const actual = await sharp(target).removeAlpha().raw().toBuffer();
  if (!expected.equals(actual)) throw new Error(`Pixel verification failed for ${label}`);
  console.log(`${target}: 800 × 1160, lossless, original pixels verified`);
}
if (hash(original) !== hash(await readFile(source))) throw new Error("Original source changed");
console.log(`Original preserved · SHA-256 ${hash(original)}`);
