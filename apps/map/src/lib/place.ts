import { aliases, bookPlaceByName, mentionsByPlace, type BookPlace, type PlaceMention } from "./book";
import { featuredVisitFor, type FeaturedVisit } from "./featured";
import { adjacentPlace, stops, type Stop } from "./geo";
import { quoteFor } from "./quotes";

/** Everything the detail view shows for one Place, assembled from the book,
 * journey, quote, featured-post and navigation data behind one call. */
export interface PlaceDetail {
  indexName: string;
  book: BookPlace | undefined;
  /** Display name, falling back to the indexName when the Place is off-index. */
  name: string;
  /** Narrative Mentions of this Place (chapter / section / kind). */
  mentions: PlaceMention[];
  /** The Stops on Saramago's journey that are this Place, in narrative order. */
  journeyStops: Stop[];
  /** Other index entries that cross-reference to this Place. */
  alsoIndexedAs: string[];
  quote: string | undefined;
  featured: FeaturedVisit | undefined;
  /** Adjacent selectable Places in journey order, powering the prev/next stepper. */
  prev: string | null;
  next: string | null;
}

/**
 * Assemble a Place's detail view. Keeps the book/journey/quote/featured lookups
 * and the alias cross-reference out of the component, which becomes a renderer
 * of one value — and the assembly becomes testable without a render.
 */
export function placeDetail(indexName: string): PlaceDetail {
  const book = bookPlaceByName.get(indexName);
  return {
    indexName,
    book,
    name: book?.name ?? indexName,
    mentions: mentionsByPlace[indexName] ?? [],
    journeyStops: stops.filter((s) => s.place === indexName),
    alsoIndexedAs: Object.entries(aliases)
      .filter(([, to]) => to === indexName)
      .map(([from]) => from),
    quote: quoteFor(indexName),
    featured: featuredVisitFor(indexName),
    prev: adjacentPlace(indexName, -1),
    next: adjacentPlace(indexName, 1),
  };
}
