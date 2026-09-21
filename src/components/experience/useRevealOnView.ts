"use client";

import { useEffect, type RefObject } from "react";

/** Progressive enhancement: content is readable before JS and after cancellation. */
export function useRevealOnView(ref: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const root = ref.current;
    if (!root || !window.IntersectionObserver || !root.animate) return;
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    let visible = new WeakSet<Element>();
    const running = new Map<Element, Animation>();
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) { visible.delete(entry.target); continue; }
        if (preference.matches || visible.has(entry.target)) continue;
        visible.add(entry.target);
        // Keyboard navigation must never fade the control currently in use.
        if (entry.target.contains(document.activeElement)) continue;
        const animation = entry.target.animate(
          [{ opacity: 0.18, transform: "translateY(22px)" }, { opacity: 1, transform: "none" }],
          { id: "mangata-reveal", duration: 600, easing: "cubic-bezier(.22,1,.36,1)" },
        );
        running.set(entry.target, animation);
        animation.onfinish = () => running.delete(entry.target);
      }
    }, { threshold: 0.08, rootMargin: "0px 0px -24px 0px" });
    const syncPreference = () => {
      observer.disconnect();
      running.forEach((animation) => animation.cancel());
      running.clear();
      visible = new WeakSet<Element>();
      if (!preference.matches) root.querySelectorAll("[data-reveal]").forEach((element) => observer.observe(element));
    };
    const onFocus = (event: FocusEvent) => {
      if (!(event.target instanceof Node)) return;
      for (const [element, animation] of running) {
        if (element.contains(event.target)) {
          animation.cancel();
          running.delete(element);
        }
      }
    };
    syncPreference();
    preference.addEventListener("change", syncPreference);
    root.addEventListener("focusin", onFocus);
    return () => {
      observer.disconnect();
      running.forEach((animation) => animation.cancel());
      preference.removeEventListener("change", syncPreference);
      root.removeEventListener("focusin", onFocus);
    };
  }, [ref]);
}
