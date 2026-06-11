import {
  aliases,
  bookPlaceByName,
  mentionsByPlace,
  sectionTitle,
} from "../lib/book";
import { featuredVisitFor } from "../lib/featured";
import { stops } from "../lib/geo";
import { CHAPTER_COLORS } from "../lib/mapStyle";
import { t } from "../lib/i18n";
import { quoteFor } from "../lib/quotes";

const KIND_LABEL: Record<string, string> = {
  stop: t("kindStop"),
  "passed-through": t("kindPassed"),
  "referenced-only": t("kindReferenced"),
};

export interface TownDetailPanelProps {
  place: string;
  /** Embedded panels (in the desktop sidebar) skip their own positioning. */
  embedded?: boolean;
  visitDate: string | null;
  isVisited: boolean;
  onToggleVisited: () => void;
  onVisitDateChange: (date: string | null) => void;
  onClose: () => void;
}

export default function TownDetailPanel({
  place,
  embedded = false,
  visitDate,
  isVisited,
  onToggleVisited,
  onVisitDateChange,
  onClose,
}: TownDetailPanelProps) {
  const book = bookPlaceByName.get(place);
  const placeMentions = mentionsByPlace[place] ?? [];
  const journeyStops = stops.filter((s) => s.place === place);
  const alsoIndexedAs = Object.entries(aliases)
    .filter(([, to]) => to === place)
    .map(([from]) => from);
  const quote = quoteFor(place);
  const featured = featuredVisitFor(place);

  const floating = embedded
    ? ""
    : "absolute right-3 top-3 max-h-[calc(100%-24px)] w-[300px] overflow-y-auto rounded-lg border border-border bg-card/95 p-4 shadow-sm";

  return (
    <div className={`flex flex-col gap-2 text-sm text-foreground ${floating}`}>
      <div className="flex items-start justify-between">
        <strong className="text-base">{book?.name ?? place}</strong>
        <button
          onClick={onClose}
          aria-label={t("close")}
          className="rounded px-1 text-muted-foreground hover:text-foreground"
        >
          ✕
        </button>
      </div>
      {book?.qualifier && <span className="text-muted-foreground">{book.qualifier}</span>}
      {alsoIndexedAs.length > 0 && (
        <span className="text-xs text-muted-foreground">
          {t("alsoIndexedAs", { names: alsoIndexedAs.join(", ") })}
        </span>
      )}

      {quote && (
        <blockquote className="m-0 rounded-md bg-secondary p-3 italic leading-relaxed">
          «{quote}»<br />
          <span className="text-[11px] not-italic text-muted-foreground">
            — Viagem a Portugal
          </span>
        </blockquote>
      )}

      {book && (
        <span className="text-xs text-muted-foreground">
          {t("pages", { pages: book.pages.join(", ") })}
        </span>
      )}

      {journeyStops.map((s) => (
        <span key={s.ordinal} className="text-[13px]">
          <span
            className="mr-1.5 inline-block h-2.5 w-2.5 rounded-full"
            style={{ background: CHAPTER_COLORS[s.chapter] }}
          />
          {t(s.role === "stop" ? "stopOnRoute" : "passedOnRoute", {
            ordinal: s.ordinal,
            chapter: s.chapter,
          })}
        </span>
      ))}

      {placeMentions.length > 0 && (
        <div className="text-xs text-muted-foreground">
          {placeMentions.map((m, i) => (
            <div key={i}>
              {t("chapterAbbrev", { chapter: m.chapter })}, “{sectionTitle(m.section)}” ({KIND_LABEL[m.kind]})
            </div>
          ))}
        </div>
      )}

      {featured && (
        <div className="rounded-md bg-accent p-2 text-[13px] text-accent-foreground">
          {t("fromTheBlog")}{" "}
          <a className="font-medium underline" href={featured.postUrl}>{featured.postTitle}</a>
          {featured.date && (
            <span className="text-muted-foreground"> · {featured.date}</span>
          )}
        </div>
      )}

      <a
        href={`https://pt.wikipedia.org/wiki/${encodeURIComponent((book?.name ?? place).replaceAll(" ", "_"))}`}
        target="_blank"
        rel="noreferrer"
        className="text-xs text-primary underline"
      >
        {t("wikipedia")}
      </a>

      <div className="flex flex-wrap items-center gap-2 border-t border-border pt-2">
        <button
          onClick={onToggleVisited}
          className={`h-8 rounded-md px-3 text-sm font-medium ${
            isVisited
              ? "border border-input bg-card text-foreground hover:bg-secondary"
              : "bg-primary text-primary-foreground hover:bg-primary/90"
          }`}
        >
          {isVisited ? t("unmarkVisited") : t("markVisited")}
        </button>
        {isVisited && (
          <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
            {t("visitDate")}
            <input
              type="date"
              value={visitDate ?? ""}
              onChange={(e) => onVisitDateChange(e.target.value || null)}
              className="h-8 rounded-md border border-input bg-card px-2 text-sm text-foreground"
            />
          </label>
        )}
      </div>
    </div>
  );
}
