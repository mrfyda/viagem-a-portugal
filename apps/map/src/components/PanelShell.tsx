import { useEffect, useRef, type ReactNode } from "react";

import { useSheetDrag } from "../hooks/useSheetDrag";
import { t } from "../lib/i18n";

/**
 * Shared chrome for the map's detail panels plus the title/close/step header.
 * Used by both TownDetailPanel (book Places) and DetourDetailPanel (off-book
 * Detours) so the shell markup lives in one place. Two layouts:
 *   - embedded (desktop sidebar): flows inline, scrolls with the sidebar.
 *   - mobile: a half-height bottom sheet — pinned header over a scrollable
 *     body, the map (and the selection halo) staying visible above it, so
 *     "where is this?" never needs closing the entry. Swipe down on the
 *     grabber/header to dismiss.
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

  // Move focus to the entry's name when a panel opens (each selection
  // remounts the shell), so keyboard and screen-reader users land on the
  // context change instead of staying on a dot-less canvas.
  const headingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    headingRef.current?.focus({ preventScroll: true });
  }, []);

  const { handleProps, sheetStyle } = useSheetDrag(onClose);

  const header = (
    <div className="flex items-center justify-between gap-2">
      <h2
        ref={headingRef}
        tabIndex={-1}
        className="min-w-0 flex-1 text-lg font-bold leading-snug focus:outline-none"
      >
        {title}
      </h2>
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

  // Mobile: a half-height bottom sheet — the map keeps the upper half, so the
  // selection halo stays in view and tapping another dot switches the entry.
  return (
    <div
      style={sheetStyle}
      className="animate-sheet-in absolute inset-x-0 bottom-0 z-20 flex max-h-[60vh] flex-col overflow-hidden rounded-t-2xl border-t border-border bg-card text-sm text-foreground shadow-[0_-8px_30px_rgba(28,25,23,0.18)]"
    >
      <div {...handleProps} className="shrink-0 cursor-grab border-b border-border px-4 pb-3 pt-2">
        <div aria-hidden className="mx-auto mb-2 h-1 w-9 rounded-full bg-border" />
        {header}
      </div>
      {/* min-h-0 lets this flex child shrink inside the max-h sheet — without
          it the body grows past the sheet and its own scroll never engages. */}
      <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        {children}
      </div>
    </div>
  );
}
