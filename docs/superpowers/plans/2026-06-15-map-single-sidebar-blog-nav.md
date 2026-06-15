# Map: one sidebar + blog-style nav — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Collapse the web map's two desktop floating panels into a single left sidebar, and give that sidebar the blog's navigation (title → home, `Mapa` active, `Sobre` → /about/).

**Architecture:** Extract a single web-only `MapSidebar` component that owns the panel shell (full-height + scroll on desktop, compact auto-height on mobile), the town search, and the chapter list (desktop) / toggle pills (mobile), and embeds the detail panel on desktop. A small `MapNav` renders the blog-mirroring header. The existing `ChapterSidebar` is deleted (folded in). The stateful auth/progress block stays in `TravelMap.web.tsx` and is passed into `MapSidebar` as a `header` slot, so the heavy session/auth types don't leak into the sidebar's prop surface. Mobile detail panels keep floating as bottom sheets, rendered by `TravelMap.web.tsx`.

**Tech Stack:** Expo / React Native Web, maplibre-gl (web map), TypeScript, NativeWind v5 + Tailwind v4 (web DOM chrome), vitest (i18n unit test).

---

## File Structure

- **Create** `apps/map/src/components/MapNav.tsx` — the blog-mirroring header (title home-link + `Mapa`/`Sobre`). Presentational, web-only DOM, zero props.
- **Create** `apps/map/src/components/MapSidebar.tsx` — the single panel: shell + nav + auth/progress slot + search + chapter list/pills + desktop detail embed.
- **Delete** `apps/map/src/components/ChapterSidebar.tsx` — folded into `MapSidebar`.
- **Modify** `apps/map/src/components/TravelMap.web.tsx` — swap the inline card + `ChapterSidebar` branch for `<MapSidebar>`; build the `header` slot; keep mobile bottom-sheet detail; flip desktop map controls to the right; drop now-unused imports.
- **Modify** `apps/map/src/lib/i18n.ts` — add `navMap` / `navAbout` to `en` and `pt`.
- **Modify** `apps/map/src/lib/__tests__/i18n.test.ts` — assert the two new keys exist in both dictionaries.

`TravelMap.tsx` (native) is **not** touched — this is web-only chrome.

---

## Task 1: Add `navMap` / `navAbout` i18n keys

**Files:**
- Test: `apps/map/src/lib/__tests__/i18n.test.ts`
- Modify: `apps/map/src/lib/i18n.ts:6-40` (en), `:42-76` (pt)

- [ ] **Step 1: Write the failing test**

Add this `it` block inside the existing `describe("i18n dictionaries", ...)` in `apps/map/src/lib/__tests__/i18n.test.ts`, after the `"t interpolates variables"` test:

```ts
  it("has the blog-mirroring nav labels in both languages", () => {
    expect(dictionaries.en.navMap).toBe("Map");
    expect(dictionaries.en.navAbout).toBe("About");
    expect(dictionaries.pt.navMap).toBe("Mapa");
    expect(dictionaries.pt.navAbout).toBe("Sobre");
  });
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter map test`
Expected: FAIL — `navMap`/`navAbout` are missing, plus the existing parity test ("pt covers every en key") fails because the keys aren't in `en` yet (TypeScript also flags `dictionaries.en.navMap` as nonexistent). This confirms the test exercises the new keys.

- [ ] **Step 3: Add the keys to the `en` dictionary**

In `apps/map/src/lib/i18n.ts`, in the `const en = { ... }` object, add these two lines immediately after `cancel: "Cancel",` (the last entry, line 39):

```ts
  navMap: "Map",
  navAbout: "About",
```

- [ ] **Step 4: Add the keys to the `pt` dictionary**

In the `const pt: typeof en = { ... }` object, add these two lines immediately after `cancel: "Cancelar",` (line 75):

```ts
  navMap: "Mapa",
  navAbout: "Sobre",
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `pnpm --filter map test`
Expected: PASS — all three `it` blocks green (new keys present, parity holds, placeholders unaffected).

- [ ] **Step 6: Typecheck**

Run: `pnpm --filter map typecheck`
Expected: no errors (`MessageKey` now includes `navMap`/`navAbout`).

- [ ] **Step 7: Commit**

```bash
git add apps/map/src/lib/i18n.ts apps/map/src/lib/__tests__/i18n.test.ts
git commit -m "Add navMap/navAbout i18n keys for the map's blog-style nav"
```

---

## Task 2: Create the `MapNav` header

**Files:**
- Create: `apps/map/src/components/MapNav.tsx`

- [ ] **Step 1: Create the component**

Create `apps/map/src/components/MapNav.tsx` with exactly:

```tsx
import { withSiteBase } from "../lib/assets";
import { t } from "../lib/i18n";

/**
 * The map sidebar's header, mirroring the blog's whiteglass nav
 * (_data/navigation.yml): the site title links home, followed by the same
 * Map / About items. Web-only DOM chrome. Links go through withSiteBase so
 * they resolve next to the blog under a sub-path host (e.g. /viagem-a-portugal/).
 * `Mapa` is the current page, so it is shown active rather than linked.
 */
export default function MapNav() {
  return (
    <div className="flex flex-col gap-1.5">
      <a href={withSiteBase("/")} className="no-underline hover:opacity-80">
        <h1 className="text-base font-bold text-foreground">Viagem a Portugal</h1>
      </a>
      <nav className="flex gap-4 border-b border-border pb-2 text-[13px]">
        <span aria-current="page" className="font-semibold text-foreground">
          {t("navMap")}
        </span>
        <a
          href={withSiteBase("/about/")}
          className="text-muted-foreground no-underline hover:text-foreground"
        >
          {t("navAbout")}
        </a>
      </nav>
    </div>
  );
}
```

Note: raw `<a>`/`<h1>` DOM elements with Tailwind classNames are the same web-only pattern `ChapterSidebar.tsx` already uses (`<aside>`/`<button>`); Tailwind's generated stylesheet applies to plain DOM elements too.

- [ ] **Step 2: Typecheck**

Run: `pnpm --filter map typecheck`
Expected: no errors. (`withSiteBase` is exported from `src/lib/assets.ts`; `t` from `src/lib/i18n.ts`.)

- [ ] **Step 3: Commit**

```bash
git add apps/map/src/components/MapNav.tsx
git commit -m "Add MapNav header mirroring the blog navigation"
```

---

## Task 3: Create the `MapSidebar` panel

**Files:**
- Create: `apps/map/src/components/MapSidebar.tsx`

This component absorbs everything `ChapterSidebar.tsx` did (search, chapter list, desktop detail embed) plus the `MapNav` header, the auth/progress `header` slot, and the mobile chapter toggle pills. The desktop/mobile differences are handled internally via the `isDesktop` prop.

- [ ] **Step 1: Create the component**

Create `apps/map/src/components/MapSidebar.tsx` with exactly:

```tsx
import type { ReactNode } from "react";

import { chapters } from "../lib/book";
import type { Detour } from "../lib/detours";
import { stops } from "../lib/geo";
import { t } from "../lib/i18n";
import { CHAPTER_COLORS } from "../lib/mapStyle";
import DetourDetailPanel from "./DetourDetailPanel";
import MapNav from "./MapNav";
import TownDetailPanel, { type TownDetailPanelProps } from "./TownDetailPanel";
import TownSearch from "./TownSearch";

export interface MapSidebarProps {
  isDesktop: boolean;
  /** The auth/progress block, owned by TravelMap (keeps session types out of here). */
  header: ReactNode;
  hiddenChapters: ReadonlySet<number>;
  onToggleChapter: (chapter: number) => void;
  onFocusChapter: (chapter: number) => void;
  onSelectPlace: (indexName: string) => void;
  selectedPlace: string | null;
  detailProps: Omit<TownDetailPanelProps, "place" | "embedded"> | null;
  selectedDetour: Detour | null;
  onCloseDetour: () => void;
}

const stopCounts = new Map<number, number>();
for (const s of stops) {
  if (s.role === "stop") {
    stopCounts.set(s.chapter, (stopCounts.get(s.chapter) ?? 0) + 1);
  }
}

export default function MapSidebar({
  isDesktop,
  header,
  hiddenChapters,
  onToggleChapter,
  onFocusChapter,
  onSelectPlace,
  selectedPlace,
  detailProps,
  selectedDetour,
  onCloseDetour,
}: MapSidebarProps) {
  const shell = isDesktop
    ? "absolute left-3 top-3 bottom-3 w-[300px] gap-2 overflow-y-auto"
    : "absolute left-3 top-3 max-w-[280px] gap-1.5 max-[359px]:max-w-[240px]";

  return (
    <aside
      className={`${shell} flex flex-col rounded-lg border border-border bg-card/95 p-4 text-sm text-foreground shadow-sm`}
    >
      <MapNav />
      {header}
      <TownSearch onSelect={onSelectPlace} />

      {isDesktop ? (
        selectedPlace != null && detailProps ? (
          <>
            <button
              onClick={detailProps.onClose}
              className="self-start text-[13px] text-muted-foreground hover:text-foreground"
            >
              {t("backToChapters")}
            </button>
            <TownDetailPanel place={selectedPlace} embedded {...detailProps} />
          </>
        ) : selectedDetour ? (
          <>
            <button
              onClick={onCloseDetour}
              className="self-start text-[13px] text-muted-foreground hover:text-foreground"
            >
              {t("backToChapters")}
            </button>
            <DetourDetailPanel detour={selectedDetour} embedded onClose={onCloseDetour} />
          </>
        ) : (
          <>
            <h2 className="text-base font-bold">{t("theJourney")}</h2>
            {chapters.map((c) => (
              <button
                key={c.number}
                onClick={() => onFocusChapter(c.number)}
                className="flex items-center gap-2 rounded-md p-1.5 text-left hover:bg-secondary"
              >
                <span
                  className="h-3 w-3 shrink-0 rounded-full"
                  style={{ background: CHAPTER_COLORS[c.number] }}
                />
                <span className="flex-1">
                  <span className="block text-[13px] font-semibold">
                    {c.number}. {c.title}
                  </span>
                  <span className="block text-xs text-muted-foreground">
                    {t("stopsCount", { count: stopCounts.get(c.number) ?? 0 })}
                  </span>
                </span>
              </button>
            ))}
          </>
        )
      ) : (
        <span style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
          {chapters.map((c) => (
            <button
              key={c.number}
              className="min-h-[22px] min-w-[28px] cursor-pointer rounded-full px-2 text-xs font-medium pointer-coarse:min-h-[44px] pointer-coarse:min-w-[44px]"
              onClick={() => onToggleChapter(c.number)}
              aria-pressed={!hiddenChapters.has(c.number)}
              aria-label={`${c.number}. ${c.title}`}
              title={c.title}
              style={{
                border: `2px solid ${CHAPTER_COLORS[c.number]}`,
                background: hiddenChapters.has(c.number)
                  ? "transparent"
                  : CHAPTER_COLORS[c.number],
                color: hiddenChapters.has(c.number)
                  ? CHAPTER_COLORS[c.number]
                  : "#fff",
              }}
            >
              {c.number}
            </button>
          ))}
        </span>
      )}
    </aside>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `pnpm --filter map typecheck`
Expected: no errors. `MapSidebar` is not yet imported anywhere, but `tsc --noEmit` checks the whole project, so this confirms the file is type-correct in isolation. (`TownDetailPanelProps` and `Detour` are exported from their modules; the imported names all exist.)

- [ ] **Step 3: Commit**

```bash
git add apps/map/src/components/MapSidebar.tsx
git commit -m "Add MapSidebar: single panel folding in ChapterSidebar + nav"
```

---

## Task 4: Wire `MapSidebar` into `TravelMap.web.tsx`, delete `ChapterSidebar`

**Files:**
- Modify: `apps/map/src/components/TravelMap.web.tsx`
- Delete: `apps/map/src/components/ChapterSidebar.tsx`

- [ ] **Step 1: Swap component imports**

In `apps/map/src/components/TravelMap.web.tsx`, update the import block (lines 32-36). Replace:

```tsx
import AuthPanel from "./AuthPanel";
import ChapterSidebar from "./ChapterSidebar";
import DetourDetailPanel from "./DetourDetailPanel";
import TownDetailPanel from "./TownDetailPanel";
import TownSearch from "./TownSearch";
```

with:

```tsx
import AuthPanel from "./AuthPanel";
import DetourDetailPanel from "./DetourDetailPanel";
import MapSidebar from "./MapSidebar";
import TownDetailPanel from "./TownDetailPanel";
```

(`TownSearch` and `ChapterSidebar` are no longer used here — search lives in `MapSidebar` now; `AuthPanel`, `TownDetailPanel`, `DetourDetailPanel` stay for the header slot and mobile bottom sheets.)

- [ ] **Step 2: Drop the now-unused `CHAPTER_COLORS` import**

In the `from "../lib/mapStyle"` import (lines 21-29), remove the `CHAPTER_COLORS,` line (the chapter pills that used it have moved to `MapSidebar`). The block becomes:

```tsx
import {
  DETOUR_COLOR,
  fetchMapStyle,
  MARKER_MIN_RADIUS,
  ROUTE_COLOR,
  TOWN_COLOR,
  TOWN_RADIUS,
} from "../lib/mapStyle";
```

- [ ] **Step 3: Flip the desktop map controls to the right edge**

The single sidebar now owns the **left** edge, so the desktop controls must move off it. Replace the comment + control placement (lines 196-212). Replace:

```tsx
  // Place the zoom + geolocate controls opposite the open chrome so they never
  // sit under a panel: on desktop the journey sidebar owns the whole right edge
  // (controls go bottom-left); on mobile the detail panel is a bottom sheet
  // (controls stay top-right / bottom-right). Re-runs when the breakpoint flips.
  // The geolocate button drops the standard blue location dot + accuracy ring
  // and recentres on the visitor — pure browser geolocation, no Visit data.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    const nav = new maplibregl.NavigationControl();
    const geolocate = new maplibregl.GeolocateControl({
      positionOptions: { enableHighAccuracy: true },
      trackUserLocation: true,
      showUserLocation: true,
    });
    map.addControl(nav, isDesktop ? "bottom-left" : "top-right");
    map.addControl(geolocate, isDesktop ? "bottom-left" : "bottom-right");
```

with:

```tsx
  // Place the zoom + geolocate controls clear of the open chrome so they never
  // sit under a panel: the single sidebar now owns the left edge, so on desktop
  // the controls go bottom-right; on mobile the detail panel is a bottom sheet
  // (controls stay top-right / bottom-right). Re-runs when the breakpoint flips.
  // The geolocate button drops the standard blue location dot + accuracy ring
  // and recentres on the visitor — pure browser geolocation, no Visit data.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    const nav = new maplibregl.NavigationControl();
    const geolocate = new maplibregl.GeolocateControl({
      positionOptions: { enableHighAccuracy: true },
      trackUserLocation: true,
      showUserLocation: true,
    });
    map.addControl(nav, isDesktop ? "bottom-right" : "top-right");
    map.addControl(geolocate, "bottom-right");
```

- [ ] **Step 4: Replace the inline card + ChapterSidebar branch with `<MapSidebar>`**

Replace the entire JSX block from the opening `<div className="absolute left-3 top-3 ...">` (line 309) through the end of the `isDesktop ? (...) : (...)` block (line 401) — i.e. lines 309-401 — with the following. This builds the auth/progress `header` once and feeds it to `MapSidebar`, then renders the mobile bottom-sheet detail panels (unchanged) outside the sidebar:

```tsx
      {(() => {
        const header = session ? (
          <>
            <span>
              {t("progress", {
                towns: townsCount,
                townsTotal: metrics.townsTotal,
                pages: pagesCount,
                pagesTotal: metrics.pagesTotal,
              })}
            </span>
            <span className="text-xs text-muted-foreground">{t("clickHint")}</span>
            <span className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="truncate">{session.user.email}</span>
              <button
                onClick={() => void signOut()}
                className="shrink-0 underline hover:text-foreground"
              >
                {t("signOut")}
              </button>
            </span>
          </>
        ) : authOpen ? (
          <AuthPanel
            onSignIn={signIn}
            onSignUp={signUp}
            onCancel={() => {
              setAuthOpen(false);
              setPendingPlace(null);
            }}
          />
        ) : (
          configured &&
          !authLoading && (
            <>
              <span className="text-xs text-muted-foreground">{t("trackPitch")}</span>
              <button
                onClick={() => setAuthOpen(true)}
                className="h-8 self-start rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-primary/90"
              >
                {t("signIn")}
              </button>
            </>
          )
        );
        return (
          <MapSidebar
            isDesktop={isDesktop}
            header={header}
            hiddenChapters={hiddenChapters}
            onToggleChapter={toggleChapter}
            onFocusChapter={focusChapter}
            onSelectPlace={selectPlace}
            selectedPlace={selectedPlace}
            detailProps={detailProps}
            selectedDetour={selectedDetour}
            onCloseDetour={clear}
          />
        );
      })()}

      {!isDesktop && selectedPlace != null && detailProps && (
        <TownDetailPanel place={selectedPlace} {...detailProps} />
      )}
      {!isDesktop && selectedDetour && (
        <DetourDetailPanel detour={selectedDetour} onClose={clear} />
      )}
```

- [ ] **Step 5: Delete the old `ChapterSidebar`**

Run: `git rm apps/map/src/components/ChapterSidebar.tsx`
Expected: file removed; nothing imports it anymore (verified by the next step).

- [ ] **Step 6: Typecheck**

Run: `pnpm --filter map typecheck`
Expected: no errors. In particular, no "unused import" or "cannot find module './ChapterSidebar'" errors, and the `MapSidebar` props all match.

- [ ] **Step 7: Build the web bundle (CI gate)**

Run: `pnpm --filter map export:web`
Expected: build succeeds, output written to `apps/map/dist`. No module-resolution errors for the deleted `ChapterSidebar`.

- [ ] **Step 8: Commit**

```bash
git add apps/map/src/components/TravelMap.web.tsx
git rm --cached apps/map/src/components/ChapterSidebar.tsx 2>/dev/null; true
git commit -m "Use single MapSidebar on the map; move controls off the left edge"
```

(The `git rm` in Step 5 already staged the deletion; the commit records both the modified `TravelMap.web.tsx` and the removed `ChapterSidebar.tsx`.)

---

## Task 5: Manual verification in the browser

**Files:** none (verification only).

Per `CLAUDE.md`, drive the running web app with the `agent-browser` CLI (not Playwright/Puppeteer). The map renders to `canvas.maplibregl-canvas` — wait for that selector before screenshotting.

- [ ] **Step 1: Start the web dev server**

Run (background): `pnpm --filter map web`
Expected: serves at `http://localhost:8081`.

- [ ] **Step 2: Desktop view (≥768px)**

```
agent-browser open http://localhost:8081
# wait for canvas.maplibregl-canvas to exist
agent-browser screenshot
```
Verify:
- Exactly **one** panel, anchored to the **left** edge, spanning full height; the **right** side of the map is clear.
- Header shows "Viagem a Portugal" with `Mapa` (active) and `Sobre` beneath it.
- The "A viagem" chapter list renders; clicking a chapter fits the map to that chapter's bounds.
- Clicking a town marker swaps the list for the detail panel with a `← Capítulos` back link; back returns to the list.
- Zoom + geolocate controls sit at the **bottom-right**, not under the sidebar.

- [ ] **Step 3: Mobile view (<768px)**

Resize the browser to a narrow width (e.g. 390px) so `useIsDesktop` reports false, reload, and screenshot.
Verify:
- One compact card top-left with the nav header.
- Chapter **pills** (numbered circles) still toggle route visibility on/off.
- Selecting a town shows the detail as a **bottom sheet** (not embedded in the card).

- [ ] **Step 4: Nav links**

Confirm the title links to the blog home and `Sobre` to `/about/` (inspect the rendered `href`s — in dev with no blog they 404 on click, which is expected and accepted per the spec).

- [ ] **Step 5: Stop the dev server**

Stop the backgrounded `pnpm --filter map web` process.

---

## Self-Review

**Spec coverage:**
- "Collapse two desktop panels into one (left edge)" → Tasks 3–4 (`MapSidebar` left shell; `ChapterSidebar` deleted). ✓
- "Blog nav: title→home, Map/About" → Task 2 (`MapNav`). ✓
- "Localized nav labels (`navMap`/`navAbout`)" → Task 1. ✓
- "`withSiteBase` URLs; dev-404 accepted" → Task 2 (links), Task 5 Step 4 (verify). ✓
- "Mobile keeps pills + bottom-sheet detail, gains nav header" → Task 3 (pills branch + `MapNav`), Task 4 (bottom sheets stay in TravelMap). ✓
- "Extract `MapSidebar`, keep `TravelMap.web.tsx` lean" → Tasks 3–4. ✓
- "Native untouched" → no task edits `TravelMap.tsx`. ✓
- "Verify via typecheck + export:web + agent-browser" → Tasks 1/2/3/4 typecheck, Task 4 export:web, Task 5 browser. ✓
- Implicit-but-required: desktop controls must not hide under the now-left sidebar → Task 4 Step 3. ✓

**Placeholder scan:** No TBD/TODO/"handle edge cases"/"similar to". Every code step shows full code. ✓

**Type consistency:** `MapSidebarProps` field names and types used in Task 4's `<MapSidebar>` call match Task 3's interface (`isDesktop`, `header`, `hiddenChapters`, `onToggleChapter`, `onFocusChapter`, `onSelectPlace`, `selectedPlace`, `detailProps`, `selectedDetour`, `onCloseDetour`). `detailProps` shape (`Omit<TownDetailPanelProps,"place"|"embedded">`) matches the object built at `TravelMap.web.tsx:285-301` (carries `onClose`, used for the back button). `t("navMap")`/`t("navAbout")` keys match Task 1. `focusChapter`/`toggleChapter`/`clear`/`selectPlace` are the existing TravelMap identifiers. ✓
