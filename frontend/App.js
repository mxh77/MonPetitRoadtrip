import React from 'react';
import { View, ActivityIndicator } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import {
  CormorantGaramond_400Regular,
  CormorantGaramond_400Regular_Italic,
  CormorantGaramond_700Bold,
  CormorantGaramond_700Bold_Italic,
} from '@expo-google-fonts/cormorant-garamond';
import { useFonts } from 'expo-font';
import AppNavigator from './src/navigation/AppNavigator';
import { COLORS } from './src/theme';

export default function App() {
  const [fontsLoaded] = useFonts({
    CormorantGaramond_400Regular,
    CormorantGaramond_400Regular_Italic,
    CormorantGaramond_700Bold,
    CormorantGaramond_700Bold_Italic,
  });

  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, backgroundColor: COLORS.bg, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={COLORS.accent} />
      </View>
    );
  }

  return (
    <>
      <StatusBar style="light" />
      <AppNavigator />
    </>
  );
}
