const path = require('path');
const { withAndroidManifest } = require('@expo/config-plugins');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

const IS_DEV = process.env.APP_VARIANT === 'development';

module.exports = ({ config }) => {
  const finalConfig = {
    ...config,
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
      '@react-native-community/datetimepicker',
      'react-native-maps',
    ],
  };

  return withAndroidManifest(finalConfig, (cfg) => {
    const app = cfg.modResults.manifest.application[0];
    if (!app['meta-data']) app['meta-data'] = [];
    app['meta-data'] = app['meta-data'].filter(
      (m) => m.$?.['android:name'] !== 'com.google.android.geo.API_KEY'
    );
    app['meta-data'].push({
      $: {
        'android:name': 'com.google.android.geo.API_KEY',
        'android:value': process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY,
      },
    });
    return cfg;
  });
};

