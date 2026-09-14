export const CONSENT_KEY = "mangata_privacy_v1";
export const CONSENT_VERSION = 1;
// Engineering review interval, not a claim about a legally prescribed duration.
export const CONSENT_TTL_MS = 180 * 24 * 60 * 60 * 1000;

export type ConsentRecord = {
  version: typeof CONSENT_VERSION;
  analytics: boolean;
  decidedAt: number;
  expiresAt: number;
};

export function createConsent(analytics: boolean, now = Date.now()): ConsentRecord {
  return { version: CONSENT_VERSION, analytics, decidedAt: now, expiresAt: now + CONSENT_TTL_MS };
}

export function parseConsent(raw: string | null, now = Date.now()): ConsentRecord | null {
  if (!raw || raw.length > 512) return null;
  try {
    const value = JSON.parse(raw) as Partial<ConsentRecord> | null;
    if (!value || Array.isArray(value) || value.version !== CONSENT_VERSION || typeof value.analytics !== "boolean" ||
      !Number.isSafeInteger(value.decidedAt) || !Number.isSafeInteger(value.expiresAt) ||
      value.decidedAt! <= 0 || value.decidedAt! > now || value.expiresAt! <= now ||
      value.expiresAt! !== value.decidedAt! + CONSENT_TTL_MS) return null;
    return { version: CONSENT_VERSION, analytics: value.analytics, decidedAt: value.decidedAt!, expiresAt: value.expiresAt! };
  } catch { return null; }
}
