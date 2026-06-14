const { getDefaultConfig } = require("expo/metro-config");
const { withNativewind } = require("nativewind/metro");

const config = getDefaultConfig(__dirname);

// NativeWind v5: the CSS entry is the `import "./global.css"` in App.tsx,
// processed by Tailwind v4 via postcss.config.mjs — no `input` option here.
module.exports = withNativewind(config);
