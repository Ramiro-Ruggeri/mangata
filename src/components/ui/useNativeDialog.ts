"use client";

import { useEffect, useRef } from "react";

/** Native modality and focus containment; scroll locking belongs to ExperienceProvider. */
export function useNativeDialog(open: boolean) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog || !open) return;
    const trigger = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    let navigationTarget: HTMLElement | null = null;
    const onNavigate = (event: MouseEvent) => {
      const anchor = event.target instanceof Element ? event.target.closest<HTMLAnchorElement>('a[href^="#"]') : null;
      if (anchor?.hash) navigationTarget = document.getElementById(decodeURIComponent(anchor.hash.slice(1)));
    };
    dialog.addEventListener("click", onNavigate);
    if (!dialog.open) dialog.showModal();
    return () => {
      dialog.close();
      dialog.removeEventListener("click", onNavigate);
      requestAnimationFrame(() => {
        const target = navigationTarget ?? trigger;
        if (!document.documentElement.dataset.activeOverlay && target?.isConnected && !target.closest("[inert]")) {
          if (navigationTarget && !target.hasAttribute("tabindex")) {
            target.setAttribute("tabindex", "-1");
            target.addEventListener("blur", () => target.removeAttribute("tabindex"), { once: true });
          }
          target.focus({ preventScroll: true });
        }
      });
    };
  }, [open]);
  return ref;
}
