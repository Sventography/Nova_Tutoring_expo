module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      [
        'module-resolver',
        {
          extensions: ['.ts', '.tsx', '.js', '.jsx', '.json'],
          alias: {
            '@': './app',
            '@lib': './app/_lib',
            '@components': './components',
            '@assets': './app/assets',
          },
        },
      ],
      // MUST be last:
      'react-native-reanimated/plugin',
    ],
  };
};
