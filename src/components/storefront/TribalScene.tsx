"use client";

import { Component, useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import dynamic from "next/dynamic";

// three.js is heavy: it only downloads when this section is about to appear.
const TribalCanvas = dynamic(() => import("./TribalCanvas"), { ssr: false });

class SceneBoundary extends Component<{ onFail: () => void; children: ReactNode }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch() { this.props.onFail(); }
  render() { return this.state.failed ? null : this.props.children; }
}

export function canDraw3D() {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return false;
  const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
  if (connection?.saveData) return false;
  const context = document.createElement("canvas").getContext("webgl2");
  context?.getExtension("WEBGL_lose_context")?.loseContext();
  return Boolean(context);
}

/** The still drawings stay in the page and remain as the fallback when 3D cannot or should not run. */
export function TribalScene() {
  const field = useRef<HTMLDivElement>(null);
  const [load, setLoad] = useState(false);
  const [live, setLive] = useState(false);
  const onReady = useCallback(() => setLive(true), []);
  const onFail = useCallback(() => { setLive(false); setLoad(false); }, []);

  useEffect(() => {
    const element = field.current;
    if (!element) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      observer.disconnect();
      if (canDraw3D()) setLoad(true);
    }, { rootMargin: "600px 0px" });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return <section className="mg-tribal" aria-labelledby="tribal-title">
    <div className="mg-tribal-copy mg-shell">
      <span className="mg-eyebrow">Reflejo sobre el agua</span>
      <h2 id="tribal-title">Mezclamos.<br /><em>Transformamos.</em></h2>
    </div>
    <div ref={field} className="mg-tribal-field" data-live={live} aria-hidden="true">
      <span className="mg-tribal-piece mg-tribal-reflejo" />
      <span className="mg-tribal-piece mg-tribal-cruz" />
      {load && <SceneBoundary onFail={onFail}><TribalCanvas field={field} onReady={onReady} onFail={onFail} /></SceneBoundary>}
    </div>
  </section>;
}
