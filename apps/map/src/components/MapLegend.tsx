import type { ReactNode } from "react";

import { t, type MessageKey } from "../lib/i18n";
import {
  CHAPTER_COLORS,
  DETOUR_COLOR,
  UNVISITED_COLOR,
  VISITED_COLOR,
} from "../lib/mapStyle";

const dot = (color: string, hollow = false) => (
  <span
    aria-hidden
    className="h-[9px] w-[9px] rounded-full"
    style={
      hollow
        ? { border: `1.5px solid ${color}`, background: "transparent" }
        : { background: color }
    }
  />
);

/** One entry: the mark, the term it stands for, then what the term means. */
function Entry({
  mark,
  term,
  desc,
}: {
  mark: ReactNode;
  term?: MessageKey;
  desc: MessageKey;
}) {
  return (
    <li className="flex items-baseline gap-2">
      <span className="flex h-4 w-3 shrink-0 items-center justify-center">
        {mark}
      </span>
      <span className="flex-1">
        {term && (
          <span className="font-semibold text-foreground">{t(term)} </span>
        )}
        {term ? "— " : null}
        {t(desc)}
      </span>
    </li>
  );
}

/**
 * The key to the map's code, at the foot of the journey list.
 *
 * It carries the one distinction the list makes and the map now makes too: a
 * solid dot is a Stop, a hollow dot is a place the traveler only drove through
 * (see TOWN_FILL_COLOR in mapStyle.ts). Naming the marks in words is the point —
 * "89 stops · 47 passed through" as a statistic told the reader nothing about
 * which dot in front of them was which.
 */
export default function MapLegend() {
  return (
    <ul className="mt-3 flex flex-col gap-1 border-t border-border pt-2.5 text-[12px] leading-snug text-muted-foreground">
      <Entry mark={dot(UNVISITED_COLOR)} term="legendStop" desc="legendStopDesc" />
      <Entry
        mark={dot(UNVISITED_COLOR, true)}
        term="legendPassed"
        desc="legendPassedDesc"
      />
      <Entry
        mark={dot(VISITED_COLOR)}
        term="legendVisited"
        desc="legendVisitedDesc"
      />
      <Entry
        mark={dot(DETOUR_COLOR)}
        term="legendDetour"
        desc="legendDetourDesc"
      />
      <Entry
        mark={
          <span
            aria-hidden
            className="h-[3px] w-3 rounded-full"
            style={{
              background: `linear-gradient(90deg, ${[1, 3, 5]
                .map((n) => CHAPTER_COLORS[n])
                .join(", ")})`,
            }}
          />
        }
        desc="legendRoute"
      />
    </ul>
  );
}
