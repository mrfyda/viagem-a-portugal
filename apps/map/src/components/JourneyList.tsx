import { bookPlaceByName, chapters } from "../lib/book";
import { stops } from "../lib/geo";
import { t } from "../lib/i18n";
import { CHAPTER_COLORS } from "../lib/mapStyle";

const stopCounts = new Map<number, number>();
for (const s of stops) {
  if (s.role === "stop") {
    stopCounts.set(s.chapter, (stopCounts.get(s.chapter) ?? 0) + 1);
  }
}

/**
 * The journey's spine, shared by the desktop panel and the mobile journey
 * sheet: one row per Chapter, then one Chapter's Stops in narrative order.
 *
 * Neither piece renders a title or a back control — each host owns its own
 * chrome (the mobile sheet has a header; the desktop panel has a section
 * heading and a back row), so these stay pure content.
 */
export function ChapterList({
  onFocusChapter,
  compact = false,
}: {
  onFocusChapter: (chapter: number) => void;
  /** Mobile bottom sheet: one line per row, so six chapters cover less map. */
  compact?: boolean;
}) {
  return (
    <>
      {chapters.map((c) => (
        <button
          key={c.number}
          onClick={() => onFocusChapter(c.number)}
          className={`group flex items-center gap-2.5 rounded-md text-left transition-colors hover:bg-secondary focus-visible:bg-secondary focus-visible:outline-none ${
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
            <>
              <span className="min-w-0 flex-1">
                <span className="block text-[13px] font-semibold leading-snug">
                  {c.number}. {c.title}
                </span>
                <span className="block text-xs text-muted-foreground">
                  {t("stopsCount", { count: stopCounts.get(c.number) ?? 0 })}
                </span>
              </span>
              {/* Quiet "this opens" hint, on hover only — the rows are already
                  dense enough without a permanent chevron per chapter. */}
              <span
                aria-hidden
                className="shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100"
              >
                <svg
                  viewBox="0 0 24 24"
                  width={14}
                  height={14}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.7}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="m10 6 6 6-6 6" />
                </svg>
              </span>
            </>
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
export function ChapterStops({
  chapter,
  onSelectPlace,
}: {
  chapter: number;
  onSelectPlace: (indexName: string) => void;
}) {
  const meta = chapters.find((c) => c.number === chapter);
  const chapterStops = stops.filter(
    (s) => s.chapter === chapter && s.role === "stop",
  );
  return (
    <>
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
