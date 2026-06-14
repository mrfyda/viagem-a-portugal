# Product

## Register

product

## Users

Readers of José Saramago's *Viagem a Portugal* (1981) — people who have read,
are reading, or are travelling alongside the book. Two modes of use:

- **Anonymous explorers** browsing the map to see where a town appears in the
  book and how Saramago's six routes cross the country. Read-only.
- **Travelers** (signed-in accounts) retracing the journey, marking the Places
  they have visited with a date and watching their progress — measured not
  just in towns but in *pages of the book* travelled.

Context of use: at a desk planning or reminiscing (desktop, journey sidebar
open) and on a phone in the field (mobile, bottom-sheet detail). Often
bilingual PT/EN readers.

## Product Purpose

An interactive map of every Place Saramago mentions in the book — hundreds of
towns, villages and sights — each tied to its book pages, with the six driven
Routes drawn between Stops. It exists to turn a 1979 travelogue into something
you can explore spatially and travel against yourself. Success: a reader can
find any place from the book on the map, understand its role in the journey,
and (signed in) keep a durable, offline-tolerant log of their own visits.

## Brand Personality

Literary, quiet, map-first. Bookish and restrained — it shares the companion
blog's Cardo serif and deep "blog green" so the two read as one site. The
chrome stays out of the way; the map and the text Saramago wrote do the
talking. Voice is unfussy and place-respecting (exact Portuguese toponyms,
real index names), never gamified or salesy.

## Anti-references

- **SaaS dashboard slop**: hero-metric cards, per-section eyebrow kickers,
  identical icon-card grids, gradient accents, the generic AI/SaaS look.
- **Generic travel app**: pin-soup clutter, booking-app chrome, loud category
  filters, marker-popup overload, "discover deals" energy.

## Design Principles

- **The map is the document.** Chrome is a frame around the territory, not a
  competitor for attention. Floating panels, never a heavy app shell.
- **One site, two surfaces.** The map must read as kin to the blog — same
  typeface, same green, same calm — so moving between them is seamless.
- **Respect the source.** Use the book's real language (Place, Stop, Route,
  exact index names); never flatten or invent for convenience.
- **Browse free, act signed-in.** Anonymous reading is first-class and fully
  functional; accounts add tracking without gating exploration.
- **Durable by default.** A Traveler's journey survives offline cold starts
  and device switches; the log is theirs, never lost to a flaky network.

## Accessibility & Inclusion

Best-effort, pragmatic (not held to a formal WCAG grade), but with real
intent already in the code: ≥44px touch targets on coarse pointers,
`prefers-reduced-motion` honoured, and design tokens chosen for legible
contrast. Bilingual PT/EN copy via the i18n layer. Keep map interactions
usable by keyboard and screen reader where the maplibre canvas allows.
