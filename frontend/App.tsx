import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { CivilianDashboard } from './src/features/emergency/CivilianDashboard';

/** Android-only, offline-first Civilian Dashboard. */
export default function App() {
  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <CivilianDashboard />
    </SafeAreaProvider>
  );
}
