import { performance } from "node:perf_hooks";
import sharp from "sharp";

// Repeatable delivery check, not Lighthouse, field CWV, network emulation, or a conversion estimate.
const origin = "http://localhost:3000";
const paths = ["/", "/producto/3", "/icon.png", "/apple-icon.png", "/_next/image?url=%2Fcampaign%2Frework-still-life-v2.webp&w=640&q=85", "/_next/image?url=%2Fcampaign%2Frework-still-life-v2.webp&w=1280&q=85"];
const results = [];
for (const path of paths) {
  const samples = [];
  let bytes = 0, type = "", width, height;
  for (let repeat = 0; repeat < 4; repeat++) {
    const start = performance.now();
    const response = await fetch(`${origin}${path}`, { headers: { Accept: "image/avif,image/webp,*/*" } });
    const ttfb = performance.now() - start;
    if (!response.ok) throw new Error(`${path}: ${response.status}`);
    const body = Buffer.from(await response.arrayBuffer());
    samples.push({ ttfbMs: +ttfb.toFixed(1), totalMs: +(performance.now() - start).toFixed(1) });
    bytes = body.length;
    type = response.headers.get("content-type");
    if (type?.startsWith("image/")) ({ width, height } = await sharp(body).metadata());
  }
  results.push({ path, bytes, type, width, height, samples });
}
console.log(JSON.stringify({ measuredAt: new Date().toISOString(), runtime: process.version, platform: process.platform, conditions: "Local production server, no throttling; first sample may be cached, 3 follow-ups. No browser rendering measured.", results }, null, 2));
