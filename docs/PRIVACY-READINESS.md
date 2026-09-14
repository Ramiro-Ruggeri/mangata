# Privacy readiness — MANGATA

Reviewed 2026-09-14. This is an implementation inventory and release checklist, not a declaration of legal compliance. No analytics service, pixel, cookie vendor or new external account was added.

## Inventory verified in source

| Mechanism | Actual purpose | Retention / conditions |
| --- | --- | --- |
| `localStorage.mangata_cart_v2` | Operational bag contents; no stock reservation | Until bag/site data is cleared; legacy `mngt_cart_v1` removed on write |
| `localStorage.mangata_privacy_v1` | Version, analytics choice, decision and expiry timestamps | 180 days; version/expiry/malformed values fail closed |
| `mangata_evershop_cart` cookie | Operational connected cart | Up to 30 days, HttpOnly, SameSite=Lax, Secure in production; created only in remote cart flow |
| `mangata_checkout_intent` cookie | Signed operational payment/session match | Up to 48 hours, HttpOnly, SameSite=Lax, Secure; payment flow must be configured |
| `sessionStorage.mangata_purchase_*` | Optional verified-purchase measurement deduplication | Browser session; removed on withdrawal; never created without permission |
| `window.dataLayer` and `mangata:commerce` | Optional local measurement hooks | Memory only, at most 100 MANGATA-owned entries, no installed collector; own entries removed on withdrawal |
| JSON-LD scripts | Product/organization structured content | Not executable tracking scripts |
| `next/font`, product/campaign assets | Rendering from this site | No client request to Google Fonts in the production bundle |
| Server EverShop / Mercado Pago / configured order service requests | Requested commerce operations | Outside optional analytics; production processor details still need confirmation |
| WhatsApp, Instagram, email links | Visitor-initiated external navigation | No embedded pixel/widget; destination service policies apply after navigation |

No GTM, Google Analytics, Meta Pixel, Vercel Analytics, marketing SDK, tracking iframe or client analytics fetch was found in this version. Deployment-provider access logs and injected scripts are not verifiable from source alone: inspect the deployed environment before release.

## Consent contract

- No choice, false, invalid JSON, expired timestamp, future timestamp, changed version, or a duration extended beyond the configured interval means no optional measurement.
- SSR emits no permission. `useSyncExternalStore` uses a hydration sentinel so a returning decision does not flash a consent banner.
- First-layer accept and reject use identical size, border, color and placement. Configure is a separate accessible action. Browsing and bag operations are never gated.
- Actual categories only: operational storage and optional MANGATA local instrumentation. No fictitious marketing/provider switches.
- A checked analytics switch is never the first-visit default. The preferences dialog shows an existing explicit choice when reopening.
- An event occurring before permission is discarded, not queued and not replayed when permission is accepted. Purchase deduplication is also permission-gated.
- Every measurement call re-checks permission synchronously. UI subscriptions handle cross-tab changes, expiry and visibility restoration. Revocation clears MANGATA-owned events and purchase markers only; it does not delete unrelated entries, bags or operational cookies.
- This version does not send measurement to an external service. Adding one requires revisiting this inventory, control gates, retention, policy version, processor details and browser-network checks. A consent banner alone is not permission to install arbitrary scripts.
- The 180-day period is a conservative engineering review interval selected to avoid indefinite permission. It is not claimed as an Argentine statutory requirement. Business/legal review may change it by updating the policy version.
- If persistence is blocked, the current in-memory choice works only during the current page lifetime. Subsequent reloads use the last record the browser actually saved, or start denied without one.
- Revocation cannot undo processing that a future external service already performed. No such collector is connected in this version.

## Integration

`ExperienceProvider` → `ConsentProvider` → `CartProvider` → page. `ConsentProvider` owns the nonmodal banner and native preferences dialog (`privacy` overlay). The experience layer owns body scroll lock. A single CSS variable, `--consent-banner-height`, reserves the rendered banner height for sticky purchase/scroll controls. An end-of-content spacer allows the bottom of the page to remain reachable. Footer uses `CookiePreferencesButton`; full inventory page is `/privacidad`.

## Tests

`node --import tsx --test tests/consent.test.ts` passes four automated tests covering explicit accept/reject, expiry/version/malformed/future/extended records, no queue/events/purchase markers/fetch before permission, no replay on accept, purchase deduplication, selective deletion/re-blocking after revoke, and blocked persistence with in-memory revocation. These unit tests do not substitute for browser network, keyboard, overlay or physical-device checks; record those in the root QA report. Scoped ESLint and repository TypeScript checks also passed after implementation.

## Argentina — sources and release blocker

The official [updated Ley 25.326](https://www.argentina.gob.ar/normativa/nacional/ley-25326-64790/actualizacion) requires clear information about purposes, recipients and responsible identity, and addresses consent and data security. The [AAIP rights guide](https://www.argentina.gob.ar/aaip/datospersonales/derechos) explains access, correction and deletion requests. These sources were checked on 2026-09-14; no claim is made that an EU-style cookie banner is specifically mandated by Argentine law or establishes complete compliance.

Before publication Emilia must confirm the legal controller identity/address, formal rights contact, actual hosting/commerce providers and destinations, processing purposes, storage periods for orders/logs, and applicable markets. Obtain appropriate legal review of the resulting notice and operational procedures. The public privacy page visibly marks these missing facts and is noindex pending validation. Do not invent controller data or legal commitments to remove this release blocker.
