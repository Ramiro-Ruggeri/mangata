"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { countMetric } from "@/lib/analytics";

/** One anonymous count per page seen. The panel is not counted. */
export function PageCounter() {
  const pathname = usePathname();
  const first = useRef(true);
  useEffect(() => {
    if (pathname.startsWith("/admin")) return;
    const referrer = first.current && document.referrer ? new URL(document.referrer).hostname : window.location.hostname;
    first.current = false;
    countMetric("page_view", { referrer });
  }, [pathname]);
  return null;
}
