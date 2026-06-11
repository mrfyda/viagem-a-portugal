import { chapters } from "../lib/book";
import { stops } from "../lib/geo";
import { t } from "../lib/i18n";
import { CHAPTER_COLORS } from "../lib/mapStyle";
import TownDetailPanel, { type TownDetailPanelProps } from "./TownDetailPanel";
import TownSearch from "./TownSearch";

export interface ChapterSidebarProps {
  selectedPlace: string | null;
  detailProps: Omit<TownDetailPanelProps, "place" | "embedded"> | null;
  hiddenChapters: ReadonlySet<number>;
  onToggleChapter: (chapter: number) => void;
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
  hiddenChapters,
  onToggleChapter,
  onFocusChapter,
  onSelectPlace,
}: ChapterSidebarProps) {
  return (
    <div className="absolute bottom-3 right-3 top-3 flex w-[300px] flex-col gap-2 overflow-y-auto rounded-lg border border-border bg-card/95 p-4 text-sm text-foreground shadow-sm">
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
          <strong className="text-base">{t("theJourney")}</strong>
          {chapters.map((c) => {
            const hidden = hiddenChapters.has(c.number);
            return (
              <div
                key={c.number}
                className={`flex items-center gap-2 rounded-md p-1.5 hover:bg-secondary ${hidden ? "opacity-50" : ""}`}
              >
                <span
                  className="h-3 w-3 shrink-0 rounded-full"
                  style={{ background: CHAPTER_COLORS[c.number] }}
                />
                <button
                  onClick={() => onFocusChapter(c.number)}
                  className="flex-1 text-left"
                >
                  <div className="text-[13px] font-semibold">
                    {c.number}. {c.title}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {t("stopsCount", { count: stopCounts.get(c.number) ?? 0 })}
                  </div>
                </button>
                <button
                  onClick={() => onToggleChapter(c.number)}
                  aria-pressed={!hidden}
                  aria-label={hidden ? t("showRoute") : t("hideRoute")}
                  title={hidden ? t("showRoute") : t("hideRoute")}
                  className="px-1 text-sm"
                  style={{ color: CHAPTER_COLORS[c.number] }}
                >
                  {hidden ? "◌" : "●"}
                </button>
              </div>
            );
          })}
        </>
      )}
    </div>
  );
}
