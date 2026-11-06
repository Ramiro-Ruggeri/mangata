import { createCipheriv, createDecipheriv, createHash, createHmac, hkdfSync, randomBytes, scrypt, timingSafeEqual } from "node:crypto";

// OWASP minimum for scrypt. About 128 MB per attempt, so login is throttled before reaching it.
const SCRYPT = { N: 2 ** 17, r: 8, p: 1, maxmem: 256 * 1024 * 1024 };
const KEY_LENGTH = 32;

const derive = (password: string, salt: Buffer, params: typeof SCRYPT) => new Promise<Buffer>((resolve, reject) => {
  scrypt(password.normalize("NFKC"), salt, KEY_LENGTH, params, (error, key) => error ? reject(error) : resolve(key));
});

export async function hashPassword(password: string) {
  const salt = randomBytes(16);
  const key = await derive(password, salt, SCRYPT);
  return `scrypt$${SCRYPT.N}$${SCRYPT.r}$${SCRYPT.p}$${salt.toString("base64url")}$${key.toString("base64url")}`;
}

export async function verifyPassword(password: string, stored: string) {
  const [scheme, N, r, p, salt, key] = stored.split("$");
  if (scheme !== "scrypt" || !salt || !key) return false;
  const expected = Buffer.from(key, "base64url");
  const actual = await derive(password, Buffer.from(salt, "base64url"), { N: Number(N), r: Number(r), p: Number(p), maxmem: SCRYPT.maxmem });
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

// Spent on unknown accounts, so response time does not reveal which emails exist.
let dummy: Promise<string> | undefined;
export function burnPasswordCheck(password: string) {
  dummy ??= hashPassword(randomBytes(16).toString("hex"));
  return dummy.then(stored => verifyPassword(password, stored)).then(() => false);
}

export const sha256 = (value: string) => createHash("sha256").update(value).digest("hex");
export const newToken = () => randomBytes(32).toString("base64url");

const BASE32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

export function base32Encode(bytes: Buffer) {
  let bits = 0, value = 0, output = "";
  for (const byte of bytes) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) { output += BASE32[(value >>> (bits - 5)) & 31]; bits -= 5; }
    value &= (1 << bits) - 1;
  }
  return bits > 0 ? output + BASE32[(value << (5 - bits)) & 31] : output;
}

export const newTotpSecret = () => randomBytes(20);
export const TOTP_PERIOD = 30;

/** RFC 6238 with the parameters every authenticator app supports: SHA-1, 6 digits, 30 seconds. */
export function totpAt(secret: Buffer, step: number) {
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(step));
  const digest = createHmac("sha1", secret).update(counter).digest();
  const offset = digest[digest.length - 1] & 0xf;
  return String((digest.readUInt32BE(offset) & 0x7fffffff) % 1_000_000).padStart(6, "0");
}

/** The matching step within one period of clock drift, or null. The caller must reject replays of it. */
export function matchTotp(secret: Buffer, code: string, now = Date.now()) {
  if (!/^\d{6}$/.test(code)) return null;
  const current = Math.floor(now / 1000 / TOTP_PERIOD);
  const supplied = Buffer.from(code);
  let match: number | null = null;
  for (const step of [current - 1, current, current + 1]) {
    if (timingSafeEqual(Buffer.from(totpAt(secret, step)), supplied)) match = step;
  }
  return match;
}

export const totpUri = (email: string, secret: Buffer) =>
  `otpauth://totp/${encodeURIComponent(`MANGATA:${email}`)}?secret=${base32Encode(secret)}&issuer=MANGATA&algorithm=SHA1&digits=6&period=${TOTP_PERIOD}`;

const encryptionKey = (rootSecret: string) => {
  if (rootSecret.length < 32) throw new Error("admin secret missing");
  return Buffer.from(hkdfSync("sha256", rootSecret, "mangata-admin", "totp-secret-v1", 32));
};

/** A database dump alone must not be enough to generate second-factor codes. */
export function sealSecret(secret: Buffer, rootSecret: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(rootSecret), iv);
  const body = Buffer.concat([cipher.update(secret), cipher.final()]);
  return [iv, cipher.getAuthTag(), body].map(part => part.toString("base64url")).join(".");
}

export function openSecret(sealed: string, rootSecret: string) {
  const [iv, tag, body] = sealed.split(".").map(part => Buffer.from(part, "base64url"));
  const decipher = createDecipheriv("aes-256-gcm", encryptionKey(rootSecret), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(body), decipher.final()]);
}

/** High-entropy and single use, so a plain hash is enough. Normalized for typing on a phone. */
export const normalizeRecoveryCode = (code: string) => code.toUpperCase().replace(/[^A-Z2-7]/g, "");
export function newRecoveryCodes(count = 8) {
  return Array.from({ length: count }, () => {
    const code = base32Encode(randomBytes(10));
    return `${code.slice(0, 4)}-${code.slice(4, 8)}-${code.slice(8, 12)}-${code.slice(12)}`;
  });
}
