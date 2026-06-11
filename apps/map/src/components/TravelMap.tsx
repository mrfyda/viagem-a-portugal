import {
  Camera,
  GeoJSONSource,
  Layer,
  Map as MapLibreMap,
} from "@maplibre/maplibre-react-native";
import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { useProgress } from "../hooks/useProgress";
import {
  buildTownsGeoJson,
  INITIAL_ZOOM,
  MAP_CENTER,
  MAP_STYLE_URL,
  routesGeoJson,
} from "../lib/geo";
import {
  fetchMapStyle,
  ROUTE_COLOR,
  TOWN_COLOR,
  TOWN_RADIUS,
} from "../lib/mapStyle";

type MapStyleProp = React.ComponentProps<typeof MapLibreMap>["mapStyle"];

export default function TravelMap() {
  const [selectedTown, setSelectedTown] = useState<string | null>(null);
  const [mapStyle, setMapStyle] = useState<MapStyleProp | null>(null);
  const { visits, toggle, metrics } = useProgress();

  useEffect(() => {
    fetchMapStyle()
      .then((style) => setMapStyle(style as MapStyleProp))
      // native SDK can still load the unboosted style itself
      .catch(() => setMapStyle(MAP_STYLE_URL));
  }, []);

  if (mapStyle == null) return <View style={styles.container} />;

  return (
    <View style={styles.container}>
      <MapLibreMap style={styles.map} mapStyle={mapStyle}>
        <Camera initialViewState={{ center: MAP_CENTER, zoom: INITIAL_ZOOM }} />
        <GeoJSONSource id="routes" data={routesGeoJson}>
          <Layer
            id="routes-line"
            type="line"
            paint={{
              "line-color": ROUTE_COLOR,
              "line-width": 2.5,
              "line-opacity": 0.75,
            }}
          />
        </GeoJSONSource>
        <GeoJSONSource
          id="towns"
          data={buildTownsGeoJson(visits)}
          onPress={(event) => {
            const props = event.nativeEvent.features[0]?.properties;
            const indexName = props?.indexName;
            if (typeof indexName !== "string") return;
            toggle(indexName);
            setSelectedTown(typeof props?.name === "string" ? props.name : null);
          }}
        >
          <Layer
            id="towns-circle"
            type="circle"
            paint={{
              "circle-radius": TOWN_RADIUS,
              "circle-color": TOWN_COLOR,
              "circle-stroke-color": "#ffffff",
              "circle-stroke-width": 1.5,
            }}
          />
        </GeoJSONSource>
      </MapLibreMap>

      <View style={styles.progressCard}>
        <Text style={styles.progressTitle}>Viagem a Portugal</Text>
        <Text>
          {metrics.townsVisited} / {metrics.townsTotal} towns ·{" "}
          {metrics.pagesVisited} / {metrics.pagesTotal} pages
        </Text>
        {selectedTown != null && <Text style={styles.selected}>{selectedTown}</Text>}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },
  progressCard: {
    position: "absolute",
    top: 48,
    left: 12,
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 2,
  },
  progressTitle: { fontWeight: "600" },
  selected: { color: "#666" },
});
