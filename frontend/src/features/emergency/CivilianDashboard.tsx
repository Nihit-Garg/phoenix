import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import * as Location from 'expo-location';
import { PeerEndpoint, TransportStatus } from '../../../../backend/src/transport/PeerTransport';
import { WifiDirectTransport } from '../../core/transport/WifiDirectTransport';
import { CivilianIdentity, getOrCreateCivilianIdentity } from '../../core/security/identity';
import { LiveSosLocation, MAX_SOS_ACCURACY_METERS, MAX_SOS_LOCATION_AGE_MS, isAcceptableLiveSosLocation } from '../../../../backend/src/domain/sos';
import { HOSPITAL_PUBLIC_MANIFEST } from '../../core/security/hospitalManifest';
import { createSosEnvelope } from '../../core/security/envelope';
import { MeshEngine } from '../../../../backend/src/mesh/engine';
import { PeerInfoExchange } from '../../core/transport/PeerInfoExchange';
import { validateSosPayload } from '../../../../backend/src/domain/sos';
import { SosDeliveryEntry } from '../../core/storage/SosDeliveryQueue';
import { SosDeliveryService } from '../../core/transport/SosDeliveryService';

/**
 * Android-only SOS screen. Delivery is nearby-only and requires both a current
 * GPS fix and a hospital public manifest embedded during provisioning.
 */
export function CivilianDashboard() {
  const transport = useMemo(() => new WifiDirectTransport(), []);
  const [transportStatus, setTransportStatus] = useState<TransportStatus>('stopped');
  const [identity, setIdentity] = useState<CivilianIdentity | null>(null);
  const [identityError, setIdentityError] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [injury, setInjury] = useState('');
  const [location, setLocation] = useState<LiveSosLocation | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);
  const [sosState, setSosState] = useState<string | null>(null);
  const [sendingSos, setSendingSos] = useState(false);
  const [peers, setPeers] = useState<PeerEndpoint[]>([]);
  const [networkError, setNetworkError] = useState<string | null>(null);
  const meshRef = useRef<MeshEngine | null>(null);
  const deliveryRef = useRef<SosDeliveryService | null>(null);
  const [deliveryEntries, setDeliveryEntries] = useState<SosDeliveryEntry[]>([]);
  const [currentSosId, setCurrentSosId] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = transport.subscribe((event) => {
      if (event.type === 'status') setTransportStatus(event.status);
      if (event.type === 'peer') setPeers((current) => [...current.filter((peer) => peer.peerId !== event.peer.peerId), event.peer]);
      if (event.type === 'error') setNetworkError(event.error.message);
    });
    void transport.start().catch((error: unknown) => setNetworkError(error instanceof Error ? error.message : 'Unable to start nearby discovery.'));
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

  useEffect(() => {
    if (!identity) return;
    const peerInfo = new PeerInfoExchange(transport, identity);
    const mesh = new MeshEngine(identity.encryptionPublicKey, null, transport);
    const delivery = new SosDeliveryService(mesh, identity);
    meshRef.current = mesh;
    deliveryRef.current = delivery;
    const stopPeerInfo = peerInfo.start();
    mesh.start();
    const stopDelivery = delivery.start(setDeliveryEntries);
    const stopAnnouncements = transport.subscribe((event) => {
      if (event.type === 'peer' && event.peer.status === 'connected') {
        void delivery.flush();
        void peerInfo.announce(event.peer.peerId).catch((error: unknown) => {
          setIdentityError(error instanceof Error ? error.message : 'Unable to announce this device to a nearby peer.');
        });
      }
    });
    transport.getPeers().filter((peer) => peer.status === 'connected').forEach((peer) => {
      void peerInfo.announce(peer.peerId).catch(() => undefined);
    });
    return () => { stopAnnouncements(); stopDelivery(); stopPeerInfo(); mesh.stop(); if (deliveryRef.current === delivery) deliveryRef.current = null; if (meshRef.current === mesh) meshRef.current = null; };
  }, [identity, transport]);

  const nativeTransportReady = transportStatus === 'ready';
  const connectPeer = async (peerId: string) => {
    setNetworkError(null);
    try { await transport.connect(peerId); }
    catch (error) { setNetworkError(error instanceof Error ? error.message : 'Unable to connect to nearby device.'); }
  };
  const disconnectPeer = async (peerId: string) => {
    setNetworkError(null);
    try { await transport.disconnect(peerId); }
    catch (error) { setNetworkError(error instanceof Error ? error.message : 'Unable to disconnect nearby device.'); }
  };
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
  const sendSos = async () => {
    setSosState(null);
    setSendingSos(true);
    try {
      if (!identity) throw new Error('Protected device identity is not ready.');
      if (!location || !isAcceptableLiveSosLocation(location)) throw new Error(`Capture a GPS position less than ${MAX_SOS_LOCATION_AGE_MS / 60_000} minutes old before sending SOS.`);
      const payload = { type: 'sos' as const, civilianName: name, injuryDescription: injury, location };
      validateSosPayload(payload);
      const delivery = deliveryRef.current;
      if (!delivery) throw new Error('Nearby delivery service is still starting. Try again in a moment.');
      const packet = createSosEnvelope(identity, payload);
      setCurrentSosId(packet.envelopeId);
      const entry = await delivery.send(packet);
      setSosState(entry.state === 'awaiting-ack' ? 'SOS transmitted. Waiting for a verified Hospital acknowledgement.' : entry.error ?? 'SOS encrypted and queued for nearby delivery.');
    } catch (error) {
      setSosState(error instanceof Error ? error.message : 'Unable to send SOS.');
    } finally { setSendingSos(false); }
  };
  const currentDelivery = deliveryEntries.find((entry) => entry.packet.envelopeId === currentSosId);
  const deliveryMessage = currentDelivery ? ({
    queued: 'SOS encrypted and queued.',
    sending: `Sending SOS (attempt ${currentDelivery.attempts})…`,
    'awaiting-ack': `SOS transmitted. Waiting for Hospital acknowledgement (attempt ${currentDelivery.attempts}).`,
    retrying: `Delivery will retry automatically${currentDelivery.error ? `: ${currentDelivery.error}` : '.'}`,
    delivered: 'SOS delivery confirmed by the provisioned Hospital.',
    failed: currentDelivery.error ?? 'SOS delivery failed after the maximum retry count.',
    expired: currentDelivery.error ?? 'SOS expired before acknowledgement.',
  } satisfies Record<SosDeliveryEntry['state'], string>)[currentDelivery.state] : sosState;
  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.eyebrow}>MIRAGE CIVILIAN</Text>
        <Text style={styles.title}>Offline emergency network</Text>
        <Text style={styles.description}>
          SOS stays on nearby Android devices using Wi-Fi Direct and encrypted UDP packets.
        </Text>

        <View style={styles.card}>
          <Text style={styles.cardLabel}>NETWORK STATUS</Text>
          <Text style={styles.cardValue}>{nativeTransportReady ? 'Nearby transport ready' : 'Starting nearby transport'}</Text>
          <Text style={styles.cardHint}>{nativeTransportReady ? 'Awaiting nearby peers' : 'Requires an Android development build and Wi-Fi Direct support.'}</Text>
          {networkError ? <Text style={styles.error}>{networkError}</Text> : null}
          {peers.filter((peer) => peer.status !== 'disconnected').map((peer) => <View style={styles.peerRow} key={peer.peerId}>
            <View style={styles.peerCopy}>
              <Text style={styles.peerName}>{peer.displayName ?? peer.ipAddress ?? 'Nearby device'}</Text>
              <Text style={styles.peerStatus}>{peer.status}</Text>
            </View>
            {peer.status === 'connected' ? <Pressable style={styles.peerButton} onPress={() => void disconnectPeer(peer.peerId)}><Text style={styles.peerButtonText}>Disconnect</Text></Pressable> : <Pressable style={styles.peerButton} onPress={() => void connectPeer(peer.peerId)} disabled={peer.status === 'connecting'}><Text style={styles.peerButtonText}>{peer.status === 'connecting' ? 'Connecting…' : 'Connect'}</Text></Pressable>}
          </View>)}
          {nativeTransportReady && peers.length === 0 ? <Text style={styles.muted}>No devices discovered yet.</Text> : null}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardLabel}>DEVICE IDENTITY</Text>
          <Text style={styles.cardValue}>{identity ? 'Protected device keys ready' : identityError ? 'Identity setup failed' : 'Securing device keys…'}</Text>
          <Text style={styles.cardHint}>{identityError ?? 'Private keys are stored in Android Keystore.'}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardLabel}>HOSPITAL PROVISIONING</Text>
          <Text style={styles.cardValue}>{HOSPITAL_PUBLIC_MANIFEST ? 'Hospital key provisioned' : 'Not provisioned'}</Text>
          <Text style={styles.cardHint}>{HOSPITAL_PUBLIC_MANIFEST ? `Recipient key ID: ${HOSPITAL_PUBLIC_MANIFEST.keyId}` : 'An administrator must embed a Hospital public manifest before distributing this APK.'}</Text>
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
          <Pressable style={[styles.sosButton, (!identity || !location || !HOSPITAL_PUBLIC_MANIFEST || sendingSos) && styles.disabledButton]} onPress={() => void sendSos()} disabled={!identity || !location || !HOSPITAL_PUBLIC_MANIFEST || sendingSos}>
            {sendingSos ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.buttonText}>Send encrypted SOS</Text>}
          </Pressable>
          <Text style={currentDelivery?.state === 'delivered' ? styles.success : styles.disabledHint}>{deliveryMessage ?? (!HOSPITAL_PUBLIC_MANIFEST ? 'SOS dispatch is blocked: this APK has no provisioned hospital public key.' : !nativeTransportReady ? 'No peer is connected. SOS can still be encrypted and queued for retry.' : 'Ready for encrypted delivery.')}</Text>
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
  sosButton: { alignItems: 'center', backgroundColor: '#DC2626', borderRadius: 10, minHeight: 50, justifyContent: 'center', padding: 10 },
  disabledButton: { opacity: 0.55 },
  buttonText: { color: '#FFFFFF', fontWeight: '800' },
  disabledHint: { color: '#FCA5A5', fontSize: 12, lineHeight: 18, textAlign: 'center' },
  error: { color: '#FCA5A5', fontSize: 12, lineHeight: 18 },
  success: { color: '#86EFAC', fontSize: 12, lineHeight: 18, textAlign: 'center' },
  peerRow: { alignItems: 'center', borderTopColor: '#334155', borderTopWidth: 1, flexDirection: 'row', gap: 10, justifyContent: 'space-between', paddingTop: 10 },
  peerCopy: { flex: 1 },
  peerName: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
  peerStatus: { color: '#94A3B8', fontSize: 12, textTransform: 'capitalize' },
  peerButton: { backgroundColor: '#334155', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 },
  peerButtonText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },
  muted: { color: '#94A3B8', fontSize: 12 },
});
