# Map: one sidebar + blog-style nav

**Date:** 2026-06-15
**Status:** Approved (brainstorm) — pending implementation plan

## Problem

The web map shows **two** floating panels on desktop:

1. **Top-left card** (`TravelMap.web.tsx`, `absolute left-3 top-3`) — title, progress
   metrics, sign-in/auth. On mobile it also holds the town search and the chapter
   *toggle* pills.
2. **Right sidebar** (`ChapterSidebar.tsx`, `absolute right-3 top-3 bottom-3`,
   `w-[300px]`) — town search, the "A viagem" chapter *list* (click to focus a
   chapter), and the embedded detail panel when a Place/Detour is selected.

Two panels is one too many. Separately, the map has **no navigation** back to the
companion blog, whereas the blog header links out to the map. We want the map to
carry the blog's nav so the two apps feel like one site.

## Goals

- Collapse the two desktop panels into **one** (left edge), freeing the right side
  of the map.
- Give the map the blog's navigation, mirroring the whiteglass header
  (`_data/navigation.yml`): site title → home, plus `Map` / `About`.
- No change to map data, GeoJSON, or visit/sync behavior.

## Non-goals

- No change to the native (`TravelMap.tsx`) layout — nav/consolidation is web-only
  chrome, consistent with how the floating panels are already web-only.
- No new pages in the map app (no in-app About). `Sobre` links out to the blog.
- No redesign of the detail panels themselves (`TownDetailPanel`,
  `DetourDetailPanel`) — only where they render.

## Design

### The single panel

The surviving panel is the **left** card, extended to do everything the right
sidebar did. On desktop it becomes full height and scrolls:

- Position: `absolute left-3 top-3 bottom-3`, fixed `w-[300px]`,
  `overflow-y-auto` — i.e. it adopts the right sidebar's box, on the left.
- On mobile it keeps today's behavior: auto height (`left-3 top-3`, no
  `bottom-3`), compact, and the detail panel still floats as a bottom sheet
  (`PanelShell` non-embedded). Mobile already has only one panel, so mobile needs
  no consolidation — only the new nav header.

Panel contents, top to bottom:

| Block | Desktop | Mobile |
| --- | --- | --- |
| **Header**: title (→ home) + nav row (`Mapa` active, `Sobre` → about) | ✓ | ✓ |
| Progress metrics / sign-in / auth (existing states) | ✓ | ✓ |
| `TownSearch` | ✓ (moved from sidebar) | ✓ (already here) |
| Chapter **list** ("A viagem", click = focus chapter) | ✓ (moved from sidebar) | — |
| Chapter **toggle pills** (show/hide layers) | — | ✓ (already here) |
| Detail panel when a Place/Detour is selected | embedded, with `← Capítulos` back | floats as bottom sheet (unchanged) |

Desktop selection behavior is exactly today's right-sidebar behavior, relocated:
selecting a Place hides the chapter list and shows `← Capítulos` + the embedded
`TownDetailPanel`; selecting a Detour shows `← Capítulos` + the embedded
`DetourDetailPanel`. The two distinct chapter interactions are preserved — desktop
list = **focus** (`onFocusChapter`), mobile pills = **toggle visibility**
(`toggleChapter`).

### Navigation (mirrors the blog header)

The blog (whiteglass) renders the site title as the home link, followed by the
`_data/navigation.yml` items `Map` and `About`. The map mirrors this:

- **Title** — `Viagem a Portugal` (unchanged text, a proper noun, never
  translated) wrapped in `<a href={withSiteBase("/")}>`. Stays an `<h1>` for
  semantics.
- **`Mapa`** — the current page: rendered as active (highlighted, non-link).
- **`Sobre`** — `<a href={withSiteBase("/about/")}>`.

Labels are **localized** via new i18n keys (the whole map UI is locale-aware; the
blog's literal English labels are a theme default we deliberately don't copy):

| key | en | pt |
| --- | --- | --- |
| `navMap` | Map | Mapa |
| `navAbout` | About | Sobre |

URLs use the existing `withSiteBase` helper (`src/lib/assets.ts`), which prefixes
the deployment base so links resolve next to the blog under a sub-path host
(e.g. `/viagem-a-portugal/about/` in production).

**Dev / standalone caveat (accepted):** when the map runs with no blog present
(local dev at `:8081`, CI fork builds with no `EXPO_BASE_URL`), `withSiteBase`
returns the raw path, so home/`Sobre` resolve to `/` and `/about/` and 404. This is
the same limitation the existing "from the blog" post links already have — shipped
as-is, no special-casing.

## Components / files

- **New `src/components/MapSidebar.tsx`** — the single panel. Absorbs all of
  `ChapterSidebar.tsx` plus the header (title + nav) and the
  progress/auth/search blocks currently inlined in `TravelMap.web.tsx`. Renders
  the desktop vs mobile differences (full-height vs auto, chapter list vs pills)
  internally via the `isDesktop` prop. Keeping it one focused component keeps
  `TravelMap.web.tsx` lean, per the components convention in CLAUDE.md.
- **`src/components/ChapterSidebar.tsx`** — **removed** (folded into `MapSidebar`).
- **`src/components/TravelMap.web.tsx`** — the inline `left-3 top-3` card JSX and
  the `isDesktop ? <ChapterSidebar/> : <bottom sheets/>` branch are replaced by a
  single `<MapSidebar .../>`. Mobile detail bottom sheets stay rendered here
  (they are not part of the sidebar). Net: the file shrinks.
- **`src/lib/i18n.ts`** — add `navMap`, `navAbout` to both `en` and `pt`
  dictionaries.
- **`src/components/TravelMap.tsx` (native)** — unchanged.

Props flowing into `MapSidebar` are the union of what the card and
`ChapterSidebar` need today (session/auth handlers, progress metrics,
`hiddenChapters`/`toggleChapter`, `onFocusChapter`, `selectPlace`, detail props,
selected Place/Detour, `isDesktop`). No new data sources.

## Testing / verification

- `pnpm --filter map typecheck` passes.
- `pnpm --filter map export:web` succeeds (CI gate).
- Existing i18n test (`src/lib/__tests__/i18n.test.ts`) still passes; extend it to
  assert the new keys exist in both dictionaries.
- Manual (agent-browser, `pnpm --filter map web` at `:8081`, wait for
  `canvas.maplibregl-canvas`):
  - Desktop (≥768px): exactly one panel, on the left, full height; right side
    clear. Chapter list focuses a chapter; selecting a town embeds the detail with
    `← Capítulos`; back returns to the list.
  - Mobile (<768px): one card with nav header; chapter pills still toggle layers;
    detail still floats as a bottom sheet.
  - Title click → blog home; `Sobre` → blog `/about/`; `Mapa` shown active.

## Open questions

None — layout (one left panel), nav structure (match blog: title→home, `Mapa`
active, `Sobre`→about), and the dev-404 handling (ship as-is) are all settled.
