export const PRODUCTION_SITE_URL = "https://mangata-store.vercel.app";

/** The previous Vercel alias is no longer this store. Never emit it in metadata. */
export function resolveSiteUrl(configured?: string): string {
  if (!configured?.trim()) return PRODUCTION_SITE_URL;
  try {
    const url = new URL(configured.trim());
    if (url.hostname === "mangata-two.vercel.app" || url.username || url.password) return PRODUCTION_SITE_URL;
    if (!["https:", "http:"].includes(url.protocol)) return PRODUCTION_SITE_URL;
    return url.origin;
  } catch { return PRODUCTION_SITE_URL; }
}

export function getSiteUrl() {
  return resolveSiteUrl(process.env.NEXT_PUBLIC_SITE_URL);
}
