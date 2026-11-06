// Issues a panel invitation and prints its private link. Run inside the web container:
// docker exec -i -e ADMIN_EMAIL=persona@ejemplo.com mangata-web-1 node --input-type=module < deploy/admin-invite.mjs
import { createHash, randomBytes } from "node:crypto";
import pg from "pg";

const email = (process.env.ADMIN_EMAIL ?? "").trim().toLowerCase();
if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { console.error("ADMIN_EMAIL inválido"); process.exit(1); }
const token = randomBytes(32).toString("base64url");
const client = new pg.Client({ connectionString: process.env.MANGATA_DATABASE_URL });
await client.connect();
await client.query(`INSERT INTO admin_users(email,invite_hash,invite_expires_at) VALUES($1,$2,now()+interval '24 hours')
  ON CONFLICT(email) DO UPDATE SET invite_hash=EXCLUDED.invite_hash,invite_expires_at=EXCLUDED.invite_expires_at,pending_password_hash=NULL,pending_totp_enc=NULL,active=true`,
[email, createHash("sha256").update(token).digest("hex")]);
await client.end();
console.log(`${process.env.NEXT_PUBLIC_SITE_URL}/admin/activar?t=${token}`);
