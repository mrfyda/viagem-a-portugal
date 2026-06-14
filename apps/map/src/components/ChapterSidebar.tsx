import { chapters } from "../lib/book";
import { stops } from "../lib/geo";
import { t } from "../lib/i18n";
import { CHAPTER_COLORS } from "../lib/mapStyle";
import TownDetailPanel, { type TownDetailPanelProps } from "./TownDetailPanel";
import TownSearch from "./TownSearch";

export interface ChapterSidebarProps {
  selectedPlace: string | null;
  detailProps: Omit<TownDetailPanelProps, "place" | "embedded"> | null;
  onFocusChapter: (chapter: number) => void;
  onSelectPlace: (indexName: string) => void;
}

const stopCounts = new Map<number, number>();
for (const s of stops) {
  if (s.role === "stop") {
    stopCounts.set(s.chapter, (stopCounts.get(s.chapter) ?? 0) + 1);
  }
}

export default function ChapterSidebar({
  selectedPlace,
  detailProps,
  onFocusChapter,
  onSelectPlace,
}: ChapterSidebarProps) {
  return (
    <aside className="absolute bottom-3 right-3 top-3 flex w-[300px] flex-col gap-2 overflow-y-auto rounded-lg border border-border bg-card/95 p-4 text-sm text-foreground shadow-sm">
      <TownSearch onSelect={onSelectPlace} />
      {selectedPlace != null && detailProps ? (
        <>
          <button
            onClick={detailProps.onClose}
            className="self-start text-[13px] text-muted-foreground hover:text-foreground"
          >
            {t("backToChapters")}
          </button>
          <TownDetailPanel place={selectedPlace} embedded {...detailProps} />
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
      )}
    </aside>
  );
}
