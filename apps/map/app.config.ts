import type { ConfigContext, ExpoConfig } from "expo/config";

// EXPO_BASE_URL lets CI export the web build for hosting under a subpath
// (e.g. "/map" on GitHub Pages). Empty means the site root.
export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: config.name ?? "Viagem a Portugal",
  slug: config.slug ?? "viagem-a-portugal",
  experiments: {
    ...config.experiments,
    baseUrl: process.env.EXPO_BASE_URL || undefined,
    // React Compiler auto-memoizes components (fewer re-renders → less
    // main-thread work). babel-preset-expo wires up babel-plugin-react-compiler
    // when this is on; React 19 needs no separate compiler runtime.
    reactCompiler: true,
  },
});
