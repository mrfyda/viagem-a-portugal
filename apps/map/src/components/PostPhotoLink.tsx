import { withSiteBase } from "../lib/assets";
import { t } from "../lib/i18n";

/**
 * The "from the blog" block — an optional hero image above a link to the post.
 * Shared by TownDetailPanel (featured Places) and DetourDetailPanel.
 */
export default function PostPhotoLink({
  image,
  postUrl,
  postTitle,
  date,
  alt,
}: {
  image?: string | null;
  postUrl: string;
  postTitle: string;
  date?: string | null;
  alt: string;
}) {
  return (
    <div className="overflow-hidden rounded-md bg-accent text-[13px] text-accent-foreground">
      {image && (
        <img
          src={withSiteBase(image)}
          alt={alt}
          loading="lazy"
          className="block aspect-[4/3] w-full object-cover"
        />
      )}
      <div className="p-2">
        {t("fromTheBlog")}{" "}
        <a className="font-medium underline" href={withSiteBase(postUrl)}>
          {postTitle}
        </a>
        {date && <span className="text-muted-foreground"> · {date}</span>}
      </div>
    </div>
  );
}
