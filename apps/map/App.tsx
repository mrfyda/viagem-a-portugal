import "./global.css";

import { StatusBar } from "expo-status-bar";
import { StyleSheet, View } from "react-native";

import TravelMap from "./src/components/TravelMap";

export default function App() {
  return (
    <View style={styles.container}>
      <TravelMap />
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
});
