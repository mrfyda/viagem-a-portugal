import { useEffect, useState, type CSSProperties, type ReactNode } from "react";

import { useKeyboardInset } from "../hooks/useKeyboardInset";
import { bookPlaces } from "../lib/book";
import { t } from "../lib/i18n";

/**
 * Mobile-only floating bottom navigation — an iOS 26 "Liquid Glass" tab bar.
 * A slim icon-only pill with a sliding frosted indicator, plus a detached
 * brand-green search button. Tapping search morphs the bar into a full-width
 * search field (iOS 26), with matches listed in a panel above it. Web-only DOM
 * chrome styled with the project's tokens over `backdrop-blur`.
 */
export type MobileTab = "map" | "journey" | "profile";

const stroke = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.7,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

const ICON: Record<MobileTab, ReactNode> = {
  map: (
    <svg viewBox="0 0 24 24" width={24} height={24} {...stroke}>
      <path d="M9 4 4 6v14l5-2 6 2 5-2V4l-5 2-6-2Z" />
      <path d="M9 4v14M15 6v14" />
    </svg>
  ),
  journey: (
    <svg viewBox="0 0 24 24" width={24} height={24} {...stroke}>
      <circle cx="6" cy="18.5" r="2.2" />
      <circle cx="18" cy="5.5" r="2.2" />
      <path d="M8 18h6a3.5 3.5 0 0 0 0-7H10a3.5 3.5 0 0 1 0-7h6" />
    </svg>
  ),
  profile: (
    <svg viewBox="0 0 24 24" width={24} height={24} {...stroke}>
      <circle cx="12" cy="8" r="3.6" />
      <path d="M4.5 20c.7-3.8 4-5.6 7.5-5.6S18.8 16.2 19.5 20" />
    </svg>
  ),
};

const searchIcon = (
  <svg viewBox="0 0 24 24" width={22} height={22} {...stroke} strokeWidth={1.9}>
    <circle cx="11" cy="11" r="7" />
    <path d="m20.5 20.5-4-4" />
  </svg>
);

const glass =
  "border border-white/50 bg-card/70 backdrop-blur-xl backdrop-saturate-150 " +
  "shadow-[0_10px_30px_-8px_rgba(15,18,40,0.35),inset_0_1px_0_rgba(255,255,255,0.7)]";

const dock =
  "absolute inset-x-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-10 flex items-stretch gap-2.5";

export default function MobileTabBar({
  active,
  searchOpen,
  hasProfile,
  onSelect,
  onToggleSearch,
  onSelectPlace,
}: {
  active: MobileTab;
  searchOpen: boolean;
  /** Hide the account tab on builds without sign-in (no Supabase config). */
  hasProfile: boolean;
  onSelect: (tab: MobileTab) => void;
  onToggleSearch: () => void;
  /** Pick a Place from the search results (also closes search, in the parent). */
  onSelectPlace: (indexName: string) => void;
}) {
  const [query, setQuery] = useState("");
  // Forget the query whenever search closes (Cancel, tab switch, place picked).
  useEffect(() => {
    if (!searchOpen) setQuery("");
  }, [searchOpen]);
  // Lift the search bar above the on-screen keyboard (iOS Safari won't on its own).
  const keyboardInset = useKeyboardInset();

  // iOS 26: tapping the separated search button morphs the tab bar into a
  // full-width search field; matches list in a panel above it; Cancel reverts.
  if (searchOpen) {
    const q = query.trim().toLowerCase();
    const matches = (q ? bookPlaces.filter((p) => p.name.toLowerCase().includes(q)) : bookPlaces)
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name, "pt"));
    const grow: CSSProperties = {
      animation: "searchIn 240ms cubic-bezier(.32,.72,0,1)",
    };
    const ease: CSSProperties = { transition: "bottom .2s ease" };
    return (
      <>
        <div
          style={{
            ...grow,
            ...ease,
            ...(keyboardInset > 0 ? { bottom: keyboardInset + 68 } : {}),
          }}
          className="absolute inset-x-3 bottom-[calc(max(0.75rem,env(safe-area-inset-bottom))+3.75rem)] z-10 max-h-[45vh] overflow-y-auto overscroll-contain rounded-2xl border border-border bg-card/95 shadow-lg backdrop-blur-md"
        >
          {matches.length ? (
            <ul className="py-1">
              {matches.map((p) => (
                <li key={p.indexName}>
                  <button
                    onClick={() => onSelectPlace(p.indexName)}
                    className="flex w-full items-center justify-between gap-2 px-4 py-2.5 text-left transition-colors hover:bg-secondary"
                  >
                    <span className="truncate text-[15px] text-foreground">{p.name}</span>
                    {p.qualifier && (
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {p.qualifier}
                      </span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <div className="px-4 py-3 text-sm text-muted-foreground">{t("noResults")}</div>
          )}
        </div>

        <div
          className={dock}
          style={{ ...ease, ...(keyboardInset > 0 ? { bottom: keyboardInset + 8 } : {}) }}
        >
          <div
            style={grow}
            className={`flex h-14 flex-1 items-center gap-2 rounded-full px-4 ${glass}`}
          >
            <span className="shrink-0 text-muted-foreground">{searchIcon}</span>
            <input
              type="search"
              // eslint-disable-next-line jsx-a11y/no-autofocus -- opened by an
              // explicit tap, so focusing the field is the expected result
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && matches[0]) onSelectPlace(matches[0].indexName);
                if (e.key === "Escape") onToggleSearch();
              }}
              placeholder={t("searchTown")}
              aria-label={t("searchTown")}
              className="h-full min-w-0 flex-1 bg-transparent text-base text-foreground placeholder:text-muted-foreground focus-visible:outline-none"
            />
            <button
              onClick={onToggleSearch}
              className="shrink-0 rounded-full px-1 text-sm font-medium text-primary"
            >
              {t("cancel")}
            </button>
          </div>
        </div>
      </>
    );
  }

  const tabs: { key: MobileTab; label: string }[] = [
    { key: "map", label: t("navMap") },
    { key: "journey", label: t("theJourney") },
    ...(hasProfile ? [{ key: "profile" as const, label: t("account") }] : []),
  ];
  const activeIndex = tabs.findIndex((tab) => tab.key === active);

  return (
    <div className={dock}>
      <nav className={`relative flex h-14 flex-1 rounded-full p-1.5 ${glass}`}>
        {activeIndex >= 0 && (
          <span
            aria-hidden
            className="pointer-events-none absolute bottom-1.5 left-1.5 top-1.5 z-0 rounded-full bg-card/85 shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_4px_12px_rgba(0,0,0,0.12)] transition-transform duration-500 [transition-timing-function:cubic-bezier(.34,1.42,.5,1)]"
            style={{
              width: `calc((100% - 0.75rem) / ${tabs.length})`,
              transform: `translateX(${activeIndex * 100}%)`,
            }}
          />
        )}
        {tabs.map((tab) => {
          const isActive = tab.key === active;
          return (
            <button
              key={tab.key}
              onClick={() => onSelect(tab.key)}
              aria-label={tab.label}
              aria-current={isActive ? "page" : undefined}
              className={`relative z-10 flex flex-1 items-center justify-center rounded-full transition-colors ${
                isActive ? "text-primary" : "text-muted-foreground"
              }`}
            >
              {ICON[tab.key]}
            </button>
          );
        })}
      </nav>

      <button
        onClick={onToggleSearch}
        aria-label={t("searchTown")}
        className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-transform active:scale-90 ${glass}`}
      >
        <svg viewBox="0 0 24 24" width={25} height={25} {...stroke} strokeWidth={1.9}>
          <circle cx="11" cy="11" r="7" />
          <path d="m20.5 20.5-4-4" />
        </svg>
      </button>
    </div>
  );
}
