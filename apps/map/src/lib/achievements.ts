import { bookPlaces, chapters } from "./book";
import { stops, towns } from "./geo";
import type { MessageKey } from "./i18n";
import { journeyMetrics, type Visits } from "./progress";

/**
 * A milestone over the Traveler's visit log: fixed tallies (first town, N
 * towns, N pages), quirky moments lifted from the book itself (the best meal,
 * the traveler's birthplace, the country's four corners…), one per chapter
 * Route (every Stop of the chapter visited), and the whole journey. Derived
 * on demand from the visit log — nothing is stored, so the list can never
 * drift from the log it summarizes.
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

/** The journey's compass extremes — northern-, southern-, eastern- and
 * westernmost marker. A Set because one Place could hold two records. */
export const fourCorners: ReadonlySet<string> = new Set(
  (
    [
      (t: (typeof towns)[number]) => t.latitude,
      (t: (typeof towns)[number]) => -t.latitude,
      (t: (typeof towns)[number]) => t.longitude,
      (t: (typeof towns)[number]) => -t.longitude,
    ] as const
  ).map((axis) => towns.reduce((a, b) => (axis(b) > axis(a) ? b : a)).name),
);

// Places the book grants a single page — the journey's footnotes.
const onePagePlaces = new Set(
  bookPlaces
    .filter((p) => p.pages.length === 1 && mappable.has(p.indexName))
    .map((p) => p.indexName),
);

const SAME_DAY_TARGET = 5;

/** The most Visits sharing one user-entered date (undated Visits count for
 * nothing — the date is the achievement). */
function busiestDay(visits: Visits): number {
  const perDay = new Map<string, number>();
  let best = 0;
  for (const date of visits.values()) {
    if (!date) continue;
    const n = (perDay.get(date) ?? 0) + 1;
    perDay.set(date, n);
    if (n > best) best = n;
  }
  return best;
}

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

// A single storied Place from the book (the best meal, the birthplace…).
// Yields null if the Place lost its marker — an achievement that cannot be
// earned must vanish, not taunt.
function storied(
  id: string,
  icon: string,
  titleKey: MessageKey,
  descriptionKey: MessageKey,
  place: string,
  visited: ReadonlySet<string>,
): Achievement | null {
  if (!mappable.has(place)) return null;
  const done = visited.has(place);
  return {
    id,
    icon,
    titleKey,
    descriptionKey,
    vars: {},
    current: done ? 1 : 0,
    target: 1,
    unlocked: done,
  };
}

export function achievements(visits: Visits): Achievement[] {
  const visited = new Set(visits.keys());
  const metrics = journeyMetrics(visited, towns);
  const quirky = [
    storied("best-meal", "🍽️", "achBestMealTitle", "achBestMealDesc", "Barcelos", visited),
    storied("birthplace", "🐣", "achBirthplaceTitle", "achBirthplaceDesc", "Azinhaga", visited),
    storied("highest-village", "⛰️", "achHighestTitle", "achHighestDesc", "Sabugueiro", visited),
    storied("nests", "🐦", "achNestsTitle", "achNestsDesc", "Borba", visited),
    storied("rio-de-onor", "🤝", "achRioDeOnorTitle", "achRioDeOnorDesc", "Rio de Onor", visited),
    {
      id: "four-corners",
      icon: "🧭",
      titleKey: "achFourCornersTitle" as const,
      descriptionKey: "achFourCornersDesc" as const,
      vars: {},
      ...completion(fourCorners, visited),
    },
    tally(
      "footnote",
      "🔎",
      "achFootnoteTitle",
      "achFootnoteDesc",
      [...onePagePlaces].filter((place) => visited.has(place)).length,
      1,
    ),
    tally(
      "same-day",
      "📅",
      "achSameDayTitle",
      "achSameDayDesc",
      busiestDay(visits),
      SAME_DAY_TARGET,
    ),
  ].filter((a): a is Achievement => a != null);
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
    ...quirky,
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
