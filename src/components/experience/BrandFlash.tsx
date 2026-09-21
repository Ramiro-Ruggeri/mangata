"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { BrandSignature } from "@/components/brand/BrandSignature";

/** Brief brand punctuation on load, route changes and return to the browser tab. */
export function BrandFlash() {
  const pathname = usePathname();
  const mounted = useRef(false);
  const hiddenAt = useRef(0);
  const [pulse, setPulse] = useState(0);

  useEffect(() => {
    if (mounted.current) setPulse((value) => value + 1);
    else mounted.current = true;
  }, [pathname]);

  useEffect(() => {
    const onVisibility = () => {
      if (document.hidden) hiddenAt.current = performance.now();
      else if (hiddenAt.current) {
        if (performance.now() - hiddenAt.current > 300) setPulse((value) => value + 1);
        hiddenAt.current = 0;
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  return <div key={pulse} className="brand-flash" aria-hidden="true"><BrandSignature /></div>;
}
