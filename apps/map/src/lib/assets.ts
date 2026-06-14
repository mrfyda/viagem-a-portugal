/**
 * Featured-Place and Detour images (and their post links) are stored by
 * blog-sync as site-root-absolute paths ("/assets/…", "/2023/…") — correct for
 * the blog, where Jekyll rewrites them with its baseurl. The map renders them
 * directly, so on a sub-path host (GitHub Pages serves the blog at
 * /viagem-a-portugal and the map at /viagem-a-portugal/map) a raw "/assets/…"
 * would resolve against the domain root and 404.
 *
 * Prefix such paths with the site base — the map's own base minus the trailing
 * "/map", i.e. where the blog (and its /assets) live. Empty at the root (dev and
 * the single-host preview), "/viagem-a-portugal" in production.
 */
function siteBase(): string {
  // Build-time value when Expo inlines it; otherwise derive from the URL.
  const env = process.env.EXPO_BASE_URL;
  if (env) return env.replace(/\/map\/?$/, "");
  if (typeof window !== "undefined" && window.location) {
    const i = window.location.pathname.indexOf("/map");
    if (i >= 0) return window.location.pathname.slice(0, i);
  }
  return "";
}

const SITE_BASE = siteBase();

/** Prefix a site-root-absolute blog URL ("/assets/…", "/2023/…") with the
 * deployment's base path so it resolves alongside the blog, not at the host root. */
export function withSiteBase(path: string): string {
  return path.startsWith("/") ? SITE_BASE + path : path;
}
