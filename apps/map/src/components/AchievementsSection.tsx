import { useMemo, useState } from "react";

import { achievements, type Achievement } from "../lib/achievements";
import { t } from "../lib/i18n";
import { CHAPTER_COLORS } from "../lib/mapStyle";

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
 * The signed-in Traveler's milestones, folded under a one-line toggle so the
 * sidebar header stays slim. Everything derives from the visited set on the
 * fly (src/lib/achievements.ts) — locked rows show how far along they are, so
 * the section doubles as a "what's next" list.
 */
export default function AchievementsSection({
  visited,
}: {
  visited: ReadonlySet<string>;
}) {
  const [open, setOpen] = useState(false);
  const list = useMemo(() => achievements(visited), [visited]);
  const unlocked = list.filter((a) => a.unlocked).length;

  return (
    <div className="flex flex-col">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex items-center gap-2 rounded-md py-1 text-left transition-colors hover:text-foreground"
      >
        <span aria-hidden className="text-sm">
          🏆
        </span>
        <span className="text-[13px] font-semibold">{t("achievements")}</span>
        <span className="text-xs tabular-nums text-muted-foreground">
          {t("achievementsSummary", { unlocked, total: list.length })}
        </span>
        <span aria-hidden className="text-xs text-muted-foreground">
          {open ? "▾" : "▸"}
        </span>
      </button>
      {open && (
        <ul className="flex flex-col">
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
      )}
    </div>
  );
}
