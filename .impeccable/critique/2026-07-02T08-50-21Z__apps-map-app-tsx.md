---
target: map app UI (apps/map)
total_score: 20
p0_count: 2
p1_count: 3
timestamp: 2026-07-02T08-50-21Z
slug: apps-map-app-tsx
---
# Design critique — Viagem a Portugal map app (apps/map)

Combined synthesis of two independent assessments: a design-director review of the live app (desktop + mobile, source-level) and a deterministic detector + mechanical browser measurements. Dev build ran read-only (no Supabase env), so signed-in states (visited dots, progress count-up, auth panel) were judged from code.

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 2 | No selected-dot highlight on the map; no active-chapter state; desktop search failure is silent |
| 2 | Match System / Real World | 3 | Superb book language (Stops, Routes, «quotes», pp.) — but global "Stop #105" vs per-chapter "89 stops" forces reconciliation |
| 3 | User Control and Freedom | 3 | URL-driven back/forward works; Escape doesn't close the desktop panel, empty-map click doesn't deselect |
| 4 | Consistency and Standards | 2 | Two unrelated search implementations (native datalist vs custom list); stock maplibre popup ignores Cardo/tokens; chapter-1 route orange ≈ dot amber |
| 5 | Error Prevention | 2 | Exact-match, diacritic-sensitive Enter selection invites dead ends |
| 6 | Recognition Rather Than Recall | 1 | No legend anywhere: amber/green/slate dots and six route colors are a private code |
| 7 | Flexibility and Efficiency | 2 | Deep links + prev/next stepper good; no keyboard path to dots, no shortcuts, no fuzzy search |
| 8 | Aesthetic and Minimalist Design | 2 | Chrome is quiet and bookish; the map body is dot-soup; mobile place sheet ~55% blank |
| 9 | Error Recovery | 2 | Map-load failure state is excellent; search misses and unknown `?place=` links fail silently |
| 10 | Help and Documentation | 1 | Zero onboarding; the one hint string only renders when signed in |
| **Total** | | **20/40** | **Acceptable — significant improvements needed** |

## Anti-Patterns Verdict

**LLM assessment:** The chrome is *not* AI slop — real token system, Cardo genuinely applied everywhere (mechanically confirmed), blog-green identity, restrained floating panels. But the core surface is the product's own declared anti-reference: ~580 identical amber dots at every zoom level is "generic travel app pin-soup", and the stock white sans-serif maplibre hover popup is the one piece of chrome with no art direction. Verdict: carefully assembled, never art-directed.

**Deterministic scan:** exceptionally clean — one CLI finding total: `bounce-easing` (`cubic-bezier(.34,1.42,.5,1)`) at `apps/map/src/components/MobileTabBar.tsx:192`. Browser overlay injection succeeded; console detector added `flat-type-hierarchy` (sizes 12/13/14/16/18px, ratio 1.5:1 overall but adjacent steps nearly indistinguishable).

**Mechanical measurements (all at fault or near-fault):**
- Place-detail panel opens with `transition-duration: 0s` at every ancestor level — no motion anywhere in the chrome except the mobile search morph.
- Touch targets at 390×844: search clear button **20×20px**, cancel 47×20, tab-bar buttons 143×42, search rows 42.5px tall, maplibre vendor controls 29×29.
- Contrast: all measured pairs pass WCAG AA (secondary text 6.17:1, attribution 10.4:1+).
- `prefers-reduced-motion` honoured in three places (CSS, maplibre pans, count-up hook) — rare diligence.

## Overall Impression

The bones are unusually good — honest domain language, clean tokens, disciplined code — but the map itself was never designed, only rendered. Every "clanky" feeling traces to three roots: an undifferentiated dot field, chrome that teleports instead of moving, and a sidebar that doesn't converse with the canvas. The single biggest opportunity: make the map legible as *the journey* (hierarchy + sequence), not a scatter of data points.

## What's Working

1. **Source fidelity as design** — exact index toponyms as URLs, real chapter titles as nav ("De Algarve e sol, pão seco e pão mole"), PT quotes in italic Cardo inside «guillemets». The peak moment of the app is hitting a quote.
2. **The mobile search morph** (`MobileTabBar.tsx`) — tab bar melts into a glass search field, iOS-style inline clear, keyboard-inset handling. The one crafted interaction; proof the codebase can do delight.
3. **Honest failure + motion respect** — the map-load error state (human hint + retry) and triple `prefers-reduced-motion` coverage.

## Priority Issues

- **[P0] The map is pin-soup — the product's own anti-reference.** ~580 same-colored dots at every zoom; on mobile the country is one unbroken smear; initial desktop camera gives half the viewport to Spain. *Why:* "The map is the document" and the document is illegible; this is the root of "clanky and poor". *Fix:* zoom-graduated disclosure — country zoom shows only Stops (route-keyed), `referenced-only` places fade in from ~z9; differentiate radius by role; reframe initial bounds to Portugal. *Command:* `$impeccable shape` (map hierarchy), then `craft`.
- **[P0] Selection is invisible on the canvas.** Choose Amarante and nothing on the map indicates which dot you chose; panel and map don't converse. *Fix:* selected-halo layer driven by `?place=` (ring + radius bump + dim others) in `TravelMap.web.tsx`. *Command:* `$impeccable polish`.
- **[P1] The chrome teleports; the map glides.** Panels/sheets appear with zero transition (measured 0s everywhere) while maplibre eases beautifully — motion identity is split-brained. The only motion is one bounce-easing spring (`MobileTabBar.tsx:192`), which is also the register violation the detector flagged. *Fix:* a small motion system — 150–250ms ease-out for panel open/close, staggered detail-panel content, camera+panel choreography; replace overshoot easing. *Command:* `$impeccable animate`.
- **[P1] The sidebar and the map don't talk (wayfinding).** Chapter tap = camera move only: no stop list, no route emphasis, no active state; dead `showRoute`/`hideRoute` i18n strings betray a cut feature; mobile `fitBounds` doesn't pad for the open sheet. No legend anywhere for dot/route colors; first-timer gets zero orientation. *Fix:* chapter focus mode (dim others + ordered stop list), collapsible legend chip, one-line anonymous-mode hint. *Command:* `$impeccable onboard`.
- **[P1] Search is two different products, and desktop fails silently.** Desktop = native datalist with exact diacritic-sensitive matching ("Obidos"⏎ does nothing, no message); mobile has the good custom list. *Fix:* reuse the mobile results component in the sidebar, diacritic-fold in `search.ts`, render `noResults`. *Command:* `$impeccable harden`.

## Persona Red Flags

- **Casey (one-handed mobile, in the field):** zoom/locate top-right (least reachable); full-screen place sheet hides the map so "where is this relative to me?" needs a close-and-reopen; sheet dismiss is a small top-corner ✕ (no swipe-down); 20×20 clear button; chapter feedback lands behind the still-open sheet.
- **Jordan (first-timer, hasn't read the book):** no legend, no intro sentence; journey tab is an unlabeled squiggle; "Stop #43 — Route 1" is insider jargon; silent search failure + broken image boxes read as "site is broken".
- **Alex (keyboard power user):** canvas dots have zero keyboard path; Escape doesn't close the panel; no `/` to focus search; focus state on chapter rows is a faint grey fill; focus never moves to the panel heading on selection (no SR announcement).

## Minor Observations

- Stock maplibre hover popup: sans-serif, unbranded; some popups omit the pages line. (What if hover whispered the quote instead?)
- Placeholder copy leaks to UI: "Viagem a Portugal II — ⟨título a confirmar⟩" via featured/detour data.
- Featured images have no `onError` fallback; the reserved 4:3 box makes failure enormous.
- `pp. 89, 90, 91, 93…` — collapse to bookish ranges ("pp. 89–93").
- Mobile tab bar overlaps OSM attribution (legal-ish nit).
- Detour panel's uppercase eyebrow flirts with the anti-reference register; quiet italic reads better.
- Unknown `?place=` deep links silently ignored; non-geocoded places searchable but produce no camera move.
- Chapter-1 route `#ea580c` vs dot `#b45309` — the first route a reader tries is the worst-differentiated.
- Type hierarchy is flat (12/13/14/16/18px); headings barely outrank body.
- Vendor map controls 29×29 on touch.

## Questions to Consider

1. What if the basemap were the book? A custom muted style — paper land, ink lines, Cardo labels — would make the territory read as an endpaper map instead of a default web map whose orange highways fight orange dots.
2. What if the journey were drawn as one continuous ink line the sidebar scrolls along, stops surfacing in narrative order — pin-soup dissolving into sequence?
3. What if hover whispered the text — the place's quote in italic Cardo on every mouse move — so browsing the map *is* reading the book?
