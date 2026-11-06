// Draws MANGATA's original tribal families from tapered strokes. Nothing here is traced from another image.
//   TRACER_DIR=<folder with potrace and svgo> node scripts/draw-tribals.mjs <output folder> [proof.jpg]
import { createRequire } from "node:module";
import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import sharp from "sharp";

const tools = createRequire(join(resolve(process.env.TRACER_DIR ?? "."), "noop.js"));
const potrace = tools("potrace");
const { optimize } = tools("svgo");

const rad = d => d * Math.PI / 180;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

/**
 * A stroke grown from a point: it keeps turning as it travels, like a hand drawing with one motion.
 * "root" is thickest where it starts and ends in a needle. "both" is a needle at each end.
 */
function stroke(x, y, angle, length, curl, w, { ease = 1.5, shape = "root" } = {}) {
  const steps = 90, step = length / steps, center = [[x, y]], headings = [angle];
  let px = x, py = y;
  for (let i = 1; i <= steps; i++) {
    const heading = angle + curl * Math.pow(i / steps, ease);
    px += Math.cos(rad(heading)) * step;
    py += Math.sin(rad(heading)) * step;
    center.push([px, py]);
    headings.push(heading);
  }
  const width = t => shape === "both"
    ? w * Math.pow(Math.sin(Math.PI * t), .85)
    : w * Math.pow(clamp(t / .07, 0, 1), .6) * Math.pow(1 - t, .82);
  const left = [], right = [];
  center.forEach(([cx, cy], i) => {
    const half = width(i / steps) / 2, h = rad(headings[i]);
    left.push([cx - Math.sin(h) * half, cy + Math.cos(h) * half]);
    right.push([cx + Math.sin(h) * half, cy - Math.cos(h) * half]);
  });
  return {
    points: [...left, ...right.reverse()],
    /** Where a branch leaves: at a point along this stroke, already travelling in its direction. */
    at: t => { const i = Math.round(clamp(t, 0, 1) * steps); return { x: center[i][0], y: center[i][1], angle: headings[i] }; },
  };
}
const branch = (parent, t, turn, length, curl, w, options) => { const p = parent.at(t); return stroke(p.x, p.y, p.angle + turn, length, curl, w, options); };
const disc = (cx, cy, r) => ({ points: Array.from({ length: 160 }, (_, i) => [cx + Math.cos(i / 160 * Math.PI * 2) * r, cy + Math.sin(i / 160 * Math.PI * 2) * r]) });
const flipX = s => ({ points: s.points.map(([x, y]) => [-x, y]) });
const both = list => [...list, ...list.map(flipX)];

// Each piece returns what to paint and what to cut away. All coordinates are in a 1000-unit box centered on zero.
const FAMILIES = {
  // The name: the moon and its broken reflection on the water.
  luna: {
    "luna-cuarto": () => {
      const top = stroke(-30, -395, -8, 390, 62, 66);
      const low = stroke(-30, 395, 8, 390, -62, 66);
      const f1 = stroke(-300, -170, -32, 500, 62, 78);
      const f2 = stroke(-345, 25, -6, 560, -34, 92);
      const f3 = stroke(-285, 215, 24, 470, -66, 70);
      return {
        add: [disc(-40, 0, 405), top, low, f1, f2, f3, branch(f1, .35, -40, 190, 60, 28), branch(f2, .4, 42, 200, -62, 30), branch(f3, .3, 44, 170, -58, 24),
          stroke(-400, -160, -135, 200, 60, 46), stroke(-400, 160, 135, 200, -60, 46)],
        cut: [disc(62, -10, 366)],
        over: [f1, f2, f3, branch(f1, .35, -40, 190, 60, 28), branch(f2, .4, 42, 200, -62, 30), branch(f3, .3, 44, 170, -58, 24)],
      };
    },
    "luna-reflejo": () => {
      const crescent = [disc(0, -255, 215), stroke(40, -470, -8, 220, 66, 44), stroke(-205, -320, -140, 120, 60, 30)];
      const hollow = disc(78, -268, 182);
      const low = [disc(0, 255, 215)];
      const water = stroke(-500, 2, -1, 1000, 2, 42, { shape: "both" });
      const waves = [120, 190, 262, 335, 400].map((y, i) => stroke(-300 - i * 10, y, -3, 620, 7, 30 - i * 2, { shape: "both" }));
      return { add: [...crescent, ...low], cut: [hollow, disc(78, 268, 182), ...waves], over: [water] };
    },
  },
  // Vertical and symmetric, in the spirit of the cross Emilia embroiders on the Campera Rituales.
  sigilo: {
    "sigilo-cruz": () => {
      const spine = stroke(0, -500, 90, 1000, 0, 92, { shape: "both" });
      const arm = stroke(0, -120, -8, 500, -30, 88);
      const crown = stroke(0, -255, -58, 300, 72, 58);
      const hip = stroke(0, 90, 38, 330, 72, 66);
      const foot = stroke(0, 285, 48, 190, 70, 38);
      return {
        add: [spine, ...both([arm, crown, hip, foot, branch(arm, .3, 48, 190, 70, 34), branch(arm, .58, -46, 170, -68, 26), branch(crown, .42, -44, 130, -60, 20), branch(hip, .45, -42, 150, -64, 24)])],
        cut: [stroke(0, -82, 90, 150, 0, 26, { shape: "both" })],
        over: [],
      };
    },
    "sigilo-astro": () => {
      const rays = [0, 90, 180, 270].map(a => stroke(0, 0, a, 505, 34, 118, { ease: 1.9 }));
      const minor = [45, 135, 225, 315].map(a => stroke(0, 0, a, 300, -48, 74, { ease: 1.6 }));
      return { add: [...rays, ...minor, ...rays.map(r => branch(r, .42, 40, 170, 60, 26))], cut: [disc(0, 0, 26)], over: [] };
    },
    "sigilo-espina": () => {
      const spine = stroke(0, -500, 90, 1000, 0, 62, { shape: "both" });
      const ribs = [[-380, 150, 26], [-250, 240, 38], [-90, 340, 54], [80, 280, 44], [230, 190, 32], [350, 120, 22]].map(([y, length, w]) => stroke(0, y, 12, length, -112, w, { ease: 1.35 }));
      return { add: [spine, ...both(ribs), ...both(ribs.slice(1, 5).map(r => branch(r, .34, 56, 110, 66, 16)))], cut: [], over: [] };
    },
  },
  // Wide like a back piece, with the empty space as part of the drawing.
  membrana: {
    "membrana-ala": () => {
      const main = stroke(0, -30, -56, 680, 84, 116);
      const second = stroke(0, 10, -20, 590, 58, 88);
      const third = stroke(0, 45, 12, 480, 46, 68);
      const fourth = stroke(0, 75, 44, 350, 36, 50);
      return {
        add: [stroke(0, -310, 90, 790, 0, 66, { shape: "both" }), ...both([main, second, third, fourth, branch(main, .3, -46, 180, -58, 32), branch(main, .62, -44, 150, -60, 22), branch(second, .6, -42, 110, -56, 16)])],
        cut: [],
        over: [],
      };
    },
    "membrana-llama": () => {
      const outer = stroke(0, 500, -58, 920, -66, 150, { ease: 1.2 });
      const inner = stroke(0, 310, -78, 560, 62, 62, { ease: 1.2 });
      const lick = branch(outer, .3, 46, 300, -74, 56);
      const lick2 = branch(outer, .58, 42, 230, -76, 40);
      return {
        add: both([outer, lick, lick2, branch(outer, .16, -60, 170, 62, 30)]),
        cut: both([inner, branch(inner, .5, 36, 150, -50, 22)]),
        over: [],
      };
    },
  },
};

const outDir = process.argv[2];
if (!outDir) throw new Error("Output folder required");
mkdirSync(outDir, { recursive: true });
const proofTiles = [];
const TILE = 340;
let row = 0;
for (const shapes of Object.values(FAMILIES)) {
  let column = 0;
  for (const [name, draw] of Object.entries(shapes)) {
    const piece = draw();
    const toPath = shapes => shapes.map(({ points }) => {
      // One winding direction, so overlapping strokes add up instead of cancelling.
      const area = points.reduce((sum, [x, y], i, all) => { const [nx, ny] = all[(i + 1) % all.length]; return sum + x * ny - nx * y; }, 0);
      const ordered = area < 0 ? [...points].reverse() : points;
      return `M${ordered.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join("L")}Z`;
    }).join("");
    const layer = (shapes, color) => shapes.length ? `<path d="${toPath(shapes)}" fill="${color}" fill-rule="nonzero"/>` : "";
    const raw = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-560 -560 1120 1120" width="2240" height="2240"><rect x="-560" y="-560" width="1120" height="1120" fill="#fff"/>${layer(piece.add, "#000")}${layer(piece.cut, "#fff")}${layer(piece.over, "#000")}</svg>`;
    const png = await sharp(Buffer.from(raw)).png().toBuffer();
    const trimmed = await sharp(png).trim({ threshold: 40 }).extend({ top: 12, bottom: 12, left: 12, right: 12, background: "#fff" }).png().toBuffer();
    const traced = await new Promise((done, fail) => potrace.trace(trimmed, { turdSize: 30, alphaMax: 1.05, optCurve: true, optTolerance: .4, threshold: 128, blackOnWhite: true, color: "#000", background: "transparent" }, (error, out) => error ? fail(error) : done(out)));
    const svg = optimize(traced, { multipass: true, floatPrecision: 1, plugins: ["preset-default", { name: "removeAttrs", params: { attrs: ["stroke", "fill-rule"] } }] }).data;
    writeFileSync(join(outDir, `${name}.svg`), svg);
    const { width, height } = await sharp(trimmed).metadata();
    console.log(`${name} ratio ${(width / height).toFixed(2)} ${(svg.length / 1024).toFixed(1)}KB`);
    const tile = await sharp(Buffer.from(svg), { density: 96 }).resize(TILE - 40, TILE - 40, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } }).negate({ alpha: false }).png().toBuffer();
    proofTiles.push({ input: tile, left: column * TILE + 20, top: row * TILE + 20 });
    column++;
  }
  row++;
}
if (process.argv[3]) await sharp({ create: { width: TILE * 3, height: TILE * row, channels: 3, background: "#0b0d12" } }).composite(proofTiles).jpeg({ quality: 88 }).toFile(process.argv[3]);
