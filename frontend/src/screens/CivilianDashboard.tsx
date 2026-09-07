import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import * as Location from 'expo-location';
import { TransportStatus, UnavailableTransport } from '../../../backend/src/transport';
import { CivilianIdentity, getOrCreateCivilianIdentity } from '../security/identity';
import { LiveSosLocation, MAX_SOS_ACCURACY_METERS, isAcceptableLiveSosLocation } from '../../../backend/src/sos';
import { HOSPITAL_PUBLIC_MANIFEST } from '../security/hospitalManifest';

/**
 * Phase 1 shell. It intentionally has no server or WebRTC state: device
 * discovery, encrypted identity, and SOS transport arrive in later phases.
 */
export function CivilianDashboard() {
  const transport = useMemo(() => new UnavailableTransport(), []);
  const [transportStatus, setTransportStatus] = useState<TransportStatus>('stopped');
  const [identity, setIdentity] = useState<CivilianIdentity | null>(null);
  const [identityError, setIdentityError] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [injury, setInjury] = useState('');
  const [location, setLocation] = useState<LiveSosLocation | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);

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
  const captureLocation = async () => {
    setLocating(true);
    setLocationError(null);
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== 'granted') throw new Error('Location permission is required to send SOS.');
      const fix = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Highest, mayShowUserSettingsDialog: true });
      const freshLocation = { latitude: fix.coords.latitude, longitude: fix.coords.longitude, accuracyMeters: fix.coords.accuracy ?? Number.POSITIVE_INFINITY, capturedAt: fix.timestamp };
      if (!isAcceptableLiveSosLocation(freshLocation)) throw new Error(`Live GPS accuracy must be ${MAX_SOS_ACCURACY_METERS} m or better. Try again outdoors.`);
      setLocation(freshLocation);
    } catch (error) {
      setLocation(null);
      setLocationError(error instanceof Error ? error.message : 'Unable to obtain a current GPS position.');
    } finally { setLocating(false); }
  };
  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
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

        <View style={styles.sosPanel}>
          <Text style={styles.sosLabel}>SOS</Text>
          <Text style={styles.sosHint}>A current GPS fix is mandatory. Manual addresses and previous locations are never used.</Text>
          <TextInput value={name} onChangeText={setName} placeholder="Your name" placeholderTextColor="#94A3B8" style={styles.input} />
          <TextInput value={injury} onChangeText={setInjury} placeholder="Injury / emergency" placeholderTextColor="#94A3B8" multiline style={[styles.input, styles.multiline]} />
          <Pressable style={styles.secondaryButton} onPress={() => void captureLocation()} disabled={locating}>
            {locating ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.buttonText}>{location ? `GPS ready (${Math.round(location.accuracyMeters)} m)` : 'Capture live GPS'}</Text>}
          </Pressable>
          {locationError ? <Text style={styles.error}>{locationError}</Text> : null}
          <Text style={styles.disabledHint}>{!HOSPITAL_PUBLIC_MANIFEST ? 'SOS dispatch is blocked: this APK has no provisioned hospital public key.' : !nativeTransportReady ? 'SOS dispatch is blocked: nearby transport is unavailable.' : 'Ready for encrypted delivery.'}</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#101827' },
  container: { flexGrow: 1, padding: 24, gap: 22, justifyContent: 'center' },
  eyebrow: { color: '#FCA5A5', fontSize: 12, fontWeight: '800', letterSpacing: 1.4 },
  title: { color: '#FFFFFF', fontSize: 32, fontWeight: '800', lineHeight: 38 },
  description: { color: '#CBD5E1', fontSize: 16, lineHeight: 24 },
  card: { backgroundColor: '#1E293B', borderColor: '#334155', borderWidth: 1, borderRadius: 16, padding: 18, gap: 6 },
  cardLabel: { color: '#94A3B8', fontSize: 11, fontWeight: '800', letterSpacing: 1 },
  cardValue: { color: '#FFFFFF', fontSize: 17, fontWeight: '700' },
  cardHint: { color: '#86EFAC', fontSize: 13 },
  sosPanel: { borderColor: '#F87171', borderRadius: 20, borderWidth: 2, marginTop: 12, padding: 20, gap: 12 },
  sosLabel: { color: '#FCA5A5', fontSize: 34, fontWeight: '900', textAlign: 'center' },
  sosHint: { color: '#CBD5E1', fontSize: 12, lineHeight: 18, marginTop: 6, textAlign: 'center' },
  input: { backgroundColor: '#1E293B', borderColor: '#475569', borderRadius: 10, borderWidth: 1, color: '#FFFFFF', padding: 12 },
  multiline: { minHeight: 72, textAlignVertical: 'top' },
  secondaryButton: { alignItems: 'center', backgroundColor: '#2563EB', borderRadius: 10, minHeight: 46, justifyContent: 'center', padding: 10 },
  buttonText: { color: '#FFFFFF', fontWeight: '800' },
  disabledHint: { color: '#FCA5A5', fontSize: 12, lineHeight: 18, textAlign: 'center' },
  error: { color: '#FCA5A5', fontSize: 12, lineHeight: 18 },
});
