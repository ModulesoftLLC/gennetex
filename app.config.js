/**
 * Expo Go: native-only plugin-уудыг хасна.
 * APK / EAS build: бүх plugin идэвхтэй.
 */
const appJson = require('./app.json');

const isNativeBuild =
  !!process.env.EAS_BUILD ||
  process.env.EXPO_USE_DEV_CLIENT === '1' ||
  process.env.NODE_ENV === 'production';

const NATIVE_ONLY_PLUGINS = new Set([
  'expo-dev-client',
  'react-native-full-screen-notification-incoming-call',
]);

const plugins = (appJson.expo.plugins || []).filter((plugin) => {
  const name = Array.isArray(plugin) ? plugin[0] : plugin;
  return !NATIVE_ONLY_PLUGINS.has(name) || isNativeBuild;
});

module.exports = {
  expo: {
    ...appJson.expo,
    plugins,
  },
};
