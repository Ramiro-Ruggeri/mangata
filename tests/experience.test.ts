import test from "node:test";
import assert from "node:assert/strict";
import { SITE, whatsappHref } from "../src/config/site";
import { readFileSync } from "node:fs";
import { nextOverlay, clampScrollY, resolveReturnY, isPastScrollThreshold, shouldDiscardReturn, type ScrollReturnPoint } from "../src/lib/experience/interaction";

test("all purchase support links share MANGATA's verified WhatsApp and preserve the message", () => {
  assert.equal(SITE.whatsapp, "5492920559780");
  const message = "Hola, ¿medidas de Campera Rituales (MNGT-7)?\n$30.000 & envío";
  const url = new URL(whatsappHref(message));
  assert.equal(url.origin, "https://wa.me");
  assert.equal(url.pathname, "/5492920559780");
  assert.equal(url.searchParams.get("text"), message);
  for (const file of ["src/components/CartDrawer.tsx", "src/components/PDPClient.tsx", "src/components/CheckoutStatus.tsx", "src/components/storefront/Storefront.tsx", "src/app/error.tsx"]) {
    const source = readFileSync(file, "utf8");
    assert.ok(source.includes("whatsappHref"), `${file} must use the shared contact`);
    assert.ok(!source.includes("5493885195631"), `${file} contains a retired contact`);
  }
});

test("the storefront uses specific hero copy and visible payment trust signals", () => {
  const storefront = readFileSync("src/components/storefront/Storefront.tsx", "utf8");
  const cart = readFileSync("src/components/CartDrawer.tsx", "utf8");
  assert.match(storefront, /El diseño/);
  assert.doesNotMatch(storefront, /El denim/);
  assert.match(storefront, /La que elegís es la que recibís/);
  assert.match(storefront, /Pago protegido/);
  assert.match(storefront, /Checkout seguro de Mercado Pago/);
  assert.match(storefront, /LockKeyhole/);
  assert.match(storefront, /CircleCheck/);
  assert.match(cart, /Pago protegido por Mercado Pago/);
  assert.match(cart, /LockKeyhole/);
  assert.match(cart, /CircleCheck/);
});

test("only one overlay is active; cleanup of a replaced modal cannot close its replacement", () => {
  let active: string | null = nextOverlay(null, { type: "open", name: "search" });
  assert.equal(active, "search");
  active = nextOverlay(active, { type: "open", name: "privacy" });
  active = nextOverlay(active, { type: "close", name: "search" });
  assert.equal(active, "privacy");
  assert.equal(nextOverlay(active, { type: "close", name: "privacy" }), null);
  assert.equal(nextOverlay(active, { type: "open", name: " " }), "privacy");
  assert.equal(nextOverlay(active, { type: "reset" }), null);
});

const point: ScrollReturnPoint = { route: "/", scrollY: 1600, anchor: { kind: "data", key: "product-3", offset: -80 } };

test("return follows the same card after layout changes, preserving its viewport offset", () => {
  assert.equal(resolveReturnY(point, "/", 8000, 800, 2080), 2000);
  assert.equal(resolveReturnY(point, "/", 8000, 800, 1480), 1400);
});

test("a missing anchor falls back safely and a route change invalidates the return", () => {
  assert.equal(resolveReturnY(point, "/", 8000, 800, null), 1600);
  assert.equal(resolveReturnY(point, "/producto/3", 8000, 800, 2080), null);
  assert.equal(resolveReturnY(point, "/", 1800, 800, null), 1000);
});

test("target coordinates are finite and clamped to the scrollable document", () => {
  assert.equal(clampScrollY(-100, 1000, 800), 0);
  assert.equal(clampScrollY(1000, 1000, 800), 200);
  assert.equal(clampScrollY(1000, 300, 800), 0);
  assert.equal(clampScrollY(NaN, 1000, 800), 0);
  assert.equal(clampScrollY(100, Infinity, 800), 0);
});

test("return survives native smooth scroll and small top movement, but manual browsing clears it", () => {
  assert.equal(shouldDiscardReturn(1600, false), false);
  assert.equal(shouldDiscardReturn(80, true), false);
  assert.equal(shouldDiscardReturn(97, true), true);
  assert.equal(isPastScrollThreshold(933, 932), true);
  assert.equal(isPastScrollThreshold(300, 320), false);
  assert.equal(isPastScrollThreshold(480, 320), false);
});
