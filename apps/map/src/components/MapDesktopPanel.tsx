import { useMemo, useState, type ReactNode } from "react";

import { achievements } from "../lib/achievements";
import type { Detour } from "../lib/detours";
import { t } from "../lib/i18n";
import type { JourneyMetrics, Visits } from "../lib/progress";
import AchievementsSection from "./AchievementsSection";
import DetourDetailPanel from "./DetourDetailPanel";
import { ChapterList, ChapterStops } from "./JourneyList";
import MapLegend from "./MapLegend";
import MapRail, { type PanelView } from "./MapRail";
import TownDetailPanel, { type TownDetailPanelProps } from "./TownDetailPanel";
import TownSearch from "./TownSearch";

/* Panel geometry. The camera has to pad by the panel's footprint so Portugal
 * never sits underneath it, so the panel owns these numbers and TravelMap
 * imports them rather than repeating a magic 396 in three places. */
const INSET = 12;
const CARD_WIDTH = 420;
/** Left inset + card — what the map must keep clear on desktop. */
export const DESKTOP_CHROME_WIDTH = INSET + CARD_WIDTH;

const stroke = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

/** Small caps section label — the views name themselves without a heavy title. */
function ViewHeading({ children }: { children: ReactNode }) {
  return (
    <h2 className="m-0 px-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
      {children}
    </h2>
  );
}

/**
 * Back out of a Place or a focused Chapter. A real control rather than the bare
 * text link this replaces — the round trip list → place → back to that same
 * list is the thing the old sidebar handled worst.
 */
function BackRow({ label, onBack }: { label: string; onBack: () => void }) {
  return (
    <button
      onClick={onBack}
      className="-ml-1.5 flex items-center gap-1 self-start rounded-md px-1.5 py-1 text-[13px] font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:bg-secondary focus-visible:outline-none"
    >
      <svg viewBox="0 0 24 24" width={15} height={15} {...stroke}>
        <path d="m14 6-6 6 6 6" />
      </svg>
      <span className="truncate">{label}</span>
    </button>
  );
}

export interface MapDesktopPanelProps {
  /** The auth/progress block, owned by TravelMap (keeps session types out). */
  header: ReactNode;
  /** Whether sign-in exists at all (Supabase configured). */
  hasAccount: boolean;
  visits: Visits | null;
  metrics: JourneyMetrics;
  focusedChapter: number | null;
  onFocusChapter: (chapter: number) => void;
  onClearFocus: () => void;
  onSelectPlace: (indexName: string) => void;
  selectedPlace: string | null;
  detailProps: Omit<TownDetailPanelProps, "place" | "embedded"> | null;
  selectedDetour: Detour | null;
  onCloseDetour: () => void;
}

/**
 * The desktop main panel: one card holding a brand-green {@link MapRail} and,
 * beside it, a permanent search row over exactly one view.
 *
 * Replaces a stack of four always-mounted blocks (wordmark nav, progress/auth,
 * achievements fold-out, search) that left a selected Place with a fifth of the
 * column and a bare text link to get out of it. Now the rail carries navigation
 * at zero vertical cost, search has a reserved row so it can never cover the
 * open view, and a Place gets the whole body.
 *
 * Selection is *inside* the journey view: clicking a dot on the map shows the
 * Place with a back row to the chapter you came from, and the rail keeps
 * pointing at the journey rather than going blank.
 */
export default function MapDesktopPanel({
  header,
  hasAccount,
  visits,
  metrics,
  focusedChapter,
  onFocusChapter,
  onClearFocus,
  onSelectPlace,
  selectedPlace,
  detailProps,
  selectedDetour,
  onCloseDetour,
}: MapDesktopPanelProps) {
  const [view, setView] = useState<PanelView>("journey");

  const selectionActive = selectedPlace != null || selectedDetour != null;
  const clearSelection = () => {
    if (detailProps) detailProps.onClose();
    else onCloseDetour();
  };
  // The map can select a Place while the reader is parked on another view, so a
  // selection always wins — and reads as the journey, since that's where it
  // came from and where backing out returns to.
  const activeView: PanelView = selectionActive ? "journey" : view;
  const selectView = (next: PanelView) => {
    if (selectionActive) clearSelection();
    setView(next);
  };

  const signedOut = hasAccount && visits == null;
  // The rail badge. Anonymous visitors have no log, so nothing is unlocked —
  // the roster itself still shows the whole thing locked, as a preview.
  const unlocked = useMemo(
    () => (visits ? achievements(visits).filter((a) => a.unlocked).length : 0),
    [visits],
  );

  const backToJourneyLabel =
    focusedChapter != null
      ? `${focusedChapter}. ${t("theJourney")}`
      : t("theJourney");

  // The back control is handed to the panel, which draws it inside its header
  // block — that is what keeps the header one height across every view.
  const backRow = <BackRow label={backToJourneyLabel} onBack={clearSelection} />;

  const body = selectionActive ? (
    selectedPlace != null && detailProps ? (
      <TownDetailPanel
        place={selectedPlace}
        embedded
        back={backRow}
        {...detailProps}
      />
    ) : selectedDetour ? (
      <DetourDetailPanel
        detour={selectedDetour}
        embedded
        back={backRow}
        onClose={onCloseDetour}
      />
    ) : null
  ) : view === "achievements" ? (
    <>
      <ViewHeading>{t("achievements")}</ViewHeading>
      <AchievementsSection
        visits={visits}
        metrics={metrics}
        signedOut={signedOut}
      />
    </>
  ) : view === "account" ? (
    <>
      <ViewHeading>{t("account")}</ViewHeading>
      <div className="flex flex-col gap-2 px-1">{header}</div>
    </>
  ) : focusedChapter != null ? (
    <>
      <BackRow label={t("theJourney")} onBack={onClearFocus} />
      <ChapterStops chapter={focusedChapter} onSelectPlace={onSelectPlace} />
    </>
  ) : (
    <>
      <ViewHeading>{t("theJourney")}</ViewHeading>
      <p className="m-0 px-1 text-xs text-muted-foreground">
        {visits != null ? t("clickHint") : t("exploreHint")}
      </p>
      <ChapterList onFocusChapter={onFocusChapter} />
      <MapLegend />
    </>
  );

  return (
    <aside
      style={{ width: CARD_WIDTH, left: INSET, top: INSET, bottom: INSET }}
      // No border on the card itself: it would draw a pale hairline around the
      // green rail. The panel column carries the border instead, so the green
      // runs clean to the card's edge and the shadow does the lifting.
      className="absolute z-10 flex overflow-hidden rounded-lg bg-card/95 text-sm text-foreground shadow-sm"
    >
      <MapRail
        view={activeView}
        onSelectView={selectView}
        hasAccount={hasAccount}
        signedOut={signedOut}
        unlocked={unlocked}
      />

      <div className="flex min-w-0 flex-1 flex-col border-y border-r border-border">
        {/* Reserved row: search can never appear on top of the open view. */}
        <div className="shrink-0 border-b border-border px-2.5 py-2.5">
          <TownSearch onSelect={onSelectPlace} />
        </div>
        <div
          // Remount on every view change so the entrance animation replays —
          // each of chapters ↔ place ↔ detour ↔ view reads as "something opened".
          key={
            selectedPlace ??
            selectedDetour?.name ??
            `${view}-${focusedChapter ?? "root"}`
          }
          // *:shrink-0: a scroll container's children must overflow, never
          // compress — overflow-hidden items (the post photo card) otherwise
          // shrink to fit and eat the very overflow that makes it scroll.
          // --panel-pad-*: mirrors px-3 below, so a full-bleed child (PostHero)
          // can cancel it and reach the panel's edges.
          style={{
            ["--panel-pad-l" as string]: "0.75rem",
            ["--panel-pad-r" as string]: "0.75rem",
          }}
          className="animate-panel-in flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto px-3 py-3 *:shrink-0"
        >
          {body}
        </div>
      </div>
    </aside>
  );
}
