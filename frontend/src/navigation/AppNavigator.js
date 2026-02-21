import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { COLORS } from '../theme';
import { useAuthStore } from '../store/authStore';

import LoginScreen from '../screens/LoginScreen';
import HomeScreen from '../screens/HomeScreen';
import CreateRoadtripScreen from '../screens/CreateRoadtripScreen';
import RoadtripDetailScreen from '../screens/RoadtripDetailScreen';
import StepDetailScreen from '../screens/StepDetailScreen';
import CreateStepScreen from '../screens/CreateStepScreen';

const Stack = createNativeStackNavigator();

const screenOptions = {
  headerStyle: { backgroundColor: COLORS.bg },
  headerTintColor: COLORS.text,
  headerTitleStyle: { fontFamily: 'CormorantGaramond_700Bold', fontSize: 20 },
  headerBackTitleVisible: false,
  contentStyle: { backgroundColor: COLORS.bg },
};

export default function AppNavigator() {
  const token = useAuthStore((state) => state.token);

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={screenOptions}>
        {!token ? (
          // ─── Auth Stack ────────────────────────────────────────────────────
          <Stack.Screen
            name="Login"
            component={LoginScreen}
            options={{ headerShown: false }}
          />
        ) : (
          // ─── App Stack ──────────────────────────────────────────────────────
          <>
            <Stack.Screen
              name="Home"
              component={HomeScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="CreateRoadtrip"
              component={CreateRoadtripScreen}
              options={{ title: 'Nouveau roadtrip', headerShown: true }}
            />
            <Stack.Screen
              name="RoadtripDetail"
              component={RoadtripDetailScreen}
              options={{ title: '', headerShown: true }}
            />
            <Stack.Screen
              name="StepDetail"
              component={StepDetailScreen}
              options={{ title: '', headerShown: true }}
            />
            <Stack.Screen
              name="CreateStep"
              component={CreateStepScreen}
              options={{ title: 'Nouvelle étape', headerShown: true }}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
