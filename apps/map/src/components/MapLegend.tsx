import { t } from "../lib/i18n";
import {
  CHAPTER_COLORS,
  DETOUR_COLOR,
  UNVISITED_COLOR,
  VISITED_COLOR,
} from "../lib/mapStyle";

const dot = (color: string) => (
  <span
    aria-hidden
    className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full border border-white shadow-[0_0_0_0.5px_rgba(0,0,0,0.15)]"
    style={{ background: color }}
  />
);

/**
 * The key to the map's code — dot colours and the chapter-coloured routes.
 * Renders inline at the foot of the chapter list (desktop sidebar and mobile
 * journey sheet), so the map itself stays free of extra chrome.
 */
export default function MapLegend() {
  const routeSwatch = (
    <span
      aria-hidden
      className="mt-1.5 h-[3px] w-4 shrink-0 rounded-full"
      style={{
        background: `linear-gradient(90deg, ${[1, 3, 5]
          .map((n) => CHAPTER_COLORS[n])
          .join(", ")})`,
      }}
    />
  );
  return (
    <ul className="mt-auto flex flex-col gap-0.5 border-t border-border pt-2 text-xs leading-snug text-muted-foreground">
      <li className="flex items-start gap-2">
        {dot(UNVISITED_COLOR)}
        <span>{t("legendPlace")}</span>
      </li>
      <li className="flex items-start gap-2">
        {dot(VISITED_COLOR)}
        <span>{t("legendVisited")}</span>
      </li>
      <li className="flex items-start gap-2">
        {dot(DETOUR_COLOR)}
        <span>{t("legendDetour")}</span>
      </li>
      <li className="flex items-start gap-2">
        {routeSwatch}
        <span>{t("legendRoute")}</span>
      </li>
    </ul>
  );
}
