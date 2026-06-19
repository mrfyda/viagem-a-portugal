import { bookPlaces, type BookPlace } from "./book";

/**
 * Places whose name contains the query (case-insensitive), in Portuguese-
 * collated order; the full catalogue (collated) when the query is empty. The
 * one home for place search, so diacritic-folding or fuzzy matching land here
 * rather than inside a component.
 */
export function searchPlaces(query: string): BookPlace[] {
  const q = query.trim().toLowerCase();
  const matched = q ? bookPlaces.filter((p) => p.name.toLowerCase().includes(q)) : bookPlaces;
  return [...matched].sort((a, b) => a.name.localeCompare(b.name, "pt"));
}
