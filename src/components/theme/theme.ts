export type Theme = "dark" | "light";

export const THEME_KEY = "mangata_theme";
export const THEME_COLORS: Record<Theme, string> = { dark: "#0b0d12", light: "#eeeae2" };

/**
 * Runs before first paint, so a saved theme never flashes and a repeat visit in the session skips the
 * brand intro. Storage may be blocked: the page then simply keeps the default theme.
 */
export const THEME_BOOT_SCRIPT = `try{var d=document.documentElement;if(localStorage.getItem("${THEME_KEY}")==="light"){d.dataset.theme="light";var m=document.querySelector('meta[name="theme-color"]');if(m)m.content="${THEME_COLORS.light}"}if(sessionStorage.getItem("mangata_intro"))d.dataset.flash="seen";else sessionStorage.setItem("mangata_intro","1")}catch(e){}`;

export const readDocumentTheme = (): Theme => document.documentElement.dataset.theme === "light" ? "light" : "dark";

const listeners = new Set<() => void>();
export function subscribeToTheme(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

function commit(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", THEME_COLORS[theme]);
  listeners.forEach(listener => listener());
}

type WithViewTransition = Document & { startViewTransition?: (update: () => void) => unknown };

export function applyTheme(theme: Theme, origin?: HTMLElement) {
  try { window.localStorage.setItem(THEME_KEY, theme); } catch { /* It still applies to this visit. */ }
  const doc = document as WithViewTransition;
  if (!origin || !doc.startViewTransition || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return commit(theme);
  const box = origin.getBoundingClientRect();
  const x = box.left + box.width / 2, y = box.top + box.height / 2;
  const style = document.documentElement.style;
  style.setProperty("--theme-x", `${x}px`);
  style.setProperty("--theme-y", `${y}px`);
  style.setProperty("--theme-r", `${Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y))}px`);
  doc.startViewTransition(() => commit(theme));
}
