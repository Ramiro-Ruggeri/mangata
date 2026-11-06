"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { trackCommerceEvent } from "@/lib/analytics";
import { isOnAir, type Campaign } from "@/config/campaign";

const closedKey = (id: string) => `mangata_campaign_closed_${id}`;

/** Fixed, so it never moves the page. It appears after a sign of interest and never takes the focus. */
export function CampaignNotice({ campaign }: { campaign: Campaign }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try { if (window.localStorage.getItem(closedKey(campaign.id))) return; } catch { /* Then it simply can be closed again next visit. */ }
    let shown = false;
    const show = () => {
      if (shown || !isOnAir(campaign)) return;
      shown = true;
      setVisible(true);
      trackCommerceEvent("announcement_view", { source: campaign.id });
    };
    const onScroll = () => { if (window.scrollY > window.innerHeight * .3) show(); };
    const timer = window.setTimeout(show, 6000);
    // It turns itself off at the end date, even in a tab left open.
    const expiry = window.setInterval(() => { if (!isOnAir(campaign)) setVisible(false); }, 60_000);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => { window.clearTimeout(timer); window.clearInterval(expiry); window.removeEventListener("scroll", onScroll); };
  }, [campaign]);

  if (!visible) return null;
  const close = () => {
    setVisible(false);
    try { window.localStorage.setItem(closedKey(campaign.id), "1"); } catch { /* It stays closed for this page view. */ }
    trackCommerceEvent("announcement_close", { source: campaign.id });
  };
  return <aside className="campaign-notice" aria-label={`Anuncio: ${campaign.title}`}>
    <span className="campaign-notice-mark" aria-hidden="true" />
    <div className="campaign-notice-copy">
      <strong>{campaign.title}</strong>
      <p>{campaign.message}</p>
      <Link href={campaign.href} onClick={() => trackCommerceEvent("announcement_click", { source: campaign.id })}>{campaign.linkLabel}</Link>
    </div>
    <button type="button" onClick={close} aria-label={`Cerrar anuncio de ${campaign.title}`}><X size={18} aria-hidden="true" /></button>
  </aside>;
}
