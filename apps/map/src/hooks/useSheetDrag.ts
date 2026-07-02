import { useRef, useState, type CSSProperties, type PointerEvent } from "react";

/**
 * Swipe-to-dismiss for the mobile bottom sheets (web-only DOM chrome). The
 * returned `handleProps` go on the sheet's grabber/header — dragging there
 * follows the finger (never upward past rest), releasing past the threshold
 * dismisses, anything less springs back. Scoping the drag to the handle keeps
 * it from fighting the sheet body's own scrolling.
 */
export function useSheetDrag(onDismiss: () => void) {
  const [offset, setOffset] = useState(0);
  const [dragging, setDragging] = useState(false);
  const startY = useRef<number | null>(null);

  const end = () => {
    startY.current = null;
    setDragging(false);
    setOffset(0);
  };

  const handleProps = {
    style: { touchAction: "none" } as CSSProperties,
    onPointerDown: (event: PointerEvent<HTMLElement>) => {
      startY.current = event.clientY;
      setDragging(true);
      event.currentTarget.setPointerCapture(event.pointerId);
    },
    onPointerMove: (event: PointerEvent<HTMLElement>) => {
      if (startY.current == null) return;
      setOffset(Math.max(0, event.clientY - startY.current));
    },
    onPointerUp: () => {
      if (startY.current == null) return;
      const dismiss = offset > 72;
      end();
      if (dismiss) onDismiss();
    },
    onPointerCancel: end,
  };

  const sheetStyle: CSSProperties = {
    transform: offset ? `translateY(${offset}px)` : undefined,
    // Direct manipulation while dragging; a quick spring-back on release.
    transition: dragging ? "none" : "transform 150ms ease-out",
  };

  return { handleProps, sheetStyle };
}
