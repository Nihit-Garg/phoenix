import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { HospitalDashboard } from './src/features/operations/HospitalDashboard';

export default function App() {
  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <HospitalDashboard />
    </SafeAreaProvider>
  );
}
