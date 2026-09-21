"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type Dispatch, type ReactNode, type SetStateAction } from "react";
import { usePathname } from "next/navigation";
import { nextOverlay } from "@/lib/experience/interaction";
import "./experience.css";

type ExperienceContextValue = {
  activeOverlay: string | null;
  openOverlay: (name: string) => void;
  closeOverlay: (name: string) => void;
  catalogView: { category: string; sort: string; onlyAvailable: boolean; limit: number };
  setCatalogView: Dispatch<SetStateAction<ExperienceContextValue["catalogView"]>>;
};

const ExperienceContext = createContext<ExperienceContextValue | null>(null);

export function ExperienceProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [overlay, setOverlay] = useState<{ route: string; name: string | null }>({ route: pathname, name: null });
  const [catalogView, setCatalogView] = useState({ category: "Todas", sort: "selection", onlyAvailable: false, limit: 8 });

  // Reset only coordination state, not children/cart, when a route changes.
  if (overlay.route !== pathname) setOverlay({ route: pathname, name: null });

  const openOverlay = useCallback((name: string) => {
    setOverlay((current) => ({ route: pathname, name: nextOverlay(current.name, { type: "open", name }) }));
  }, [pathname]);

  const closeOverlay = useCallback((name: string) => {
    setOverlay((current) => {
      const next = nextOverlay(current.name, { type: "close", name });
      return next === current.name ? current : { ...current, name: next };
    });
  }, []);

  const value = useMemo(() => ({
    activeOverlay: overlay.route === pathname ? overlay.name : null,
    openOverlay,
    closeOverlay,
    catalogView,
    setCatalogView,
  }), [overlay, pathname, openOverlay, closeOverlay, catalogView]);

  useEffect(() => {
    if (value.activeOverlay) document.documentElement.dataset.activeOverlay = value.activeOverlay;
    else delete document.documentElement.dataset.activeOverlay;
    return () => { delete document.documentElement.dataset.activeOverlay; };
  }, [value.activeOverlay]);

  const hasOverlay = value.activeOverlay !== null;
  useEffect(() => {
    if (!hasOverlay) return;
    const body = document.body;
    const html = document.documentElement;
    const previous = { bodyOverflow: body.style.overflow, htmlOverflow: html.style.overflow, padding: body.style.paddingRight };
    const gutter = Math.max(0, window.innerWidth - html.clientWidth);
    if (gutter) body.style.paddingRight = `${parseFloat(getComputedStyle(body).paddingRight) + gutter}px`;
    body.style.overflow = "hidden";
    html.style.overflow = "hidden";
    return () => {
      body.style.overflow = previous.bodyOverflow;
      html.style.overflow = previous.htmlOverflow;
      body.style.paddingRight = previous.padding;
    };
  }, [hasOverlay]);

  return <ExperienceContext.Provider value={value}>{children}</ExperienceContext.Provider>;
}

export function useExperience() {
  const context = useContext(ExperienceContext);
  if (!context) throw new Error("useExperience must be used inside ExperienceProvider");
  return context;
}
