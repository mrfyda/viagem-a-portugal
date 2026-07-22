import { useEffect, useRef, type ReactNode } from "react";

import { useSheetDrag } from "../hooks/useSheetDrag";
import { t } from "../lib/i18n";

// Header controls are drawn as SVGs in equal-sized buttons — text glyphs
// (‹ › ✕) carry different metrics per font/size, so they never align.
const stroke = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

const headerButton =
  "flex h-8 w-8 items-center justify-center rounded text-muted-foreground " +
  "hover:text-foreground disabled:opacity-30 disabled:hover:text-muted-foreground";

/** The sheets' shared close control — also used by MapSidebar's tab sheet. */
export function SheetCloseButton({ onClose }: { onClose: () => void }) {
  return (
    <button onClick={onClose} aria-label={t("close")} className={headerButton}>
      <svg viewBox="0 0 24 24" width={18} height={18} {...stroke}>
        <path d="M6 6l12 12M18 6 6 18" />
      </svg>
    </button>
  );
}

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
              className={headerButton}
            >
              <svg viewBox="0 0 24 24" width={18} height={18} {...stroke}>
                <path d="m14 6-6 6 6 6" />
              </svg>
            </button>
            <button
              onClick={onNext ?? undefined}
              disabled={!onNext}
              aria-label={t("nextPlace")}
              className={headerButton}
            >
              <svg viewBox="0 0 24 24" width={18} height={18} {...stroke}>
                <path d="m10 6 6 6-6 6" />
              </svg>
            </button>
          </>
        )}
        <SheetCloseButton onClose={onClose} />
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
  // Grid (not column flex): Safari doesn't give a flex child a definite size
  // inside a max-height parent, so its overflow scroll never engages on iOS —
  // a minmax(0,1fr) row does. dvh, not vh: iOS 26 pins vh to the large
  // viewport, which would hide the sheet's tail behind Safari's bottom bar.
  return (
    <div
      style={sheetStyle}
      className="animate-sheet-in absolute inset-x-0 bottom-0 z-20 grid max-h-[60dvh] grid-rows-[auto_minmax(0,1fr)] overflow-hidden rounded-t-2xl border-t border-border bg-card text-sm text-foreground shadow-[0_-8px_30px_rgba(28,25,23,0.18)]"
    >
      <div {...handleProps} className="cursor-grab border-b border-border px-4 pb-3 pt-2">
        <div aria-hidden className="mx-auto mb-2 h-1 w-9 rounded-full bg-border" />
        {header}
      </div>
      {/* touch-pan-y declares the body's gesture to iOS up front;
          overscroll-contain keeps the swipe from rubber-banding the page.
          The body carries its own max-height (sheet cap minus the ~4.5rem
          header) besides the grid row, so no grid/flex min-size resolution
          is involved. *:shrink-0 because the on-device failure was the
          content, not the scroller: a flex item with overflow-hidden (the
          post photo card) has a zero automatic min-size, so the column
          compressed it to fit the cap — the body never overflowed, which
          left nothing to scroll and the photo squashed to a sliver. */}
      <div className="flex max-h-[calc(60dvh_-_4.5rem)] touch-pan-y flex-col gap-2 overflow-y-auto overscroll-contain pt-4 pl-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))] pb-[max(1rem,env(safe-area-inset-bottom))] *:shrink-0">
        {children}
      </div>
    </div>
  );
}
