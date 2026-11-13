const path = require("path");
const createExpoWebpackConfigAsync = require("@expo/webpack-config");

module.exports = async function (env, argv) {
  const config = await createExpoWebpackConfigAsync(env, argv);

  // Ensure we have an alias object
  config.resolve.alias = { ...(config.resolve.alias || {}) };

  // On web, point native Stripe package to our harmless stub
  config.resolve.alias["@stripe/stripe-react-native"] = path.resolve(__dirname, "app/stripe-web-stub.ts");

  return config;
};
