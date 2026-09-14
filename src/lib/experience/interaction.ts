/** Seconds for Motion; matching millisecond tokens live in experience.css. */
export const motionTokens = {
  feedback: 0.16,
  overlay: 0.24,
  editorial: 0.4,
  distance: 8,
  ease: [0.22, 1, 0.36, 1] as const,
};

export type OverlayAction = { type: "open" | "close"; name: string } | { type: "reset" };

/** A stale dialog's close/cleanup must never dismiss its replacement. */
export function nextOverlay(current: string | null, action: OverlayAction): string | null {
  if (action.type === "reset") return null;
  if (action.type === "open") return action.name.trim() || current;
  return current === action.name ? null : current;
}

export type ScrollAnchor = { kind: "id" | "data"; key: string; offset: number };
export type ScrollReturnPoint = { route: string; scrollY: number; anchor: ScrollAnchor | null };

export function clampScrollY(value: number, documentHeight: number, viewportHeight: number): number {
  const maximum = Math.max(0, documentHeight - viewportHeight);
  return Math.min(Number.isFinite(maximum) ? maximum : 0, Math.max(0, Number.isFinite(value) ? value : 0));
}

export function resolveReturnY(
  point: ScrollReturnPoint,
  route: string,
  documentHeight: number,
  viewportHeight: number,
  anchorDocumentTop: number | null,
): number | null {
  if (point.route !== route) return null;
  const target = point.anchor && anchorDocumentTop !== null && Number.isFinite(anchorDocumentTop)
    ? anchorDocumentTop + point.anchor.offset
    : point.scrollY;
  return clampScrollY(target, documentHeight, viewportHeight);
}

export function isPastScrollThreshold(scrollY: number, viewportHeight: number): boolean {
  return scrollY > Math.max(480, viewportHeight);
}

/** Small accidental movement near the top does not discard the return link. */
export function shouldDiscardReturn(scrollY: number, manualNavigation: boolean): boolean {
  return manualNavigation && scrollY > 96;
}
