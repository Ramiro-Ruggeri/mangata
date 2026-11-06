import test from "node:test";
import assert from "node:assert/strict";
import { runInNewContext } from "node:vm";
import { relatedPieces } from "../src/lib/catalog-view";
import { THEME_BOOT_SCRIPT, THEME_COLORS, THEME_KEY } from "../src/components/theme/theme";
import { resolveScenePieces } from "../src/components/storefront/tribal-scene";
import tribals from "../src/components/storefront/tribals.json";
import { currentCampaign, isOnAir, type Campaign } from "../src/config/campaign";
import type { StoreProduct } from "../src/lib/commerce/types";

const boot = (saved: Record<string, string>, session: Record<string, string> = {}, blocked = false) => {
  const html = { dataset: {} as Record<string, string> };
  const meta = { content: THEME_COLORS.dark };
  const storage = (values: Record<string, string>) => ({
    getItem(key: string) { if (blocked) throw new Error("blocked"); return values[key] ?? null; },
    setItem(key: string, value: string) { if (blocked) throw new Error("blocked"); values[key] = value; },
  });
  runInNewContext(THEME_BOOT_SCRIPT, { document: { documentElement: html, querySelector: () => meta }, localStorage: storage(saved), sessionStorage: storage(session) });
  return { html, meta, session };
};

test("a first visit stays on the night theme and shows the intro once", () => {
  const first = boot({});
  assert.equal(first.html.dataset.theme, undefined);
  assert.equal(first.html.dataset.flash, undefined);
  assert.equal(first.session.mangata_intro, "1");
  assert.equal(boot({}, { mangata_intro: "1" }).html.dataset.flash, "seen");
});

test("a saved light theme applies before paint, with its browser color", () => {
  const visit = boot({ [THEME_KEY]: "light" });
  assert.equal(visit.html.dataset.theme, "light");
  assert.equal(visit.meta.content, THEME_COLORS.light);
});

test("an unexpected stored value or blocked storage never breaks the page", () => {
  assert.equal(boot({ [THEME_KEY]: "</script><script>alert(1)" }).html.dataset.theme, undefined);
  assert.doesNotThrow(() => boot({}, {}, true));
});

const piece = (id: string, category: string, isInStock = true) => ({ id, category, inventory: { isInStock, manageStock: true } }) as StoreProduct;

test("related pieces only offer what can be bought, same category first", () => {
  const current = piece("1", "Denim", false);
  const result = relatedPieces([current, piece("2", "Prendas"), piece("3", "Denim", false), piece("4", "Denim"), piece("5", "Accesorios")], current);
  assert.deepEqual(result.map(p => p.id), ["4", "2", "5"]);
  assert.equal(relatedPieces(Array.from({ length: 9 }, (_, i) => piece(String(i + 2), "Denim")), current).length, 4);
});

test("every tribal leads to a garment in the store, and a missing garment takes its shapes out", () => {
  const bermuda = piece("11", "Denim"), campera = piece("7", "Prendas");
  assert.ok(resolveScenePieces(tribals, [bermuda, campera]).every(p => ["11", "7"].includes(p.product.id)));
  assert.ok(resolveScenePieces(tribals, [campera]).every(p => p.product.id === "7"));
  assert.deepEqual(resolveScenePieces(tribals, []), []);
});

const campaign: Campaign = { id: "x", title: "T", message: "M", linkLabel: "L", href: "/", startsAt: "2026-11-27T00:00:00-03:00", endsAt: "2026-11-30T00:00:00-03:00" };

test("a campaign starts and ends by itself, in Argentine time", () => {
  assert.equal(isOnAir(campaign, Date.parse("2026-11-26T23:59:59-03:00")), false);
  assert.equal(isOnAir(campaign, Date.parse("2026-11-27T00:00:00-03:00")), true);
  assert.equal(isOnAir(campaign, Date.parse("2026-11-30T00:00:00-03:00")), false);
  assert.equal(isOnAir({ ...campaign, endsAt: "fecha mala" }), false);
});

test("nothing shows without a campaign on air, and the preview needs its private switch", () => {
  const during = Date.parse("2026-11-28T12:00:00-03:00"), after = Date.parse("2026-12-01T12:00:00-03:00");
  assert.equal(currentCampaign(during, campaign, false)?.id, "x");
  assert.equal(currentCampaign(after, campaign, false), null);
  assert.equal(currentCampaign(during, null, false), null);
  assert.equal(currentCampaign(during, null, true)?.id, "vista-previa");
});
