# Backlog

Parked ideas and agreed next steps, in rough priority order. (Kept as a note
by choice — no issue tracker for this project.)

## Needs a device session

Two iOS Safari fixes shipped on research + Chromium checks only — this
container has no iOS. Verify on a real iPhone (live site, hard refresh) and
strike through here; if either still fails, the next angles are noted.

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
- **Trip soundtracks** — the music shared in the car on each retracing,
  alongside `transport:` in the post front matter (e.g. a `soundtrack:` list
  of title/artist/url). Render as a quiet "banda sonora" liner-note section
  at the end of the post (PT/EN via `page.lang`, like `transport.html`).
  Car journeys only — train trips are headphone listening, not a shared
  soundtrack (so Viagem IV is out by design). Data: the author's scrobble
  export has a gap from 2012 to 29 Nov 2023, which swallows Viagens I–III —
  needs memory or Spotify's extended streaming history export.
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

- **Mobile ergonomics** — half-height place sheet so the map stays visible in
  the field; swipe-to-dismiss on sheets; zoom/locate controls' reach zone.
- **Chapter-1 route orange vs. dot amber** — optional recolor; heavily
  mitigated by disclosure/focus/halo work.
- **Art direction shelf** — endpaper-style custom basemap; quote-on-hover
  popups; the journey drawn as one continuous line.

## Native

- Verify the native map component on a real device; then its auth UI
  (docs/adr/0007). Read-only until then.
