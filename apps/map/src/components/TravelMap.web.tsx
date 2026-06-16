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
  INITIAL_ZOOM,
  MAP_CENTER,
  placeCenter,
  routesGeoJson,
  stops,
} from "../lib/geo";
import { detourBySlug, detourCenter, detoursGeoJson } from "../lib/detours";
import {
  DETOUR_COLOR,
  fetchMapStyle,
  MARKER_MIN_RADIUS,
  ROUTE_COLOR,
  TOWN_COLOR,
  TOWN_RADIUS,
} from "../lib/mapStyle";
import { t } from "../lib/i18n";
import { useIsDesktop } from "../hooks/useIsDesktop";
import AuthPanel from "./AuthPanel";
import DetourDetailPanel from "./DetourDetailPanel";
import MapSidebar from "./MapSidebar";
import TownDetailPanel from "./TownDetailPanel";

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
        map = new maplibregl.Map({
          container: containerRef.current!,
          style,
          center: MAP_CENTER,
          zoom: INITIAL_ZOOM,
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
          "circle-stroke-color": "#ffffff",
          "circle-stroke-width": 1.5,
        },
      });

      // Detours (ADR 0010): hollow grey rings, above the town dots and clear of
      // the routes — they read as "not part of the journey".
      map.addSource("detours", { type: "geojson", data: detoursGeoJson });
      map.addLayer({
        id: "detours",
        type: "circle",
        source: "detours",
        paint: {
          "circle-radius": MARKER_MIN_RADIUS,
          "circle-color": DETOUR_COLOR,
          "circle-stroke-color": "#ffffff",
          "circle-stroke-width": 2,
        },
      });

      const popup = new maplibregl.Popup({ closeButton: false, closeOnClick: false });
      map.on("mouseenter", "towns", (event) => {
        const feature = event.features?.[0];
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
        const feature = event.features?.[0];
        if (feature) selectPlace(feature.properties.indexName);
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

  // Bring the current selection into view — a Place or a Detour — whether it
  // came from a map click, the search box, a shared deep link, or back/forward.
  useEffect(() => {
    if (!mapReady || !selection) return;
    const center =
      selection.kind === "place"
        ? placeCenter(selection.id)
        : detourCenter(selection.slug);
    if (center) {
      // CSS prefers-reduced-motion can't reach maplibre's JS pan, so honour it
      // here: jump instantly instead of a 600ms ease.
      const reduce = window.matchMedia?.(
        "(prefers-reduced-motion: reduce)",
      ).matches;
      mapRef.current?.easeTo({ center, duration: reduce ? 0 : 600 });
    }
  }, [selection, mapReady]);

  const focusChapter = (n: number) => {
    const chapterStops = stops.filter((s) => s.chapter === n);
    const lats = chapterStops.map((s) => s.latitude);
    const lons = chapterStops.map((s) => s.longitude);
    mapRef.current?.fitBounds(
      [
        [Math.min(...lons), Math.min(...lats)],
        [Math.max(...lons), Math.max(...lats)],
      ],
      { padding: 60, maxZoom: 9 },
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
          configured &&
          !authLoading && (
            <>
              <span className="text-xs text-muted-foreground">{t("trackPitch")}</span>
              <button
                onClick={() => setAuthOpen(true)}
                className="h-8 self-start rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-primary/90"
              >
                {t("signIn")}
              </button>
            </>
          )
        );
        return (
          <MapSidebar
            isDesktop={isDesktop}
            header={header}
            onFocusChapter={focusChapter}
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
