module.exports = function (api) {
  api.cache(true);
  // NativeWind v5 moves the className transform to Metro (react-native-css),
  // so the v4 `jsxImportSource`/`nativewind/babel` presets are no longer needed.
  return {
    presets: ["babel-preset-expo"],
  };
};
