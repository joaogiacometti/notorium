"use client";

import { useEffect } from "react";

/**
 * Registers the app service worker on supported browsers.
 *
 * @example
 * <ServiceWorkerRegister />
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) {
      return;
    }

    void navigator.serviceWorker.register("/sw.js").catch(() => {});
  }, []);

  return null;
}
