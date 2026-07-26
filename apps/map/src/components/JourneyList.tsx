import { t } from "../lib/i18n";
import {
  firstPage,
  journeyChapters,
  placeName,
  visitedInChapter,
} from "../lib/journey";
import { CHAPTER_COLORS, VISITED_COLOR } from "../lib/mapStyle";
import type { Visits } from "../lib/progress";
import MapLegend from "./MapLegend";
import { PANEL_HEADER_HEIGHT } from "./PanelShell";

export interface JourneyListProps {
  /** The chapter currently expanded here and dimmed-around on the map. */
  focusedChapter: number | null;
  onFocusChapter: (chapter: number) => void;
  onClearFocus: () => void;
  onSelectPlace: (indexName: string) => void;
  /** The Traveler's visit log, or null when signed out. */
  visits: Visits | null;
  /** Mobile bottom sheet: no reserved header, rows lose their second line. */
  compact?: boolean;
}

const Check = () => (
  <svg
    viewBox="0 0 24 24"
    width={12}
    height={12}
    fill="none"
    stroke="currentColor"
    strokeWidth={3}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden
  >
    <path d="m4 12.5 5.5 5.5L20 6.5" />
  </svg>
);

const Chevron = ({ open }: { open: boolean }) => (
  <svg
    viewBox="0 0 24 24"
    width={16}
    height={16}
    fill="none"
    stroke="currentColor"
    strokeWidth={1.9}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden
    className="mt-1 shrink-0 text-muted-foreground transition-transform duration-150"
    style={{ transform: open ? "rotate(90deg)" : undefined }}
  >
    <path d="m10 6 6 6-6 6" />
  </svg>
);

/**
 * The journey's spine: six Chapters as nodes on a line, the one in focus opening
 * its Places in place.
 *
 * Two things drive the shape. A chapter used to *replace* the list with a flat
 * column of up to 89 rows, so the round trip list → place → back lost the
 * reader's position every time; expanding in place removes the trip, and
 * grouping by Section (lib/journey.ts) turns that column into fourteen legible
 * runs. And a reader has to be able to get back out: every chapter row states
 * its own expand/collapse with a chevron, and the permanent "whole journey" row
 * above them is the way back to all six routes — clearing the focus also flies
 * the camera home (TravelMap), so the list and the territory agree about what
 * "everything" means.
 *
 * Drive-throughs are listed beside Stops rather than hidden, drawn with the
 * hollow node the map now uses too, and named in the key below.
 */
export default function JourneyList({
  focusedChapter,
  onFocusChapter,
  onClearFocus,
  onSelectPlace,
  visits,
  compact = false,
}: JourneyListProps) {
  return (
    <div className="flex flex-col">
      <button
        onClick={onClearFocus}
        aria-current={focusedChapter == null ? "true" : undefined}
        // Desktop reserves the same header height as a Place/Detour panel, so
        // the body below starts at the same y in every view.
        style={compact ? undefined : { height: PANEL_HEADER_HEIGHT }}
        className={`flex shrink-0 items-center gap-2.5 rounded-md px-2 py-2 text-left transition-colors ${
          focusedChapter == null ? "bg-secondary" : "hover:bg-secondary/70"
        }`}
      >
        <span aria-hidden className="flex w-3 shrink-0 justify-center">
          <span
            className="h-2.5 w-2.5 rounded-full"
            style={{
              background: `linear-gradient(135deg, ${CHAPTER_COLORS[1]}, ${CHAPTER_COLORS[5]})`,
            }}
          />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[14px] font-semibold leading-snug">
            {t("wholeJourney")}
          </span>
          {!compact && (
            <span className="block text-[12px] text-muted-foreground">
              {t("wholeJourneyHint")}
            </span>
          )}
        </span>
        {focusedChapter != null && (
          <span
            aria-hidden
            className="shrink-0 text-[12px] font-medium text-muted-foreground"
          >
            ↺
          </span>
        )}
      </button>

      {/* mt-2 mirrors the detail panel's gap under its header, so the first row
          of either view lands on the same baseline. */}
      <div className="mt-2 flex flex-col">
        {journeyChapters.map((chapter) => {
          const open = focusedChapter === chapter.number;
          const color = CHAPTER_COLORS[chapter.number];
          const visited = visitedInChapter(chapter, visits);
          return (
            <div key={chapter.number} className="relative pl-7">
              {/* The spine: one rule behind the nodes, chapter-coloured while
                  open so the expanded run reads as a single leg. */}
              <span
                aria-hidden
                className="absolute bottom-0 left-[9px] top-0 w-[2px]"
                style={{
                  background: open ? `${color}80` : "var(--color-border)",
                }}
              />
              <button
                onClick={() =>
                  open ? onClearFocus() : onFocusChapter(chapter.number)
                }
                aria-expanded={open}
                className="-ml-7 flex w-full items-start gap-2.5 rounded-md py-2 pl-7 pr-1.5 text-left transition-colors hover:bg-secondary"
              >
                {/* Pinned to the title's line, not the row's middle: the row is
                    two lines tall and a centred node reads as belonging to the
                    meta text instead of the chapter. */}
                <span
                  aria-hidden
                  className="absolute left-[4px] top-[0.95rem] h-3 w-3 rounded-full ring-2 ring-card"
                  style={{ background: color }}
                />
                <span className="min-w-0 flex-1">
                  <span className="flex items-baseline gap-1.5">
                    <span
                      className="text-[15px] font-bold tabular-nums"
                      style={{ color }}
                    >
                      {chapter.number}
                    </span>
                    <span className="min-w-0 flex-1 text-[15px] font-semibold leading-snug">
                      {chapter.title}
                    </span>
                  </span>
                  <span className="mt-0.5 block text-[12px] text-muted-foreground">
                    {!compact && `${chapter.from} → ${chapter.to}`}
                    {visited > 0 &&
                      `${compact ? "" : " · "}${t("visitedCount", { count: visited })}`}
                  </span>
                </span>
                <Chevron open={open} />
              </button>

              {open && (
                <div className="pb-2">
                  {chapter.sections.map((section) => (
                    <div key={section.ordinal} className="mt-2">
                      <div className="flex items-center gap-2 py-0.5">
                        <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
                          {section.title}
                        </span>
                        <span className="h-px flex-1 bg-border" />
                      </div>
                      {section.places.map((place) => {
                        const isVisited = visits?.has(place.place) ?? false;
                        const isStop = place.role === "stop";
                        const page = firstPage(place.place);
                        return (
                          <button
                            key={place.place}
                            onClick={() => onSelectPlace(place.place)}
                            className="-ml-7 flex w-full items-baseline gap-2 rounded-md py-1 pl-7 pr-1.5 text-left transition-colors hover:bg-secondary"
                          >
                            {/* Solid = the traveler stopped, hollow = he drove
                                through. Same pair as the map's dots. */}
                            <span
                              aria-hidden
                              className="absolute left-[6px] h-[7px] w-[7px] self-center rounded-full ring-2 ring-card"
                              style={
                                isVisited
                                  ? { background: VISITED_COLOR }
                                  : isStop
                                    ? { background: "var(--color-input)" }
                                    : {
                                        background: "var(--color-card)",
                                        boxShadow:
                                          "inset 0 0 0 1.5px var(--color-input)",
                                      }
                              }
                            />
                            <span
                              className={`min-w-0 flex-1 truncate text-[14px] ${
                                isStop ? "" : "text-muted-foreground"
                              }`}
                            >
                              {placeName(place.place)}
                            </span>
                            {isVisited && (
                              <span
                                className="shrink-0 self-center"
                                style={{ color: VISITED_COLOR }}
                              >
                                <Check />
                              </span>
                            )}
                            {page != null && (
                              <span className="w-9 shrink-0 text-right text-[11px] tabular-nums text-muted-foreground/70">
                                {t("pageShort", { page })}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <MapLegend />
    </div>
  );
}
