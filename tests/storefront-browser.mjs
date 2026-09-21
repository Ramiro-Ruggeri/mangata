// Optional browser QA. Uses an existing Playwright installation; never opens checkout.
// NODE_PATH can point to the workstation's bundled node_modules. No production writes.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
const { chromium, webkit } = createRequire(import.meta.url)('playwright');

async function main() {
  const browser = await (process.env.QA_BROWSER === 'webkit' ? webkit : chromium).launch({ headless: true });
  const context = await browser.newContext();
  const errors = [];
  const paymentRequests = [];
  const paymentRoute = url => url.pathname === '/api/mp' || url.pathname.startsWith('/api/mp/') || url.pathname === '/api/store/checkout';
  const blockPayment = route => { paymentRequests.push(route.request().url()); return route.abort(); };
  await context.route(paymentRoute, blockPayment);
  const page = await context.newPage();
  page.setDefaultTimeout(8000);
  page.on('pageerror', error => errors.push(error.message));
  const base = process.env.QA_BASE_URL || 'http://127.0.0.1:3000';
  const output = process.env.QA_SCREENSHOTS;
  if (output) mkdirSync(output, { recursive: true });
  try {
    await page.goto(base, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.evaluate(() => document.fonts.ready);
    await page.getByRole('button', { name: 'Rechazar opcionales', exact: true }).click();
    const rows = [];
    for (const [width, height] of [[320,740],[360,800],[390,844],[430,932],[700,900],[720,450],[768,1024],[844,390],[1024,768],[1280,800],[1440,900],[1920,1080],[2560,1440]]) {
      await page.setViewportSize({ width, height });
      const dimensions = await page.evaluate(() => {
        const box = selector => document.querySelector(selector).getBoundingClientRect();
        return { overflow: document.documentElement.scrollWidth - innerWidth,
          hero: Math.round(box('.mg-hero').height), footer: Math.round(box('.mg-footer').height),
          card: Math.round(box('.mg-product-card').width), cta: box('.mg-hero .mg-button').height,
          content: box('.mg-product-grid').width,
          bodyFont: parseFloat(getComputedStyle(document.querySelector('.mg-hero-copy > p')).fontSize) };
      });
      assert.ok(dimensions.overflow <= 1, `${width}: horizontal overflow`);
      assert.ok(dimensions.content <= 1321, `${width}: unbounded catalog`);
      assert.ok(dimensions.cta >= 44 && dimensions.bodyFont >= 14, `${width}: unreadable hero`);
      if (width >= 1280) {
        assert.ok(dimensions.hero <= 620, `${width}: oversized hero`);
        assert.ok(dimensions.footer <= 590, `${width}: oversized footer`);
      }
      rows.push({ width, height, ...dimensions });
      if (output && [390,1440,2560].includes(width)) {
        await page.evaluate(() => scrollTo({ top: 0, behavior: 'instant' }));
        await page.screenshot({ path: join(output, `home-${width}.png`) });
        await page.locator('.mg-footer').scrollIntoViewIfNeeded();
        await page.screenshot({ path: join(output, `footer-${width}.png`) });
      }
    }
    console.table(rows);
    await page.setViewportSize({ width: 390, height: 844 });
    // Keyboard focus is explicit: Safari does not focus buttons on pointer clicks.
    await page.getByRole('button', { name: 'Buscar una pieza', exact: true }).focus();
    await page.keyboard.press('Enter');
    await page.getByRole('textbox', { name: 'Buscar por nombre, categoría o SKU' }).fill('zz-no-existe');
    await page.getByText('No encontramos esa pieza.', { exact: true }).waitFor();
    await page.keyboard.press('Escape');
    await page.waitForFunction(() => document.activeElement?.getAttribute('aria-label') === 'Buscar una pieza');
    assert.equal(await page.getByRole('button', { name: 'Buscar una pieza', exact: true }).evaluate(el => el === document.activeElement), true);
    await page.getByRole('button', { name: 'Accesorios', exact: true }).click();
    await page.getByRole('combobox', { name: 'Ordenar piezas' }).selectOption('price-low');
    await page.waitForFunction(() => [...document.querySelectorAll('.mg-product-category')].every(el => el.textContent === 'Accesorios'));
    await page.locator('.mg-product-card').first().scrollIntoViewIfNeeded();
    await page.locator('.mg-product-photo').first().click({ trial: true });
    const returnAnchor = await page.locator('.mg-product-card').first().getAttribute('data-scroll-anchor');
    const returnTop = await page.locator('.mg-product-card').first().evaluate(el => el.getBoundingClientRect().top);
    await page.locator('.mg-product-photo').first().click();
    await page.waitForURL('**/producto/*');
    await page.goBack({ waitUntil: 'domcontentloaded' });
    await page.waitForURL(url => !url.pathname.includes('/producto/'));
    assert.equal(await page.getByRole('button', { name: 'Accesorios', exact: true }).getAttribute('aria-pressed'), 'true');
    assert.equal(await page.getByRole('combobox', { name: 'Ordenar piezas' }).inputValue(), 'price-low');
    await page.waitForFunction(({ anchor, top }) => {
      const card = document.querySelector(`[data-scroll-anchor="${anchor}"]`);
      return card && Math.abs(card.getBoundingClientRect().top - top) < 4;
    }, { anchor: returnAnchor, top: returnTop });
    await page.getByRole('button', { name: 'Todas', exact: true }).click();
    await page.getByRole('button', { name: 'Ver más piezas', exact: true }).click();
    assert.equal(await page.locator('.mg-product-card').count(), 16);
    await page.locator('.mg-faq summary').nth(1).click();
    assert.equal(await page.locator('.mg-faq details').nth(1).evaluate(el => el.open), true);
    await page.locator('.mg-faq summary').nth(1).focus();
    await page.keyboard.press('Space');
    assert.equal(await page.locator('.mg-faq details').nth(1).evaluate(el => el.open), false);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.locator('.mg-product-photo').first().hover();
    await page.waitForFunction(() => Number(getComputedStyle(document.querySelector('.mg-image-primary')).transform.match(/matrix\(([^,]+)/)?.[1]) > 1);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    assert.equal(await page.locator('.mg-hero-copy > p').evaluate(el => getComputedStyle(el).animationName), 'none');
    assert.equal(await page.locator('.mg-hero .mg-button').evaluate(el => getComputedStyle(el).transitionDuration), '0s');
    const touch = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    await touch.route(paymentRoute, blockPayment);
    const mobile = await touch.newPage();
    mobile.setDefaultTimeout(8000);
    mobile.on('pageerror', error => errors.push(error.message));
    // UI-only bag check with the real catalog as fixture. Origin/payment/API security
    // is covered separately by npm test; this must not mutate a remote cart.
    const catalog = await (await mobile.request.get(`${base}/api/store/catalog`)).json();
    await touch.route('**/api/store/cart', route => {
      if (route.request().method() === 'GET') return route.continue();
      if (route.request().method() === 'DELETE') return route.fulfill({ json: { synced: true } });
      if (route.request().method() !== 'POST') return route.abort();
      const product = catalog.products.find(item => item.sku === route.request().postDataJSON().sku);
      return route.fulfill({ status: product ? 200 : 400, json: product ? { synced: true, product } : { code: 'invalid_cart' } });
    });
    await mobile.goto(base, { waitUntil: 'domcontentloaded' });
    await mobile.getByRole('button', { name: 'Rechazar opcionales', exact: true }).tap();
    await mobile.getByRole('link', { name: 'Ver las piezas', exact: true }).tap();
    const card = mobile.locator('.mg-product-card').filter({ has: mobile.locator('.mg-add-button:not([disabled])') }).first();
    const piece = await card.locator('h3').innerText();
    const [cartResponse] = await Promise.all([
      mobile.waitForResponse(response => new URL(response.url()).pathname === '/api/store/cart' && response.request().method() === 'POST'),
      card.locator('.mg-add-button').tap(),
    ]);
    assert.equal(cartResponse.status(), 200, 'Catalog fixture must contain the selected piece');
    const bag = mobile.getByRole('dialog', { name: 'Tu selección', exact: true });
    await bag.getByRole('button', { name: `Quitar ${piece}`, exact: true }).tap();
    await bag.getByText('Todavía no elegiste una pieza.', { exact: true }).waitFor();
    await bag.getByRole('button', { name: 'Cerrar', exact: true }).tap();
    assert.equal(await mobile.evaluate(() => matchMedia('(hover: hover) and (pointer: fine)').matches), false);
    await touch.close();
    assert.deepEqual(errors, []);
    assert.deepEqual(paymentRequests, []);
    console.log('PASS: responsive, search/focus, filters/order/scroll return, pagination, FAQ, hover/reduced motion, touch bag UI (mocked cart API); no checkout requests.');
  } finally { await browser.close(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
