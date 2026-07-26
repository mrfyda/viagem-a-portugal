import { useState, type ReactNode } from "react";

import { useSheetDrag } from "../hooks/useSheetDrag";
import type { Detour } from "../lib/detours";
import { t } from "../lib/i18n";
import type { JourneyMetrics, Visits } from "../lib/progress";
import AchievementsSection from "./AchievementsSection";
import JourneyList from "./JourneyList";
import MapDesktopPanel from "./MapDesktopPanel";
import MapTopBar from "./MapTopBar";
import MobileTabBar, { type MobileTab } from "./MobileTabBar";
import { SheetCloseButton } from "./PanelShell";
import type { TownDetailPanelProps } from "./TownDetailPanel";

export interface MapSidebarProps {
  isDesktop: boolean;
  /** The auth/progress block, owned by TravelMap (keeps session types out of here). */
  header: ReactNode;
  /** Whether sign-in exists at all (Supabase configured) — gates the mobile
   * account tab and the desktop rail's account item; the header alone can't
   * tell, it always carries the hint. */
  hasAccount: boolean;
  /** The signed-in Traveler's visit log, or null when signed out. Drives the
   * achievements: a trophy tab + sheet on mobile, a rail view on desktop. */
  visits: Visits | null;
  /** Towns/pages travelled — the desktop achievements view's progress bars. */
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
          <div
            aria-hidden
            className="mx-auto mb-1.5 h-1 w-9 rounded-full bg-border"
          />
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
  metrics,
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
              <MobileSheet
                title={t("theJourney")}
                onClose={() => setMobileView("map")}
              >
                <JourneyList
                  compact
                  focusedChapter={focusedChapter}
                  onFocusChapter={onFocusChapter}
                  onClearFocus={onClearFocus}
                  onSelectPlace={onSelectPlace}
                  visits={visits}
                />
              </MobileSheet>
            ) : mobileView === "achievements" ? (
              <MobileSheet
                title={t("achievements")}
                onClose={() => setMobileView("map")}
              >
                <AchievementsSection
                  visits={visits}
                  metrics={metrics}
                  signedOut={hasAccount && visits == null}
                />
              </MobileSheet>
            ) : mobileView === "profile" && hasAccount ? (
              <MobileSheet
                title={t("account")}
                onClose={() => setMobileView("map")}
              >
                <div className="flex flex-col gap-2 px-2 py-1">{header}</div>
              </MobileSheet>
            ) : null}
            <MobileTabBar
              active={mobileView}
              searchOpen={searchOpen}
              hasProfile={hasAccount}
              onSelect={(tab) => {
                setSearchOpen(false);
                setMobileView((cur) =>
                  cur === tab && tab !== "map" ? "map" : tab,
                );
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

  // Desktop: a brand-green rail plus a permanent search row over exactly one
  // view — see MapDesktopPanel for why that replaced the old stack of four
  // always-mounted header blocks.
  return (
    <MapDesktopPanel
      header={header}
      hasAccount={hasAccount}
      visits={visits}
      metrics={metrics}
      focusedChapter={focusedChapter}
      onFocusChapter={onFocusChapter}
      onClearFocus={onClearFocus}
      onSelectPlace={onSelectPlace}
      selectedPlace={selectedPlace}
      detailProps={detailProps}
      selectedDetour={selectedDetour}
      onCloseDetour={onCloseDetour}
    />
  );
}
