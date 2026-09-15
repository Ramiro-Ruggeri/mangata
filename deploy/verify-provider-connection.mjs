// Run inside the production web container. Creates and immediately expires a
// synthetic preference; never submits a payment or reserves any catalog SKU.
import assert from 'node:assert/strict';
import { createHmac, randomUUID } from 'node:crypto';

const token = process.env.MP_ACCESS_TOKEN ?? '';
const secret = process.env.MP_WEBHOOK_SECRET ?? '';
assert.match(token, /^APP_USR-[\w-]{20,}$/);
assert.ok(secret.length >= 20);
assert.equal(process.env.MANGATA_PAYMENT_ENV, 'production');
assert.equal(process.env.MP_MERCHANT_ID, '1017442384');
assert.equal(process.env.MANGATA_SHIPPING_MODE, 'arranged_separately');
async function api(path, method = 'GET', body) {
  const response = await fetch(`https://api.mercadopago.com${path}`, {
    method, redirect: 'error', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined, signal: AbortSignal.timeout(15000),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(`Provider ${method} ${path.split('/').slice(0,3).join('/')}: HTTP ${response.status}; ${String(data.message ?? data.error ?? '').slice(0,200)}`);
  return data;
}
let preference;
try {
  const site = 'https://mangata.com.ar';
  preference = await api('/checkout/preferences', 'POST', {
    items: [{ id: 'MANGATA-QA-NOT-FOR-SALE', title: 'MANGATA — verificación técnica sin compra', quantity: 1, currency_id: 'ARS', unit_price: 100 }],
    external_reference: `MANGATA-DEPLOY-CHECK-${randomUUID()}`,
    back_urls: { success: `${site}/checkout/success`, failure: `${site}/checkout/failure`, pending: `${site}/checkout/pending` },
    notification_url: `${site}/api/mp/webhook`, auto_return: 'approved', statement_descriptor: 'MANGATA',
    expires: true, expiration_date_to: new Date(Date.now() + 600000).toISOString(),
  });
  assert.equal(String(preference.collector_id), '1017442384');
  assert.equal(new URL(preference.init_point).hostname, 'www.mercadopago.com.ar');
  assert.equal(preference.notification_url, `${site}/api/mp/webhook`);
  assert.equal(preference.items[0].currency_id, 'ARS');
  assert.equal(preference.items[0].unit_price, 100);
  const payments = await api(`/v1/payments/search?external_reference=${encodeURIComponent(preference.external_reference)}`);
  assert.equal(payments.results.length, 0);
  console.log(JSON.stringify({ preferenceCreated: true, paymentSearchAuthorized: true, merchantVerified: true, currency: 'ARS', paymentSubmitted: false }));
} finally {
  if (preference?.id) {
    const expired = await api(`/checkout/preferences/${preference.id}`, 'PUT', {
      expires: true, expiration_date_from: new Date(Date.now() - 120000).toISOString(), expiration_date_to: new Date(Date.now() - 60000).toISOString(),
    });
    assert.equal(expired.expires, true);
    assert.ok(new Date(expired.expiration_date_to).getTime() < Date.now());
    console.log(JSON.stringify({ syntheticPreferenceExpired: true, productionStockTouched: false }));
  }
}
const id = '0';
const ts = String(Math.floor(Date.now()/1000));
const requestId = randomUUID();
const digest = createHmac('sha256', secret).update(`id:${id};request-id:${requestId};ts:${ts};`).digest('hex');
for (const base of ['http://127.0.0.1:3000', 'https://mangata.com.ar']) {
  const endpoint = `${base}/api/mp/webhook?data.id=${id}`;
  const invalid = await fetch(endpoint, { method: 'POST', signal: AbortSignal.timeout(12000) });
  assert.equal(invalid.status, 401);
  const signed = await fetch(endpoint, { method: 'POST', headers: { 'x-request-id': requestId, 'x-signature': `ts=${ts},v1=${digest}` }, signal: AbortSignal.timeout(12000) });
  // A signature is not proof of a payment: a nonexistent resource must not ACK.
  assert.equal(signed.status, 503);
  console.log(JSON.stringify({ origin: base.startsWith('https') ? 'public-https' : 'container', forgedEventRejected: true, signedMissingPaymentNotAcknowledged: true }));
}
