import { chapters } from "./book";
import { stops, towns } from "./geo";
import type { MessageKey } from "./i18n";
import { journeyMetrics } from "./progress";

/**
 * A milestone over the Traveler's visit log: fixed tallies (first town, N
 * towns, N pages), one per chapter Route (every Stop of the chapter visited),
 * and the whole journey. Derived on demand from the visited set — nothing is
 * stored, so the list can never drift from the log it summarizes.
 */
export interface Achievement {
  id: string;
  /** Emoji badge. Chapter achievements also carry `chapter`, so the UI can
   * show the Route's colour instead. */
  icon: string;
  chapter?: number;
  titleKey: MessageKey;
  descriptionKey: MessageKey;
  /** Interpolation vars shared by the title and the description. */
  vars: Record<string, string | number>;
  /** Progress toward `target`, clamped so 12/10 never renders. */
  current: number;
  target: number;
  unlocked: boolean;
}

// Only Stops whose Place has a marker count toward completion — a Place with
// no coordinates can never be marked visited, and an achievement that cannot
// be earned is a bug, not a challenge.
const mappable = new Set(towns.map((town) => town.name));
const stopPlacesByChapter = new Map<number, Set<string>>();
for (const stop of stops) {
  if (stop.role !== "stop" || !mappable.has(stop.place)) continue;
  const set = stopPlacesByChapter.get(stop.chapter) ?? new Set();
  set.add(stop.place);
  stopPlacesByChapter.set(stop.chapter, set);
}

/** The Places a chapter's Route achievement requires. Exposed for tests. */
export function chapterStopPlaces(chapter: number): ReadonlySet<string> {
  return stopPlacesByChapter.get(chapter) ?? new Set();
}

const allStopPlaces = new Set(
  [...stopPlacesByChapter.values()].flatMap((set) => [...set]),
);

function tally(
  id: string,
  icon: string,
  titleKey: MessageKey,
  descriptionKey: MessageKey,
  current: number,
  target: number,
): Achievement {
  return {
    id,
    icon,
    titleKey,
    descriptionKey,
    vars: { target },
    current: Math.min(current, target),
    target,
    unlocked: current >= target,
  };
}

function completion(places: ReadonlySet<string>, visited: ReadonlySet<string>) {
  const current = [...places].filter((place) => visited.has(place)).length;
  return { current, target: places.size, unlocked: places.size > 0 && current === places.size };
}

export function achievements(visited: ReadonlySet<string>): Achievement[] {
  const metrics = journeyMetrics(visited, towns);
  return [
    tally("first-stop", "👣", "achFirstStopTitle", "achFirstStopDesc", metrics.townsVisited, 1),
    tally("towns-10", "🎒", "achTowns10Title", "achTownsDesc", metrics.townsVisited, 10),
    tally("towns-50", "🥾", "achTowns50Title", "achTownsDesc", metrics.townsVisited, 50),
    tally("pages-100", "📖", "achPages100Title", "achPagesDesc", metrics.pagesVisited, 100),
    tally(
      "half-book",
      "📚",
      "achHalfBookTitle",
      "achHalfBookDesc",
      metrics.pagesVisited,
      Math.ceil(metrics.pagesTotal / 2),
    ),
    ...chapters.map(
      (chapter): Achievement => ({
        id: `chapter-${chapter.number}`,
        icon: "🧭",
        chapter: chapter.number,
        titleKey: "achChapterTitle",
        descriptionKey: "achChapterDesc",
        vars: { chapter: chapter.number, title: chapter.title },
        ...completion(chapterStopPlaces(chapter.number), visited),
      }),
    ),
    {
      id: "full-journey",
      icon: "🏁",
      titleKey: "achFullJourneyTitle",
      descriptionKey: "achFullJourneyDesc",
      vars: {},
      ...completion(allStopPlaces, visited),
    },
  ];
}
