import { useEffect } from "react";
import { useLocation } from "react-router-dom";

const TAWK_SRC = "https://embed.tawk.to/69ef3fd9b011881c32c49944/1jn792qcv";
const SCRIPT_ID = "tawk-to-script";

/**
 * Loads Tawk.to live chat widget on user-facing pages only.
 * Excluded from /admin/* (super admin SaaS area).
 */
export function TawkChat() {
  const location = useLocation();
  const isAdminRoute = location.pathname.startsWith("/admin");

  useEffect(() => {
    if (isAdminRoute) {
      // Hide widget on admin pages if it was loaded previously
      const w = window as any;
      if (w.Tawk_API && typeof w.Tawk_API.hideWidget === "function") {
        w.Tawk_API.hideWidget();
      }
      return;
    }

    const w = window as any;

    // If already loaded, just show it
    if (document.getElementById(SCRIPT_ID)) {
      if (w.Tawk_API && typeof w.Tawk_API.showWidget === "function") {
        w.Tawk_API.showWidget();
      }
      return;
    }

    w.Tawk_API = w.Tawk_API || {};
    w.Tawk_LoadStart = new Date();

    const s1 = document.createElement("script");
    s1.id = SCRIPT_ID;
    s1.async = true;
    s1.src = TAWK_SRC;
    s1.charset = "UTF-8";
    s1.setAttribute("crossorigin", "*");

    const s0 = document.getElementsByTagName("script")[0];
    s0?.parentNode?.insertBefore(s1, s0);
  }, [isAdminRoute]);

  return null;
}
