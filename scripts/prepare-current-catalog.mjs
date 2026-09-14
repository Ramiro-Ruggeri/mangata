import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const source = path.resolve("source-assets/catalog-2026-09");
const destination = path.resolve("public/catalog/2026-09");
const manifest = JSON.parse(await fs.readFile("docs/catalog-source-2026-09.json", "utf8"));
const rejected = new Set(manifest.correction.replaces);
const names = [...manifest.files.map((file) => file.filename).filter((name) => !rejected.has(name)), manifest.correction.filename];
await fs.mkdir(destination, { recursive: true });
let total = 0;
for (const name of names) {
  const output = path.join(destination, name.replace(/\.(png|jpe?g)$/i, ".webp"));
  const info = await sharp(path.join(source, name))
    .rotate()
    .resize({ width: 1800, height: 2400, fit: "inside", withoutEnlargement: true })
    .webp({ quality: 86, effort: 5, smartSubsample: true })
    .toFile(output);
  total += info.size;
  console.log(`${path.basename(output)}: ${info.width} × ${info.height}, ${Math.round(info.size / 1024)} KB`);
}
console.log(`${names.length} images, ${(total / 1024 / 1024).toFixed(2)} MB. Originals preserved; no upscaling or crop.`);
