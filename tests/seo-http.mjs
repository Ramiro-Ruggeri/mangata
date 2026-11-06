// Crawl-facing regressions, against a running build: BASE_URL=http://localhost:3100 npm run test:seo
import assert from "node:assert/strict";
import test from "node:test";

const base = (process.env.BASE_URL ?? "http://localhost:3000").replace(/\/$/, "");
const get = (path) => fetch(`${base}${path}`, { redirect: "manual" });
const headOf = (html) => html.slice(0, html.indexOf("</head>"));

test("unknown products answer a real 404", async () => {
  for (const path of ["/producto/9999", "/producto/abc", "/producto/01"]) {
    const response = await get(path);
    await response.arrayBuffer();
    assert.equal(response.status, 404, path);
  }
});

test("product metadata is delivered inside head", async () => {
  const response = await get("/producto/1");
  assert.equal(response.status, 200);
  const head = headOf(await response.text());
  assert.match(head, /<title>[^<]+<\/title>/);
  assert.match(head, /<link rel="canonical"[^>]*\/producto\/1"/);
  assert.match(head, /<meta name="description"/);
});

test("the initial home HTML links every product in the sitemap", async () => {
  const [home, sitemap] = await Promise.all([get("/").then((r) => r.text()), get("/sitemap.xml").then((r) => r.text())]);
  const inSitemap = [...sitemap.matchAll(/<loc>[^<]*(\/producto\/[^<]+)<\/loc>/g)].map((match) => match[1]);
  assert.ok(inSitemap.length > 0);
  for (const path of inSitemap) assert.ok(home.includes(`href="${path}"`), `${path} sin enlace en el HTML`);
});

test("the sitemap does not publish generated modification dates", async () => {
  assert.doesNotMatch(await get("/sitemap.xml").then((r) => r.text()), /<lastmod>/);
});
