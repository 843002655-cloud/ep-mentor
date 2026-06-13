"use client";

import { useEffect } from "react";

/** Set the browser tab title for client-rendered pages.
 *  Use in "use client" pages that cannot export `metadata`. */
export function usePageTitle(title: string) {
  useEffect(() => {
    const prev = document.title;
    document.title = `${title} | EP Mentor`;
    return () => {
      document.title = prev;
    };
  }, [title]);
}
