// Optional browser QA. Uses the workstation's existing Playwright installation; never opens checkout.
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { mkdirSync } from "node:fs";
import { join } from "node:path";

const { chromium, webkit } = createRequire(import.meta.url)("playwright");
const base = process.env.QA_BASE_URL || "http://127.0.0.1:3000";
const output = process.env.QA_SCREENSHOTS;

for (const [name, engine] of [["chromium", chromium], ["webkit", webkit]]) {
  const browser = await engine.launch({ headless: true });
  try {
    for (const width of [320, 390, 1440]) {
      const page = await browser.newPage({ viewport: { width, height: width < 600 ? 844 : 900 } });
      const errors = [];
      page.on("pageerror", error => errors.push(error.message));

      await page.goto(`${base}/producto/7`, { waitUntil: "domcontentloaded" });
      assert.equal(await page.locator(".product-measures").count(), 1);
      assert.match(await page.locator(".product-measures").innerText(), /Ancho de pecho\s*108 cm[\s\S]*Largo de prenda\s*63 cm/);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth), 0);
      if (output && width !== 390) {
        mkdirSync(output, { recursive: true });
        await page.screenshot({ path: join(output, `${name}-medidas-${width}.png`), fullPage: true });
      }

      await page.goto(`${base}/producto/9`, { waitUntil: "domcontentloaded" });
      assert.equal(await page.locator(".product-measures").count(), 0);
      assert.match(await page.locator(".product-measurement small").innerText(), /Pedinos las medidas/);

      await page.goto(`${base}/cambios`, { waitUntil: "domcontentloaded" });
      const policy = await page.locator("main").innerText();
      assert.match(policy, /10 días corridos/);
      assert.match(policy, /seña del 50%/);
      assert.match(await page.getByRole("link", { name: "BOTÓN DE ARREPENTIMIENTO", exact: true }).first().getAttribute("href"), /^https:\/\/wa\.me\//);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth), 0);
      assert.deepEqual(errors, []);
      if (output && width !== 390) {
        await page.screenshot({ path: join(output, `${name}-cambios-${width}.png`), fullPage: true });
      }
      await page.close();
    }
  } finally {
    await browser.close();
  }
}

console.log("PASS: medidas confirmadas, faltantes sin inventar, política y arrepentimiento; Chromium/WebKit 320, 390 y 1440 px.");
