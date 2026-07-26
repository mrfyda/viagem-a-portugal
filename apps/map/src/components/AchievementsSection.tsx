import { useMemo } from "react";

import { achievements, type Achievement } from "../lib/achievements";
import { t } from "../lib/i18n";
import { CHAPTER_COLORS } from "../lib/mapStyle";
import type { JourneyMetrics, Visits } from "../lib/progress";

/** A chapter achievement wears its Route's colour; the rest wear their emoji. */
function Badge({ achievement }: { achievement: Achievement }) {
  if (achievement.chapter != null) {
    return (
      <span
        className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white ${
          achievement.unlocked ? "" : "grayscale"
        }`}
        style={{ background: CHAPTER_COLORS[achievement.chapter] }}
      >
        {achievement.chapter}
      </span>
    );
  }
  return (
    <span
      aria-hidden
      className={`mt-0.5 w-5 shrink-0 text-center text-sm leading-5 ${
        achievement.unlocked ? "" : "grayscale"
      }`}
    >
      {achievement.icon}
    </span>
  );
}

/**
 * Towns and pages travelled, as two thin bars. The counts arrive already
 * tweened by useCountUp, which is what animates the fill too — hence no CSS
 * width transition, or the two would fight.
 */
function ProgressBars({ metrics }: { metrics: JourneyMetrics }) {
  const row = (label: string, done: number, total: number) => (
    <div key={label} className="flex flex-col gap-1">
      <div className="flex items-baseline justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="tabular-nums text-foreground">
          {done}
          <span className="text-muted-foreground"> / {total}</span>
        </span>
      </div>
      <div className="h-1 overflow-hidden rounded-full bg-secondary">
        <div
          className="h-full rounded-full bg-primary"
          style={{ width: `${total ? (done / total) * 100 : 0}%` }}
        />
      </div>
    </div>
  );
  return (
    <div className="flex flex-col gap-2 px-1 pb-1">
      {row(t("progressTowns"), metrics.townsVisited, metrics.townsTotal)}
      {row(t("progressPages"), metrics.pagesVisited, metrics.pagesTotal)}
    </div>
  );
}

/** Stable empty log for anonymous visitors — a fresh Map each render would
 * make useMemo recompute the (constant) all-locked list every time. */
const EMPTY_VISITS: Visits = new Map();

/**
 * The Traveler's milestones — the full roster, uncapped. Both hosts give it a
 * whole scrolling surface of its own (the desktop rail's achievements view, the
 * mobile tab bar's trophy sheet) and both carry their own title, so this owns
 * neither a heading nor a height cap.
 *
 * Everything derives from the visit log on the fly (src/lib/achievements.ts) —
 * locked rows show how far along they are, so the section doubles as a "what's
 * next" list. Anonymous visitors (a null log) see the whole roster locked, as a
 * preview of what's there to earn.
 */
export default function AchievementsSection({
  visits,
  metrics,
  signedOut = false,
}: {
  /** The Traveler's visit log, or null for an anonymous visitor. */
  visits: Visits | null;
  /** Towns/pages travelled. Progress lives with the milestones it feeds. */
  metrics: JourneyMetrics;
  /** Anonymous on a build where signing in is possible — adds a sign-in nudge. */
  signedOut?: boolean;
}) {
  const list = useMemo(() => achievements(visits ?? EMPTY_VISITS), [visits]);
  const unlocked = list.filter((a) => a.unlocked).length;

  return (
    <div className="flex flex-col">
      <ProgressBars metrics={metrics} />
      <span className="border-t border-border px-1 pb-1 pt-2 text-xs text-muted-foreground">
        {t("achievementsSummary", { unlocked, total: list.length })}
      </span>
      <ul className="flex flex-col">
        {signedOut && (
          <li className="px-1 pb-1 text-xs text-muted-foreground">
            {t("achievementsSignedOut")}
          </li>
        )}
        {list.map((a) => (
          <li
            key={a.id}
            className={`flex items-start gap-2 rounded-md px-1 py-1 ${
              a.unlocked ? "" : "opacity-60"
            }`}
          >
            <Badge achievement={a} />
            <span className="min-w-0 flex-1">
              <span className="block text-[13px] font-medium leading-snug">
                {t(a.titleKey, a.vars)}
              </span>
              <span className="block text-xs text-muted-foreground">
                {t(a.descriptionKey, a.vars)}
              </span>
            </span>
            <span className="shrink-0 pt-0.5 text-xs tabular-nums text-muted-foreground">
              {a.unlocked ? "✓" : `${a.current}/${a.target}`}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
