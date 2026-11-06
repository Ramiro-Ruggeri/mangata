"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { ArrowDown, X } from "lucide-react";
import { trackCommerceEvent } from "@/lib/analytics";
import type { Campaign } from "@/config/campaign";

const closedKey = (id: string) => `mangata_campaign_closed_${id}`;

function BarItems({ campaign }: { campaign: Campaign }) {
  return <>
    {Array.from({ length: 6 }, (_, index) => <span className="mg-campaign-bar-item" key={index}>
      <i className="mangata-mark" aria-hidden="true" />
      <b>{campaign.title}</b>
      <strong>{campaign.percent}% OFF</strong>
      <span>{campaign.message}</span>
    </span>)}
  </>;
}

/** The moving strip over the header, on every visit, for as long as the campaign lasts. */
export function CampaignBar({ campaign }: { campaign: Campaign }) {
  return <a className="mg-campaign-bar" href={campaign.href} aria-label={`${campaign.title}: ${campaign.percent}% OFF. ${campaign.message} ${campaign.linkLabel}`} onClick={() => trackCommerceEvent("announcement_click", { source: `${campaign.id}_bar` })}>
    <span className="mg-campaign-bar-track" aria-hidden="true"><BarItems campaign={campaign} /><BarItems campaign={campaign} /></span>
  </a>;
}

/** The full-screen opening. It shows once per visitor and per campaign, and closes with Esc, the X or the button. */
export function CampaignTakeover({ campaign }: { campaign: Campaign }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });

  useEffect(() => {
    try { if (window.localStorage.getItem(closedKey(campaign.id))) return; } catch { /* It may show again next visit. */ }
    const timer = window.setTimeout(() => {
      if (document.documentElement.dataset.activeOverlay || !dialog.current || dialog.current.open) return;
      dialog.current.showModal();
      trackCommerceEvent("announcement_view", { source: campaign.id });
    }, 1400);
    return () => window.clearTimeout(timer);
  }, [campaign.id]);

  const remember = () => {
    try { window.localStorage.setItem(closedKey(campaign.id), "1"); } catch { /* It stays closed for this page view. */ }
  };
  const close = () => {
    dialog.current?.close();
    trackCommerceEvent("announcement_close", { source: campaign.id });
  };
  const enter = () => {
    dialog.current?.close();
    trackCommerceEvent("announcement_click", { source: campaign.id });
    window.location.hash = campaign.href.split("#")[1] ?? "";
  };

  return <dialog
    ref={dialog}
    className="mg-takeover"
    aria-label={`${campaign.title}: ${campaign.percent}% OFF`}
    onClose={remember}
    onPointerMove={(event) => setTilt({ x: event.clientX / window.innerWidth * 2 - 1, y: event.clientY / window.innerHeight * 2 - 1 })}
    style={{ "--tilt-x": tilt.x, "--tilt-y": tilt.y } as CSSProperties}
  >
    <span className="mg-takeover-glow" aria-hidden="true" />
    <span className="mg-takeover-tribal mg-takeover-reflejo" aria-hidden="true" />
    <span className="mg-takeover-tribal mg-takeover-cruz" aria-hidden="true" />
    <button type="button" className="mg-takeover-close" onClick={close} aria-label="Cerrar"><X size={22} aria-hidden="true" /></button>
    <div className="mg-takeover-body">
      <i className="mangata-mark" aria-hidden="true" />
      <p className="mg-takeover-title">{campaign.title}</p>
      <p className="mg-takeover-number"><strong>{campaign.percent}<sup>%</sup></strong><span>OFF</span></p>
      <p className="mg-takeover-message">{campaign.message}</p>
      <button type="button" className="mg-takeover-cta" onClick={enter} autoFocus>{campaign.linkLabel} <ArrowDown size={18} aria-hidden="true" /></button>
    </div>
  </dialog>;
}
