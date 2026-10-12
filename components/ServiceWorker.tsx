"use client";

import { useEffect } from "react";

/** Registers public/sw.js (offline page only) in production builds. */
export function ServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch((err) => console.error("Service worker gagal:", err));
  }, []);
  return null;
}
