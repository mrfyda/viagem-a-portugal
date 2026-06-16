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

/** The journey: one row per Chapter, tap to fit the map to that Chapter's Stops. */
function ChapterList({ onFocusChapter }: { onFocusChapter: (chapter: number) => void }) {
  return (
    <>
      <h2 className="text-base font-bold">{t("theJourney")}</h2>
      {chapters.map((c) => (
        <button
          key={c.number}
          onClick={() => onFocusChapter(c.number)}
          className="flex items-center gap-2.5 rounded-md p-2 text-left transition-colors hover:bg-secondary focus-visible:bg-secondary focus-visible:outline-none"
        >
          <span
            className="mt-0.5 h-3 w-3 shrink-0 rounded-full"
            style={{ background: CHAPTER_COLORS[c.number] }}
          />
          <span className="flex-1">
            <span className="block text-[13px] font-semibold leading-snug">
              {c.number}. {c.title}
            </span>
            <span className="block text-xs text-muted-foreground">
              {t("stopsCount", { count: stopCounts.get(c.number) ?? 0 })}
            </span>
          </span>
        </button>
      ))}
    </>
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
  // Mobile: a narrow top-left card carries only the brand, progress and search
  // so the map and its top-right controls stay visible; the journey rides in a
  // bottom sheet. A selected Place/Detour renders its own bottom sheet (via
  // TravelMap), so the journey sheet steps aside to avoid stacking two sheets.
  if (!isDesktop) {
    const showJourney = selectedPlace == null && selectedDetour == null;
    return (
      <>
        <aside className="absolute left-3 top-3 flex w-60 max-w-[70%] flex-col gap-1.5 rounded-lg border border-border bg-card/95 p-3 text-sm text-foreground shadow-sm max-[359px]:w-52">
          <MapNav />
          {header}
          <TownSearch onSelect={onSelectPlace} />
        </aside>
        {showJourney && (
          <aside className="absolute inset-x-3 bottom-3 flex max-h-[45vh] flex-col gap-1.5 overflow-y-auto rounded-lg border border-border bg-card/95 p-4 text-sm text-foreground shadow-sm">
            <ChapterList onFocusChapter={onFocusChapter} />
          </aside>
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
