// Read-only lab sample, not field Core Web Vitals. Three cold mobile visits, no checkout.
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)('playwright');
const browser = await chromium.launch();
try {
  const rows = [];
    for (let run = 1; run <= 3; run++) {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, deviceScaleFactor: 3 });
    const page = await context.newPage();
    const cdp = await context.newCDPSession(page);
    await cdp.send('Network.enable');
    await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
    await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 150, downloadThroughput: 200000, uploadThroughput: 100000 });
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
    await page.addInitScript(() => {
      window.lab = { lcp: 0, cls: 0, element: '', image: '', longTasks: [] };
      new PerformanceObserver(list => { const e = list.getEntries().at(-1); window.lab.lcp = e.startTime; window.lab.element = e.element?.outerHTML.slice(0, 180); window.lab.image = e.url; }).observe({ type: 'largest-contentful-paint', buffered: true });
      new PerformanceObserver(list => { for (const e of list.getEntries()) if (!e.hadRecentInput) window.lab.cls += e.value; }).observe({ type: 'layout-shift', buffered: true });
      new PerformanceObserver(list => { for (const e of list.getEntries()) window.lab.longTasks.push({ start: Math.round(e.startTime), duration: Math.round(e.duration) }); }).observe({ type: 'longtask', buffered: true });
    });
    await page.goto(process.env.QA_BASE_URL || 'https://mangata.com.ar', { waitUntil: 'load', timeout: 60000 });
    await page.waitForTimeout(3000);
    rows.push(await page.evaluate(run => {
      const nav = performance.getEntriesByType('navigation')[0];
      const resources = performance.getEntriesByType('resource');
      const photo = resources.find(e => e.name === window.lab.image);
      return { run, ...window.lab, ttfb: nav.responseStart, imageEnd: photo?.responseEnd,
        imageDuration: photo?.duration, imageBytes: photo?.encodedBodySize,
        fcp: performance.getEntriesByName('first-contentful-paint')[0]?.startTime,
        resources: resources.filter(e => e.initiatorType === 'link').map(e => ({ name: e.name.split('/').at(-1), end: Math.round(e.responseEnd), bytes: e.encodedBodySize })),
        scriptKB: Math.round(resources.filter(e => e.initiatorType === 'script').reduce((sum,e) => sum + e.encodedBodySize, 0) / 1024) };
    }, run));
    await context.close();
  }
  console.log(JSON.stringify(rows, null, 2));
} finally { await browser.close(); }
