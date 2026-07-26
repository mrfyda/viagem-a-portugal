import { useState } from "react";

import { withSiteBase } from "../lib/assets";
import { t } from "../lib/i18n";

/**
 * The "from the blog" block, and the first thing in a detail panel: the post's
 * hero photo running full-bleed, over an accent band carrying the post title.
 *
 * It leads because it used to be buried. In the old panel the photo sat below a
 * twelve-line wall of mention text, which on a mobile sheet put it at y≈812 of a
 * 932-tall viewport — visible only after scrolling past everything else. Leading
 * with it is the whole point of the block.
 *
 * Two shapes, and the text-only one is not a rare edge case: only 82 of the
 * book's 578 Places have a post at all, so most Places never render this, and a
 * renamed asset must degrade rather than leave a hole. (Detours are the
 * opposite — all 17 carry both a note and an image.)
 *
 * ## Escaping the host's padding
 * A full-bleed child has to cancel its container's horizontal padding, and it
 * can't know what that is: the desktop panel pads by 0.75rem, the mobile sheet
 * by `max(1rem, safe-area)` — which differ left from right in landscape. So the
 * hosts declare their padding in `--panel-pad-l` / `--panel-pad-r` and this
 * reads it back. Unset (any other host) resolves to 0px and the image simply
 * sits inside the padding instead of breaking out.
 */
export default function PostHero({
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
  // A broken hero (asset renamed, or a dev server with no blog — see
  // EXPO_PUBLIC_BLOG_BASE in .env.example) collapses to the band alone rather
  // than an empty 3:2 box.
  const [broken, setBroken] = useState(false);
  const showImage = !!image && !broken;

  const caption = (
    <span className="flex items-baseline gap-1.5 bg-accent px-3 py-2 text-[13px] text-accent-foreground">
      <span className="min-w-0 flex-1">
        {!showImage && <>{t("fromTheBlog")} </>}
        <span className="font-medium underline group-hover:no-underline">
          {postTitle}
        </span>
        {date && <span className="text-muted-foreground"> · {date}</span>}
      </span>
      <span aria-hidden className="shrink-0 self-center text-primary">
        <svg
          viewBox="0 0 24 24"
          width={14}
          height={14}
          fill="none"
          stroke="currentColor"
          strokeWidth={1.8}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M5 12h13M13 6l6 6-6 6" />
        </svg>
      </span>
    </span>
  );

  // Only the image breaks out; the text-only form stays a rounded card inside
  // the padding, since a full-width bar of colour with no photo reads as chrome.
  return showImage ? (
    <a
      href={withSiteBase(postUrl)}
      style={{
        marginLeft: "calc(var(--panel-pad-l, 0px) * -1)",
        marginRight: "calc(var(--panel-pad-r, 0px) * -1)",
      }}
      className="group block no-underline"
    >
      <img
        src={withSiteBase(image!)}
        alt={alt}
        loading="lazy"
        onError={() => setBroken(true)}
        className="block aspect-[3/2] w-full object-cover"
      />
      {caption}
    </a>
  ) : (
    <a
      href={withSiteBase(postUrl)}
      className="group block overflow-hidden rounded-md no-underline"
    >
      {caption}
    </a>
  );
}
