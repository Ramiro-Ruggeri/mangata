export type Campaign = {
  /** Remembers a visitor's dismissal per campaign, so a new campaign can be seen again. */
  id: string;
  title: string;
  /** The discount already inside the listed prices. It never changes a price. */
  percent: number;
  message: string;
  linkLabel: string;
  href: string;
  /** ISO dates with Argentina's offset, for example 2026-11-27T00:00:00-03:00. */
  startsAt: string;
  endsAt: string;
};

/**
 * The campaign on air. Until the panel exists, this is the one place to change it.
 * Only a real benefit with real dates goes here: no invented urgency, no inflated prices, no official event logos.
 */
export const CAMPAIGN: Campaign | null = null;

/** Only for looking at the design on a private server, with MANGATA_CAMPAIGN_PREVIEW=1. Never set it in production. */
const PREVIEW: Campaign = {
  id: "vista-previa",
  title: "Cyber Monday",
  percent: 20,
  message: "Ya aplicado en los precios que ves.",
  linkLabel: "Ver el catálogo",
  href: "/#coleccion",
  startsAt: "2000-01-01T00:00:00-03:00",
  endsAt: "2100-01-01T00:00:00-03:00",
};

export function isOnAir(campaign: Campaign, now = Date.now()) {
  const start = Date.parse(campaign.startsAt), end = Date.parse(campaign.endsAt);
  return Number.isFinite(start) && Number.isFinite(end) && now >= start && now < end;
}

export function currentCampaign(now = Date.now(), campaign = CAMPAIGN, preview = process.env.MANGATA_CAMPAIGN_PREVIEW === "1") {
  if (campaign && isOnAir(campaign, now)) return campaign;
  return preview ? PREVIEW : null;
}
