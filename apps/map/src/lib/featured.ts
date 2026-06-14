import featuredData from "../data/featured-journey.json";

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

const featured: Record<string, FeaturedVisit> = featuredData;

export function featuredVisitFor(place: string): FeaturedVisit | undefined {
  return featured[place];
}
