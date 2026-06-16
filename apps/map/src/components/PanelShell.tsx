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
  onPrev,
  onNext,
  children,
}: {
  title: string;
  embedded?: boolean;
  onClose: () => void;
  /**
   * Step to the previous/next entry. Passing either (even as null) shows the
   * stepper, with a null handler rendered as a disabled arrow at the ends of
   * the sequence. Omit both for panels with no sequence (e.g. Detours).
   */
  onPrev?: (() => void) | null;
  onNext?: (() => void) | null;
  children: ReactNode;
}) {
  // The floating variant is only used on mobile web (desktop embeds the panel
  // in the sidebar). Anchor it as a bottom sheet so it never overlaps the
  // top-left progress card or the top-right map controls.
  const floating = embedded
    ? ""
    : "absolute inset-x-3 bottom-3 max-h-[60vh] overflow-y-auto rounded-lg border border-border bg-card/95 p-4 shadow-sm";

  const hasStepper = onPrev !== undefined || onNext !== undefined;

  return (
    <div className={`flex flex-col gap-2 text-sm text-foreground ${floating}`}>
      <div className="flex items-start justify-between gap-2">
        <h2 className="min-w-0 flex-1 text-base font-bold">{title}</h2>
        <div className="flex shrink-0 items-center gap-0.5">
          {hasStepper && (
            <>
              <button
                onClick={onPrev ?? undefined}
                disabled={!onPrev}
                aria-label={t("prevPlace")}
                className="rounded px-1.5 text-lg leading-none text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:hover:text-muted-foreground"
              >
                ‹
              </button>
              <button
                onClick={onNext ?? undefined}
                disabled={!onNext}
                aria-label={t("nextPlace")}
                className="rounded px-1.5 text-lg leading-none text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:hover:text-muted-foreground"
              >
                ›
              </button>
            </>
          )}
          <button
            onClick={onClose}
            aria-label={t("close")}
            className="rounded px-1 text-muted-foreground hover:text-foreground"
          >
            ✕
          </button>
        </div>
      </div>
      {children}
    </div>
  );
}
