"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

/** Tracks page views and time on page. Add to AppLayout. */
export default function AnalyticsTracker() {
  const pathname = usePathname();
  const startTime = useRef(Date.now());

  useEffect(() => {
    if (pathname.startsWith("/admin")) return;

    startTime.current = Date.now();

    fetch("/api/analytics", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event_type: "page_view", path: pathname }),
      keepalive: true,
    }).catch(() => {});

    return () => {
      const duration = Date.now() - startTime.current;
      if (duration > 500) {
        fetch("/api/analytics", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            event_type: "page_exit",
            path: pathname,
            duration_ms: duration,
          }),
          keepalive: true,
        }).catch(() => {});
      }
    };
  }, [pathname]);

  return null;
}
