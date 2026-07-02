import { sectionTitle } from "../lib/book";
import { formatPages } from "../lib/format";
import { CHAPTER_COLORS } from "../lib/mapStyle";
import { t } from "../lib/i18n";
import { placeDetail } from "../lib/place";
import PanelShell from "./PanelShell";
import PostPhotoLink from "./PostPhotoLink";

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
  /** Actions require a signed-in Traveler; when false the visited button
   * stays visible as the discovery point but opens sign-in instead. */
  canAct: boolean;
  /** Null when sign-in is unavailable (unconfigured build) — the action row
   * is hidden entirely then. */
  onRequestSignIn: (() => void) | null;
  onToggleVisited: () => void;
  onVisitDateChange: (date: string | null) => void;
  onClose: () => void;
  /** Step to another Place — wires the panel's prev/next stepper. */
  onNavigate: (indexName: string) => void;
}

export default function TownDetailPanel({
  place,
  embedded = false,
  visitDate,
  isVisited,
  canAct,
  onRequestSignIn,
  onToggleVisited,
  onVisitDateChange,
  onClose,
  onNavigate,
}: TownDetailPanelProps) {
  const { book, name, mentions, journeyStops, alsoIndexedAs, quote, featured, prev, next } =
    placeDetail(place);

  return (
    <PanelShell
      title={name}
      embedded={embedded}
      onClose={onClose}
      onPrev={prev ? () => onNavigate(prev) : null}
      onNext={next ? () => onNavigate(next) : null}
    >
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
          {t("pages", { pages: formatPages(book.pages) })}
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

      {mentions.length > 0 && (
        <div className="text-xs text-muted-foreground">
          {mentions.map((m, i) => (
            <div key={i}>
              {t("chapterAbbrev", { chapter: m.chapter })}, “{sectionTitle(m.section)}” ({KIND_LABEL[m.kind]})
            </div>
          ))}
        </div>
      )}

      {featured && (
        <PostPhotoLink
          image={featured.image}
          postUrl={featured.postUrl}
          postTitle={featured.postTitle}
          date={featured.date}
          alt={name}
        />
      )}

      <a
        href={`https://pt.wikipedia.org/wiki/${encodeURIComponent(name.replaceAll(" ", "_"))}`}
        target="_blank"
        rel="noreferrer"
        className="text-xs text-primary underline"
      >
        {t("wikipedia")}
      </a>

      {(canAct || onRequestSignIn != null) && (
        <div className="flex flex-wrap items-center gap-2 border-t border-border pt-2">
          <button
            onClick={canAct ? onToggleVisited : onRequestSignIn ?? undefined}
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
      )}
    </PanelShell>
  );
}
