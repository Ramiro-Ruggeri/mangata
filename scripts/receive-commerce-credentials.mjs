// Temporary loopback-only provisioning form. No outbound traffic or secret logs.
// Browser clipboard -> password field -> ignored local file -> SSH to Hostinger.
import { createServer } from 'node:http';
import { randomBytes } from 'node:crypto';
import { writeFileSync, existsSync, readFileSync } from 'node:fs';
const nonce = randomBytes(24).toString('hex');
const port = 37643;
const origin = `http://127.0.0.1:${port}`;
const file = new URL('../.env.mercadopago-provision', import.meta.url);
const keys = ['MP_ACCESS_TOKEN', 'MP_WEBHOOK_SECRET', 'MP_TEST_ACCESS_TOKEN'];
const server = createServer(async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Content-Security-Policy', "default-src 'none'; form-action 'self'; frame-ancestors 'none'; base-uri 'none'");
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'no-referrer');
  if (req.headers.host !== `127.0.0.1:${port}` || req.url !== `/${nonce}`) { res.writeHead(404).end(); return; }
  if (req.method === 'GET') {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.end(`<!doctype html><html lang="es"><meta charset="utf-8"><title>Configuración privada MANGATA</title><h1>Credenciales · transferencia local</h1><p>Se guardan sólo en este equipo, fuera de Git. Destino: servidor Hostinger de MANGATA.</p><form method="post" autocomplete="off"><label>Clave<select name="key">${keys.map(key => `<option>${key}</option>`).join('')}</select></label><label>Valor<input name="value" type="password" required autocomplete="off"></label><button>Guardar en archivo privado</button></form></html>`);
    return;
  }
  if (req.method !== 'POST' || req.headers.origin !== origin || !['same-origin', undefined].includes(req.headers['sec-fetch-site'])) { res.writeHead(403).end(); return; }
  const chunks = []; let size = 0;
  for await (const chunk of req) { size += chunk.length; if (size > 4096) { res.writeHead(413).end(); return; } chunks.push(chunk); }
  const data = new URLSearchParams(Buffer.concat(chunks).toString());
  const key = data.get('key'), value = data.get('value')?.trim() ?? '';
  if (!keys.includes(key) || !/^[a-zA-Z0-9_-]{20,500}$/.test(value)) { res.writeHead(400).end('Formato no válido. No se guardó.'); return; }
  const values = Object.fromEntries((existsSync(file) ? readFileSync(file, 'utf8') : '').split('\n').filter(Boolean).map(line => { const at = line.indexOf('='); return [line.slice(0, at), line.slice(at + 1)]; }));
  values[key] = value;
  writeFileSync(file, Object.entries(values).map(([k, v]) => `${k}=${v}`).join('\n') + '\n', { mode: 0o600 });
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.end('<!doctype html><html lang="es"><meta charset="utf-8"><title>Guardado privado</title><h1>Clave guardada sin mostrar su valor</h1><a href="">Cargar otra clave</a></html>');
  console.log(`Stored ${key}; value not logged.`);
});
server.listen(port, '127.0.0.1', () => console.log(`Private provisioning form: ${origin}/${nonce}`));
setTimeout(() => server.close(), 45 * 60 * 1000).unref();
