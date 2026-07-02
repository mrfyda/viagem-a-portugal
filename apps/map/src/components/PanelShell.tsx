import type { ReactNode } from "react";

import { t } from "../lib/i18n";

/**
 * Shared chrome for the map's detail panels plus the title/close/step header.
 * Used by both TownDetailPanel (book Places) and DetourDetailPanel (off-book
 * Detours) so the shell markup lives in one place. Two layouts:
 *   - embedded (desktop sidebar): flows inline, scrolls with the sidebar.
 *   - mobile: a full-screen modal with a pinned header over a scrollable body,
 *     so the close/prev/next controls stay reachable however long the entry.
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
  const hasStepper = onPrev !== undefined || onNext !== undefined;

  const header = (
    <div className="flex items-center justify-between gap-2">
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
  );

  // Desktop: flows within the sidebar, header scrolls with the content.
  if (embedded) {
    return (
      <div className="flex flex-col gap-2 text-sm text-foreground">
        {header}
        {children}
      </div>
    );
  }

  // Mobile: full-screen modal — pinned header, scrollable body. Covers the
  // map chrome (top card + controls) so the entry has the whole screen.
  return (
    <div className="animate-sheet-in absolute inset-0 z-20 flex flex-col bg-card text-sm text-foreground">
      <div className="shrink-0 border-b border-border p-4">{header}</div>
      <div className="flex flex-1 flex-col gap-2 overflow-y-auto p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        {children}
      </div>
    </div>
  );
}
