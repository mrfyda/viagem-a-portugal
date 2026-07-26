import {
  Camera,
  GeoJSONSource,
  Layer,
  Map as MapLibreMap,
} from "@maplibre/maplibre-react-native";
import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import {
  INITIAL_ZOOM,
  MAP_CENTER,
  MAP_STYLE_URL,
  routesGeoJson,
  townsGeoJson,
} from "../lib/geo";
import {
  fetchMapStyle,
  ROUTE_COLOR,
  TOWN_FILL_COLOR,
  TOWN_OPACITY,
  TOWN_RADIUS,
  TOWN_RING_COLOR,
  TOWN_RING_WIDTH,
  TOWN_STROKE_OPACITY,
} from "../lib/mapStyle";

type MapStyleProp = React.ComponentProps<typeof MapLibreMap>["mapStyle"];

// Native is read-only browsing until Traveler auth UI lands here: actions
// require a signed-in account (docs/adr/0007), and this component has never
// been verified on a device.
export default function TravelMap() {
  const [selectedTown, setSelectedTown] = useState<string | null>(null);
  const [mapStyle, setMapStyle] = useState<MapStyleProp | null>(null);

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
          data={townsGeoJson}
          onPress={(event) => {
            const props = event.nativeEvent.features[0]?.properties;
            setSelectedTown(typeof props?.name === "string" ? props.name : null);
          }}
        >
          <Layer
            id="towns-circle"
            type="circle"
            paint={{
              "circle-radius": TOWN_RADIUS,
              // Hollow dot = drove through without stopping (mapStyle.ts), the
              // same mark the journey list uses. Kept in step with the web map.
              "circle-color": TOWN_FILL_COLOR,
              "circle-opacity": TOWN_OPACITY,
              "circle-stroke-color": TOWN_RING_COLOR,
              "circle-stroke-width": TOWN_RING_WIDTH,
              "circle-stroke-opacity": TOWN_STROKE_OPACITY,
            }}
          />
        </GeoJSONSource>
      </MapLibreMap>

      <View style={styles.progressCard}>
        <Text style={styles.progressTitle}>Viagem a Portugal</Text>
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
