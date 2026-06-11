import { useId, useState } from "react";

import { bookPlaces } from "../lib/book";
import { t } from "../lib/i18n";

/** Keyboard-accessible path to any Place (the map dots need a pointer). */
export default function TownSearch({
  onSelect,
}: {
  onSelect: (indexName: string) => void;
}) {
  const listId = useId();
  const [value, setValue] = useState("");

  const trySelect = (text: string) => {
    const hit = bookPlaces.find(
      (p) => p.indexName === text || p.name === text,
    );
    if (hit) {
      onSelect(hit.indexName);
      setValue("");
      return true;
    }
    return false;
  };

  return (
    <>
      <input
        type="search"
        list={listId}
        value={value}
        placeholder={t("searchTown")}
        aria-label={t("searchTown")}
        onChange={(e) => {
          setValue(e.target.value);
          trySelect(e.target.value); // datalist pick fires change with full value
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") trySelect(value);
        }}
        className="h-9 w-full rounded-md border border-input bg-card px-3 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      />
      <datalist id={listId}>
        {bookPlaces.map((p) => (
          <option key={p.indexName} value={p.indexName} />
        ))}
      </datalist>
    </>
  );
}
