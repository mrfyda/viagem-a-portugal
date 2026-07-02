import { useEffect, useRef, useState } from "react";

import { t } from "../lib/i18n";
import { searchPlaces } from "../lib/search";

const MAX_RESULTS = 8;

/**
 * Keyboard-accessible path to any Place (the map dots need a pointer): a
 * results-list combobox, the desktop sibling of the mobile tab-bar search.
 * Diacritic-folded matching lives in lib/search; "/" focuses the field from
 * anywhere; ↑/↓ + Enter pick, Escape clears then blurs.
 */
export default function TownSearch({
  onSelect,
}: {
  onSelect: (indexName: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [highlighted, setHighlighted] = useState(0);
  const open = query.trim().length > 0;
  const matches = open ? searchPlaces(query).slice(0, MAX_RESULTS) : [];

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "/") return;
      const target = event.target as HTMLElement | null;
      if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement)
        return;
      event.preventDefault();
      inputRef.current?.focus();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const pick = (indexName: string) => {
    onSelect(indexName);
    setQuery("");
  };

  return (
    <div className="relative shrink-0">
      <input
        ref={inputRef}
        type="search"
        role="combobox"
        aria-expanded={open}
        aria-autocomplete="list"
        value={query}
        placeholder={t("searchTown")}
        aria-label={t("searchTown")}
        onChange={(e) => {
          setQuery(e.target.value);
          setHighlighted(0);
        }}
        // The results list preventDefaults mousedown (keeps focus here), so a
        // blur really is the reader leaving — drop the stale list with it.
        onBlur={() => setQuery("")}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setHighlighted((h) => Math.min(h + 1, matches.length - 1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setHighlighted((h) => Math.max(h - 1, 0));
          } else if (e.key === "Enter" && matches[highlighted]) {
            pick(matches[highlighted].indexName);
          } else if (e.key === "Escape") {
            if (query) setQuery("");
            else e.currentTarget.blur();
          }
        }}
        className="h-9 w-full shrink-0 rounded-md border border-input bg-card px-3 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      />
      {open && (
        <div
          onMouseDown={(e) => e.preventDefault()}
          className="animate-panel-in absolute inset-x-0 top-full z-20 mt-1 overflow-hidden rounded-md border border-border bg-card shadow-lg"
        >
          {matches.length ? (
            <ul className="py-1">
              {matches.map((p, i) => (
                <li key={p.indexName}>
                  <button
                    onClick={() => pick(p.indexName)}
                    onMouseEnter={() => setHighlighted(i)}
                    className={`flex w-full items-center justify-between gap-2 px-3 py-1.5 text-left text-sm transition-colors ${
                      i === highlighted ? "bg-secondary" : ""
                    }`}
                  >
                    <span className="truncate text-foreground">{p.name}</span>
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
            <div className="px-3 py-2 text-sm text-muted-foreground">
              {t("noResults")}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
