import "maplibre-gl/dist/maplibre-gl.css";

import type { Point } from "geojson";
import maplibregl from "maplibre-gl";
import { useEffect, useRef, useState } from "react";

import { useProgress } from "../hooks/useProgress";
import {
  buildTownsGeoJson,
  INITIAL_ZOOM,
  MAP_CENTER,
  routesGeoJson,
  stops,
} from "../lib/geo";
import { chapters } from "../lib/book";
import {
  CHAPTER_COLORS,
  fetchMapStyle,
  ROUTE_COLOR,
  TOWN_COLOR,
  TOWN_RADIUS,
} from "../lib/mapStyle";
import { t } from "../lib/i18n";
import { useIsDesktop } from "../hooks/useIsDesktop";
import ChapterSidebar from "./ChapterSidebar";
import TownDetailPanel from "./TownDetailPanel";
import TownSearch from "./TownSearch";

export default function TravelMap() {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [selectedPlace, setSelectedPlace] = useState<string | null>(null);
  const [hiddenChapters, setHiddenChapters] = useState<ReadonlySet<number>>(
    new Set(),
  );

  const isDesktop = useIsDesktop();
  const { visits, toggle, setVisitDate, metrics } = useProgress();
  const visitsRef = useRef(visits);
  visitsRef.current = visits;

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
        });
        mapRef.current = map;
        if (__DEV__) (globalThis as Record<string, unknown>).__travelMap = map;
        map.addControl(new maplibregl.NavigationControl());
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
        if (feature) setSelectedPlace(feature.properties.indexName);
      });

      setMapReady(true);
    });

    return () => {
      cancelled = true;
      mapRef.current = null;
      map?.remove();
    };
  }, [attempt]);

  useEffect(() => {
    if (!mapReady) return;
    const source = mapRef.current?.getSource<maplibregl.GeoJSONSource>("towns");
    source?.setData(buildTownsGeoJson(visits));
  }, [visits, mapReady]);

  useEffect(() => {
    if (!mapReady) return;
    const visible = chapters
      .map((c) => c.number)
      .filter((n) => !hiddenChapters.has(n));
    mapRef.current?.setFilter("routes", [
      "in",
      ["get", "chapter"],
      ["literal", visible],
    ]);
  }, [hiddenChapters, mapReady]);

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

  const toggleChapter = (n: number) =>
    setHiddenChapters((current) => {
      const next = new Set(current);
      if (next.has(n)) {
        next.delete(n);
        focusChapter(n);
      } else {
        next.add(n);
      }
      return next;
    });

  const detailProps = selectedPlace
    ? {
        isVisited: visits.has(selectedPlace),
        visitDate: visits.get(selectedPlace) ?? null,
        onToggleVisited: () => toggle(selectedPlace),
        onVisitDateChange: (date: string | null) =>
          setVisitDate(selectedPlace, date),
        onClose: () => setSelectedPlace(null),
      }
    : null;



  return (
    <div style={{ width: "100%", height: "100%", position: "relative" }}>
      <div ref={containerRef} style={{ width: "100%", height: "100%" }} />

      <div className="absolute left-3 top-3 flex max-w-[280px] flex-col gap-1.5 rounded-lg border border-border bg-card/95 p-4 text-sm text-foreground shadow-sm">
        <strong className="text-base">Viagem a Portugal</strong>
        <span>
          {t("progress", {
            towns: metrics.townsVisited,
            townsTotal: metrics.townsTotal,
            pages: metrics.pagesVisited,
            pagesTotal: metrics.pagesTotal,
          })}
        </span>
        <span className="text-xs text-muted-foreground">{t("clickHint")}</span>
        {!isDesktop && <TownSearch onSelect={setSelectedPlace} />}
        {!isDesktop && (
        <span style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
          {chapters.map((c) => (
            <button
              key={c.number}
              className="min-h-[22px] min-w-[28px] cursor-pointer rounded-full px-2 text-xs font-medium"
              onClick={() => toggleChapter(c.number)}
              aria-pressed={!hiddenChapters.has(c.number)}
              aria-label={`${c.number}. ${c.title}`}
              title={c.title}
              style={{
                border: `2px solid ${CHAPTER_COLORS[c.number]}`,
                background: hiddenChapters.has(c.number)
                  ? "transparent"
                  : CHAPTER_COLORS[c.number],
                color: hiddenChapters.has(c.number)
                  ? CHAPTER_COLORS[c.number]
                  : "#fff",
              }}
            >
              {c.number}
            </button>
          ))}
        </span>
        )}
      </div>

      {isDesktop ? (
        <ChapterSidebar
          selectedPlace={selectedPlace}
          detailProps={detailProps}
          hiddenChapters={hiddenChapters}
          onToggleChapter={toggleChapter}
          onFocusChapter={focusChapter}
          onSelectPlace={setSelectedPlace}
        />
      ) : (
        selectedPlace != null &&
        detailProps && <TownDetailPanel place={selectedPlace} {...detailProps} />
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
