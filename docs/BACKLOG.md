# Backlog

Parked ideas and agreed next steps, in rough priority order. (Kept as a note
by choice — no issue tracker for this project.)

## Needs the owner to verify

Fixes shipped on research + what an agent can check remotely; the last step
needs the owner (a real iPhone, or the Search Console account). Verify and
strike through here; if anything still fails, the next angles are noted.

- **Search Console won't read the sitemap** (2026-07): "Não foi possível ler
  o mapa do site" persisted 48h past submission, while manually-submitted
  pages indexed fine. Everything measurable from outside checks out: all
  three sitemap URLs (`sitemap_index.xml`, `sitemap.xml`,
  `map/sitemap.xml`) serve 200 `application/xml` to a Googlebot UA, XML
  validates byte-clean (579 map URLs, no raw `&`, no non-ASCII, all
  in-scope), domain-root `mrfyda.github.io/robots.txt` is 404 (= crawling
  allowed). Shipped so far: a sitemap index (one URL to submit), the
  verification file out of the sitemap, and the index renamed
  `sitemap-index` → `sitemap_index` to dodge a documented GSC bug where
  dash-plus filenames stick at "could not be read" (jcchouinard.com
  write-up). Owner's diagnostic: delete all GSC sitemap entries, submit
  `sitemap_index.xml` AND both children directly — the per-row outcome
  isolates the fault (children green + index red = index handling; map
  child red = map sitemap; all red = property-level). If a row still
  fails, click it: the itemized error under the header (type/count/example
  URL) is the answer — bring that string back before any more changes.
  **Root cause found (2026-07-13):** web research shows this is a known,
  unresolved platform-wide GSC failure for `*.github.io` sitemaps — worst
  for project pages (`name.github.io/slug`, our shape) — not a defect in
  our files (re-verified: all three URLs still 200 `application/xml`, no
  BOM, no redirect; Bing reads the same sitemaps instantly). GitHub
  community discussion 149884 (Jan 2025 → Apr 2026): the same sitemap
  processes fine on a custom domain; Google experts note sitemaps are
  only crawl hints regardless. Durable fix: serve the site on the custom
  domain (GitHub Pages supports it) + a new GSC property there; until
  then, manual URL submission is the only lever and the sitemap row's red
  status can be ignored.

- **Place-sheet scrolling** (2026-07): sheets went from column flex to grid
  `auto minmax(0,1fr)` rows — Safari never gives a flex child a definite size
  inside a `max-height` parent, so its `overflow-y` scroll never engages
  (Chromium tolerates it, which is why it kept "passing" here). Also
  `dvh` for the caps (iOS 26 pins `vh` to the large viewport),
  `overscroll-contain` and `touch-action: pan-y` on the scroll bodies.
  Survived the first device retest; second round of findings (2026-07-03):
  layout verified correct in Linux WebKit (body clamps, wheel +
  programmatic scroll work) and a CDP touch-swipe scrolls fine in Chromium
  against the production build with react-native-web's document responder
  listeners attached — so the responder theory is cleared, and the failure
  is device-WebKit-specific. Prime suspect: Safari 26.2's changelog fixes
  "automatic min-size handling for flex and grid items", i.e. the
  minmax(0,1fr) row resolves wrong on iOS 26.0/.1. Shipped: the scroll
  bodies now carry their own max-height (sheet cap minus header) so no
  flex/grid min-size resolution is involved. If even that fails on device,
  it's time for remote Safari devtools (Mac + cable) — guessing is done.
- **Edge-to-edge under Safari's bars** (2026-07): Safari 26 ignores
  `theme-color` and tints its liquid-glass chrome by sampling the page;
  transparent/unset roots fall back to solid white bands. `html`/`body` now
  carry the map's paper colour (`#f8f4f0`) alongside the existing
  `viewport-fit=cover`. If bands persist: the "runway" family of tricks
  (document taller than the viewport + auto-scroll offset) was tried and
  reverted in June — see `stripearmy.medium.com` iOS 26 viewport write-up
  (window.outerHeight overlays) before going back down that road.

## Features

- **Aggregate footsteps** — anonymous visit counts per Place; a "forgotten
  places" view (which corners of the journey nobody has retraced). Needs a
  Supabase aggregate view; interesting once there are a few Travelers.
- **Shared journeys** — two Travelers sharing one visit log (or read-only
  views of each other's). Mostly a Supabase RLS design question; the
  VisitStore transport split keeps the client side tractable.
- ~~More book-moment achievements~~ — built (2026-07): a second batch of 12
  quirky moments (the São Jorge rats at Braga, the devil in the choir at
  Carrazedo, Grão-Vasco by flickering light at Viseu, "ban the weddings" at
  Tomar, the sparrow's pardon at Torre de Palma, "A viagem acabou" at the
  Finisterra do Sul…) plus a "locked churches" collection for the recurring
  closed-church gag. Mined from the Caminho EPUB text, quotes verified
  verbatim, places checked against the index. See
  `apps/map/src/lib/achievements.ts`.
- ~~Blog language suggestion~~ — decided against (2026-07): hreflang routes
  search traffic and the per-post switcher covers the rest; no client-side
  detection bar.
- ~~Full pin fade-out when zoomed far out~~ — built (2026-07), then extended:
  the opening country view itself is now lines-only. Every dot, visited
  included, fades in only past z6.6 (the country fit tops out ~z6.45 on
  desktop); at the default view and wider the six routes carry the map alone
  as line-work.

## Content

- **Viagem II, III, IV prose** — the posts are scaffolds with photos and
  front matter done; day-by-day text, titles and descriptions pending the
  author's voice memos/notes. Unblocks the EN editions too (drop a file in
  `_en/` with a `translation_key`).

## Map UI (deferred from the 2026-07 critique)

- **Distinguish Routes sharing a road** (2026-07): the road-snapped Routes
  legitimately overlap where two chapters drive the same road (chapter 4
  and 5 both take the EN 253 between Alcácer do Sal and Montemor-o-Novo),
  and the topmost colour hides the other. A per-chapter `line-offset` was
  tried and reverted (aa5a8cb): with each chapter offset to its own side,
  single-chapter stretches visibly hug one side of the road and
  out-and-backs split into odd double lines — strange artifacts at most
  zooms. Next angles: offset only *shared* segments (precompute overlap in
  the snapper, so lone lines stay centred); dash-pattern or width
  alternation on the shared stretches; or accept topmost-wins and rely on
  chapter focus (the sidebar already isolates one Route).
- **Mobile ergonomics** — half-height place sheet so the map stays visible in
  the field; swipe-to-dismiss on sheets; zoom/locate controls' reach zone.
- **Chapter-1 route orange vs. dot amber** — optional recolor; heavily
  mitigated by disclosure/focus/halo work.
- **Art direction shelf** — endpaper-style custom basemap; quote-on-hover
  popups; the journey drawn as one continuous line.

## Native

- Verify the native map component on a real device; then its auth UI
  (docs/adr/0007). Read-only until then.
