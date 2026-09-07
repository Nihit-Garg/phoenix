import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { HospitalDashboard } from './src/HospitalDashboard';

export default function App() {
  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <HospitalDashboard />
    </SafeAreaProvider>
  );
}
