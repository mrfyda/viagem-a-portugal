import { bookPlaceByName, chapters } from "./book";
import { stops, type Stop } from "./geo";
import type { Visits } from "./progress";

/**
 * The journey as the panel reads it: six Chapters, each a run of Sections, each
 * Section the Places the traveler met there in narrative order.
 *
 * stops.json is a flat list of Stops keyed by global ordinal, which is the right
 * shape for the map and the wrong one for a list — a Place can be hit by several
 * Stops (arriving, passing back through) and a chapter of 89 Stops is unreadable
 * as one column. Grouping by Section is what turns chapter 1 into fourteen
 * legible runs, so the grouping belongs here rather than in the component.
 */

export interface JourneySection {
  /** Global narrative position of the Section across the book. */
  ordinal: number;
  title: string;
  /** Stops and drive-throughs together, narrative order, one entry per Place. */
  places: Stop[];
  /** How many of `places` the traveler actually stopped at. */
  stopCount: number;
}

export interface JourneyChapter {
  number: number;
  title: string;
  /** Sections holding at least one Place. */
  sections: JourneySection[];
  /** Every Place the traveler stopped at in this chapter, deduped. */
  stops: Stop[];
  /** Display name of the chapter's first Stop. */
  from: string;
  /** Display name of its last. */
  to: string;
}

export const placeName = (indexName: string): string =>
  bookPlaceByName.get(indexName)?.name ?? indexName;

/** First page the book mentions the Place on — the list's right-hand rail. */
export const firstPage = (indexName: string): number | null =>
  bookPlaceByName.get(indexName)?.pages[0] ?? null;

/**
 * One entry per Place, narrative order preserved. A Place hit twice in the same
 * run keeps its earliest hit, and a real Stop outranks a drive-through: the same
 * Place can be both inside one Section, and "the traveler stopped here" is the
 * truer of the two claims.
 */
function byPlace(list: readonly Stop[]): Stop[] {
  const best = new Map<string, Stop>();
  for (const stop of list) {
    const seen = best.get(stop.place);
    if (!seen) best.set(stop.place, stop);
    else if (seen.role !== "stop" && stop.role === "stop") {
      best.set(stop.place, { ...seen, role: "stop" });
    }
  }
  return [...best.values()];
}

export const journeyChapters: JourneyChapter[] = chapters.map((chapter) => {
  const own = stops.filter((s) => s.chapter === chapter.number);
  const chapterStops = byPlace(own).filter((s) => s.role === "stop");
  const sections: JourneySection[] = chapter.sections
    .map((section) => {
      const places = byPlace(own.filter((s) => s.section === section.ordinal));
      return {
        ordinal: section.ordinal,
        title: section.title,
        places,
        stopCount: places.filter((s) => s.role === "stop").length,
      };
    })
    .filter((section) => section.places.length > 0);

  return {
    number: chapter.number,
    title: chapter.title,
    sections,
    stops: chapterStops,
    from: placeName(chapterStops[0]?.place ?? ""),
    to: placeName(chapterStops[chapterStops.length - 1]?.place ?? ""),
  };
});

/** How many of a chapter's Stops the Traveler has visited. */
export function visitedInChapter(
  chapter: JourneyChapter,
  visits: Visits | null,
): number {
  if (!visits) return 0;
  return chapter.stops.filter((s) => visits.has(s.place)).length;
}
