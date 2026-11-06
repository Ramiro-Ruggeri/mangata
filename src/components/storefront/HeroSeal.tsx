"use client";

import { Component, useCallback, useEffect, useState, type ReactNode } from "react";
import dynamic from "next/dynamic";
import { canDraw3D } from "./TribalScene";

const AdornCanvas = dynamic(() => import("./TribalCanvas").then((module) => module.AdornCanvas), { ssr: false });

class Boundary extends Component<{ children: ReactNode }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? null : this.props.children; }
}

/** The stamp on the cover piece: the garment's own applique turning in 3D, with the promise around it. */
export function HeroSeal() {
  const [load, setLoad] = useState(false);
  const [live, setLive] = useState(false);
  const onReady = useCallback(() => setLive(true), []);

  // It waits until the page has finished and settled, so it never delays the photo or a purchase.
  useEffect(() => {
    let timer = 0;
    const schedule = () => { timer = window.setTimeout(() => { if (canDraw3D()) setLoad(true); }, 1500); };
    if (document.readyState === "complete") schedule();
    else window.addEventListener("load", schedule, { once: true });
    return () => { window.clearTimeout(timer); window.removeEventListener("load", schedule); };
  }, []);

  return <span className="mg-hero-seal" data-live={live}>
    <span className="sr-only">Pieza única. Sin reposición.</span>
    <svg className="mg-hero-seal-ring" viewBox="0 0 120 120" aria-hidden="true">
      <defs><path id="mg-seal-ring" d="M60 60m-47 0a47 47 0 1 1 94 0a47 47 0 1 1-94 0" /></defs>
      <text><textPath href="#mg-seal-ring" textLength="292">PIEZA ÚNICA · SIN REPOSICIÓN ·</textPath></text>
    </svg>
    <span className="mg-hero-seal-static" aria-hidden="true" />
    {load && <Boundary><AdornCanvas onReady={onReady} /></Boundary>}
  </span>;
}
