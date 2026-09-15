// Secure, repeatable import: /incoming/provider.env -> /secrets/commerce.env.
// Does not enable checkout, accept terms, create a payment or generate API keys.
import { readFileSync, writeFileSync, renameSync } from 'node:fs';
const parse = text => Object.fromEntries(text.split(/\r?\n/).filter(line=>line && !line.startsWith('#')).map(line=>{const at=line.indexOf('=');return [line.slice(0,at),line.slice(at+1)];}));
const incoming = parse(readFileSync('/incoming/provider.env','utf8'));
const current = parse(readFileSync('/secrets/commerce.env','utf8'));
const token = incoming.MP_ACCESS_TOKEN ?? current.MP_ACCESS_TOKEN;
if (!/^APP_USR-[\w-]{20,}$/.test(token ?? '')) throw new Error('Production credential format invalid.');
const response = await fetch('https://api.mercadopago.com/users/me', { headers:{Authorization:`Bearer ${token}`}, redirect:'error', signal:AbortSignal.timeout(10000) });
if (!response.ok) throw new Error(`Merchant verification failed (${response.status}).`);
const merchant = await response.json();
if (String(merchant.id) !== '1017442384' || merchant.site_id !== 'MLA') throw new Error('Merchant is not the verified MANGATA owner.');
current.MP_ACCESS_TOKEN = token;
current.MP_MERCHANT_ID = String(merchant.id);
current.MANGATA_PAYMENT_ENV = 'production';
// Explicitly approved by the owner/operator on 14 September 2026.
current.MANGATA_SHIPPING_MODE = 'arranged_separately';
if (incoming.MP_WEBHOOK_SECRET) {
  if (!/^[\w-]{20,500}$/.test(incoming.MP_WEBHOOK_SECRET)) throw new Error('Webhook secret format invalid.');
  current.MP_WEBHOOK_SECRET = incoming.MP_WEBHOOK_SECRET;
}
writeFileSync('/secrets/commerce.env.next',Object.entries(current).map(([key,value])=>`${key}=${value}`).join('\n')+'\n',{mode:0o600});
renameSync('/secrets/commerce.env.next','/secrets/commerce.env');
console.log(JSON.stringify({merchantVerified:true,site:'MLA',webhookConfigured:!!current.MP_WEBHOOK_SECRET,checkoutEnabled:current.MANGATA_CHECKOUT_ENABLED==='1'}));
