import { t } from "../lib/i18n";
import { placeDetail } from "../lib/place";
import BookSection from "./BookSection";
import PanelShell from "./PanelShell";
import PostHero from "./PostHero";

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

/**
 * One Place, in reading order: the post's photo, then Saramago on it, then what
 * the book records, then the Traveler's own visit.
 *
 * The order is the design. The panel used to open on metadata and bury the
 * photograph below a twelve-line list of mentions — on a mobile sheet that put
 * it off-screen entirely. Now {@link PostHero} leads, the quote follows as the
 * reason the Place is worth opening, and {@link BookSection} gathers the pages,
 * Stops and Mentions into one labelled block instead of loose grey lines.
 */
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
  const detail = placeDetail(place);
  const { book, name, alsoIndexedAs, quote, featured, prev, next } = detail;

  return (
    <PanelShell
      title={name}
      embedded={embedded}
      onClose={onClose}
      onPrev={prev ? () => onNavigate(prev) : null}
      onNext={next ? () => onNavigate(next) : null}
    >
      {featured && (
        <PostHero
          image={featured.image}
          postUrl={featured.postUrl}
          postTitle={featured.postTitle}
          date={featured.date}
          alt={name}
        />
      )}

      {(book?.qualifier || alsoIndexedAs.length > 0) && (
        <div className="flex flex-col gap-0.5">
          {book?.qualifier && (
            <span className="text-xs text-muted-foreground">{book.qualifier}</span>
          )}
          {alsoIndexedAs.length > 0 && (
            <span className="text-[11px] text-muted-foreground">
              {t("alsoIndexedAs", { names: alsoIndexedAs.join(", ") })}
            </span>
          )}
        </div>
      )}

      {quote && (
        // A left rule rather than a filled box: the line is Saramago's voice,
        // not a piece of UI, and it has to read differently from the Detour
        // note directly below the same hero.
        <blockquote className="m-0 border-l-2 border-primary/30 pl-3 font-serif text-[15px] italic leading-relaxed text-foreground">
          «{quote}»
          <span className="mt-1 block text-[11px] not-italic text-muted-foreground">
            — Viagem a Portugal
          </span>
        </blockquote>
      )}

      <BookSection detail={detail} />

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
