import React from 'react';
import { SafeAreaView, StyleSheet, Text, View } from 'react-native';

/**
 * Phase 1 shell. It intentionally has no server or WebRTC state: device
 * discovery, encrypted identity, and SOS transport arrive in later phases.
 */
export function CivilianDashboard() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Text style={styles.eyebrow}>MIRAGE CIVILIAN</Text>
        <Text style={styles.title}>Offline emergency network</Text>
        <Text style={styles.description}>
          This Android app is prepared for Wi-Fi Direct and encrypted SOS delivery.
          Nearby discovery is not enabled until the transport phase is complete.
        </Text>

        <View style={styles.card}>
          <Text style={styles.cardLabel}>NETWORK STATUS</Text>
          <Text style={styles.cardValue}>Offline transport not configured</Text>
          <Text style={styles.cardHint}>Phase 1 native foundation ready</Text>
        </View>

        <View style={styles.sosPlaceholder}>
          <Text style={styles.sosLabel}>SOS</Text>
          <Text style={styles.sosHint}>Available after live GPS and encrypted UDP transport are implemented.</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#101827' },
  container: { flex: 1, padding: 24, gap: 22, justifyContent: 'center' },
  eyebrow: { color: '#FCA5A5', fontSize: 12, fontWeight: '800', letterSpacing: 1.4 },
  title: { color: '#FFFFFF', fontSize: 32, fontWeight: '800', lineHeight: 38 },
  description: { color: '#CBD5E1', fontSize: 16, lineHeight: 24 },
  card: { backgroundColor: '#1E293B', borderColor: '#334155', borderWidth: 1, borderRadius: 16, padding: 18, gap: 6 },
  cardLabel: { color: '#94A3B8', fontSize: 11, fontWeight: '800', letterSpacing: 1 },
  cardValue: { color: '#FFFFFF', fontSize: 17, fontWeight: '700' },
  cardHint: { color: '#86EFAC', fontSize: 13 },
  sosPlaceholder: { alignItems: 'center', borderColor: '#F87171', borderRadius: 999, borderWidth: 10, height: 220, justifyContent: 'center', marginTop: 12, paddingHorizontal: 34 },
  sosLabel: { color: '#FCA5A5', fontSize: 50, fontWeight: '900' },
  sosHint: { color: '#CBD5E1', fontSize: 12, lineHeight: 18, marginTop: 6, textAlign: 'center' },
});
