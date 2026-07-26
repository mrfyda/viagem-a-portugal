import "maplibre-gl/dist/maplibre-gl.css";

import maplibregl from "maplibre-gl";
import {
  useEffect,
  useReducer,
  useRef,
  useState,
  type CSSProperties,
} from "react";

import { useCountUp } from "../hooks/useCountUp";
import { useProgress } from "../hooks/useProgress";
import { useSelection } from "../hooks/useSelection";
import { useSession } from "../hooks/useSession";
import {
  buildTownsGeoJson,
  placeCenter,
  PORTUGAL_BOUNDS,
  routesGeoJson,
  stops,
} from "../lib/geo";
import { detourBySlug, detourCenter, detoursGeoJson } from "../lib/detours";
import {
  chapterDim,
  DETOUR_COLOR,
  DETOUR_HIT_RADIUS,
  fetchMapStyle,
  MARKER_MIN_RADIUS,
  ROUTE_COLOR,
  routeOpacity,
  SELECTED_DOT_RADIUS,
  SELECTED_HALO_RADIUS,
  SELECTION_RING_COLOR,
  TIER_INTERACTIVE_ZOOM,
  TOWN_COLOR,
  TOWN_HIT_RADIUS,
  TOWN_OPACITY,
  TOWN_RADIUS,
  TOWN_STROKE_OPACITY,
  townOpacity,
  townStrokeOpacity,
} from "../lib/mapStyle";
import { t } from "../lib/i18n";
import { useIsDesktop } from "../hooks/useIsDesktop";
import AuthPanel from "./AuthPanel";
import DetourDetailPanel from "./DetourDetailPanel";
import JourneyRevealOverlay from "./JourneyRevealOverlay";
import { DESKTOP_CHROME_WIDTH } from "./MapDesktopPanel";
import MapHoverCard, { type HoverTarget } from "./MapHoverCard";
import MapSidebar from "./MapSidebar";
import TownDetailPanel from "./TownDetailPanel";

// Filter matching no Place — the selected-dot layers' resting state.
const NO_SELECTION: maplibregl.FilterSpecification = [
  "==",
  ["get", "indexName"],
  "\u0000",
];

/** A hovered feature plus the dot's coordinates, for anchoring the card. */
type Hover = HoverTarget & { lngLat: [number, number] };

// Hover-preview card geometry: fixed width, clamped into the container,
// flipped above/below the dot by whichever half of the map it sits in —
// max-height is whatever room that side leaves.
const HOVER_CARD_WIDTH = 288;
const HOVER_CARD_MARGIN = 12;
const HOVER_CARD_GAP = 14;

function hoverCardStyle(
  point: { x: number; y: number },
  container: HTMLElement,
): CSSProperties {
  const half = HOVER_CARD_WIDTH / 2;
  const left = Math.min(
    Math.max(point.x, half + HOVER_CARD_MARGIN),
    container.clientWidth - half - HOVER_CARD_MARGIN,
  );
  const below = point.y < container.clientHeight / 2;
  return {
    left,
    top: point.y,
    width: HOVER_CARD_WIDTH,
    maxHeight: (below ? container.clientHeight - point.y : point.y) - 30,
    transform: below
      ? `translate(-50%, ${HOVER_CARD_GAP}px)`
      : `translate(-50%, calc(-100% - ${HOVER_CARD_GAP}px))`,
  };
}

export default function TravelMap() {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const { selection, selectPlace, selectDetour, clear } = useSelection();
  const selectedPlace = selection?.kind === "place" ? selection.id : null;
  const selectedDetour =
    selection?.kind === "detour" ? detourBySlug(selection.slug) ?? null : null;
  // Chapter focus: one Route holds the stage (sidebar stop list + map dim).
  const [focusedChapter, setFocusedChapter] = useState<number | null>(null);

  // The journey-reveal loading choreography (JourneyRevealOverlay): the
  // routes layer stays at opacity 0 until the overlay's ring has morphed
  // into the route shapes — `revealed` flips it on (maplibre's default
  // 300ms paint transition is the crossfade), `overlayDone` unmounts the
  // overlay. A deep link at mount skips the morph: someone following a
  // shared ?place= link is owed their destination, not a show.
  const [revealed, setRevealed] = useState(false);
  const [overlayDone, setOverlayDone] = useState(false);
  const skipRevealRef = useRef(selection != null);

  // Desktop hover preview (touches never reach it — see the touchstart
  // guard). Closing runs on a short grace timer so the cursor can travel
  // from the dot into the card without it vanishing en route.
  const [hover, setHover] = useState<Hover | null>(null);
  const hoverKeyRef = useRef<string | null>(null);
  const hoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cancelHoverClose = () => {
    if (hoverTimerRef.current == null) return;
    clearTimeout(hoverTimerRef.current);
    hoverTimerRef.current = null;
  };
  const scheduleHoverClose = () => {
    cancelHoverClose();
    hoverTimerRef.current = setTimeout(() => {
      hoverTimerRef.current = null;
      setHover(null);
    }, 320);
  };
  const closeHover = () => {
    cancelHoverClose();
    hoverKeyRef.current = null;
    setHover(null);
  };

  // The card anchors to the dot's projected screen position; while the
  // camera moves (drag, wheel, easeTo) re-render so it stays glued to the
  // dot — the maplibre Popup used to do this tracking internally.
  const [, bumpHoverAnchor] = useReducer((n: number) => n + 1, 0);
  useEffect(() => {
    if (!hover || !mapReady) return;
    const map = mapRef.current;
    if (!map) return;
    map.on("move", bumpHoverAnchor);
    return () => {
      map.off("move", bumpHoverAnchor);
    };
  }, [hover, mapReady]);

  const isDesktop = useIsDesktop();
  const { session, loading: authLoading, configured, signIn, signUp, signOut } =
    useSession();
  const { visits, toggle, setVisitDate, metrics } = useProgress(
    session?.user.id ?? null,
  );
  const visitsRef = useRef(visits);
  visitsRef.current = visits;
  // Quiet count-up when a Visit lands — the "pages travelled" tally ticks up.
  const townsCount = useCountUp(metrics.townsVisited);
  const pagesCount = useCountUp(metrics.pagesVisited);
  // The tweened counts drive the achievements view's progress bars — labels and
  // fills both, so the "pages travelled" tick-up survives the move off the
  // old header line.
  const animatedMetrics = {
    ...metrics,
    townsVisited: townsCount,
    pagesVisited: pagesCount,
  };

  const [authOpen, setAuthOpen] = useState(false);
  // a gated action: the place whose visited-toggle opened sign-in, applied
  // once the Traveler is in
  const [pendingPlace, setPendingPlace] = useState<string | null>(null);
  const toggleRef = useRef(toggle);
  toggleRef.current = toggle;

  useEffect(() => {
    if (!session) return;
    if (pendingPlace) {
      toggleRef.current(pendingPlace);
      setPendingPlace(null);
    }
    setAuthOpen(false);
  }, [session, pendingPlace]);

  useEffect(() => {
    setLoadFailed(false);
    setMapReady(false);
    let cancelled = false;
    let map: maplibregl.Map | undefined;

    // fetch the style ourselves (offline or an ad blocker otherwise leaves
    // a silent blank map) and boost rail visibility before handing it over
    fetchMapStyle()
      .then((style) => {
        if (cancelled) return;
        // Open on the whole country, padded so the sidebar (desktop) or the
        // top bar + tab bar (mobile) never eat into Portugal itself.
        const desktop = window.matchMedia?.("(min-width: 768px)").matches;
        map = new maplibregl.Map({
          container: containerRef.current!,
          style,
          bounds: PORTUGAL_BOUNDS,
          fitBoundsOptions: {
            padding: desktop
              ? { top: 24, right: 24, bottom: 24, left: DESKTOP_CHROME_WIDTH + 24 }
              : { top: 72, right: 16, bottom: 96, left: 16 },
          },
          attributionControl: { compact: true },
        });
        mapRef.current = map;
        if (__DEV__) (globalThis as Record<string, unknown>).__travelMap = map;
        wireMap(map);
      })
      .catch((error) => {
        console.warn("Map style failed to load:", error);
        if (!cancelled) setLoadFailed(true);
      });

    const wireMap = (map: maplibregl.Map) => map.on("load", () => {
      map.addSource("routes", { type: "geojson", data: routesGeoJson });
      map.addLayer({
        id: "routes",
        type: "line",
        source: "routes",
        // Hidden until the loading overlay reveals the journey (the dim
        // effect below owns line-opacity from then on).
        paint: { "line-color": ROUTE_COLOR, "line-width": 2.5, "line-opacity": 0 },
      });

      map.addSource("towns", {
        type: "geojson",
        data: buildTownsGeoJson(visitsRef.current),
      });
      map.addLayer({
        id: "towns",
        type: "circle",
        source: "towns",
        paint: {
          "circle-radius": TOWN_RADIUS,
          "circle-color": TOWN_COLOR,
          "circle-opacity": TOWN_OPACITY,
          "circle-stroke-color": "#ffffff",
          "circle-stroke-width": 1.5,
          "circle-stroke-opacity": TOWN_STROKE_OPACITY,
        },
      });

      // Detours (ADR 0010): hollow grey rings, above the town dots and clear of
      // the routes — they read as "not part of the journey".
      map.addSource("detours", { type: "geojson", data: detoursGeoJson });
      map.addLayer({
        id: "detours",
        type: "circle",
        source: "detours",
        // Off-book context: keep Detours out of the country-zoom picture.
        minzoom: 8,
        paint: {
          "circle-radius": MARKER_MIN_RADIUS,
          "circle-color": DETOUR_COLOR,
          "circle-stroke-color": "#ffffff",
          "circle-stroke-width": 2,
        },
      });

      // The selected Place, above everything: an ink halo ring plus the dot
      // itself re-drawn at full strength (the base layer dims while a
      // selection is active). Filters start matching nothing; the selection
      // effect below swaps them as ?place= changes.
      map.addLayer({
        id: "towns-selected-halo",
        type: "circle",
        source: "towns",
        filter: NO_SELECTION,
        paint: {
          "circle-radius": SELECTED_HALO_RADIUS,
          "circle-color": "rgba(0,0,0,0)",
          "circle-stroke-color": SELECTION_RING_COLOR,
          "circle-stroke-width": 2,
          "circle-stroke-opacity": 0.85,
        },
      });
      map.addLayer({
        id: "towns-selected",
        type: "circle",
        source: "towns",
        filter: NO_SELECTION,
        paint: {
          "circle-radius": SELECTED_DOT_RADIUS,
          "circle-color": TOWN_COLOR,
          "circle-stroke-color": "#ffffff",
          "circle-stroke-width": 2,
        },
      });

      // Interaction happens on invisible fat hit layers, not the visible
      // dots: every place gets a finger-sized target even when its dot is
      // tiny. Rendered (near-transparent, top of the stack) because
      // queryRenderedFeatures only sees painted circles.
      map.addLayer({
        id: "towns-hit",
        type: "circle",
        source: "towns",
        paint: {
          "circle-color": "#000000",
          "circle-opacity": 0.001,
          "circle-radius": TOWN_HIT_RADIUS,
        },
      });
      map.addLayer({
        id: "detours-hit",
        type: "circle",
        source: "detours",
        minzoom: 8,
        paint: {
          "circle-color": "#000000",
          "circle-opacity": 0.001,
          "circle-radius": DETOUR_HIT_RADIUS,
        },
      });

      // Dots below their disclosure tier render at radius 0 but their hit
      // circles still paint — only interact with the ones actually visible.
      const townInteractive = (f: maplibregl.MapGeoJSONFeature) =>
        map.getZoom() >= TIER_INTERACTIVE_ZOOM[f.properties.tier as number];

      // Query a small box around the pointer and take the nearest candidate,
      // so near-misses land and overlapping dots resolve predictably.
      const pickFeature = (point: { x: number; y: number }) => {
        const features = map.queryRenderedFeatures(
          [
            [point.x - 6, point.y - 6],
            [point.x + 6, point.y + 6],
          ],
          { layers: ["towns-hit", "detours-hit"] },
        );
        let best: maplibregl.MapGeoJSONFeature | undefined;
        let bestDistance = Infinity;
        for (const feature of features) {
          if (feature.layer.id === "towns-hit" && !townInteractive(feature))
            continue;
          if (feature.geometry.type !== "Point") continue;
          const p = map.project(
            feature.geometry.coordinates as [number, number],
          );
          const d = (p.x - point.x) ** 2 + (p.y - point.y) ** 2;
          if (d < bestDistance) {
            bestDistance = d;
            best = feature;
          }
        }
        return best;
      };

      const applyHover = (
        feature: maplibregl.MapGeoJSONFeature | undefined,
      ) => {
        const key =
          feature == null
            ? null
            : feature.layer.id === "detours-hit"
              ? `detour:${feature.properties.slug}`
              : `place:${feature.properties.indexName}`;
        map.getCanvas().style.cursor = key ? "pointer" : "";
        if (feature == null || feature.geometry.type !== "Point") {
          // Only the transition off a dot arms the close timer — further
          // empty-map moves must not keep postponing it.
          if (hoverKeyRef.current != null) {
            hoverKeyRef.current = null;
            scheduleHoverClose();
          }
          return;
        }
        cancelHoverClose();
        if (key === hoverKeyRef.current) return;
        hoverKeyRef.current = key;
        const [lon, lat] = feature.geometry.coordinates as [number, number];
        setHover(
          feature.layer.id === "detours-hit"
            ? {
                kind: "detour",
                slug: feature.properties.slug as string,
                lngLat: [lon, lat],
              }
            : {
                kind: "place",
                id: feature.properties.indexName as string,
                lngLat: [lon, lat],
              },
        );
      };

      // iOS WebKit synthesizes mouse events after a tap; treat any "hover"
      // within 600ms of a touch as the tap it really was (the click handler
      // owns it) — otherwise the hover card opens on tap and sticks, since
      // no mouseleave ever comes.
      let lastTouch = 0;
      map.on("touchstart", () => {
        lastTouch = Date.now();
      });
      map.on("mousemove", (event) => {
        if (Date.now() - lastTouch < 600) return;
        applyHover(pickFeature(event.point));
      });
      map.on("mouseout", () => {
        // Off the canvas — possibly onto the hover card itself, whose
        // mouseenter cancels the grace timer.
        hoverKeyRef.current = null;
        map.getCanvas().style.cursor = "";
        scheduleHoverClose();
      });

      // One click handler for everything: the nearest hit opens the entry;
      // open water/land backs out of the current selection — the map is an
      // exit, not a dead surface.
      map.on("click", (event) => {
        closeHover();
        const feature = pickFeature(event.point);
        if (!feature) {
          clear();
          return;
        }
        if (feature.layer.id === "detours-hit")
          selectDetour(feature.properties.slug as string);
        else selectPlace(feature.properties.indexName as string);
      });

      setMapReady(true);
    });

    return () => {
      cancelled = true;
      closeHover();
      mapRef.current = null;
      map?.remove();
    };
  }, [attempt]);

  // Zoom + geolocate live bottom-right on both breakpoints: on desktop the
  // sidebar owns the left edge; on mobile bottom-right is the one-handed
  // thumb zone (the CSS raises the corner stack above the glass tab bar, and
  // the half-height place sheet covers it only while an entry is open).
  // Re-runs when the breakpoint flips. The geolocate button drops the
  // standard blue location dot + accuracy ring and recentres on the visitor —
  // pure browser geolocation, no Visit data.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    const corner = "bottom-right";
    const nav = new maplibregl.NavigationControl();
    const geolocate = new maplibregl.GeolocateControl({
      positionOptions: { enableHighAccuracy: true },
      trackUserLocation: true,
      showUserLocation: true,
    });
    map.addControl(nav, corner);
    map.addControl(geolocate, corner);
    return () => {
      // No-op if the map was already torn down (attempt change / unmount).
      try {
        map.removeControl(nav);
        map.removeControl(geolocate);
      } catch {
        // map removed
      }
    };
  }, [mapReady]);

  useEffect(() => {
    if (!mapReady) return;
    const source = mapRef.current?.getSource<maplibregl.GeoJSONSource>("towns");
    source?.setData(buildTownsGeoJson(visits));
  }, [visits, mapReady]);

  // Mirror the selection / chapter focus onto the canvas: halo +
  // full-strength dot on the selected Place, or the focused chapter's dots
  // and route at full strength — everything else stepped back, so the panel
  // and the map always point at the same thing.
  useEffect(() => {
    if (!mapReady) return;
    const map = mapRef.current;
    if (!map) return;
    const filter: maplibregl.FilterSpecification = selectedPlace
      ? ["==", ["get", "indexName"], selectedPlace]
      : NO_SELECTION;
    map.setFilter("towns-selected-halo", filter);
    map.setFilter("towns-selected", filter);
    const dim = selectedPlace
      ? 0.45
      : focusedChapter != null
        ? chapterDim(focusedChapter)
        : 1;
    map.setPaintProperty("towns", "circle-opacity", townOpacity(dim));
    map.setPaintProperty("towns", "circle-stroke-opacity", townStrokeOpacity(dim));
    map.setPaintProperty(
      "routes",
      "line-opacity",
      !revealed ? 0 : selectedPlace ? 0.35 : routeOpacity(focusedChapter),
    );
  }, [selectedPlace, focusedChapter, mapReady, revealed]);

  // Escape backs out one level — place/detour first, then chapter focus —
  // unless an input owns the keyboard (the search field handles its own).
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      const target = event.target as HTMLElement | null;
      if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement)
        return;
      if (selection) clear();
      else setFocusedChapter(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selection, clear]);

  // Bring the current selection into view — a Place or a Detour — whether it
  // came from a map click, the search box, a shared deep link, or back/forward.
  // From country zoom the camera also glides closer, so picking a place shows
  // its surroundings (and its disclosure-tier neighbours) instead of a lone
  // ring on the national map. Desktop pads for the sidebar, mobile for the
  // half-height place sheet, so the selection centres in the visible map.
  useEffect(() => {
    if (!mapReady) return;
    const map = mapRef.current;
    if (!map) return;
    if (!selection) {
      // easeTo padding persists on the camera; drop it so later camera moves
      // (chapter fits, manual pans) aren't offset by a ghost sidebar.
      map.easeTo({ padding: { top: 0, right: 0, bottom: 0, left: 0 }, duration: 0 });
      return;
    }
    const center =
      selection.kind === "place"
        ? placeCenter(selection.id)
        : detourCenter(selection.slug);
    if (center) {
      // CSS prefers-reduced-motion can't reach maplibre's JS pan, so honour it
      // here: jump instantly instead of an eased flight.
      const reduce = window.matchMedia?.(
        "(prefers-reduced-motion: reduce)",
      ).matches;
      map.easeTo({
        center,
        zoom: Math.max(map.getZoom(), 8.6),
        padding: isDesktop
          ? { top: 0, right: 0, bottom: 0, left: DESKTOP_CHROME_WIDTH + 24 }
          : {
              top: 0,
              right: 0,
              bottom: Math.round(map.getContainer().clientHeight * 0.4),
              left: 0,
            },
        duration: reduce ? 0 : 700,
      });
    }
  }, [selection, mapReady, isDesktop]);

  const focusChapter = (n: number) => {
    setFocusedChapter(n);
    const map = mapRef.current;
    if (!map) return;
    const chapterStops = stops.filter((s) => s.chapter === n);
    const lats = chapterStops.map((s) => s.latitude);
    const lons = chapterStops.map((s) => s.longitude);
    // Fit around the open chrome: the sidebar on desktop; the top bar and the
    // journey bottom sheet (max 55vh, floated above the tab bar) on mobile —
    // otherwise half the chapter lands underneath the sheet.
    const padding = isDesktop
      ? { top: 48, right: 48, bottom: 48, left: DESKTOP_CHROME_WIDTH + 48 }
      : {
          top: 72,
          right: 24,
          bottom: Math.round(map.getContainer().clientHeight * 0.55) + 24,
          left: 24,
        };
    map.fitBounds(
      [
        [Math.min(...lons), Math.min(...lats)],
        [Math.max(...lons), Math.max(...lats)],
      ],
      { padding, maxZoom: 9 },
    );
  };

  const detailProps = selectedPlace
    ? {
        isVisited: visits.has(selectedPlace),
        visitDate: visits.get(selectedPlace) ?? null,
        canAct: session != null,
        onRequestSignIn: configured
          ? () => {
              setPendingPlace(selectedPlace);
              setAuthOpen(true);
            }
          : null,
        onToggleVisited: () => toggle(selectedPlace),
        onVisitDateChange: (date: string | null) =>
          setVisitDate(selectedPlace, date),
        onClose: clear,
        onNavigate: selectPlace,
      }
    : null;



  return (
    <div style={{ width: "100%", height: "100%", position: "relative" }}>
      <div ref={containerRef} style={{ width: "100%", height: "100%" }} />

      {(() => {
        const header = session ? (
          <span className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="truncate">{session.user.email}</span>
            <button
              onClick={() => void signOut()}
              className="shrink-0 underline hover:text-foreground"
            >
              {t("signOut")}
            </button>
          </span>
        ) : authOpen ? (
          <AuthPanel
            onSignIn={signIn}
            onSignUp={signUp}
            onCancel={() => {
              setAuthOpen(false);
              setPendingPlace(null);
            }}
          />
        ) : (
          <>
            {configured && !authLoading && (
              <>
                <span className="text-xs text-muted-foreground">{t("trackPitch")}</span>
                <button
                  onClick={() => setAuthOpen(true)}
                  className="h-8 self-start rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                >
                  {t("signIn")}
                </button>
              </>
            )}
          </>
        );
        return (
          <MapSidebar
            isDesktop={isDesktop}
            header={header}
            hasAccount={configured}
            visits={session ? visits : null}
            metrics={animatedMetrics}
            focusedChapter={focusedChapter}
            onFocusChapter={focusChapter}
            onClearFocus={() => setFocusedChapter(null)}
            onSelectPlace={selectPlace}
            selectedPlace={selectedPlace}
            detailProps={detailProps}
            selectedDetour={selectedDetour}
            onCloseDetour={clear}
          />
        );
      })()}

      {hover && mapReady && mapRef.current && containerRef.current && (
        <MapHoverCard
          key={hover.kind === "place" ? hover.id : hover.slug}
          target={hover}
          visited={hover.kind === "place" && visits.has(hover.id)}
          visitDate={
            hover.kind === "place" ? visits.get(hover.id) ?? null : null
          }
          style={hoverCardStyle(
            mapRef.current.project(hover.lngLat),
            containerRef.current,
          )}
          onMouseEnter={cancelHoverClose}
          onMouseLeave={scheduleHoverClose}
          onClick={() => {
            closeHover();
            if (hover.kind === "place") selectPlace(hover.id);
            else selectDetour(hover.slug);
          }}
        />
      )}

      {!isDesktop && selectedPlace != null && detailProps && (
        <TownDetailPanel place={selectedPlace} {...detailProps} />
      )}
      {!isDesktop && selectedDetour && (
        <DetourDetailPanel detour={selectedDetour} onClose={clear} />
      )}

      {!overlayDone && !loadFailed && (
        <JourneyRevealOverlay
          mapRef={mapRef}
          mapReady={mapReady}
          skipMorph={skipRevealRef.current}
          onRevealRoutes={() => setRevealed(true)}
          onDone={() => setOverlayDone(true)}
        />
      )}

      {loadFailed && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-secondary p-6 text-center text-sm text-foreground">
          <strong>{t("mapFailed")}</strong>
          <span>
            {t("mapFailedHint")} <code>tiles.openfreemap.org</code>.
          </span>
          <button
            onClick={() => setAttempt((n) => n + 1)}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            {t("tryAgain")}
          </button>
        </div>
      )}
    </div>
  );
}
