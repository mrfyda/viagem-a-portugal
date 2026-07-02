import featuredData from "../data/featured-journey.json";
import { stripDraftMarkers } from "./format";

/**
 * The site author's journey, generated from blog post front matter by
 * tools/blog-sync. Maps indexName -> linked post.
 */
export interface FeaturedVisit {
  postUrl: string;
  postTitle: string;
  date: string | null;
  /** Blog-relative path to one hero image for this place, if the post set one. */
  image?: string | null;
}

const featured: Record<string, FeaturedVisit> = Object.fromEntries(
  Object.entries(featuredData as Record<string, FeaturedVisit>).map(
    ([place, visit]) => [
      place,
      { ...visit, postTitle: stripDraftMarkers(visit.postTitle) },
    ],
  ),
);

export function featuredVisitFor(place: string): FeaturedVisit | undefined {
  return featured[place];
}
