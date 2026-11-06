// Traces tribal appliques from MANGATA's own product photos into SVG.
// potrace (GPL) and svgo run as offline tools and are not project dependencies:
//   TRACER_DIR=<folder with potrace and svgo installed> node scripts/trace-tribals.mjs
import { createRequire } from "node:module";
import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import sharp from "sharp";

const tools = createRequire(join(resolve(process.env.TRACER_DIR ?? "."), "noop.js"));
const potrace = tools("potrace");
const { optimize } = tools("svgo");

const PHOTOS = "public/catalog/2026-09";
const OUT = "public/tribals";
const SCALE = 3;

// Boxes are in the photo's own pixels. `mode` says whether the motif is darker or lighter than its surroundings.
const SOURCES = [
  { id: "bermuda-llama", productId: 11, photo: "bermuda-tribal-azul-delante", box: [205, 1060, 265, 550], mode: "dark", threshold: 56, blur: 1.2 },
  { id: "bermuda-estrella", productId: 11, photo: "bermuda-tribal-azul-delante", box: [780, 815, 310, 485], mode: "dark", threshold: 56, blur: 1.2 },
  { id: "bermuda-garra", productId: 11, photo: "bermuda-tribal-azul-delante", box: [935, 1330, 310, 410], mode: "dark", threshold: 56, blur: 1.2 },
];

const largestComponent = (mask, w, h) => {
  const label = new Int32Array(w * h);
  const sizes = [0];
  for (let start = 0; start < mask.length; start++) {
    if (!mask[start] || label[start]) continue;
    const id = sizes.length;
    const stack = [start];
    let size = 0;
    label[start] = id;
    while (stack.length) {
      const i = stack.pop();
      size++;
      const x = i % w;
      for (const n of [x > 0 ? i - 1 : -1, x < w - 1 ? i + 1 : -1, i - w, i + w]) {
        if (n >= 0 && n < mask.length && mask[n] && !label[n]) { label[n] = id; stack.push(n); }
      }
    }
    sizes.push(size);
  }
  const best = sizes.indexOf(Math.max(...sizes));
  return { mask: mask.map((_, i) => (label[i] === best ? 1 : 0)), area: sizes[best] };
};

/** Small gaps are threads crossing the fabric; large ones belong to the design and stay open. */
const fillSmallHoles = (mask, w, h, limit) => {
  const seen = new Uint8Array(w * h);
  const out = Uint8Array.from(mask);
  for (let start = 0; start < mask.length; start++) {
    if (mask[start] || seen[start]) continue;
    const stack = [start], cells = [];
    let border = false;
    seen[start] = 1;
    while (stack.length) {
      const i = stack.pop();
      cells.push(i);
      const x = i % w, y = Math.floor(i / w);
      if (x === 0 || y === 0 || x === w - 1 || y === h - 1) border = true;
      for (const n of [x > 0 ? i - 1 : -1, x < w - 1 ? i + 1 : -1, i - w, i + w]) {
        if (n >= 0 && n < mask.length && !mask[n] && !seen[n]) { seen[n] = 1; stack.push(n); }
      }
    }
    if (!border && cells.length < limit) for (const i of cells) out[i] = 1;
  }
  return out;
};

mkdirSync(OUT, { recursive: true });
const manifest = [];
for (const source of SOURCES) {
  const [left, top, width, height] = source.box;
  const { data, info } = await sharp(join(PHOTOS, `${source.photo}.webp`))
    .extract({ left, top, width, height }).resize(width * SCALE, height * SCALE, { kernel: "lanczos3" })
    .greyscale().blur(source.blur).raw().toBuffer({ resolveWithObject: true });
  const w = info.width, h = info.height;
  let mask = Uint8Array.from(data, v => (source.mode === "dark" ? v < source.threshold : v > source.threshold) ? 1 : 0);
  for (let n = 0; n < (source.grow ?? 0); n++) {
    const before = Uint8Array.from(mask);
    for (let i = 0; i < mask.length; i++) if (!before[i] && (before[i - 1] || before[i + 1] || before[i - w] || before[i + w])) mask[i] = 1;
  }
  ({ mask } = largestComponent(mask, w, h));
  mask = fillSmallHoles(mask, w, h, source.solid ? w * h : w * h * .0006);

  let minX = w, minY = h, maxX = 0, maxY = 0, area = 0;
  for (let i = 0; i < mask.length; i++) if (mask[i]) {
    const x = i % w, y = Math.floor(i / w);
    minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y); maxY = Math.max(maxY, y); area++;
  }
  const bw = maxX - minX + 1, bh = maxY - minY + 1;
  const cropped = new Uint8Array(bw * bh);
  const ink = Buffer.alloc(bw * bh, 255);
  for (let y = 0; y < bh; y++) for (let x = 0; x < bw; x++) {
    if (mask[(y + minY) * w + x + minX]) { cropped[y * bw + x] = 1; ink[y * bw + x] = 0; }
  }
  const png = await sharp(ink, { raw: { width: bw, height: bh, channels: 1 } }).png().toBuffer();
  const svg = await new Promise((done, fail) => potrace.trace(png, { turdSize: 60, alphaMax: 1, optCurve: true, optTolerance: .6, threshold: 128, blackOnWhite: true, color: "#000", background: "transparent" }, (error, out) => error ? fail(error) : done(out)));
  const small = optimize(svg, { multipass: true, floatPrecision: 1, plugins: ["preset-default", { name: "removeAttrs", params: { attrs: ["stroke", "fill-rule"] } }] }).data;
  writeFileSync(join(OUT, `${source.id}.svg`), small);

  manifest.push({ id: source.id, productId: source.productId, photo: source.photo, ratio: +(bw / bh).toFixed(3) });
  console.log(source.id, `${bw}x${bh}`, `fill ${(area / (bw * bh)).toFixed(2)}`, `${(small.length / 1024).toFixed(1)}KB`);
}
writeFileSync("src/components/storefront/tribals.json", JSON.stringify(manifest, null, 1) + "\n");

// The denim that fills the shapes, from a plain area of the same garment.
await sharp(join(PHOTOS, "bermuda-tribal-azul-delante.webp")).extract({ left: 280, top: 790, width: 170, height: 240 }).resize(510, 720, { kernel: "lanczos3" }).webp({ quality: 72 }).toFile(join(OUT, "denim.webp"));

// A proof sheet: every traced shape next to the crop it came from.
const tiles = [];
let i = 0;
for (const source of SOURCES) {
  const [left, top, width, height] = source.box;
  const crop = await sharp(join(PHOTOS, `${source.photo}.webp`)).extract({ left, top, width, height }).resize(300, 300, { fit: "contain", background: "#fff" }).png().toBuffer();
  const shape = await sharp(join(OUT, `${source.id}.svg`), { density: 200 }).resize(280, 280, { fit: "contain", background: "#e9eaf0" }).flatten({ background: "#e9eaf0" }).extend({ top: 10, bottom: 10, left: 10, right: 10, background: "#e9eaf0" }).png().toBuffer();
  tiles.push({ input: crop, left: i * 308, top: 0 }, { input: shape, left: i * 308, top: 308 });
  i++;
}
if (process.argv[2]) await sharp({ create: { width: i * 308, height: 608, channels: 3, background: "#222" } }).composite(tiles).jpeg({ quality: 85 }).toFile(process.argv[2]);
