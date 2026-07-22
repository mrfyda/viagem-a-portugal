// Post-export SEO pass for the web build.
//
// The map is a client-rendered Expo (react-native-web) SPA, not Expo Router, so
// the official head APIs (`app/+html.tsx`, `expo-router/head`) don't apply and
// there's no build-time per-route HTML. This script rewrites the single
// `dist/index.html` that `expo export --platform web` produces, giving the map
// landing URL a complete, crawler-visible <head>: title, description, canonical,
// Open Graph, Twitter card and JSON-LD. (Per-place rich previews would need
// prerendering — see the runtime title/description in src/lib/head.web.ts for
// the JS-rendered, Google-visible fallback.)
//
// Run automatically after export via the `export:web` package script.

import {
  copyFileSync,
  existsSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const dist = join(root, "dist");
const indexPath = join(dist, "index.html");

// Canonical production origin. Update when the custom domain goes live (mirror
// apps/blog/_config.yml `url`). The base path is the same EXPO_BASE_URL that
// rebased the app's asset URLs at export time (CI sets it to "<pages>/map").
const ORIGIN = process.env.SEO_SITE_ORIGIN || "https://mrfyda.github.io";
const BASE = (process.env.EXPO_BASE_URL || "").replace(/\/+$/, "");
const pageUrl = `${ORIGIN}${BASE}/`;
const assetUrl = (file) => `${ORIGIN}${BASE}/${file}`;

const TITLE = "Viagem a Portugal — mapa interativo";
const DESCRIPTION =
  "Mapa interativo de todos os lugares de Viagem a Portugal de José Saramago: " +
  "centenas de vilas, aldeias e sítios, cada um ligado às suas páginas no " +
  "livro, com as seis rotas traçadas entre paragens.";

const esc = (s) =>
  s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "Viagem a Portugal",
  url: pageUrl,
  description: DESCRIPTION,
  applicationCategory: "TravelApplication",
  operatingSystem: "Web",
  browserRequirements: "Requires JavaScript.",
  inLanguage: "pt-PT",
  isAccessibleForFree: true,
  isBasedOn: {
    "@type": "Book",
    name: "Viagem a Portugal",
    author: { "@type": "Person", name: "José Saramago" },
  },
};

// Open early connections to the cross-origin hosts the first paint depends on:
// the OpenFreeMap tile server (the map canvas is the LCP element) and Google
// Fonts (stylesheet on googleapis, font file on gstatic — gstatic needs the
// crossorigin form to match the CORS font fetch). Saves a TLS round-trip each.
const preconnects = `
    <link rel="preconnect" href="https://tiles.openfreemap.org" crossorigin />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />`;

// The boot-phase loading ring: the same six-arc chapter-colored spinner that
// JourneyRevealOverlay renders, as static HTML+CSS, so the ring is there from
// the first paint — covering the JS download before React mounts. On mount
// the overlay reads #boot-reveal-ring's current rotation, continues the spin
// from that angle, and removes this node before its own first paint, so the
// hand-off is invisible. Geometry and colors mirror JourneyRevealOverlay.tsx
// and CHAPTER_COLORS in src/lib/mapStyle.ts — keep them in sync.
const RING_COLORS = [
  "#ea580c", // chapter 1
  "#0d9488", // chapter 2
  "#7c3aed", // chapter 3
  "#dc2626", // chapter 4
  "#2563eb", // chapter 5
  "#db2777", // chapter 6
];
const RING_RADIUS = 26;
const RING_STROKE = 5;
const ARC_SWEEP = 60; // 6 arcs × 60° = a solid ring, colors butted together
const SPIN_MS = 1600;

const bootArc = (i) => {
  const point = (deg) => {
    const a = (deg * Math.PI) / 180;
    return `${(40 + RING_RADIUS * Math.cos(a)).toFixed(2)} ${(40 + RING_RADIUS * Math.sin(a)).toFixed(2)}`;
  };
  const start = -90 + i * 60;
  return (
    `<path d="M ${point(start)} A ${RING_RADIUS} ${RING_RADIUS} 0 0 1 ${point(start + ARC_SWEEP)}" ` +
    `stroke="${RING_COLORS[i]}" stroke-width="${RING_STROKE}" fill="none" stroke-linecap="butt"/>`
  );
};

const bootLoader = `
    <div id="boot-reveal" aria-hidden="true"><svg width="80" height="80" viewBox="0 0 80 80"><g id="boot-reveal-ring">${RING_COLORS.map((_, i) => bootArc(i)).join("")}</g></svg></div>
    <style>
      #boot-reveal{position:fixed;inset:0;z-index:40;display:grid;place-items:center;background:#f8f4f0}
      #boot-reveal-ring{transform-origin:40px 40px;animation:boot-reveal-spin ${SPIN_MS}ms linear infinite}
      @keyframes boot-reveal-spin{to{transform:rotate(360deg)}}
      @media (prefers-reduced-motion: reduce){#boot-reveal-ring{animation:none}}
    </style>
    <noscript><style>#boot-reveal{display:none}</style></noscript>`;

const headTags = `
    <meta name="description" content="${esc(DESCRIPTION)}" />
    <link rel="canonical" href="${pageUrl}" />
    <meta property="og:type" content="website" />
    <meta property="og:site_name" content="Viagem a Portugal" />
    <meta property="og:title" content="${esc(TITLE)}" />
    <meta property="og:description" content="${esc(DESCRIPTION)}" />
    <meta property="og:url" content="${pageUrl}" />
    <meta property="og:locale" content="pt_PT" />
    <meta property="og:image" content="${assetUrl("og-default.png")}" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${esc(TITLE)}" />
    <meta name="twitter:description" content="${esc(DESCRIPTION)}" />
    <meta name="twitter:image" content="${assetUrl("og-default.png")}" />
    <link rel="apple-touch-icon" href="${assetUrl("apple-touch-icon.png")}" />
    <link rel="icon" href="${assetUrl("favicon.svg")}" type="image/svg+xml" />
    <link rel="manifest" href="${assetUrl("manifest.webmanifest")}" />
    <script type="application/ld+json">${JSON.stringify(jsonLd)}</script>
    <!-- seo:injected -->`;

if (!existsSync(indexPath)) {
  console.error(`[inject-web-meta] ${indexPath} not found — run expo export first.`);
  process.exit(1);
}

// Copy committed static SEO assets (share image, svg favicon, apple icon) into
// the build so they ship next to index.html at the deployed base path.
const seoAssets = join(root, "seo-assets");
if (existsSync(seoAssets)) {
  for (const file of readdirSync(seoAssets)) {
    copyFileSync(join(seoAssets, file), join(dist, file));
  }
}

let html = readFileSync(indexPath, "utf8");

if (html.includes("<!-- seo:injected -->")) {
  console.log("[inject-web-meta] already injected — skipping.");
  process.exit(0);
}

html = html
  .replace(/<html lang="[^"]*">/, '<html lang="pt-PT">')
  .replace(/<title>[^<]*<\/title>/, `<title>${esc(TITLE)}</title>`)
  // Edge-to-edge on iOS: the map draws under Safari's translucent bars
  // (the chrome floats over the territory instead of a solid band). The
  // app's own chrome already pads with env(safe-area-inset-*). No
  // theme-color meta for the same reason — a solid tint would beat the
  // translucency.
  .replace(
    /<meta name="viewport" content="[^"]*"/,
    '<meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no, viewport-fit=cover"',
  )
  // Preconnects go right after the charset meta (which must stay first in head).
  .replace(/(<meta charset="utf-8"\s*\/?>)/, `$1${preconnects}`)
  // Expo hoists the global.css `@import` of the Cardo font into a render-blocking
  // <link rel="stylesheet">. Load it without blocking first paint: swap media
  // print→all on load, with a <noscript> fallback. `display=swap` already lets
  // text show in the fallback serif until Cardo arrives.
  .replace(
    /<link rel="stylesheet" href="(https:\/\/fonts\.googleapis\.com\/css2\?family=Cardo(?:&|&amp;)display=swap)">/,
    `<link rel="stylesheet" href="$1" media="print" onload="this.media='all'"><noscript><link rel="stylesheet" href="$1"></noscript>`,
  )
  .replace("</head>", `${headTags}\n  </head>`)
  // Boot loading ring, right after the app root so React never touches it.
  .replace(/(<div id="root"><\/div>)/, `$1${bootLoader}`);

if (!html.includes('media="print"')) {
  console.warn(
    "[inject-web-meta] WARNING: Cardo font <link> not found to defer — " +
      "Expo may have changed its CSS @import handling; check render-blocking.",
  );
}

writeFileSync(indexPath, html);
console.log(`[inject-web-meta] injected SEO head + preconnects (canonical ${pageUrl}).`);
