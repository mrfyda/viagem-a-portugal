import { useEffect, useRef, useState } from "react";

const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

// ease-out-quart — quick start, gentle settle (no bounce)
const easeOutQuart = (t: number) => 1 - Math.pow(1 - t, 4);

/**
 * Tween an integer toward `target` for a quiet count-up — the small delight
 * when a Traveler marks a Visit and their "pages travelled" ticks upward.
 * Snaps on first mount (never a page-load count-up sequence) and whenever the
 * user prefers reduced motion. Each new tween starts from the value currently
 * on screen, so rapid changes chain smoothly instead of jumping.
 */
export function useCountUp(target: number, durationMs = 700): number {
  const [display, setDisplay] = useState(target);
  const displayRef = useRef(target);
  displayRef.current = display;
  const mounted = useRef(false);

  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      setDisplay(target);
      return;
    }
    if (prefersReducedMotion()) {
      setDisplay(target);
      return;
    }
    const from = displayRef.current;
    if (from === target) return;
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / durationMs);
      setDisplay(Math.round(from + (target - from) * easeOutQuart(p)));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, durationMs]);

  return display;
}
