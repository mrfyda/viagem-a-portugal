import "maplibre-gl/dist/maplibre-gl.css";

import type { Point } from "geojson";
import maplibregl from "maplibre-gl";
import { useEffect, useRef, useState } from "react";

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
  fetchMapStyle,
  MARKER_MIN_RADIUS,
  ROUTE_COLOR,
  routeOpacity,
  SELECTED_DOT_RADIUS,
  SELECTED_HALO_RADIUS,
  SELECTION_RING_COLOR,
  TIER_INTERACTIVE_ZOOM,
  TOWN_COLOR,
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
import MapSidebar from "./MapSidebar";
import TownDetailPanel from "./TownDetailPanel";

// Filter matching no Place — the selected-dot layers' resting state.
const NO_SELECTION: maplibregl.FilterSpecification = [
  "==",
  ["get", "indexName"],
  "\u0000",
];

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
              ? { top: 24, right: 24, bottom: 24, left: 396 }
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
        paint: { "line-color": ROUTE_COLOR, "line-width": 2.5, "line-opacity": 0.75 },
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

      // Dots below their disclosure tier render at radius 0 but still
      // hit-test — only interact with the ones actually visible.
      const visibleTown = (features?: maplibregl.MapGeoJSONFeature[]) =>
        features?.find(
          (f) => map.getZoom() >= TIER_INTERACTIVE_ZOOM[f.properties.tier as number],
        );

      const popup = new maplibregl.Popup({ closeButton: false, closeOnClick: false });
      map.on("mouseenter", "towns", (event) => {
        const feature = visibleTown(event.features);
        if (!feature) return;
        map.getCanvas().style.cursor = "pointer";
        const [lon, lat] = (feature.geometry as Point).coordinates;
        const { name, pagesLabel, visitedDate } = feature.properties;
        const parts = [pagesLabel ? `${name} — pp. ${pagesLabel}` : name];
        if (visitedDate) parts.push(`visited ${visitedDate}`);
        popup.setLngLat([lon, lat]).setText(parts.join(" · ")).addTo(map);
      });
      map.on("mouseleave", "towns", () => {
        map.getCanvas().style.cursor = "";
        popup.remove();
      });
      map.on("click", "towns", (event) => {
        const feature = visibleTown(event.features);
        if (feature) selectPlace(feature.properties.indexName);
      });

      // Clicking open water/land backs out of the current selection — the
      // map is an exit, not a dead surface. (Layer clicks above also reach
      // this handler; a visible hit means it wasn't a background click.)
      map.on("click", (event) => {
        const features = map.queryRenderedFeatures(event.point, {
          layers: ["towns", "detours"],
        });
        const hit = features.some(
          (f) =>
            f.layer.id === "detours" ||
            map.getZoom() >= TIER_INTERACTIVE_ZOOM[f.properties.tier as number],
        );
        if (!hit) clear();
      });

      map.on("click", "detours", (event) => {
        const feature = event.features?.[0];
        if (feature) selectDetour(feature.properties.slug as string);
      });
      map.on("mouseenter", "detours", (event) => {
        const feature = event.features?.[0];
        if (!feature) return;
        map.getCanvas().style.cursor = "pointer";
        const [lon, lat] = (feature.geometry as Point).coordinates;
        popup
          .setLngLat([lon, lat])
          .setText(feature.properties.name as string)
          .addTo(map);
      });
      map.on("mouseleave", "detours", () => {
        map.getCanvas().style.cursor = "";
        popup.remove();
      });

      setMapReady(true);
    });

    return () => {
      cancelled = true;
      mapRef.current = null;
      map?.remove();
    };
  }, [attempt]);

  // Place the zoom + geolocate controls clear of the open chrome so they never
  // sit under a panel. On desktop the tall left sidebar owns the left edge, so
  // both controls go bottom-right. On mobile the chrome is a narrow top-left
  // card plus a bottom-sheet panel, leaving the top-right corner free — both
  // controls live there so the bottom sheet never buries them. Re-runs when the
  // breakpoint flips. The geolocate button drops the standard blue location dot
  // + accuracy ring and recentres on the visitor — pure browser geolocation, no
  // Visit data.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    const corner = isDesktop ? "bottom-right" : "top-right";
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
  }, [mapReady, isDesktop]);

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
      selectedPlace ? 0.35 : routeOpacity(focusedChapter),
    );
  }, [selectedPlace, focusedChapter, mapReady]);

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
  // ring on the national map. Desktop pads for the sidebar so the selection
  // centres in the visible map, not under the chrome.
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
        padding: isDesktop ? { top: 0, right: 0, bottom: 0, left: 396 } : 0,
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
      ? { top: 48, right: 48, bottom: 48, left: 396 + 48 }
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
          <>
            <span>
              {t("progress", {
                towns: townsCount,
                townsTotal: metrics.townsTotal,
                pages: pagesCount,
                pagesTotal: metrics.pagesTotal,
              })}
            </span>
            <span className="text-xs text-muted-foreground">{t("clickHint")}</span>
            <span className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="truncate">{session.user.email}</span>
              <button
                onClick={() => void signOut()}
                className="shrink-0 underline hover:text-foreground"
              >
                {t("signOut")}
              </button>
            </span>
          </>
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
            {/* The one orientation line an anonymous reader gets. */}
            <span className="text-xs text-muted-foreground">{t("exploreHint")}</span>
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

      {!isDesktop && selectedPlace != null && detailProps && (
        <TownDetailPanel place={selectedPlace} {...detailProps} />
      )}
      {!isDesktop && selectedDetour && (
        <DetourDetailPanel detour={selectedDetour} onClose={clear} />
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
