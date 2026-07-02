import { useState } from "react";

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
  // A broken hero (asset renamed, dev server without the blog) collapses to
  // the text link instead of a giant empty 4:3 box.
  const [broken, setBroken] = useState(false);
  return (
    <div className="overflow-hidden rounded-md bg-accent text-[13px] text-accent-foreground">
      {image && !broken && (
        <img
          src={withSiteBase(image)}
          alt={alt}
          loading="lazy"
          onError={() => setBroken(true)}
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
