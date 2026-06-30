const { getDefaultConfig } = require("expo/metro-config");
const { withNativewind } = require("nativewind/metro");

const config = getDefaultConfig(__dirname);

// NativeWind v5: the CSS entry is the `import "./global.css"` in App.tsx,
// processed by Tailwind v4 via postcss.config.mjs — no `input` option here.
const withCss = withNativewind(config);

// Lazily evaluate module factories so a heavy module (maplibre, supabase) only
// runs when first required — trims startup main-thread work. Set after
// withNativewind so it wins. experimentalImportSupport is already Expo's
// production default (and a prerequisite for tree shaking); keep it on.
withCss.transformer.getTransformOptions = async () => ({
  transform: {
    experimentalImportSupport: true,
    inlineRequires: true,
  },
});

module.exports = withCss;
