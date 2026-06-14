---
name: load-journey
description: Load a folder of travel photos into the Viagem a Portugal map + blog — extract EXIF date/GPS, detect people and sharpness on-device, curate a selection, export EXIF-stripped AVIFs, scaffold a day-by-day Portuguese blog post, and classify off-book Detours. Use when the user wants to add/import a new journey from photos (e.g. "load Viagem a Portugal II", "import these trip photos", "add the next journey").
---

# Load a journey from photos

Turns one folder of trip photos into: web assets, a day-by-day PT blog post
scaffold, and map Detours. The scripts live in `tools/journey-loader/`
(see its README for the table); this is the playbook and the judgement calls.

## Inviolable rules

- **Never upload the photos.** All photo processing is on-device: `exiftool`,
  Swift Vision/CoreImage, `sips`. Do **not** Read image files into the
  conversation, and do **not** screenshot any panel/gallery that shows a photo.
  Reverse-geocoding (detour review) sends **coordinates only** — that's allowed;
  flag it.
- **Generated data is generated.** Never hand-edit `locations.json`,
  `book-index.json`, `featured-journey.json`, `detours.json`. Coordinate fixes
  go in `corrections.json`; Detours come from the post's `detours:` block via
  `blog-sync`.
- **AVIF, not webp.** macOS has no local webp encoder (ImageIO can't write it,
  `sips` can't, and PyPI/Pillow may be offline). ImageIO *does* write AVIF —
  smaller than webp and fine for 2026 browsers + GitHub Pages.

## The pipeline

Ask the user for the **photo folder** and the **journey number N** (asset prefix
`viagem-N`, post slug roman numeral). Then, from the repo root:

1. `python3 tools/journey-loader/extract_metadata.py --photos "DIR"`
   — EXIF date + GPS. Times normalise to UTC (Portugal winter = WET = UTC+0; a
   `+01:00` tag near the Spanish border would otherwise land on the wrong day).
   Photos with **no GPS** (e.g. a phone with camera location off) are **inferred**
   from the closest-in-time GPS photo and flagged `inferred` — never silently.
2. `swift tools/journey-loader/detect_people.swift "DIR"` — Vision face/person.
3. `swift tools/journey-loader/measure_sharpness.swift "DIR"` — sharpness/exposure.
4. `python3 tools/journey-loader/curate.py --photos "DIR"` — merges the three,
   dedups bursts into scenes, ranks a place-only shortlist.
5. `python3 tools/journey-loader/build_viewer.py --photos "DIR" --title "Viagem … N"`
   then `open "DIR/_journey/viewer.html"`.

   → **DECISION 1 (user): pick the photos.** The default filter is place-only
   (no people). They click-select and hit *Export selection* → `selection.txt`
   in `_journey/`. Don't pick for them; the technical shortlist is a starting
   point, not taste (featured = sharpest, which is blind to composition).

6. `python3 tools/journey-loader/review_detours.py --photos "DIR" --selection "DIR/_journey/selection.txt"`

   → **DECISION 2 (user): classify far-snapped photos.** Any selected photo that
   snapped >2 km from its town is suspect — a real place with no nearby index
   entry (this is how Mazouco, Pedras Salgadas and Atenor were found). For each:
   - real place **not** in the book index → **Detour** (ADR 0010): add it to the
     post's `detours:` block `{name, lat, lon, note, image}`; the note states why
     it's off the journey (it postdates the 1979 trip, or Saramago just didn't go).
     Use the photo's own GPS for the coordinate.
   - real place **is** a book Place, just mis-snapped → fix its coordinate in
     `corrections.json` instead.
   - genuine GPS drift / across a border → leave it.
   When a town's *only* photos turn out to be a Detour, that town drops from
   `places:`/`featured_photos:` entirely (it had no real photo).

7. `python3 tools/journey-loader/export_web.py --photos "DIR" --journey N --selection "DIR/_journey/selection.txt"`
   — EXIF-stripped, 1600px, orientation-baked AVIFs into
   `apps/blog/assets/viagem-N/`, named `slug(town)-<rank>` (rank by sharpness, so
   `-1` is the hero). Spot-check `exiftool -GPSPosition` shows nothing.
8. `python3 tools/journey-loader/scaffold_post.py --photos "DIR" --journey N`
   — writes the day-by-day PT post: `places:` (validated by blog-sync against the
   index), `featured_photos:` (sharpest per town), Saramago epigraphs pulled from
   `quotes.json`, a commented `detours:` template, and `⟨…⟩` placeholders.

   → **DECISION 3 (user): the prose.** Every `⟨…⟩` is theirs to write — intro,
   per-day notes, per-place notes, epílogo, title, description. **Do not invent
   travelogue content**; ask. Detour `note:` lines may be drafted from verified
   facts, flagged for confirmation.

9. Hand-edit the post's `detours:` block per Decision 2, then:
   `uv run tools/blog-sync/sync.py` (regenerates `featured-journey.json` +
   `detours.json`; fails on any `places:` name not in the index).

## Build & verify

- **Typecheck:** `pnpm --filter map typecheck`.
- **Map render:** detours appear as solid slate dots (`DETOUR_COLOR`), sized to
  `MARKER_MIN_RADIUS`; selectable via `?detour=<slug>`. To verify without showing
  a photo, drive a *fresh* dev load (`agent-browser`, the dev build exposes
  `window.__travelMap`), centre via `jumpTo`, and screenshot the map with **no
  panel open**. (A hot-reloaded tab won't show new markers — they're added in the
  one-time `load` handler.)
- **Blog build:** local Ruby/asdf is unreliable — build in a container:
  `cd apps/blog && docker run --rm -v "$PWD":/app -w /app ruby:3.3 bash -lc "bundle install --quiet && bundle exec jekyll build"`.
- **One-port preview (blog + map together, so `/assets` photos resolve in the
  map):** two live dev servers can't share a port, so build both and serve the
  combined tree:
  `EXPO_BASE_URL=/map pnpm --filter map export:web`; assemble `_site` + `dist`→`/map`
  into one dir; `python3 -m http.server 8080`. Blog `/`, map `/map`, photos under
  `/assets/viagem-N/`.

## Background

Domain terms in `CONTEXT.md` (Place, Stop, Visit, **Detour**). The Detour
boundary — display-only, not Visit-able, not counted, never on a Route, generated
from blog front matter — is `docs/adr/0010-detours-off-book-places.md`. The
photo-handling rule is also captured in memory `travel-photos-local-only`.
