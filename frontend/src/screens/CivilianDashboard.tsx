import React, { useEffect, useMemo, useState } from 'react';
import { SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { TransportStatus, UnavailableTransport } from '../../../shared/transport';
import { CivilianIdentity, getOrCreateCivilianIdentity } from '../security/identity';

/**
 * Phase 1 shell. It intentionally has no server or WebRTC state: device
 * discovery, encrypted identity, and SOS transport arrive in later phases.
 */
export function CivilianDashboard() {
  const transport = useMemo(() => new UnavailableTransport(), []);
  const [transportStatus, setTransportStatus] = useState<TransportStatus>('stopped');
  const [identity, setIdentity] = useState<CivilianIdentity | null>(null);
  const [identityError, setIdentityError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = transport.subscribe((event) => {
      if (event.type === 'status') setTransportStatus(event.status);
    });
    void transport.start();
    return () => {
      unsubscribe();
      void transport.stop();
    };
  }, [transport]);

  useEffect(() => {
    void getOrCreateCivilianIdentity().then(setIdentity).catch((error: unknown) => {
      setIdentityError(error instanceof Error ? error.message : 'Unable to initialize the protected device identity.');
    });
  }, []);

  const nativeTransportReady = transportStatus === 'ready';
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Text style={styles.eyebrow}>MIRAGE CIVILIAN</Text>
        <Text style={styles.title}>Offline emergency network</Text>
        <Text style={styles.description}>
          This Android app is prepared for Wi-Fi Direct and encrypted SOS delivery.
          Nearby discovery is not enabled until the Android Wi-Fi Direct and UDP modules are installed.
        </Text>

        <View style={styles.card}>
          <Text style={styles.cardLabel}>NETWORK STATUS</Text>
          <Text style={styles.cardValue}>{nativeTransportReady ? 'Nearby transport ready' : 'Native transport unavailable'}</Text>
          <Text style={styles.cardHint}>{nativeTransportReady ? 'Awaiting nearby peers' : 'Wi-Fi Direct + UDP arrive in Phase 4'}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardLabel}>DEVICE IDENTITY</Text>
          <Text style={styles.cardValue}>{identity ? 'Protected device keys ready' : identityError ? 'Identity setup failed' : 'Securing device keys…'}</Text>
          <Text style={styles.cardHint}>{identityError ?? 'Private keys are stored in Android Keystore.'}</Text>
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
