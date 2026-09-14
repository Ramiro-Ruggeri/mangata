import test from "node:test";
import assert from "node:assert/strict";
import { PRODUCTION_SITE_URL, resolveSiteUrl } from "../src/config/site-url";

test("public metadata cannot point at the retired alias, malformed URLs or credentials", () => {
  for (const value of [undefined, "", "broken", "https://mangata-two.vercel.app/", "https://mangata-two.vercel.app/old", "https://mangata.vercel.app", "https://user:password@example.com", "javascript:alert(1)"]) {
    assert.equal(resolveSiteUrl(value), PRODUCTION_SITE_URL);
  }
});

test("site metadata supports the verified domain, localhost and future custom domains", () => {
  assert.equal(resolveSiteUrl(PRODUCTION_SITE_URL), PRODUCTION_SITE_URL);
  assert.equal(resolveSiteUrl("http://localhost:3000/"), "http://localhost:3000");
  assert.equal(resolveSiteUrl("https://tienda.example.com/path?x=1#section"), "https://tienda.example.com");
});
