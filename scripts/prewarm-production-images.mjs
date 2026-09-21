const site = new URL(process.env.MANGATA_PREWARM_URL || "https://mangata.com.ar");
if (site.protocol !== "https:" || site.username || site.password || site.search || site.hash) {
  throw new Error("MANGATA_PREWARM_URL must be a clean HTTPS origin");
}

const catalogResponse = await fetch(new URL("/api/store/catalog", site), { cache: "no-store" });
if (!catalogResponse.ok) throw new Error(`catalog returned ${catalogResponse.status}`);
const catalog = await catalogResponse.json();
if (!Array.isArray(catalog.products) || catalog.products.length < 1) throw new Error("catalog is empty");

const paths = new Set([
  "/campaign/rework-still-life-v2.webp",
  ...catalog.products.flatMap(product => [product.image, ...(product.images || [])]).filter(path => typeof path === "string" && path.startsWith("/")),
]);
const formats = ["image/avif,image/webp", "image/webp"];
const widths = [96, 256, 360, 640];
const jobs = [...paths].flatMap(path => formats.flatMap(accept => widths.map(width => ({ path, accept, width }))));

let completed = 0;
async function worker() {
  while (jobs.length) {
    const job = jobs.shift();
    const url = new URL("/_next/image", site);
    url.searchParams.set("url", job.path);
    url.searchParams.set("w", String(job.width));
    url.searchParams.set("q", job.path.startsWith("/campaign/") ? "85" : "75");
    const response = await fetch(url, { headers: { Accept: job.accept }, redirect: "error" });
    if (!response.ok || !response.headers.get("content-type")?.startsWith("image/")) {
      throw new Error(`image ${job.path} at ${job.width}px returned ${response.status}`);
    }
    await response.arrayBuffer();
    completed++;
  }
}

await Promise.all(Array.from({ length: 3 }, worker));
console.log(JSON.stringify({ warmed: completed, images: paths.size, widths, formats: formats.length }));
