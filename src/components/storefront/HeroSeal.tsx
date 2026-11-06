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

/** The stamp on the cover piece: an adorn turning in 3D, with the promise around it. */
export function HeroSeal({ adorn }: { adorn: string }) {
  const [load, setLoad] = useState(false);
  const [live, setLive] = useState(false);
  const onReady = useCallback(() => setLive(true), []);

  // three.js is heavy: someone who only glances at the page never downloads it, and sees the still stamp.
  useEffect(() => {
    const events = ["pointermove", "pointerdown", "scroll", "keydown"] as const;
    const start = () => {
      events.forEach(name => window.removeEventListener(name, start));
      if (canDraw3D()) setLoad(true);
    };
    events.forEach(name => window.addEventListener(name, start, { passive: true }));
    return () => events.forEach(name => window.removeEventListener(name, start));
  }, []);

  return <span className="mg-hero-seal" data-live={live}>
    <span className="sr-only">Pieza única. Sin reposición.</span>
    <svg className="mg-hero-seal-ring" viewBox="0 0 120 120" aria-hidden="true">
      <defs><path id="mg-seal-ring" d="M60 60m-47 0a47 47 0 1 1 94 0a47 47 0 1 1-94 0" /></defs>
      <text><textPath href="#mg-seal-ring" textLength="292">PIEZA ÚNICA · SIN REPOSICIÓN ·</textPath></text>
    </svg>
    <span className="mg-hero-seal-static" aria-hidden="true" style={{ WebkitMaskImage: `url(${adorn})`, maskImage: `url(${adorn})` }} />
    {load && <Boundary><AdornCanvas src={adorn} onReady={onReady} /></Boundary>}
  </span>;
}
