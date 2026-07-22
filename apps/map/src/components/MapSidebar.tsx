import { useState, type ReactNode } from "react";

import { useSheetDrag } from "../hooks/useSheetDrag";
import { bookPlaceByName, chapters } from "../lib/book";
import type { Detour } from "../lib/detours";
import { stops } from "../lib/geo";
import { t } from "../lib/i18n";
import { CHAPTER_COLORS } from "../lib/mapStyle";
import type { Visits } from "../lib/progress";
import AchievementsSection from "./AchievementsSection";
import DetourDetailPanel from "./DetourDetailPanel";
import MapLegend from "./MapLegend";
import MapNav from "./MapNav";
import MapTopBar from "./MapTopBar";
import MobileTabBar, { type MobileTab } from "./MobileTabBar";
import { SheetCloseButton } from "./PanelShell";
import TownDetailPanel, { type TownDetailPanelProps } from "./TownDetailPanel";
import TownSearch from "./TownSearch";

export interface MapSidebarProps {
  isDesktop: boolean;
  /** The auth/progress block, owned by TravelMap (keeps session types out of here). */
  header: ReactNode;
  /** Whether sign-in exists at all (Supabase configured) — gates the mobile
   * account tab; the header alone can't tell, it always carries the hint. */
  hasAccount: boolean;
  /** The signed-in Traveler's visit log, or null when signed out. Drives the
   * achievements: a trophy tab + sheet on mobile, a fold-out under the
   * header on desktop. */
  visits: Visits | null;
  focusedChapter: number | null;
  onFocusChapter: (chapter: number) => void;
  onClearFocus: () => void;
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

/**
 * The journey: one row per Chapter, tap to fit the map to that Chapter's Stops.
 * `compact` (mobile bottom sheet) collapses each row to a single line and drops
 * the heading — its sheet owns the title — so six chapters cover less map.
 */
function ChapterList({
  onFocusChapter,
  compact = false,
}: {
  onFocusChapter: (chapter: number) => void;
  compact?: boolean;
}) {
  return (
    <>
      {!compact && <h2 className="text-lg font-bold">{t("theJourney")}</h2>}
      {chapters.map((c) => (
        <button
          key={c.number}
          onClick={() => onFocusChapter(c.number)}
          className={`flex items-center gap-2.5 rounded-md text-left transition-colors hover:bg-secondary focus-visible:bg-secondary focus-visible:outline-none ${
            compact ? "px-2 py-1.5" : "p-2"
          }`}
        >
          <span
            className={`shrink-0 rounded-full ${compact ? "h-2.5 w-2.5" : "mt-0.5 h-3 w-3"}`}
            style={{ background: CHAPTER_COLORS[c.number] }}
          />
          {compact ? (
            <>
              <span className="flex-1 truncate text-[13px] font-medium leading-snug">
                {c.number}. {c.title}
              </span>
              <span className="shrink-0 text-xs text-muted-foreground">
                {t("stopsCount", { count: stopCounts.get(c.number) ?? 0 })}
              </span>
            </>
          ) : (
            <span className="flex-1">
              <span className="block text-[13px] font-semibold leading-snug">
                {c.number}. {c.title}
              </span>
              <span className="block text-xs text-muted-foreground">
                {t("stopsCount", { count: stopCounts.get(c.number) ?? 0 })}
              </span>
            </span>
          )}
        </button>
      ))}
    </>
  );
}

/**
 * One chapter in focus: its Stops in narrative order, tap to open the Place.
 * The map meanwhile dims everything outside the chapter (TravelMap owns that),
 * so the list and the territory point at the same thing.
 */
function ChapterStops({
  chapter,
  onSelectPlace,
  onBack,
}: {
  chapter: number;
  onSelectPlace: (indexName: string) => void;
  onBack: () => void;
}) {
  const meta = chapters.find((c) => c.number === chapter);
  const chapterStops = stops.filter(
    (s) => s.chapter === chapter && s.role === "stop",
  );
  return (
    <>
      <button
        onClick={onBack}
        className="self-start text-[13px] text-muted-foreground transition-colors hover:text-foreground"
      >
        {t("backToChapters")}
      </button>
      <h2 className="flex items-baseline gap-2 text-lg font-bold leading-snug">
        <span
          className="h-3 w-3 shrink-0 self-center rounded-full"
          style={{ background: CHAPTER_COLORS[chapter] }}
        />
        <span>
          {chapter}. {meta?.title}
        </span>
      </h2>
      <ol className="flex flex-col">
        {chapterStops.map((s, i) => (
          <li key={s.ordinal}>
            <button
              onClick={() => onSelectPlace(s.place)}
              className="flex w-full items-baseline gap-2 rounded-md px-2 py-1 text-left transition-colors hover:bg-secondary focus-visible:bg-secondary focus-visible:outline-none"
            >
              <span className="w-6 shrink-0 text-right text-xs tabular-nums text-muted-foreground">
                {i + 1}.
              </span>
              <span className="text-[13px]">
                {bookPlaceByName.get(s.place)?.name ?? s.place}
              </span>
            </button>
          </li>
        ))}
      </ol>
    </>
  );
}

/**
 * Mobile bottom sheet floated just above the {@link MobileTabBar}. Each tab /
 * the search button opens one of these (journey, account, search) with a pinned
 * header and a scrollable body, leaving the map visible behind the glass nav.
 */
function MobileSheet({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const { handleProps, sheetStyle } = useSheetDrag(onClose);
  return (
    <aside
      style={sheetStyle}
      // Grid rows + dvh, not column flex + vh: see the PanelShell mobile
      // sheet — Safari needs the minmax(0,1fr) row for the body to scroll.
      className="animate-sheet-in absolute left-[calc(0.75rem+env(safe-area-inset-left))] right-[calc(0.75rem+env(safe-area-inset-right))] bottom-20 z-10 grid max-h-[55dvh] grid-rows-[auto_minmax(0,1fr)] rounded-2xl border border-border bg-card/95 text-sm text-foreground shadow-lg backdrop-blur-sm"
    >
      <div
        {...handleProps}
        className="flex cursor-grab items-center justify-between gap-2 border-b border-border px-4 pb-2.5 pt-1.5"
      >
        <div className="min-w-0 flex-1">
          <div aria-hidden className="mx-auto mb-1.5 h-1 w-9 rounded-full bg-border" />
          <span className="text-lg font-bold">{title}</span>
        </div>
        <SheetCloseButton onClose={onClose} />
      </div>
      {/* Own max-height besides the grid row, and *:shrink-0 so children
          overflow into scrolling instead of compressing to fit the cap —
          see the PanelShell body for the full story. */}
      <div className="flex max-h-[calc(55dvh_-_4rem)] touch-pan-y flex-col gap-0.5 overflow-y-auto overscroll-contain p-2 *:shrink-0">
        {children}
      </div>
    </aside>
  );
}

export default function MapSidebar({
  isDesktop,
  header,
  hasAccount,
  visits,
  focusedChapter,
  onFocusChapter,
  onClearFocus,
  onSelectPlace,
  selectedPlace,
  detailProps,
  selectedDetour,
  onCloseDetour,
}: MapSidebarProps) {
  // Which bottom sheet the glass tab bar has open ("map" = none). Search is a
  // separate toggle so it can overlay whichever tab view is underneath.
  const [mobileView, setMobileView] = useState<MobileTab>("map");
  const [searchOpen, setSearchOpen] = useState(false);

  // Mobile: a slim top-left brand card, and a floating Liquid Glass tab bar that
  // owns the journey / account / search, each opening as a bottom sheet above
  // it. A selected Place/Detour renders a full-screen sheet (via TravelMap) that
  // covers the nav, so the bottom chrome only shows while browsing the map.
  if (!isDesktop) {
    const selectionActive = selectedPlace != null || selectedDetour != null;
    return (
      <>
        <MapTopBar />

        {!selectionActive && (
          <>
            {/* The tab view sheet (journey / account). Search isn't a sheet:
                it expands the glass nav itself into a search field (iOS 26). */}
            {searchOpen ? null : mobileView === "journey" ? (
              <MobileSheet title={t("theJourney")} onClose={() => setMobileView("map")}>
                {focusedChapter != null ? (
                  <ChapterStops
                    chapter={focusedChapter}
                    onSelectPlace={onSelectPlace}
                    onBack={onClearFocus}
                  />
                ) : (
                  <>
                    <ChapterList compact onFocusChapter={onFocusChapter} />
                    <MapLegend />
                  </>
                )}
              </MobileSheet>
            ) : mobileView === "achievements" ? (
              <MobileSheet
                title={t("achievements")}
                onClose={() => setMobileView("map")}
              >
                <AchievementsSection
                  visits={visits}
                  signedOut={hasAccount && visits == null}
                  expanded
                />
              </MobileSheet>
            ) : mobileView === "profile" && hasAccount ? (
              <MobileSheet title={t("account")} onClose={() => setMobileView("map")}>
                <div className="flex flex-col gap-2 px-2 py-1">{header}</div>
              </MobileSheet>
            ) : null}
            <MobileTabBar
              active={mobileView}
              searchOpen={searchOpen}
              hasProfile={hasAccount}
              onSelect={(tab) => {
                setSearchOpen(false);
                setMobileView((cur) => (cur === tab && tab !== "map" ? "map" : tab));
              }}
              onToggleSearch={() => setSearchOpen((o) => !o)}
              onSelectPlace={(p) => {
                onSelectPlace(p);
                setSearchOpen(false);
              }}
            />
          </>
        )}
      </>
    );
  }

  const shell = "absolute left-3 top-3 bottom-3 w-[360px] gap-2";

  // On desktop the detail panel embeds in place of the chapter list.
  const body =
    selectedPlace != null && detailProps ? (
      <>
        <button
          onClick={detailProps.onClose}
          className="self-start text-[13px] text-muted-foreground transition-colors hover:text-foreground"
        >
          {t("backToChapters")}
        </button>
        <TownDetailPanel place={selectedPlace} embedded {...detailProps} />
      </>
    ) : selectedDetour ? (
      <>
        <button
          onClick={onCloseDetour}
          className="self-start text-[13px] text-muted-foreground transition-colors hover:text-foreground"
        >
          {t("backToChapters")}
        </button>
        <DetourDetailPanel detour={selectedDetour} embedded onClose={onCloseDetour} />
      </>
    ) : focusedChapter != null ? (
      <ChapterStops
        chapter={focusedChapter}
        onSelectPlace={onSelectPlace}
        onBack={onClearFocus}
      />
    ) : (
      <>
        <ChapterList onFocusChapter={onFocusChapter} />
        <MapLegend />
      </>
    );

  return (
    <aside
      className={`${shell} flex flex-col rounded-lg border border-border bg-card/95 p-4 text-sm text-foreground shadow-sm`}
    >
      <div className="shrink-0">
        <MapNav />
      </div>
      <div className="shrink-0">{header}</div>
      <div className="shrink-0">
        <AchievementsSection visits={visits} signedOut={hasAccount && visits == null} />
      </div>
      <TownSearch onSelect={onSelectPlace} />
      <div
        // Remount on every view change so the entrance animation replays —
        // chapters ↔ place ↔ detour each read as "something opened".
        key={
          selectedPlace ??
          selectedDetour?.name ??
          (focusedChapter != null ? `chapter-${focusedChapter}` : "chapters")
        }
        // *:shrink-0: a scroll container's children must overflow, never
        // compress — overflow-hidden items (the post photo card) otherwise
        // shrink to fit and eat the very overflow that makes it scroll.
        className="animate-panel-in flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto *:shrink-0"
      >
        {body}
      </div>
    </aside>
  );
}
