// Post-export prerender: one static, crawlable page per book Place.
//
// The map itself is a client-rendered SPA — a shared `?place=` deep link only
// grows a head at runtime (src/lib/head.web.ts), which social scrapers and
// most crawlers never see. This script emits `dist/lugares/<slug>/index.html`
// for every selectable index Place: real content (name, Saramago quote, page
// references, journey role), full meta (title, description, canonical, Open
// Graph, JSON-LD Place) and prev/next links in journey order so crawlers can
// walk the whole set. Each page links into the interactive map; the map's own
// URLs stay `?place=`. A `dist/sitemap.xml` lists everything (referenced from
// the blog's robots.txt).
//
// Runs automatically after export via the `export:web` package script, after
// inject-web-meta.mjs. Mirrors that script's ORIGIN/BASE handling.

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import bookIndex from "../src/data/book-index.json" with { type: "json" };
import corrections from "../src/data/corrections.json" with { type: "json" };
import featured from "../src/data/featured-journey.json" with { type: "json" };
import locations from "../src/data/locations.json" with { type: "json" };
import quotes from "../src/data/quotes.json" with { type: "json" };
import sections from "../src/data/sections.json" with { type: "json" };
import stopsData from "../src/data/stops.json" with { type: "json" };

const here = dirname(fileURLToPath(import.meta.url));
const dist = join(here, "..", "dist");

const ORIGIN = process.env.SEO_SITE_ORIGIN || "https://mrfyda.github.io";
const BASE = (process.env.EXPO_BASE_URL || "").replace(/\/+$/, "");
// The blog lives at the site root the map hangs off ("<pages>/map" → "<pages>").
const SITE_BASE = BASE.replace(/\/map$/, "");
const mapUrl = `${ORIGIN}${BASE}/`;

// --- data ---------------------------------------------------------------

const coords = new Map();
for (const t of [...locations, ...corrections]) {
  if (t.latitude !== 0 || t.longitude !== 0) {
    coords.set(t.name, { lat: t.latitude, lon: t.longitude });
  }
}

const stops = stopsData.stops;
const chapterTitle = new Map(sections.chapters.map((c) => [c.number, c.title]));

// First Stop per Place, for the journey line and narrative ordering.
const firstStop = new Map();
for (const s of stops) if (!firstStop.has(s.place)) firstStop.set(s.place, s);

// Selectable index Places only — the same rule as the app's search: a page
// for a Place without a dot would dead-end into the map.
const places = bookIndex.places.filter((p) => coords.has(p.indexName));

// Journey order (mirrors orderedPlaces in src/lib/geo.ts): Stops in narrative
// order first, then the rest by first page of appearance.
const seen = new Set();
const ordered = [];
for (const s of stops) {
  if (coords.has(s.place) && !seen.has(s.place)) {
    seen.add(s.place);
    ordered.push(s.place);
  }
}
const byName = new Map(places.map((p) => [p.indexName, p]));
const rest = places
  .map((p) => p.indexName)
  .filter((n) => !seen.has(n))
  .sort((a, b) => (byName.get(a).pages[0] ?? 1e9) - (byName.get(b).pages[0] ?? 1e9));
const orderedPlaces = [...ordered.filter((n) => byName.has(n)), ...rest];
const orderIndex = new Map(orderedPlaces.map((n, i) => [n, i]));

// --- helpers ------------------------------------------------------------

const slugOf = (name) =>
  name
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const slugs = new Map();
for (const p of places) {
  const slug = slugOf(p.indexName);
  if (!slug || slugs.has(slug)) {
    throw new Error(
      `[generate-place-pages] slug collision or empty slug for "${p.indexName}" (${slug})`,
    );
  }
  slugs.set(slug, p.indexName);
}
const slugByPlace = new Map([...slugs].map(([slug, name]) => [name, slug]));

const esc = (s) =>
  String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

// Mirrors formatPages in src/lib/format.ts.
const formatPages = (pages) => {
  const parts = [];
  for (let i = 0; i < pages.length; ) {
    let j = i;
    while (j + 1 < pages.length && pages[j + 1] === pages[j] + 1) j++;
    parts.push(j > i ? `${pages[i]}–${pages[j]}` : `${pages[i]}`);
    i = j + 1;
  }
  return parts.join(", ");
};

// Mirrors clamp in src/lib/head.web.ts.
const clamp = (text, max = 200) => {
  if (text.length <= max) return text;
  const cut = text.slice(0, max - 1);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`;
};

const stripDraftMarkers = (text) =>
  text
    .replace(/\s*[—–-]?\s*⟨[^⟩]*⟩/gu, "")
    .replace(/\s{2,}/g, " ")
    .trim();

// --- page template --------------------------------------------------------

const CSS = `
  :root { color-scheme: light; }
  body { margin: 0; font-family: "Cardo", serif; color: #1c1917; background: #fff;
         line-height: 1.6; }
  main { max-width: 40rem; margin: 0 auto; padding: 2rem 1.25rem 3rem; }
  header a { color: #0a5a3a; text-decoration: none; font-weight: bold;
             font-size: 1.25rem; }
  h1 { font-size: 1.75rem; line-height: 1.2; margin: 1.5rem 0 0.25rem; }
  .qualifier { color: #57534e; font-style: italic; margin: 0 0 1rem; }
  blockquote { margin: 1.25rem 0; padding: 0.9rem 1.1rem; background: #f5f5f4;
               border-radius: 6px; font-style: italic; }
  blockquote footer { font-style: normal; font-size: 0.8rem; color: #57534e;
                      margin-top: 0.4rem; }
  .meta { color: #57534e; font-size: 0.9rem; margin: 0.25rem 0; }
  .map-link { display: inline-block; margin: 1.25rem 0; padding: 0.55rem 1rem;
              background: #0a5a3a; color: #fff; border-radius: 6px;
              text-decoration: none; font-weight: bold; }
  nav.places { display: flex; justify-content: space-between; gap: 1rem;
               margin-top: 2.5rem; padding-top: 1rem; border-top: 1px solid #e7e5e4;
               font-size: 0.9rem; }
  nav.places a { color: #0a5a3a; }
`;

function pageHtml(place) {
  const name = place.name ?? place.indexName;
  const slug = slugByPlace.get(place.indexName);
  const pageUrl = `${mapUrl}lugares/${slug}/`;
  const quote = quotes[place.indexName];
  const pages = formatPages(place.pages);
  const stop = firstStop.get(place.indexName);
  const feat = featured[place.indexName];
  const { lat, lon } = coords.get(place.indexName);
  const deepLink = `${mapUrl}?place=${encodeURIComponent(place.indexName)}`;

  const title = `${name} — Viagem a Portugal`;
  const description = quote
    ? clamp(`“${quote}” — ${name} em Viagem a Portugal de José Saramago.`)
    : `${name} em Viagem a Portugal de José Saramago — páginas ${pages}.`;
  // Social scrapers largely can't decode AVIF; only hand them a featured
  // photo in a format they render, else the branded default.
  const ogImage =
    feat?.image && /\.(jpe?g|png|webp|gif)$/i.test(feat.image)
      ? `${ORIGIN}${SITE_BASE}${feat.image}`
      : `${mapUrl}og-default.png`;

  const journeyLine = stop
    ? `${stop.role === "stop" ? "Paragem" : "Passagem"} n.º ${stop.ordinal} da viagem — percurso ${stop.chapter}, «${chapterTitle.get(stop.chapter)}»`
    : "Referida no livro, fora dos percursos.";

  const idx = orderIndex.get(place.indexName);
  const prev = orderedPlaces[idx - 1];
  const next = orderedPlaces[idx + 1];
  const placeLink = (n, label) =>
    n
      ? `<a href="../${slugByPlace.get(n)}/" rel="${label === "‹" ? "prev" : "next"}">${label === "‹" ? "‹ " + esc(byName.get(n).name ?? n) : esc(byName.get(n).name ?? n) + " ›"}</a>`
      : "<span></span>";

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Place",
    name,
    url: pageUrl,
    description,
    geo: { "@type": "GeoCoordinates", latitude: lat, longitude: lon },
    containedInPlace: { "@type": "Country", name: "Portugal" },
    subjectOf: {
      "@type": "Book",
      name: "Viagem a Portugal",
      author: { "@type": "Person", name: "José Saramago" },
    },
  };

  return `<!DOCTYPE html>
<html lang="pt-PT">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${esc(title)}</title>
  <meta name="description" content="${esc(description)}" />
  <meta name="theme-color" content="#0a5a3a" />
  <link rel="canonical" href="${pageUrl}" />
  <link rel="icon" href="${mapUrl}favicon.svg" type="image/svg+xml" />
  <meta property="og:type" content="article" />
  <meta property="og:site_name" content="Viagem a Portugal" />
  <meta property="og:title" content="${esc(title)}" />
  <meta property="og:description" content="${esc(description)}" />
  <meta property="og:url" content="${pageUrl}" />
  <meta property="og:locale" content="pt_PT" />
  <meta property="og:image" content="${esc(ogImage)}" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${esc(title)}" />
  <meta name="twitter:description" content="${esc(description)}" />
  <meta name="twitter:image" content="${esc(ogImage)}" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Cardo&display=swap" />
  <style>${CSS}</style>
  <script type="application/ld+json">${JSON.stringify(jsonLd)}</script>
</head>
<body>
  <main>
    <header><a href="${SITE_BASE || "/"}">Viagem a Portugal</a></header>
    <h1>${esc(name)}</h1>
    ${place.qualifier ? `<p class="qualifier">${esc(place.qualifier)}</p>` : ""}
    ${
      quote
        ? `<blockquote>«${esc(quote)}»<footer>— José Saramago, <cite>Viagem a Portugal</cite></footer></blockquote>`
        : ""
    }
    <p class="meta">pp. ${esc(pages)}</p>
    <p class="meta">${esc(journeyLine)}</p>
    ${
      feat
        ? `<p class="meta">Do blog: <a href="${esc(`${SITE_BASE}${feat.postUrl}`)}">${esc(stripDraftMarkers(feat.postTitle))}</a></p>`
        : ""
    }
    <a class="map-link" href="${esc(deepLink)}">Ver no mapa interativo →</a>
    <nav class="places">${placeLink(prev, "‹")}${placeLink(next, "›")}</nav>
  </main>
</body>
</html>
`;
}

// --- emit -----------------------------------------------------------------

let count = 0;
for (const place of places) {
  const dir = join(dist, "lugares", slugByPlace.get(place.indexName));
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "index.html"), pageHtml(place));
  count++;
}

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>${mapUrl}</loc></url>
${places
  .map((p) => `  <url><loc>${mapUrl}lugares/${slugByPlace.get(p.indexName)}/</loc></url>`)
  .join("\n")}
</urlset>
`;
writeFileSync(join(dist, "sitemap.xml"), sitemap);

console.log(
  `[generate-place-pages] wrote ${count} place pages + sitemap.xml (base ${mapUrl}lugares/).`,
);
