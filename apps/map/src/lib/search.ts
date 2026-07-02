import { bookPlaces, type BookPlace } from "./book";
import { towns } from "./geo";

// Only Places with a dot on the map are offered — selecting anything else
// dead-ends (useSelection validates against the same towns set).
const selectable = new Set(towns.map((t) => t.name));

/** Diacritic-folded lowercase, so "obidos" finds Óbidos. */
const fold = (s: string) =>
  s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();

const catalogue: { place: BookPlace; folded: string }[] = bookPlaces
  .filter((p) => selectable.has(p.indexName))
  .map((place) => ({ place, folded: fold(place.name) }))
  .sort((a, b) => a.place.name.localeCompare(b.place.name, "pt"));

/**
 * Places whose name contains the query — case- and diacritic-insensitive,
 * prefix matches ranked first, then Portuguese-collated; the full selectable
 * catalogue (collated) when the query is empty. The one home for place
 * search, so ranking and matching rules land here rather than inside a
 * component.
 */
export function searchPlaces(query: string): BookPlace[] {
  const q = fold(query.trim());
  if (!q) return catalogue.map((c) => c.place);
  return catalogue
    .filter((c) => c.folded.includes(q))
    .sort((a, b) => {
      const prefix =
        Number(!a.folded.startsWith(q)) - Number(!b.folded.startsWith(q));
      return prefix || a.place.name.localeCompare(b.place.name, "pt");
    })
    .map((c) => c.place);
}
