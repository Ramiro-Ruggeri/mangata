import sharp from "sharp";
import { mkdir } from "node:fs/promises";

// Preserve the versioned master and original brand mark. Never upscale or change a sale garment.
await mkdir("public/campaign", { recursive: true });
const master = "source-assets/campaign/rework-still-life-v2.png";
await sharp(master).webp({ quality: 90, effort: 6 }).toFile("public/campaign/rework-still-life-v2.webp");
const logo = "public/brand/logoAnimacionMANGATA.png";
await sharp(logo).resize(64, 64).png({ compressionLevel: 9 }).toFile("src/app/icon.png");
await sharp(logo).resize(180, 180).png({ compressionLevel: 9 }).toFile("src/app/apple-icon.png");
for (const file of [master, "public/campaign/rework-still-life-v2.webp", "src/app/icon.png", "src/app/apple-icon.png"]) {
  const meta = await sharp(file).metadata();
  console.log(`${file}: ${meta.width} × ${meta.height}`);
}
