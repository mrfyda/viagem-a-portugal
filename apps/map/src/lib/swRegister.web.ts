/**
 * Register the offline service worker — production web only. The worker is
 * generated into the export root by scripts/generate-service-worker.mjs, next
 * to index.html, so a page-relative URL resolves under any deploy base path.
 * Dev servers skip it: a stale shell cache while Metro hot-reloads is misery.
 */
export function registerServiceWorker(): void {
  if (__DEV__) return;
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js").catch((error) => {
      console.warn("Service worker registration failed:", error);
    });
  });
}
