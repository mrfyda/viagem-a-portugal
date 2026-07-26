import { useState, type ReactNode } from "react";

import { sectionTitle } from "../lib/book";
import { formatPages } from "../lib/format";
import { t } from "../lib/i18n";
import { CHAPTER_COLORS } from "../lib/mapStyle";
import type { PlaceDetail } from "../lib/place";

const KIND_LABEL: Record<string, string> = {
  stop: t("kindStop"),
  "passed-through": t("kindPassed"),
  "referenced-only": t("kindReferenced"),
};

const chevron = (
  <svg
    viewBox="0 0 24 24"
    width={13}
    height={13}
    fill="none"
    stroke="currentColor"
    strokeWidth={1.8}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="m10 6 6 6-6 6" />
  </svg>
);

function Chip({ children, color }: { children: ReactNode; color?: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-2 py-0.5 text-[11px] font-medium text-secondary-foreground">
      {color && (
        <span
          aria-hidden
          className="h-2 w-2 shrink-0 rounded-full"
          style={{ background: color }}
        />
      )}
      {children}
    </span>
  );
}

/**
 * The Mentions, folded away. Closed, it is one line: the count plus a
 * chapter-coloured tally, so "where does this place turn up" is answerable at a
 * glance. Open, it is the full section list.
 *
 * It folds because it used to be the panel's centre of gravity — Bragança's
 * twelve mentions were twelve permanent lines of grey text, ahead of both the
 * photo and the quote. Folded, that is one line and roughly eleven reclaimed.
 */
function MentionsFold({ detail }: { detail: PlaceDetail }) {
  const [open, setOpen] = useState(false);
  if (detail.mentions.length === 0) return null;

  const counts = new Map<number, number>();
  for (const m of detail.mentions) {
    counts.set(m.chapter, (counts.get(m.chapter) ?? 0) + 1);
  }
  const grouped = [...counts.entries()].sort((a, b) => a[0] - b[0]);
  const total = detail.mentions.length;

  return (
    <div className="flex flex-col gap-1">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="-mx-1 flex items-center gap-1.5 rounded-md px-1 py-1 text-left transition-colors hover:bg-secondary focus-visible:bg-secondary focus-visible:outline-none"
      >
        <span className="text-xs text-muted-foreground">
          {t(total === 1 ? "mentionsCountOne" : "mentionsCount", { count: total })}
        </span>
        <span className="flex flex-1 flex-wrap items-center gap-1">
          {grouped.map(([chapter, n]) => (
            <span
              key={chapter}
              title={t("chapterAbbrev", { chapter })}
              className="inline-flex items-center gap-0.5 text-[11px] tabular-nums text-muted-foreground"
            >
              <span
                aria-hidden
                className="h-1.5 w-1.5 rounded-full"
                style={{ background: CHAPTER_COLORS[chapter] }}
              />
              {n}
            </span>
          ))}
        </span>
        <span
          aria-hidden
          className="shrink-0 text-muted-foreground"
          style={{ transform: open ? "rotate(90deg)" : undefined }}
        >
          {chevron}
        </span>
      </button>
      {open && (
        <ul className="m-0 flex list-none flex-col gap-0.5 p-0 pl-1 text-xs text-muted-foreground">
          {detail.mentions.map((m, i) => (
            <li key={i}>
              {t("chapterAbbrev", { chapter: m.chapter })}, “{sectionTitle(m.section)}”
              {" "}({KIND_LABEL[m.kind]})
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/**
 * A Place's presence in the book, as one labelled block: the journey Stops and
 * the page span as chips, then the folded Mentions.
 *
 * Gathering them into a bordered box is what lets the photo lead without the
 * book data dissolving into loose grey lines underneath it — and it is why the
 * panel still looks composed for the ~86% of Places that have no post at all.
 *
 * A Detour never renders this: it is off-book by definition (ADR 0010), with no
 * pages, mentions or route, so there would be nothing to put inside.
 */
export default function BookSection({ detail }: { detail: PlaceDetail }) {
  const hasContent =
    detail.book != null ||
    detail.journeyStops.length > 0 ||
    detail.mentions.length > 0;
  if (!hasContent) return null;

  return (
    <div className="flex flex-col gap-1.5 rounded-md border border-border p-2">
      <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
        {t("inTheBook")}
      </span>
      {(detail.book != null || detail.journeyStops.length > 0) && (
        <div className="flex flex-wrap items-center gap-1.5">
          {detail.journeyStops.map((s) => (
            <Chip key={s.ordinal} color={CHAPTER_COLORS[s.chapter]}>
              {t(s.role === "stop" ? "stopOnRoute" : "passedOnRoute", {
                ordinal: s.ordinal,
                chapter: s.chapter,
              })}
            </Chip>
          ))}
          {detail.book && (
            <Chip>{t("pages", { pages: formatPages(detail.book.pages) })}</Chip>
          )}
        </div>
      )}
      <MentionsFold detail={detail} />
    </div>
  );
}
