import test from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { assertStoreRequest, CommerceError, publicCommerceError, resolveOneOfOneItems } from "../src/lib/commerce/one-of-one";
import { readCheckoutIntent, signCheckoutIntent, paymentMatchesIntent, type CheckoutIntent } from "../src/lib/commerce/checkout-session";
import { fetchMercadoPagoPayment, verifyMercadoPagoSignature } from "../src/lib/commerce/payment-webhook";
import { assertOneOfOneCart, withCartLock } from "../src/lib/commerce/cart-server";
import { getLocalCatalog, getProduct } from "../src/lib/commerce/catalog";
import sitemap from "../src/app/sitemap";
import { refreshLocalCart } from "../src/lib/commerce/cart-refresh";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { POST as createPreference } from "../src/app/api/mp/route";
import { POST as webhook } from "../src/app/api/mp/webhook/route";
import { getCheckoutReady } from "../src/lib/commerce/readiness";
import { readStoreJson, secureServiceUrl, STORE_BODY_LIMIT } from "../src/lib/commerce/http-security";
import { requestEverShop } from "../src/lib/commerce/evershop";
import { POST as addCartItem, DELETE as removeCartItem } from "../src/app/api/store/cart/route";

const products = getLocalCatalog();
const product = products.find((item) => item.inventory.isInStock)!;
const secret = "a-secure-test-only-key-with-at-least-32-bytes";

test("September catalog uses the eight confirmed final ARS prices and real photo files", () => {
  const expected = new Map([
    ["Bandoo Moñito", 10000], ["Bermuda Oscuridad", 17000], ["Bermuda Tribal", 17000],
    ["Blazer Cuadrillé", 25000], ["Boxy Black", 10000], ["Buzo Alitas", 17000],
    ["Camisa Crop Cuadrillé", 12000], ["Camisa Jappon", 12000],
  ]);
  for (const [name, price] of expected) {
    const item = products.find((candidate) => candidate.name === name);
    assert.ok(item, `Missing ${name}`);
    assert.equal(item.price, price);
    assert.equal(item.transferPrice, undefined, "No unconfirmed additional transfer discount");
    assert.equal(item.compareAtPrice, undefined, "No fictional before price or launch percentage");
    assert.ok(item.images.every((image) => image.startsWith("/catalog/2026-09/")));
  }
  assert.equal(new Set(products.map((item) => item.id)).size, products.length);
  assert.equal(new Set(products.map((item) => item.sku)).size, products.length);
  for (const item of products) {
    for (const image of item.images) assert.ok(existsSync(path.join(process.cwd(), "public", image)), image);
  }
  assert.deepEqual(products.find((item) => item.id === "7")?.images, ["/catalog/2026-09/campera-corderoy-corregida.webp"]);
});

test("saved local bags refresh prices and photos, deduplicate, and remove unavailable identities", () => {
  const current = products.find((item) => item.id === "11")!;
  const saved = { id: current.id, sku: current.sku, name: current.name, price: 69900, image: "/products/11/bermudaTribal.webp", qty: 1 };
  const result = refreshLocalCart([saved, saved, { ...saved, sku: "missing" }], products);
  assert.equal(result.length, 1);
  assert.equal(result[0].price, 17000);
  assert.equal(result[0].image, current.image);
  assert.equal(saved.price, 69900, "Never mutate the original snapshot");
  assert.deepEqual(refreshLocalCart([saved], [{ ...current, inventory: { ...current.inventory, isInStock: false } }]), []);
  assert.deepEqual(refreshLocalCart([{ ...saved, id: "other" }], products), []);
});

test("only photograph-matched Drive products remain in the public catalog", () => {
  const reconciled = JSON.parse(readFileSync("docs/catalog-reconciliation-2026-09.json", "utf8")) as {
    active: Array<{ id: number; files: string[] }>; retiredIds: number[];
  };
  assert.equal(products.length, 21);
  assert.deepEqual(products.map((item) => Number(item.id)).sort((a, b) => a - b), reconciled.active.map((item) => item.id).sort((a, b) => a - b));
  for (const item of products) {
    const mapping = reconciled.active.find((entry) => String(entry.id) === item.id)!;
    assert.deepEqual(item.images, mapping.files.map((file) => `/catalog/2026-09/${file.replace(/\.(png|jpe?g)$/i, ".webp")}`));
  }
  assert.equal(products.find((item) => item.id === "1")?.name, "Vaquero Tribal", "Photo identity wins over the old generic product name");
  assert.equal(products.find((item) => item.id === "7")?.name, "Campera Rituales");
});

test("retired pieces cannot return through product URLs, sitemap, cart API or saved bags", async () => {
  const retiredIds = [2, 10, 13, 15, 18, 19, 23, 24, 27, 28, 29, 30, 31];
  const previousMode = process.env.MANGATA_COMMERCE_MODE;
  process.env.MANGATA_COMMERCE_MODE = "local";
  try {
    const sitemapUrls = (await sitemap()).map((entry) => new URL(entry.url).pathname);
    for (const id of retiredIds) {
      const sku = `MNGT-${String(id).padStart(3, "0")}`;
      assert.equal(await getProduct(String(id)), null);
      assert.ok(!sitemapUrls.includes(`/producto/${id}`));
      const response = await addCartItem(new Request("https://mangata.test/api/store/cart", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sku }),
      }));
      assert.equal(response.status, 400);
      const saved = { id: String(id), sku, name: "Previous selection", price: 10000, image: "/old.webp", qty: 1 };
      assert.deepEqual(refreshLocalCart([saved], products), []);
    }
    assert.equal(sitemapUrls.length, products.length + 1);
  } finally {
    if (previousMode === undefined) delete process.env.MANGATA_COMMERCE_MODE;
    else process.env.MANGATA_COMMERCE_MODE = previousMode;
  }
});
const intent: CheckoutIntent = {
  reference: "MNGT-aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa", currency: "ARS", amount: 100,
  skus: [product.sku], expiresAt: Date.now() + 600_000,
};

test("server deduplicates mixed id/SKU lines and discards submitted prices", () => {
  const resolved = resolveOneOfOneItems([{ sku: product.sku, price: 1 }, { id: product.id, price: 0.01 }], products);
  assert.equal(resolved.length, 1);
  assert.equal(resolved[0].price, product.price);
});

test("rejects conflicting selectors, extra quantity, oversized and fallback carts", () => {
  assert.throws(() => resolveOneOfOneItems([{ id: "other", sku: product.sku }], products));
  assert.throws(() => resolveOneOfOneItems([{ sku: product.sku, qty: 2 }], products));
  assert.throws(() => resolveOneOfOneItems(Array.from({ length: 51 }, () => ({ sku: product.sku })), products));
  assert.throws(() => resolveOneOfOneItems([{ sku: product.sku }], [{ ...product, source: "local-fallback" }]));
});

test("a signed session cannot be forged, expired or used for another payment", () => {
  const signed = signCheckoutIntent(intent, secret);
  assert.deepEqual(readCheckoutIntent(signed, secret), intent);
  assert.equal(readCheckoutIntent(signed, "a-different-signing-key-that-is-long-enough"), null);
  assert.equal(readCheckoutIntent(`${signed.slice(0, -4)}abcd`, secret), null);
  assert.equal(readCheckoutIntent(signed, secret, intent.expiresAt + 1), null);
  const payment = { id: 123, status: "approved", external_reference: intent.reference, currency_id: "ARS", transaction_amount: 100 };
  assert.equal(paymentMatchesIntent(payment, intent), true);
  assert.equal(paymentMatchesIntent({ ...payment, external_reference: "MNGT-other" }, intent), false);
  assert.equal(paymentMatchesIntent({ ...payment, transaction_amount: 1 }, intent), false);
  assert.equal(paymentMatchesIntent({ ...payment, currency_id: "USD" }, intent), false);
  assert.equal(paymentMatchesIntent({ ...payment, status: "pending" }, intent), false);
});

test("webhook validates the exact resource ID, request ID, signature and freshness", () => {
  const now = Date.now();
  const ts = String(Math.floor(now / 1000));
  const digest = createHmac("sha256", secret).update(`id:123;request-id:request-1;ts:${ts};`).digest("hex");
  const input = { signature: `ts=${ts},v1=${digest}`, requestId: "request-1", dataId: "123", secret, now };
  assert.equal(verifyMercadoPagoSignature(input), true);
  assert.equal(verifyMercadoPagoSignature({ ...input, dataId: "456" }), false);
  assert.equal(verifyMercadoPagoSignature({ ...input, requestId: "request-2" }), false);
  assert.equal(verifyMercadoPagoSignature({ ...input, now: now + 360_000 }), false);
});

test("remote cart blocks multiple units, duplicate SKUs, inactive carts and item errors", () => {
  const cart = { uuid: "cart-1", status: 1, items: [{ uuid: "line-1", productSku: "sku", qty: 1, errors: [] }] };
  assert.doesNotThrow(() => assertOneOfOneCart(cart));
  assert.throws(() => assertOneOfOneCart({ ...cart, items: [{ ...cart.items[0], qty: 2 }] }));
  assert.throws(() => assertOneOfOneCart({ ...cart, items: [...cart.items, { ...cart.items[0], uuid: "line-2" }] }));
  assert.throws(() => assertOneOfOneCart({ ...cart, status: 0 }));
  assert.throws(() => assertOneOfOneCart({ ...cart, items: [{ ...cart.items[0], errors: ["unavailable"] }] }));
});

test("process cart lock serializes mutations and survives a failed operation", async () => {
  const calls: string[] = [];
  const first = withCartLock("cart-test", async () => { calls.push("first"); throw new Error("remote down"); }).catch(() => undefined);
  const second = withCartLock("cart-test", async () => { calls.push("second"); return true; });
  await first;
  assert.equal(await second, true);
  assert.deepEqual(calls, ["first", "second"]);
});

test("public errors never echo provider messages or infrastructure secrets", () => {
  assert.doesNotMatch(JSON.stringify(publicCommerceError(new Error("EVERSHOP_TOKEN=private-key"))), /TOKEN|private-key|EverShop/);
  assert.throws(() => assertStoreRequest(new Request("https://mangata.test/api/mp", { method: "POST", headers: { origin: "https://attacker.test", "content-type": "application/json" } })));
});

test("store requests reject cross-site fetches and misleading content types", () => {
  const request = (headers: Record<string, string>) => new Request("https://mangata.test/api/store/cart", { method: "POST", headers });
  assert.doesNotThrow(() => assertStoreRequest(request({ origin: "https://mangata.test", "sec-fetch-site": "same-origin", "content-type": "application/json; charset=utf-8" })));
  assert.throws(() => assertStoreRequest(request({ "sec-fetch-site": "cross-site", "content-type": "application/json" })), (error) => error instanceof CommerceError && error.status === 403);
  assert.throws(() => assertStoreRequest(request({ "sec-fetch-site": "same-site", "content-type": "application/json" })), (error) => error instanceof CommerceError && error.status === 403);
  assert.throws(() => assertStoreRequest(request({ "content-type": "text/plain; application/json" })), (error) => error instanceof CommerceError && error.status === 415);
});

test("JSON body limits count bytes without trusting missing or forged Content-Length", async () => {
  const request = (body: string, headers: Record<string, string> = {}) => new Request("https://mangata.test/api/store/cart", { method: "POST", headers: { "content-type": "application/json", ...headers }, body });
  assert.deepEqual(await readStoreJson(request('{"sku":"MNGT-001"}')), { sku: "MNGT-001" });
  const lengthHeaders: Array<Record<string, string>> = [{}, { "content-length": "2" }, { "content-length": String(STORE_BODY_LIMIT + 1) }];
  for (const headers of lengthHeaders) {
    await assert.rejects(readStoreJson(request(JSON.stringify({ text: "é".repeat(17_000) }), headers)), (error) => error instanceof CommerceError && error.status === 413);
  }
  for (const malformed of ["null", "[]", "{", '"hello"']) {
    await assert.rejects(readStoreJson(request(malformed)), (error) => error instanceof CommerceError && error.status === 400);
  }
  await assert.rejects(readStoreJson(request("{}", { "content-encoding": "gzip" })), (error) => error instanceof CommerceError && error.status === 415);
});

test("oversized chunked body is cancelled before JSON parsing", async () => {
  let cancelled = false;
  let chunksRead = 0;
  const body = new ReadableStream<Uint8Array>({
    pull(controller) { chunksRead++; controller.enqueue(new Uint8Array(16_384)); },
    cancel() { cancelled = true; },
  });
  const request = new Request("https://mangata.test/api/store/cart", { method: "POST", body, duplex: "half" } as RequestInit & { duplex: "half" });
  await assert.rejects(readStoreJson(request), (error) => error instanceof CommerceError && error.status === 413);
  assert.equal(cancelled, true);
  assert.ok(chunksRead <= 4);
});

test("cart and payment routes reject oversized requests before any provider call", async () => {
  const previousMode = process.env.MANGATA_COMMERCE_MODE;
  const previousFetch = global.fetch;
  let networkCalls = 0;
  try {
    process.env.MANGATA_COMMERCE_MODE = "local";
    global.fetch = async () => { networkCalls++; throw new Error("network must not run"); };
    const request = (path: string) => new Request(`https://mangata.test${path}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ sku: "x".repeat(STORE_BODY_LIMIT) }) });
    assert.equal((await addCartItem(request("/api/store/cart"))).status, 413);
    assert.equal((await createPreference(request("/api/mp"))).status, 413);
    const deleted = await removeCartItem(new Request("https://mangata.test/api/store/cart", { method: "DELETE", headers: { origin: "https://attacker.test" } }));
    assert.equal(deleted.status, 403);
    assert.match(deleted.headers.get("cache-control") ?? "", /no-store/);
    assert.equal(networkCalls, 0);
  } finally {
    global.fetch = previousFetch;
    if (previousMode === undefined) delete process.env.MANGATA_COMMERCE_MODE;
    else process.env.MANGATA_COMMERCE_MODE = previousMode;
  }
});

test("service configuration rejects HTTP, embedded credentials, fragments and query strings", () => {
  assert.equal(secureServiceUrl(" https://orders.test/v1/ ").origin, "https://orders.test");
  for (const invalid of [undefined, "", "http://orders.test", "https://user:secret@orders.test", "https://orders.test?token=secret", "https://orders.test#secret", "javascript:alert(1)"]) {
    assert.throws(() => secureServiceUrl(invalid), (error) => error instanceof CommerceError && error.status === 503);
  }
});

test("authenticated EverShop and payment reads refuse provider redirects", async () => {
  const previousEnv = { ...process.env };
  const previousFetch = global.fetch;
  const redirects: Array<RequestRedirect | undefined> = [];
  try {
    Object.assign(process.env, { EVERSHOP_BASE_URL: "https://commerce.test", EVERSHOP_STOREFRONT_TOKEN: "test-token", MP_ACCESS_TOKEN: "test-token" });
    global.fetch = async (url, options) => {
      redirects.push(options?.redirect);
      return String(url).includes("mercadopago") ? Response.json({ id: "123" }) : Response.json({ data: { ok: true } });
    };
    await requestEverShop("query { ok }", undefined, true);
    await fetchMercadoPagoPayment("123");
    assert.deepEqual(redirects, ["error", "error"]);
    process.env.EVERSHOP_BASE_URL = "http://commerce.test";
    await assert.rejects(requestEverShop("query { ok }"));
    assert.equal(redirects.length, 2);
  } finally {
    global.fetch = previousFetch;
    for (const key of Object.keys(process.env)) if (!(key in previousEnv)) delete process.env[key];
    Object.assign(process.env, previousEnv);
  }
});

test("checkout readiness stays false without complete secure configuration", () => {
  const previousEnv = { ...process.env };
  try {
    delete process.env.MANGATA_ORDER_SERVICE_URL;
    assert.equal(getCheckoutReady("local"), false);
    Object.assign(process.env, {
      NEXT_PUBLIC_SITE_URL: "https://mangata.test", MP_ACCESS_TOKEN: "test-access", MP_WEBHOOK_SECRET: secret,
      COMMERCE_SESSION_SECRET: secret, MANGATA_ORDER_SERVICE_URL: "https://orders.test", MANGATA_ORDER_SERVICE_TOKEN: "test-token",
      EVERSHOP_BASE_URL: "https://commerce.test", EVERSHOP_CHECKOUT_URL: "https://commerce.test/handoff",
    });
    assert.equal(getCheckoutReady("local"), true);
    process.env.NEXT_PUBLIC_SITE_URL = "http://localhost:3000";
    assert.equal(getCheckoutReady("local"), false);
    assert.equal(getCheckoutReady("evershop"), true);
    process.env.EVERSHOP_CHECKOUT_URL = "https://other.test/handoff";
    assert.equal(getCheckoutReady("evershop"), false);
  } finally {
    for (const key of Object.keys(process.env)) if (!(key in previousEnv)) delete process.env[key];
    Object.assign(process.env, previousEnv);
  }
});

test("checkout route sends one server-priced unit, signs the session and fails closed without durability", async () => {
  const previousEnv = { ...process.env };
  const previousFetch = global.fetch;
  try {
    Object.assign(process.env, {
      MANGATA_COMMERCE_MODE: "local", NEXT_PUBLIC_SITE_URL: "https://mangata.test", MP_ACCESS_TOKEN: "test-access",
      MP_WEBHOOK_SECRET: secret, COMMERCE_SESSION_SECRET: secret, MANGATA_ORDER_SERVICE_URL: "https://orders.test", MANGATA_ORDER_SERVICE_TOKEN: "test-order-token",
    });
    let submitted: Record<string, unknown> | undefined;
    global.fetch = async (url, options) => {
      const body = JSON.parse(String(options?.body)) as Record<string, unknown>;
      if (String(url).endsWith("/intents")) return Response.json({ reference: body.reference, persisted: true, stockReserved: true });
      submitted = body;
      return Response.json({ init_point: "https://www.mercadopago.com.ar/checkout/v1/redirect?pref_id=test" });
    };
    const request = () => new Request("https://mangata.test/api/mp", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ items: [{ sku: product.sku, price: 1 }, { id: product.id }] }) });
    const response = await createPreference(request());
    assert.equal(response.status, 200);
    const items = submitted!.items as Array<{ quantity: number; unit_price: number }>;
    assert.deepEqual(items.map(({ quantity, unit_price }) => ({ quantity, unit_price })), [{ quantity: 1, unit_price: product.price }]);
    assert.match(response.headers.get("set-cookie") ?? "", /HttpOnly/i);
    global.fetch = async () => Response.json({ persisted: false, stockReserved: false });
    assert.equal((await createPreference(request())).status, 503);
  } finally {
    global.fetch = previousFetch;
    for (const key of Object.keys(process.env)) if (!(key in previousEnv)) delete process.env[key];
    Object.assign(process.env, previousEnv);
  }
});

test("webhook never acknowledges an unpersisted event; a persisted duplicate is acknowledged", async () => {
  const previousEnv = { ...process.env };
  const previousFetch = global.fetch;
  try {
    Object.assign(process.env, { MP_WEBHOOK_SECRET: secret, MP_ACCESS_TOKEN: "test-access", MANGATA_ORDER_SERVICE_URL: "https://orders.test", MANGATA_ORDER_SERVICE_TOKEN: "test-token" });
    const ts = String(Math.floor(Date.now() / 1000));
    const signature = createHmac("sha256", secret).update(`id:123;request-id:test-request;ts:${ts};`).digest("hex");
    const request = () => new Request("https://mangata.test/api/mp/webhook?data.id=123", { method: "POST", headers: { "x-signature": `ts=${ts},v1=${signature}`, "x-request-id": "test-request" } });
    let persisted = false;
    const keys: string[] = [];
    global.fetch = async (url, options) => {
      if (String(url).includes("api.mercadopago.com")) return Response.json({ id: 123, status: "approved", external_reference: intent.reference, currency_id: "ARS", transaction_amount: 100 });
      keys.push(new Headers(options?.headers).get("Idempotency-Key") ?? "");
      return Response.json({ paymentId: "123", reference: intent.reference, persisted, result: "duplicate" });
    };
    assert.equal((await webhook(request())).status, 503);
    persisted = true;
    assert.equal((await webhook(request())).status, 200);
    assert.deepEqual(keys, ["mercadopago:123:approved", "mercadopago:123:approved"]);
  } finally {
    global.fetch = previousFetch;
    for (const key of Object.keys(process.env)) if (!(key in previousEnv)) delete process.env[key];
    Object.assign(process.env, previousEnv);
  }
});
