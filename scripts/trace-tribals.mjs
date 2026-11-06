// Traces tribal appliques from MANGATA's own product photos into SVG, with simple collision circles.
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

const distanceField = (mask, w, h) => {
  const d = new Float32Array(w * h).map((_, i) => (mask[i] ? 1e6 : 0));
  const relax = (i, j, cost) => { if (d[j] + cost < d[i]) d[i] = d[j] + cost; };
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = y * w + x;
    if (x) relax(i, i - 1, 1);
    if (y) relax(i, i - w, 1);
    if (x && y) relax(i, i - w - 1, 1.414);
    if (y && x < w - 1) relax(i, i - w + 1, 1.414);
  }
  for (let y = h - 1; y >= 0; y--) for (let x = w - 1; x >= 0; x--) {
    const i = y * w + x;
    if (x < w - 1) relax(i, i + 1, 1);
    if (y < h - 1) relax(i, i + w, 1);
    if (x < w - 1 && y < h - 1) relax(i, i + w + 1, 1.414);
    if (y < h - 1 && x) relax(i, i + w - 1, 1.414);
  }
  return d;
};

/** Greedy largest inscribed circles: a light compound body, without using the SVG outline. */
const collisionCircles = (mask, w, h, limit = 9) => {
  const field = distanceField(mask, w, h);
  const circles = [];
  for (let n = 0; n < limit; n++) {
    let best = -1, r = 0;
    for (let i = 0; i < field.length; i++) if (field[i] > r) { r = field[i]; best = i; }
    if (best < 0 || (circles.length && r < circles[0].r * .16)) break;
    const cx = best % w, cy = Math.floor(best / w);
    circles.push({ x: cx, y: cy, r });
    for (let y = Math.max(0, Math.floor(cy - r * 1.25)); y <= Math.min(h - 1, cy + r * 1.25); y++) {
      for (let x = Math.max(0, Math.floor(cx - r * 1.25)); x <= Math.min(w - 1, cx + r * 1.25); x++) {
        if ((x - cx) ** 2 + (y - cy) ** 2 <= (r * 1.25) ** 2) field[y * w + x] = 0;
      }
    }
  }
  // The arms have to collide too, or the pieces sink into the floor: cover the point farthest from every circle so far.
  const inside = distanceField(mask, w, h);
  const minimum = Math.max(w, h) * .018;
  while (circles.length < 16) {
    let best = -1, far = 0;
    for (let i = 0; i < mask.length; i += 7) {
      if (!mask[i]) continue;
      const x = i % w, y = Math.floor(i / w);
      let gap = Infinity;
      for (const c of circles) gap = Math.min(gap, Math.hypot(x - c.x, y - c.y) - c.r);
      if (gap > far) { far = gap; best = i; }
    }
    if (best < 0 || far < Math.max(w, h) * .05) break;
    circles.push({ x: best % w, y: Math.floor(best / w), r: Math.max(inside[best], minimum) });
  }
  return circles;
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

  const circles = collisionCircles(cropped, bw, bh).map(c => ({ x: +(c.x / bw).toFixed(3), y: +(c.y / bh).toFixed(3), r: +(c.r / bw).toFixed(3) }));
  manifest.push({ id: source.id, productId: source.productId, photo: source.photo, ratio: +(bw / bh).toFixed(3), circles });
  console.log(source.id, `${bw}x${bh}`, `fill ${(area / (bw * bh)).toFixed(2)}`, `${(small.length / 1024).toFixed(1)}KB`, `${circles.length} circles`);
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
