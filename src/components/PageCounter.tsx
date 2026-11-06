"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { countMetric } from "@/lib/analytics";
import { hasAnalyticsConsent, subscribeConsent } from "@/lib/privacy/store";

/** One anonymous count per page seen, also for the page where the visitor accepts. The panel is not counted. */
export function PageCounter() {
  const pathname = usePathname();
  const counted = useRef<string | null>(null);
  const firstPage = useRef(true);
  useEffect(() => {
    if (pathname.startsWith("/admin")) return;
    const count = () => {
      if (counted.current === pathname || !hasAnalyticsConsent()) return;
      counted.current = pathname;
      const referrer = firstPage.current && document.referrer ? new URL(document.referrer).hostname : window.location.hostname;
      firstPage.current = false;
      countMetric("page_view", { referrer });
    };
    count();
    return subscribeConsent(count);
  }, [pathname]);
  return null;
}
