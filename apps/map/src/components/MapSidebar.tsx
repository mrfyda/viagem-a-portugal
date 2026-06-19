import { useState, type ReactNode } from "react";

import { chapters } from "../lib/book";
import type { Detour } from "../lib/detours";
import { stops } from "../lib/geo";
import { t } from "../lib/i18n";
import { CHAPTER_COLORS } from "../lib/mapStyle";
import DetourDetailPanel from "./DetourDetailPanel";
import MapNav from "./MapNav";
import MapTopBar from "./MapTopBar";
import MobileTabBar, { type MobileTab } from "./MobileTabBar";
import TownDetailPanel, { type TownDetailPanelProps } from "./TownDetailPanel";
import TownSearch from "./TownSearch";

export interface MapSidebarProps {
  isDesktop: boolean;
  /** The auth/progress block, owned by TravelMap (keeps session types out of here). */
  header: ReactNode;
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
      {!compact && <h2 className="text-base font-bold">{t("theJourney")}</h2>}
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
  return (
    <aside className="absolute inset-x-3 bottom-20 z-10 flex max-h-[55vh] flex-col rounded-2xl border border-border bg-card/95 text-sm text-foreground shadow-lg backdrop-blur-sm">
      <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-2.5">
        <span className="text-base font-bold">{title}</span>
        <button
          onClick={onClose}
          aria-label={t("close")}
          className="rounded px-1 text-muted-foreground hover:text-foreground"
        >
          ✕
        </button>
      </div>
      <div className="flex flex-col gap-0.5 overflow-y-auto p-2">{children}</div>
    </aside>
  );
}

export default function MapSidebar({
  isDesktop,
  header,
  onFocusChapter,
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
                <ChapterList compact onFocusChapter={onFocusChapter} />
              </MobileSheet>
            ) : mobileView === "profile" && header ? (
              <MobileSheet title={t("account")} onClose={() => setMobileView("map")}>
                <div className="flex flex-col gap-2 px-2 py-1">{header}</div>
              </MobileSheet>
            ) : null}
            <MobileTabBar
              active={mobileView}
              searchOpen={searchOpen}
              hasProfile={Boolean(header)}
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

  const shell = "absolute left-3 top-3 bottom-3 w-[360px] gap-2 overflow-y-auto";

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
    ) : (
      <ChapterList onFocusChapter={onFocusChapter} />
    );

  return (
    <aside
      className={`${shell} flex flex-col rounded-lg border border-border bg-card/95 p-4 text-sm text-foreground shadow-sm`}
    >
      <MapNav />
      {header}
      <TownSearch onSelect={onSelectPlace} />
      {body}
    </aside>
  );
}
