"use client";

import { useEffect, useSyncExternalStore } from "react";
import { trackCommerceEvent } from "@/lib/analytics";
import { applyTheme, readDocumentTheme, subscribeToTheme, THEME_COLORS } from "./theme";

/** A single moon: its shadow slides away to reveal the full disc, so the icon itself is the transition. */
export function ThemeToggle() {
  const theme = useSyncExternalStore(subscribeToTheme, readDocumentTheme, () => "dark" as const);
  const next = theme === "dark" ? "light" : "dark";
  // The boot script may run before the metadata reaches the document.
  useEffect(() => { document.querySelector('meta[name="theme-color"]')?.setAttribute("content", THEME_COLORS[theme]); }, [theme]);
  const label = next === "light" ? "Modo claro" : "Modo oscuro";
  return (
    <button type="button" className="theme-toggle" aria-label={`Cambiar a ${label.toLowerCase()}`} onClick={(event) => { applyTheme(next, event.currentTarget); trackCommerceEvent("theme_change", { source: next }); }}>
      <svg className="theme-toggle-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <defs><mask id="theme-toggle-moon"><rect width="24" height="24" fill="#fff" /><circle className="theme-toggle-shadow" cx="16.5" cy="7.5" r="7.5" fill="#000" /></mask></defs>
        <g className="theme-toggle-core"><circle className="theme-toggle-disc" cx="12" cy="12" r="9" mask="url(#theme-toggle-moon)" /></g>
        <g className="theme-toggle-rays"><path d="M12 1.5v2.2M12 20.3v2.2M1.5 12h2.2M20.3 12h2.2M4.6 4.6l1.5 1.5M17.9 17.9l1.5 1.5M4.6 19.4l1.5-1.5M17.9 6.1l1.5-1.5" fill="none" /></g>
      </svg>
      <span className="theme-toggle-hint" aria-hidden="true">{label}</span>
    </button>
  );
}
