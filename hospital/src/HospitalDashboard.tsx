import React from 'react';
import { SafeAreaView, StyleSheet, Text, View } from 'react-native';

/** Phase 1 shell for the Android-only hospital administrative app. */
export function HospitalDashboard() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Text style={styles.eyebrow}>MIRAGE HOSPITAL</Text>
        <Text style={styles.title}>Emergency operations dashboard</Text>
        <Text style={styles.description}>
          This offline Android app will receive encrypted SOS alerts directly from nearby civilian devices.
        </Text>
        <View style={styles.card}>
          <Text style={styles.cardLabel}>HOSPITAL KEY</Text>
          <Text style={styles.cardValue}>Provisioning not configured</Text>
          <Text style={styles.cardHint}>Secure key setup begins in the identity phase</Text>
        </View>
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>No active SOS alerts</Text>
          <Text style={styles.emptyHint}>Offline discovery and encrypted SOS delivery are not configured yet.</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F8FAFC' },
  container: { flex: 1, padding: 24, gap: 22, justifyContent: 'center' },
  eyebrow: { color: '#B91C1C', fontSize: 12, fontWeight: '800', letterSpacing: 1.4 },
  title: { color: '#0F172A', fontSize: 31, fontWeight: '800', lineHeight: 38 },
  description: { color: '#475569', fontSize: 16, lineHeight: 24 },
  card: { backgroundColor: '#FFFFFF', borderColor: '#E2E8F0', borderWidth: 1, borderRadius: 16, padding: 18, gap: 6 },
  cardLabel: { color: '#64748B', fontSize: 11, fontWeight: '800', letterSpacing: 1 },
  cardValue: { color: '#0F172A', fontSize: 17, fontWeight: '700' },
  cardHint: { color: '#B45309', fontSize: 13 },
  emptyState: { backgroundColor: '#FFF1F2', borderColor: '#FECDD3', borderRadius: 16, borderWidth: 1, padding: 20, gap: 8 },
  emptyTitle: { color: '#9F1239', fontSize: 19, fontWeight: '800' },
  emptyHint: { color: '#9F1239', fontSize: 14, lineHeight: 21 },
});
