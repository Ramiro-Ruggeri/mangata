"use client";

import { useEffect, useMemo, useState } from "react";

type Props = {
  avoidSelector?: string; // WhatsApp u otros FABs
  baseBottom?: number; // padding inferior base (px)
  right?: number; // padding derecha desktop (px)
  leftMobile?: number; // padding izquierda mobile (px)
  mobileBreakpoint?: number; // ancho a partir del cual es desktop
};

const DEFAULT_AVOID_SELECTOR =
  '.whatsapp-fab, .whatsapp_float, .whatsapp-button, #whatsapp-button, a[href*="wa.me"], a[href*="api.whatsapp.com"]';

export default function BackToTop({
  avoidSelector = DEFAULT_AVOID_SELECTOR,
  baseBottom = 20,
  right = 20,
  leftMobile = 20,
  mobileBreakpoint = 768, // <768 = mobile
}: Props) {
  const [visible, setVisible] = useState(false);
  const [avoidOffset, setAvoidOffset] = useState(0);
  const [isMobile, setIsMobile] = useState(true);

  const safeAreaBottom = useMemo(() => 0, []);

  // visibilidad + breakpoint
  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 120);
    const onResize = () => setIsMobile(window.innerWidth < mobileBreakpoint);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize, { passive: true });
    onScroll();
    onResize();
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
    };
  }, [mobileBreakpoint]);

  // medir FAB(es) a evitar
  useEffect(() => {
    const nodes = Array.from(
      document.querySelectorAll(avoidSelector)
    ) as HTMLElement[];
    if (!nodes.length) {
      setAvoidOffset(0);
      return;
    }

    const compute = () => {
      const maxH = nodes.reduce(
        (m, el) =>
          Math.max(
            m,
            el.getBoundingClientRect().height || el.offsetHeight || 0
          ),
        0
      );
      setAvoidOffset(maxH + 12);
    };

    compute();
    const ros = nodes.map((el) => {
      const ro = new ResizeObserver(compute);
      ro.observe(el);
      return ro;
    });
    window.addEventListener("resize", compute);
    return () => {
      ros.forEach((ro) => {
        try {
          ro.disconnect();
        } catch {}
      });
      window.removeEventListener("resize", compute);
    };
  }, [avoidSelector]);

  const handleClick = () => {
    const prefersReduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    window.scrollTo({ top: 0, behavior: prefersReduced ? "auto" : "smooth" });
  };

  const bottomPx = baseBottom + avoidOffset + safeAreaBottom;

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label="Volver arriba"
      title="Volver arriba"
      style={{
        bottom: bottomPx,
        right: isMobile ? undefined : right,
        left: isMobile ? leftMobile : undefined,
      }}
      className={[
        "fixed z-50 flex items-center justify-center",
        "h-12 w-12 rounded-2xl",
        // Mangata: negro + dorado + glass
        "bg-black/60 backdrop-blur-md border border-yellow-500/40 text-yellow-300",
        "shadow-[0_0_10px_rgba(255,215,0,0.28)] hover:shadow-[0_0_18px_rgba(255,215,0,0.55)]",
        "hover:border-yellow-400",
        "transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-yellow-400/40",
        visible
          ? "opacity-100 translate-y-0"
          : "opacity-0 translate-y-3 pointer-events-none",
      ].join(" ")}
    >
      {/* Flecha con flotación sutil */}
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="animate-[float_2.2s_ease-in-out_infinite]"
      >
        <path d="M5 15l7-7 7 7" />
      </svg>
      <style jsx global>{`
        @keyframes float {
          0% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-2px);
          }
          100% {
            transform: translateY(0);
          }
        }
      `}</style>
    </button>
  );
}
