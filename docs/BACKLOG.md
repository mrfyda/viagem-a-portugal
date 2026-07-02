# Backlog

Parked ideas and agreed next steps, in rough priority order. (Kept as a note
by choice — no issue tracker for this project.)

## Features

- **Aggregate footsteps** — anonymous visit counts per Place; a "forgotten
  places" view (which corners of the journey nobody has retraced). Needs a
  Supabase aggregate view; interesting once there are a few Travelers.
- **Shared journeys** — two Travelers sharing one visit log (or read-only
  views of each other's). Mostly a Supabase RLS design question; the
  VisitStore transport split keeps the client side tractable.
- **Trip soundtracks** — the music listened to on each retracing, alongside
  `transport:` in the post front matter (e.g. a `soundtrack:` list of
  title/artist/url). Render as a quiet "banda sonora" liner-note section at
  the end of the post (PT/EN via `page.lang`, like `transport.html`);
  optionally a playlist URL surfaced later in the map's featured block.
  Needs the actual lists/playlists per trip.
- ~~Blog language suggestion~~ — decided against (2026-07): hreflang routes
  search traffic and the per-post switcher covers the rest; no client-side
  detection bar.
- ~~Full pin fade-out when zoomed far out~~ — built (2026-07): anchors fade
  z5.5→4.8, leaving the six routes as line-work; a Traveler's visited dots
  persist through every fade (the log is theirs).

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
