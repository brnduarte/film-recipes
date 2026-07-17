import { useEffect, useState } from "react";

/** Viewport breakpoint below which the app switches to its mobile layout
 *  (full-bleed image + bottom recipe carousel + floating adjustments) instead
 *  of the desktop sidebar layout. Tracks changes live so rotating a device or
 *  resizing a window swaps layouts. */
const MOBILE_QUERY = "(max-width: 768px)";

export function isMobileViewport(): boolean {
  return typeof window !== "undefined" && window.matchMedia(MOBILE_QUERY).matches;
}

export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(isMobileViewport);

  useEffect(() => {
    const mql = window.matchMedia(MOBILE_QUERY);
    const onChange = () => setIsMobile(mql.matches);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return isMobile;
}
