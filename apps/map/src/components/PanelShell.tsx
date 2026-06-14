import type { ReactNode } from "react";

import { t } from "../lib/i18n";

/**
 * Shared chrome for the map's detail panels: the floating (mobile bottom-sheet)
 * vs embedded (desktop sidebar) shell plus the title/close header. Used by both
 * TownDetailPanel (book Places) and DetourDetailPanel (off-book Detours) so the
 * shell markup lives in one place.
 */
export default function PanelShell({
  title,
  embedded = false,
  onClose,
  children,
}: {
  title: string;
  embedded?: boolean;
  onClose: () => void;
  children: ReactNode;
}) {
  // The floating variant is only used on mobile web (desktop embeds the panel
  // in the sidebar). Anchor it as a bottom sheet so it never overlaps the
  // top-left progress card or the top-right map controls.
  const floating = embedded
    ? ""
    : "absolute inset-x-3 bottom-3 max-h-[60vh] overflow-y-auto rounded-lg border border-border bg-card/95 p-4 shadow-sm";

  return (
    <div className={`flex flex-col gap-2 text-sm text-foreground ${floating}`}>
      <div className="flex items-start justify-between">
        <h2 className="text-base font-bold">{title}</h2>
        <button
          onClick={onClose}
          aria-label={t("close")}
          className="rounded px-1 text-muted-foreground hover:text-foreground"
        >
          ✕
        </button>
      </div>
      {children}
    </div>
  );
}
