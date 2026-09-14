import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const source = path.resolve("source-assets/catalog-2026-09");
const files = (await fs.readdir(source)).filter((name) => /\.(jpe?g|png)$/i.test(name) && name !== "contact-sheet.jpg").sort();
const tiles = [];
const metadata = [];
for (const [index, name] of files.entries()) {
  const input = path.join(source, name);
  const meta = await sharp(input).metadata();
  metadata.push({ name, width: meta.width, height: meta.height, bytes: (await fs.stat(input)).size });
  const thumbnail = await sharp(input).rotate().resize(280, 260, { fit: "contain", background: "#f1f0ed" }).png().toBuffer();
  const label = Buffer.from(`<svg width="280" height="40"><rect width="280" height="40" fill="white"/><text x="8" y="16" font-size="12" font-family="sans-serif">${name}</text><text x="8" y="32" font-size="11" font-family="sans-serif">${meta.width} × ${meta.height}</text></svg>`);
  tiles.push({ input: thumbnail, left: (index % 4) * 280, top: Math.floor(index / 4) * 300 });
  tiles.push({ input: label, left: (index % 4) * 280, top: Math.floor(index / 4) * 300 + 260 });
}
await sharp({ create: { width: 1120, height: Math.ceil(files.length / 4) * 300, channels: 3, background: "white" } }).composite(tiles).jpeg({ quality: 85 }).toFile(path.join(source, "contact-sheet.jpg"));
console.log(JSON.stringify(metadata, null, 2));
