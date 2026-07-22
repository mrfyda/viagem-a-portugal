import type maplibregl from "maplibre-gl";
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type RefObject,
} from "react";

import { routesGeoJson } from "../lib/geo";
import {
  arcPoints,
  chapterPolylines,
  easeInOutCubic,
  lerpPolylines,
  orientToMatch,
  resamplePolyline,
  toSvgPath,
  type Pt,
} from "../lib/journeyReveal";
import { CHAPTER_COLORS } from "../lib/mapStyle";

/**
 * The loading experience (web): a ring spinner whose six arcs carry the
 * chapter colors and — once the map is ready — flow out of the ring and
 * morph into the six chapter Routes, one continuous animation from "loading"
 * to "the journey is on the map".
 *
 * Seams, and how each stays invisible:
 *  - boot → React: inject-web-meta.mjs ships the identical static ring in
 *    index.html (#boot-reveal); on mount we read its current rotation and
 *    start our spin from that angle, then remove it before first paint.
 *  - spin → morph: rotation is rAF-driven, so the morph bakes the exact
 *    current angle into its source arcs — no jump. The paper background
 *    fades over the same window: the map materialises and the routes land
 *    together.
 *  - morph → map: the morph's final frame *is* the projected route geometry;
 *    the real layer flips on with no transition and the SVG is dropped only
 *    once a frame containing the routes has actually been drawn — a cut
 *    between identical shapes, not a crossfade (which would pulse).
 *
 * The overlay never blocks the map after the paper background fades
 * (pointer-events: none); a camera move mid-morph jumps the animation to its
 * end instead of animating against a stale projection. Deep links and
 * prefers-reduced-motion skip the morph: routes reveal under a plain fade.
 */

// Ring geometry — mirrored by the static boot spinner in
// scripts/inject-web-meta.mjs; keep the two in sync.
const RING_RADIUS = 26;
const RING_STROKE = 5;
const ARC_SWEEP = 60; // 6 arcs × 60° = a solid ring, colors butted together
const SPIN_MS = 1600;

const ROUTE_STROKE = 2.5; // the routes layer's line-width
const ROUTE_OPACITY = 0.75; // the routes layer's resting line-opacity
const SAMPLES = 160; // points per polyline during the morph
const FADE_MS = 450; // paper background fade — concurrent with the morph
const MORPH_MS = 450;
const EXIT_MS = 300; // whole-overlay fade when the morph is skipped

const CHAPTERS = Object.keys(CHAPTER_COLORS)
  .map(Number)
  .sort((a, b) => a - b);

type Phase = "loading" | "morphing" | "exit";

/** Current rotation of the static boot ring, so React's spin continues it. */
function readBootAngle(): number {
  if (typeof document === "undefined") return 0;
  const ring = document.getElementById("boot-reveal-ring");
  if (!ring) return 0;
  const match = /matrix\(([^,]+),\s*([^,]+),/.exec(
    getComputedStyle(ring).transform,
  );
  if (!match) return 0;
  return (
    (Math.atan2(parseFloat(match[2]), parseFloat(match[1])) * 180) / Math.PI
  );
}

export default function JourneyRevealOverlay({
  mapRef,
  mapReady,
  skipMorph,
  onRevealRoutes,
  onDone,
}: {
  mapRef: RefObject<maplibregl.Map | null>;
  mapReady: boolean;
  /** Deep links skip the choreography — never delay a shared destination. */
  skipMorph: boolean;
  /** Flip the maplibre routes layer to its resting opacity. */
  onRevealRoutes: () => void;
  /** The overlay is finished — unmount it. */
  onDone: () => void;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const groupRef = useRef<SVGGElement>(null);
  const pathRefs = useRef<(SVGPathElement | null)[]>([]);
  const [bootAngle] = useState(readBootAngle);
  const angleRef = useRef(bootAngle);
  const [phase, setPhase] = useState<Phase>("loading");
  const phaseRef = useRef(phase);
  phaseRef.current = phase;
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  const sizeRef = useRef(size);
  sizeRef.current = size;

  // Parent callbacks are inline arrows; refs keep the effects stable.
  const onRevealRef = useRef(onRevealRoutes);
  onRevealRef.current = onRevealRoutes;
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  // Measure the container (the ring centres on it, the morph projects into
  // it). Frozen once the morph starts — a mid-morph resize aborts instead.
  useLayoutEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const measure = () => {
      if (phaseRef.current === "loading")
        setSize({ w: el.clientWidth, h: el.clientHeight });
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // With our ring committed (and painted at the boot ring's angle), the
  // static boot spinner has done its job. Layout effect: swap before paint.
  const measured = size != null;
  useLayoutEffect(() => {
    if (measured) document.getElementById("boot-reveal")?.remove();
  }, [measured]);

  // The spin. rAF (not CSS) so the morph can read the exact angle.
  useEffect(() => {
    if (!size || phase !== "loading") return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches)
      return; // still ring
    const { w, h } = size;
    const start = performance.now();
    const from = angleRef.current;
    let raf = 0;
    const tick = (now: number) => {
      angleRef.current = (from + ((now - start) / SPIN_MS) * 360) % 360;
      groupRef.current?.setAttribute(
        "transform",
        `rotate(${angleRef.current} ${w / 2} ${h / 2})`,
      );
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [phase, size]);

  // Map ready → either the full choreography or the quiet exit. Fade and
  // morph start together and end together.
  useEffect(() => {
    if (!mapReady || phase !== "loading") return;
    const reduce = window.matchMedia?.(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (skipMorph || reduce) {
      onRevealRef.current();
      setPhase("exit");
    } else {
      setPhase("morphing");
    }
  }, [mapReady, phase, skipMorph]);

  // The morph: arcs → routes, all six at once.
  useEffect(() => {
    if (phase !== "morphing") return;
    const map = mapRef.current;
    const size = sizeRef.current;
    if (!map || !size) {
      onRevealRef.current();
      setPhase("exit");
      return;
    }
    const cx = size.w / 2;
    const cy = size.h / 2;
    const angle = angleRef.current;
    const lines = chapterPolylines(routesGeoJson);
    const tweens = CHAPTERS.map((chapter, i) => {
      const arc = arcPoints(
        cx,
        cy,
        RING_RADIUS,
        -90 + i * 60 + angle,
        ARC_SWEEP,
        SAMPLES,
      );
      const line = lines.get(chapter);
      if (!line) return { source: arc, target: arc };
      const target = resamplePolyline(
        line.map((p): Pt => {
          const q = map.project(p);
          return [q.x, q.y];
        }),
        SAMPLES,
      );
      return { source: orientToMatch(arc, target), target };
    });

    // Bake the rotation into the source points; the group stops rotating.
    groupRef.current?.removeAttribute("transform");

    const apply = (t: number) => {
      const k = easeInOutCubic(t);
      tweens.forEach((tween, i) => {
        const path = pathRefs.current[i];
        if (!path) return;
        path.setAttribute(
          "d",
          toSvgPath(lerpPolylines(tween.source, tween.target, k)),
        );
        path.setAttribute(
          "stroke-width",
          String(RING_STROKE + (ROUTE_STROKE - RING_STROKE) * k),
        );
        path.setAttribute(
          "stroke-opacity",
          String(1 + (ROUTE_OPACITY - 1) * k),
        );
      });
    };

    let raf = 0;
    let finished = false;
    const onRoutesDrawn = () => {
      // The canvas now shows the routes — drop the identical SVG. Restore
      // maplibre's default paint transition for the later selection dims.
      map.setPaintProperty("routes", "line-opacity-transition", {
        duration: 300,
      });
      onDoneRef.current();
    };
    const finish = () => {
      if (finished) return;
      finished = true;
      cancelAnimationFrame(raf);
      apply(1);
      // Flip the real layer on with no transition (the overlay sets the
      // value itself — waiting on the parent's effect could race the render
      // below), and cut only once a frame with the routes has been drawn.
      map.setPaintProperty("routes", "line-opacity-transition", {
        duration: 0,
      });
      map.setPaintProperty("routes", "line-opacity", ROUTE_OPACITY);
      onRevealRef.current();
      map.once("render", onRoutesDrawn);
    };
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min((now - start) / MORPH_MS, 1);
      apply(t);
      if (t >= 1) {
        finish();
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    apply(0);
    raf = requestAnimationFrame(tick);

    // The camera moving (or a resize) makes the projection stale — jump to
    // the end state rather than animating against the wrong geometry.
    map.on("movestart", finish);
    window.addEventListener("resize", finish);
    return () => {
      cancelAnimationFrame(raf);
      map.off("movestart", finish);
      map.off("render", onRoutesDrawn);
      window.removeEventListener("resize", finish);
    };
  }, [phase, mapRef]);

  // The skip-path fade hands back to the parent once it completes.
  useEffect(() => {
    if (phase !== "exit") return;
    const id = setTimeout(() => onDoneRef.current(), EXIT_MS + 60);
    return () => clearTimeout(id);
  }, [phase]);

  const fading = phase !== "loading";
  return (
    <div
      ref={wrapRef}
      aria-hidden
      className="absolute inset-0 z-40"
      style={{ pointerEvents: phase === "loading" ? "auto" : "none" }}
    >
      <div
        className="absolute inset-0 bg-[#f8f4f0]"
        style={{
          opacity: fading ? 0 : 1,
          transition: `opacity ${FADE_MS}ms ease`,
        }}
      />
      <svg
        className="absolute inset-0 h-full w-full"
        style={{
          opacity: phase === "exit" ? 0 : 1,
          transition: `opacity ${EXIT_MS}ms ease`,
        }}
      >
        {size && (
          <g
            ref={groupRef}
            transform={`rotate(${bootAngle} ${size.w / 2} ${size.h / 2})`}
          >
            {CHAPTERS.map((chapter, i) => (
              <path
                key={chapter}
                ref={(el) => {
                  pathRefs.current[i] = el;
                }}
                d={toSvgPath(
                  arcPoints(
                    size.w / 2,
                    size.h / 2,
                    RING_RADIUS,
                    -90 + i * 60,
                    ARC_SWEEP,
                    64,
                  ),
                )}
                stroke={CHAPTER_COLORS[chapter]}
                strokeWidth={RING_STROKE}
                fill="none"
                strokeLinecap="butt"
              />
            ))}
          </g>
        )}
      </svg>
    </div>
  );
}
