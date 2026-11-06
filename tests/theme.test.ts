import test from "node:test";
import assert from "node:assert/strict";
import { runInNewContext } from "node:vm";
import { relatedPieces } from "../src/lib/catalog-view";
import { THEME_BOOT_SCRIPT, THEME_COLORS, THEME_KEY } from "../src/components/theme/theme";
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
