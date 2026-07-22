import { useState, type CSSProperties } from "react";

import { withSiteBase } from "../lib/assets";
import { detourBySlug } from "../lib/detours";
import { formatPages } from "../lib/format";
import { t } from "../lib/i18n";
import { CHAPTER_COLORS } from "../lib/mapStyle";
import { placeDetail } from "../lib/place";

/** What the map is hovering — mirrors TravelMap.web's hover state. */
export type HoverTarget =
  | { kind: "place"; id: string }
  | { kind: "detour"; slug: string };

/**
 * Desktop hover preview for a map feature — a compact card anchored to the
 * dot (TravelMap.web computes `style`: position, flip and max-height). A
 * taste of the detail panel — photo, pages, route stops — enough to decide
 * whether to click; clicking anywhere on it opens the full entry. The card
 * is itself hoverable: entering it cancels the map's close grace timer, so
 * the cursor can travel from dot to card.
 */
export default function MapHoverCard({
  target,
  visited = false,
  visitDate = null,
  style,
  onMouseEnter,
  onMouseLeave,
  onClick,
}: {
  target: HoverTarget;
  visited?: boolean;
  visitDate?: string | null;
  style: CSSProperties;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  onClick: () => void;
}) {
  return (
    <div
      role="tooltip"
      style={style}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onClick={onClick}
      className="animate-panel-in pointer-events-auto absolute z-20 cursor-pointer overflow-y-auto overflow-x-hidden rounded-lg border border-border bg-card text-[13px] leading-snug text-foreground shadow-lg"
    >
      {target.kind === "place" ? (
        <PlaceBody id={target.id} visited={visited} visitDate={visitDate} />
      ) : (
        <DetourBody slug={target.slug} />
      )}
    </div>
  );
}

/** Hover-card hero: fixed ratio so the card never reflows when the photo
 * streams in; a broken asset collapses the block (same as PostPhotoLink). */
function Photo({ image, alt }: { image: string; alt: string }) {
  const [broken, setBroken] = useState(false);
  if (broken) return null;
  return (
    <img
      src={withSiteBase(image)}
      alt={alt}
      loading="lazy"
      onError={() => setBroken(true)}
      className="block aspect-[3/2] w-full bg-secondary object-cover"
    />
  );
}

function PlaceBody({
  id,
  visited,
  visitDate,
}: {
  id: string;
  visited: boolean;
  visitDate: string | null;
}) {
  const { book, name, journeyStops, featured } = placeDetail(id);
  return (
    <>
      {featured?.image && <Photo image={featured.image} alt={name} />}
      <div className="flex flex-col gap-1 p-3">
        <div className="flex items-baseline justify-between gap-2">
          <h3 className="m-0 text-base font-bold">{name}</h3>
          {book && (
            <span className="shrink-0 text-xs text-muted-foreground">
              {t("pages", { pages: formatPages(book.pages) })}
            </span>
          )}
        </div>
        {book?.qualifier && (
          <span className="text-xs text-muted-foreground">{book.qualifier}</span>
        )}
        {journeyStops.map((s) => (
          <span key={s.ordinal} className="text-xs text-muted-foreground">
            <span
              className="mr-1.5 inline-block h-2 w-2 rounded-full"
              style={{ background: CHAPTER_COLORS[s.chapter] }}
            />
            {t(s.role === "stop" ? "stopOnRoute" : "passedOnRoute", {
              ordinal: s.ordinal,
              chapter: s.chapter,
            })}
          </span>
        ))}
        {visited && (
          <span className="text-xs font-medium text-primary">
            {visitDate ? t("visitedOn", { date: visitDate }) : t("visited")}
          </span>
        )}
      </div>
    </>
  );
}

function DetourBody({ slug }: { slug: string }) {
  const detour = detourBySlug(slug);
  if (!detour) return null;
  return (
    <>
      {detour.image && <Photo image={detour.image} alt={detour.name} />}
      <div className="flex flex-col gap-1 p-3">
        <h3 className="m-0 text-base font-bold">{detour.name}</h3>
        <span className="text-xs italic text-muted-foreground">
          {t("notInJourney")}
        </span>
        {detour.note && (
          <p className="m-0 line-clamp-3 text-xs text-muted-foreground">
            {detour.note}
          </p>
        )}
      </div>
    </>
  );
}
