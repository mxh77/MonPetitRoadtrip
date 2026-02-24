// Configuration dynamique selon APP_VARIANT
// - development : debug APK (package .dev, nom MPR_Debug)
// - production  : release APK (package racine, nom MPR)
const IS_DEV = process.env.APP_VARIANT === 'development';

module.exports = {
  expo: {
    name: IS_DEV ? 'MPR_Debug' : 'MPR',
    slug: 'monpetitroadtrip',
    scheme: IS_DEV ? 'monpetitroadtrip-dev' : 'monpetitroadtrip',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/icon.png',
    userInterfaceStyle: 'light',
    newArchEnabled: true,
    splash: {
      image: './assets/splash-icon.png',
      resizeMode: 'contain',
      backgroundColor: '#ffffff',
    },
    ios: {
      supportsTablet: true,
    },
    android: {
      adaptiveIcon: {
        foregroundImage: './assets/adaptive-icon.png',
        backgroundColor: '#ffffff',
      },
      edgeToEdgeEnabled: true,
      package: IS_DEV
        ? 'com.mxh7777.monpetitroadtrip.dev'
        : 'com.mxh7777.monpetitroadtrip',
    },
    web: {
      favicon: './assets/favicon.png',
    },
    plugins: [
      'expo-font',
      '@journeyapps/react-native-quick-sqlite',
    ],
  },
};
