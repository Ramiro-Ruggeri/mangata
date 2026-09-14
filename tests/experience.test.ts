import test from "node:test";
import assert from "node:assert/strict";
import { nextOverlay, clampScrollY, resolveReturnY, isPastScrollThreshold, shouldDiscardReturn, type ScrollReturnPoint } from "../src/lib/experience/interaction";

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
