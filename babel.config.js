module.exports = function (api) {
  api.cache(true);
  return {
    presets: ["babel-preset-expo"],
    plugins: [
    'react-native-reanimated/plugin',
      [
        "module-resolver",
        {
          extensions: [".ts", ".tsx", ".js", ".jsx", ".json"],
          alias: {
            "@": "./app",
            "@lib": "./app/_lib",
            "@components": "./components",
            "@assets": "./app/assets"
          },
        },
      ],
      // ⛑️ Reanimated 3+ moved its Babel plugin:
    ],
  };
};
