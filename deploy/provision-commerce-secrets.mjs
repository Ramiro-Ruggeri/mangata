// Run on the VPS, mounted at /secrets. Existing files are never overwritten.
import { randomBytes } from 'node:crypto';
import { existsSync, writeFileSync, chmodSync } from 'node:fs';
const files = ['/secrets/database.env', '/secrets/commerce.env'];
if (files.some(existsSync)) throw new Error('Existing commerce configuration: review it, do not rotate blindly.');
const secret = () => randomBytes(32).toString('hex');
const appPassword = secret();
writeFileSync(files[0], `POSTGRES_USER=mangata_bootstrap\nPOSTGRES_DB=mangata\nPOSTGRES_PASSWORD=${secret()}\nMANGATA_APP_PASSWORD=${appPassword}\nPOSTGRES_INITDB_ARGS=--data-checksums\n`, { mode: 0o600, flag: 'wx' });
writeFileSync(files[1], `MANGATA_ORDER_STORAGE=postgres\nMANGATA_DATABASE_URL=postgresql://mangata_app:${appPassword}@mangata_db:5432/mangata\nCOMMERCE_SESSION_SECRET=${secret()}\nCOMMERCE_OPS_TOKEN=${secret()}\nMANGATA_CHECKOUT_ENABLED=0\n`, { mode: 0o600, flag: 'wx' });
files.forEach(file => chmodSync(file, 0o600));
console.log('Private database/session/operations secrets created; checkout remains disabled.');
