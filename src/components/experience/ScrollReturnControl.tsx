"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { ArrowDown, ArrowUp } from "lucide-react";
import { useExperience } from "./ExperienceProvider";
import { isPastScrollThreshold, resolveReturnY, shouldDiscardReturn, type ScrollReturnPoint } from "@/lib/experience/interaction";

const ANCHORS = "[data-scroll-anchor], main [id], main, [role='main']";
const SCROLL_KEYS = new Set(["ArrowDown", "ArrowUp", "PageDown", "PageUp", "Home", "End", " "]);

function documentHeight() {
  return Math.max(document.documentElement.scrollHeight, document.body.scrollHeight);
}

function visibleAnchor(): HTMLElement | null {
  const candidates = Array.from(document.querySelectorAll<HTMLElement>(ANCHORS))
    .map((element) => ({ element, rect: element.getBoundingClientRect() }))
    .filter(({ element, rect }) => rect.height > 0 && rect.width > 0 && rect.top < window.innerHeight && rect.bottom > 0 && !element.closest("dialog, [inert], [aria-hidden='true']"));
  candidates.sort((a, b) => Math.abs(a.rect.top - 96) - Math.abs(b.rect.top - 96));
  return candidates[0]?.element ?? document.querySelector<HTMLElement>("main");
}

function findAnchor(point: ScrollReturnPoint): HTMLElement | null {
  if (!point.anchor) return null;
  if (point.anchor.kind === "id") return document.getElementById(point.anchor.key);
  return Array.from(document.querySelectorAll<HTMLElement>("[data-scroll-anchor]"))
    .find((element) => element.dataset.scrollAnchor === point.anchor?.key) ?? null;
}

function capturePoint(route: string): ScrollReturnPoint {
  const element = visibleAnchor();
  const dataKey = element?.dataset.scrollAnchor;
  const key = dataKey || element?.id;
  const anchor = element && key ? {
    kind: dataKey ? "data" as const : "id" as const,
    key,
    offset: -element.getBoundingClientRect().top,
  } : null;
  return { route, scrollY: window.scrollY, anchor };
}

function focusDestination(element: HTMLElement | null) {
  if (!element?.isConnected || document.documentElement.dataset.activeOverlay) return;
  const nativeFocusable = element.matches("a[href], button, input, select, textarea, [tabindex]");
  if (!nativeFocusable) {
    element.setAttribute("tabindex", "-1");
    element.addEventListener("blur", () => element.removeAttribute("tabindex"), { once: true });
  }
  element.focus({ preventScroll: true });
}

/** This key resets only navigation UI on a route change, never the cart/catalog. */
export function ScrollReturnControl() {
  const pathname = usePathname();
  return <ScrollReturnSession key={pathname} route={pathname} />;
}

function ScrollReturnSession({ route }: { route: string }) {
  const { activeOverlay } = useExperience();
  const [beyondViewport, setBeyondViewport] = useState(false);
  const [returnPoint, setReturnPoint] = useState<ScrollReturnPoint | null>(null);
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  const [travelling, setTravelling] = useState(false);
  const [status, setStatus] = useState("");
  const pointRef = useRef<ScrollReturnPoint | null>(null);
  const manualNavigation = useRef(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const cancelFlight = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (activeOverlay) cancelFlight.current?.();
  }, [activeOverlay]);

  useEffect(() => {
    let frame = 0;
    const readPosition = () => {
      frame = 0;
      setBeyondViewport(isPastScrollThreshold(window.scrollY, window.innerHeight));
      if (pointRef.current && shouldDiscardReturn(window.scrollY, manualNavigation.current)) {
        pointRef.current = null;
        setReturnPoint(null);
        setStatus("");
        if (document.activeElement === buttonRef.current && !isPastScrollThreshold(window.scrollY, window.innerHeight)) focusDestination(visibleAnchor());
      }
      if (!pointRef.current && !cancelFlight.current && !isPastScrollThreshold(window.scrollY, window.innerHeight) && document.activeElement === buttonRef.current) focusDestination(visibleAnchor());
    };
    const onScroll = () => { if (!frame) frame = requestAnimationFrame(readPosition); };
    const onManualInput = (event: Event) => {
      if (event.target instanceof Node && buttonRef.current?.contains(event.target)) return;
      if (event instanceof KeyboardEvent) {
        if (event.key === "Tab") { cancelFlight.current?.(); return; }
        if (!SCROLL_KEYS.has(event.key) || event.altKey || event.ctrlKey || event.metaKey) return;
        const target = event.target as HTMLElement;
        if (target?.closest("input, textarea, select, [contenteditable='true'], dialog")) return;
        if (event.key === " " && target?.closest("button, a, summary")) return;
      }
      manualNavigation.current = true;
      cancelFlight.current?.();
      onScroll();
    };
    const onViewportChange = () => {
      const editable = document.activeElement?.matches("input, textarea, select, [contenteditable='true']") ?? false;
      setKeyboardOpen(Boolean(editable && window.visualViewport && window.innerHeight - window.visualViewport.height > 150));
      onScroll();
    };

    frame = requestAnimationFrame(readPosition);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onViewportChange, { passive: true });
    window.addEventListener("wheel", onManualInput, { passive: true });
    window.addEventListener("touchmove", onManualInput, { passive: true });
    window.addEventListener("pointerdown", onManualInput, { passive: true });
    window.addEventListener("keydown", onManualInput);
    document.addEventListener("focusin", onViewportChange);
    document.addEventListener("focusout", onViewportChange);
    window.visualViewport?.addEventListener("resize", onViewportChange, { passive: true });
    return () => {
      if (frame) cancelAnimationFrame(frame);
      cancelFlight.current?.();
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onViewportChange);
      window.removeEventListener("wheel", onManualInput);
      window.removeEventListener("touchmove", onManualInput);
      window.removeEventListener("pointerdown", onManualInput);
      window.removeEventListener("keydown", onManualInput);
      document.removeEventListener("focusin", onViewportChange);
      document.removeEventListener("focusout", onViewportChange);
      window.visualViewport?.removeEventListener("resize", onViewportChange);
    };
  }, []);

  function travelTo(top: number, target: HTMLElement | null, message: string) {
    cancelFlight.current?.();
    manualNavigation.current = false;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top, behavior: reduced ? "instant" : "smooth" });
    if (reduced) {
      setTravelling(false);
      focusDestination(target ?? visibleAnchor());
      setStatus(message);
      return;
    }

    // Observe the actual native scroll, not a guessed animation duration.
    let frame = 0;
    let cancelled = false;
    setTravelling(true);
    const started = performance.now();
    const cancel = () => {
      cancelled = true;
      cancelAnimationFrame(frame);
      cancelFlight.current = null;
      window.scrollTo({ top: window.scrollY, behavior: "instant" });
      setTravelling(false);
    };
    cancelFlight.current = cancel;
    const observe = () => {
      if (cancelled) return;
      const reached = Math.abs(window.scrollY - top) <= 2;
      if (reached || performance.now() - started > 2500) {
        cancelFlight.current = null;
        setTravelling(false);
        if (reached) { focusDestination(target ?? visibleAnchor()); setStatus(message); }
        return;
      }
      frame = requestAnimationFrame(observe);
    };
    frame = requestAnimationFrame(observe);
  }

  function navigate() {
    const point = pointRef.current;
    if (point) {
      const anchor = findAnchor(point);
      const top = resolveReturnY(point, route, documentHeight(), window.innerHeight, anchor ? window.scrollY + anchor.getBoundingClientRect().top : null);
      pointRef.current = null;
      setReturnPoint(null);
      if (top === null) return;
      // Keep the control visible during descent if a repeat click interrupts it.
      setBeyondViewport(true);
      travelTo(top, anchor, "Volviste al lugar donde estabas.");
      return;
    }
    const saved = capturePoint(route);
    pointRef.current = saved;
    setReturnPoint(saved);
    const topTarget = document.querySelector<HTMLElement>("[data-scroll-start]") ?? document.querySelector<HTMLElement>("main h1") ?? document.querySelector<HTMLElement>("main, [role='main']");
    travelTo(0, topTarget, "Estás al inicio. Podés volver al lugar anterior con el botón de flecha hacia abajo.");
  }

  const visible = (beyondViewport || returnPoint !== null || travelling) && !keyboardOpen && activeOverlay === null;
  const label = returnPoint ? "Volver a donde estaba" : "Subir al inicio";

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        className="experience-scroll-control"
        data-visible={visible}
        data-return={returnPoint !== null}
        data-return-anchor={returnPoint?.anchor?.key}
        data-return-origin-y={returnPoint?.scrollY}
        aria-label={label}
        aria-hidden={!visible}
        tabIndex={visible ? 0 : -1}
        onClick={navigate}
      >
        {returnPoint ? <ArrowDown size={21} aria-hidden="true" /> : <ArrowUp size={21} aria-hidden="true" />}
        <span className="experience-scroll-label" aria-hidden="true">{label}</span>
      </button>
      <span className="experience-status" role="status" aria-live="polite" aria-atomic="true">{status}</span>
    </>
  );
}
