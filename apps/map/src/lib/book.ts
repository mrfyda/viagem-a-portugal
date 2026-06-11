import bookIndex from "../data/book-index.json";
import mentionsData from "../data/mentions.json";
import sectionsData from "../data/sections.json";

export interface BookPlace {
  /** Exact entry as it appears in the book's toponymic index (join key). */
  indexName: string;
  /** Display name, without the disambiguating qualifier. */
  name: string;
  /** Disambiguation from the index, e.g. "freg. de Celorico da Beira". */
  qualifier: string | null;
  /** Every page the place appears on, ascending. */
  pages: number[];
}

export interface Section {
  /** Global narrative position across the whole book, 1-based. */
  ordinal: number;
  title: string;
}

export interface Chapter {
  number: number;
  title: string;
  sections: Section[];
}

export const bookPlaces: BookPlace[] = bookIndex.places;

/** Index cross-references, e.g. "Gaia" -> "Vila Nova de Gaia". */
export const aliases: Record<string, string> = Object.fromEntries(
  bookIndex.aliases.map(({ from, to }) => [from, to]),
);

/** Chapter/Section structure extracted from the Caminho edition (ADR 0002). */
export const chapters: Chapter[] = sectionsData.chapters;

export const bookPlaceByName = new Map<string, BookPlace>(
  bookPlaces.map((place) => [place.indexName, place]),
);

export const FIRST_PAGE = Math.min(...bookPlaces.flatMap((p) => p.pages));
export const LAST_PAGE = Math.max(...bookPlaces.flatMap((p) => p.pages));

export type MentionKind = "stop" | "passed-through" | "referenced-only";

export interface PlaceMention {
  chapter: number;
  section: number;
  kind: MentionKind;
}

/** Per-Place narrative appearances, one entry per (section, kind). */
export const mentionsByPlace: Record<string, PlaceMention[]> = mentionsData as Record<
  string,
  PlaceMention[]
>;

const sectionTitles = new Map(
  chapters.flatMap((c) => c.sections.map((s) => [s.ordinal, s.title] as const)),
);

export function sectionTitle(ordinal: number): string | undefined {
  return sectionTitles.get(ordinal);
}
