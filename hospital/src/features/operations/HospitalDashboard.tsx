import React, { useEffect, useMemo, useState } from 'react';
import { SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { TransportStatus } from '../../../../backend/src/transport/PeerTransport';
import { WifiDirectTransport } from '../../core/transport/WifiDirectTransport';
import { HospitalIdentity, getOrCreateHospitalIdentity, publicManifest } from '../../core/security/identity';

/** Phase 1 shell for the Android-only hospital administrative app. */
export function HospitalDashboard() {
  const transport = useMemo(() => new WifiDirectTransport(), []);
  const [transportStatus, setTransportStatus] = useState<TransportStatus>('stopped');
  const [identity, setIdentity] = useState<HospitalIdentity | null>(null);
  const [identityError, setIdentityError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = transport.subscribe((event) => {
      if (event.type === 'status') setTransportStatus(event.status);
    });
    void transport.start().catch((error: unknown) => setIdentityError(error instanceof Error ? error.message : 'Unable to start nearby discovery.'));
    return () => {
      unsubscribe();
      void transport.stop();
    };
  }, [transport]);

  useEffect(() => {
    void getOrCreateHospitalIdentity().then(setIdentity).catch((error: unknown) => {
      setIdentityError(error instanceof Error ? error.message : 'Unable to initialize protected hospital keys.');
    });
  }, []);

  const nativeTransportReady = transportStatus === 'ready';
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Text style={styles.eyebrow}>MIRAGE HOSPITAL</Text>
        <Text style={styles.title}>Emergency operations dashboard</Text>
        <Text style={styles.description}>
          This offline Android app will receive encrypted SOS alerts directly from nearby civilian devices.
        </Text>
        <View style={styles.card}>
          <Text style={styles.cardLabel}>NETWORK STATUS</Text>
          <Text style={styles.cardValue}>{nativeTransportReady ? 'Nearby transport ready' : 'Native transport unavailable'}</Text>
          <Text style={styles.cardHint}>{nativeTransportReady ? 'Awaiting encrypted SOS packets' : 'Wi-Fi Direct + UDP arrive in Phase 4'}</Text>
        </View>
        <View style={styles.card}>
          <Text style={styles.cardLabel}>HOSPITAL KEY</Text>
          <Text style={styles.cardValue}>{identity ? 'Protected hospital keys ready' : identityError ? 'Key setup failed' : 'Creating protected keys…'}</Text>
          <Text style={styles.cardHint}>{identity ? `Provisioning key ID: ${publicManifest(identity).keyId}` : identityError ?? 'Private keys remain on this Android device.'}</Text>
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
