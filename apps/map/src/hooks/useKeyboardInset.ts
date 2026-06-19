import { useEffect, useState } from "react";

/**
 * Height (in px) of the area at the bottom of the layout viewport currently
 * covered by the on-screen keyboard, derived from the VisualViewport API.
 * Returns 0 when there is no keyboard, no `visualViewport` support, or on the
 * server/native.
 *
 * iOS Safari does not shrink the layout viewport when the keyboard opens, so an
 * element pinned with `position: absolute; bottom: …` ends up hidden behind the
 * keyboard. Bottom-anchored chrome (the search bar) uses this to lift itself
 * above the keyboard instead.
 */
export function useKeyboardInset(): number {
  const [inset, setInset] = useState(0);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const vv = window.visualViewport;
    if (!vv) return;

    const update = () => {
      // What the visual viewport leaves uncovered at the bottom of the layout
      // viewport — i.e. the keyboard's height (plus any scroll offset).
      const hidden = window.innerHeight - vv.height - vv.offsetTop;
      setInset(Math.max(0, Math.round(hidden)));
    };

    update();
    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    return () => {
      vv.removeEventListener("resize", update);
      vv.removeEventListener("scroll", update);
    };
  }, []);

  return inset;
}
