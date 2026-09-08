import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import { PeerEndpoint, TransportStatus } from '../../../../backend/src/transport/PeerTransport';
import { NearbyConnectionsTransport } from '../../core/transport/NearbyConnectionsTransport';
import { CivilianIdentity, getOrCreateCivilianIdentity } from '../../core/security/identity';
import { LiveSosLocation, MAX_SOS_ACCURACY_METERS, MAX_SOS_LOCATION_AGE_MS, isAcceptableLiveSosLocation } from '../../../../backend/src/domain/sos';
import { HOSPITAL_PUBLIC_MANIFEST } from '../../core/security/hospitalManifest';
import { createSosEnvelope } from '../../core/security/envelope';
import { MeshEngine } from '../../../../backend/src/mesh/engine';
import { PeerInfoExchange } from '../../core/transport/PeerInfoExchange';
import { validateSosPayload } from '../../../../backend/src/domain/sos';
import { SosDeliveryEntry } from '../../core/storage/SosDeliveryQueue';
import { SosDeliveryService } from '../../core/transport/SosDeliveryService';
import { ChatService } from '../messages/ChatService';
import { chatDependencies } from '../messages/crypto';
import { ChatState } from '../messages/model';
import { MessagesScreen } from '../messages/MessagesScreen';

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Location request timed out.')), timeoutMs);
    promise.then((value) => { clearTimeout(timeout); resolve(value); }, (error) => { clearTimeout(timeout); reject(error); });
  });
}

/**
 * Android-only SOS screen. Delivery is nearby-only and requires both a current
 * GPS fix and a hospital public manifest embedded during provisioning.
 */
export function CivilianDashboard() {
  const transport = useMemo(() => new NearbyConnectionsTransport('Mirage Civilian'), []);
  const [transportStatus, setTransportStatus] = useState<TransportStatus>('stopped');
  const [identity, setIdentity] = useState<CivilianIdentity | null>(null);
  const [identityError, setIdentityError] = useState<string | null>(null);
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
  const [group, setGroup] = useState<{ groupFormed: boolean; isGroupOwner: boolean; groupOwnerAddress?: string }>({ groupFormed: false, isGroupOwner: false });
  const [routingTrace, setRoutingTrace] = useState<string[]>([]);
  const [page, setPage] = useState<'sos' | 'messages'>('sos');
  const [chat, setChat] = useState<ChatService | null>(null);
  const [chatState, setChatState] = useState<ChatState | null>(null);
  const [chatError, setChatError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = transport.subscribe((event) => {
      if (event.type === 'status') {
        setTransportStatus(event.status);
        if (event.status === 'starting' || event.status === 'ready') setNetworkError(null);
      }
      if (event.type === 'peer') setPeers([...transport.getPeers()]);
      if (event.type === 'error') setNetworkError(event.error.message);
      if (event.type === 'group') setGroup(event);
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
    const messaging = new ChatService(mesh, chatDependencies(identity));
    setChat(messaging);
    meshRef.current = mesh;
    deliveryRef.current = delivery;
    const stopPeerInfo = peerInfo.start();
    mesh.start();
    const stopMessaging = messaging.start(setChatState, setChatError);
    const stopDelivery = delivery.start(setDeliveryEntries);
    const stopTrace = mesh.subscribe((event) => {
      if (!event.packet || (event.packet.kind !== 'sos' && event.packet.kind !== 'ack')) return;
      const hop = event.packet.hops ?? 0;
      const detail = event.disposition === 'relayed' ? `${event.packet.kind.toUpperCase()} forwarded as hop ${hop + 1}` : `${event.packet.kind.toUpperCase()} ${event.disposition} at hop ${hop}`;
      setRoutingTrace((current) => [`${new Date().toLocaleTimeString()} · ${detail}`, ...current].slice(0, 8));
    });
    const stopAnnouncements = transport.subscribe((event) => {
      if (event.type === 'peer' && event.peer.status === 'connected') {
        void delivery.flush();
        void messaging.flush().catch((error: unknown) => setChatError(error instanceof Error ? error.message : 'Unable to open saved messages.'));
        void peerInfo.announce(event.peer.peerId).catch((error: unknown) => {
          setIdentityError(error instanceof Error ? error.message : 'Unable to announce this device to a nearby peer.');
        });
      }
    });
    transport.getPeers().filter((peer) => peer.status === 'connected').forEach((peer) => {
      void peerInfo.announce(peer.peerId).catch(() => undefined);
    });
    return () => { stopMessaging(); stopAnnouncements(); stopTrace(); stopDelivery(); stopPeerInfo(); mesh.stop(); if (deliveryRef.current === delivery) deliveryRef.current = null; if (meshRef.current === mesh) meshRef.current = null; };
  }, [identity, transport]);

  const nativeTransportReady = transportStatus === 'ready';
  const sendSos = async () => {
    setSosState(null);
    setSendingSos(true);
    setLocating(true);
    setLocationError(null);
    try {
      if (!identity) throw new Error('Protected device identity is not ready.');
      if (!HOSPITAL_PUBLIC_MANIFEST) throw new Error('This Civilian build is not linked to a Hospital. Provision and rebuild the APK first.');
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== 'granted') throw new Error('Allow precise location to send an SOS.');
      if (!(await Location.hasServicesEnabledAsync())) throw new Error('Turn on Location in Android Quick Settings, then press SOS again.');
      let fix: Location.LocationObject | null = null;
      try {
        fix = await withTimeout(Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High, mayShowUserSettingsDialog: true }), 15_000);
      } catch {
        fix = await Location.getLastKnownPositionAsync({ maxAge: MAX_SOS_LOCATION_AGE_MS, requiredAccuracy: MAX_SOS_ACCURACY_METERS });
      }
      if (!fix) throw new Error('No GPS fix is available yet. Move near a window or outdoors and press SOS again.');
      const freshLocation = { latitude: fix.coords.latitude, longitude: fix.coords.longitude, accuracyMeters: fix.coords.accuracy ?? Number.POSITIVE_INFINITY, capturedAt: fix.timestamp };
      if (!isAcceptableLiveSosLocation(freshLocation)) throw new Error(`The available location is older than ${MAX_SOS_LOCATION_AGE_MS / 60_000} minutes or less accurate than ${MAX_SOS_ACCURACY_METERS} m.`);
      setLocation(freshLocation);
      const payload = { type: 'sos' as const, civilianName: chatState?.name || 'Mirage user', injuryDescription: 'Emergency assistance requested through Mirage.', location: freshLocation };
      validateSosPayload(payload);
      const delivery = deliveryRef.current;
      if (!delivery) throw new Error('Nearby delivery service is still starting. Try again in a moment.');
      const packet = createSosEnvelope(identity, payload);
      setCurrentSosId(packet.envelopeId);
      const entry = await delivery.send(packet);
      setSosState(entry.state === 'awaiting-ack' ? 'SOS transmitted. Waiting for a verified Hospital acknowledgement.' : entry.error ?? 'SOS encrypted and queued for nearby delivery.');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to send SOS.';
      setSosState(message);
      if (/location|GPS/i.test(message)) setLocationError(message);
    } finally { setSendingSos(false); setLocating(false); }
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
  const activePeerCount = peers.filter((peer) => peer.status === 'connected').length;
  const networkLabel = group.groupFormed
    ? `Nearby emergency network connected${activePeerCount ? ` · ${activePeerCount} peer${activePeerCount === 1 ? '' : 's'}` : ''}`
    : nativeTransportReady ? 'Finding and connecting to nearby Mirage phones…' : transportStatus === 'unavailable' ? 'Nearby network needs attention' : 'Starting nearby emergency network…';
  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={page === 'messages' ? styles.hiddenPage : styles.visiblePage} contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <Text style={styles.welcome}>Welcome back,</Text>
          <Text style={styles.userName}>{chatState?.name || 'Mirage user'}</Text>
        </View>

        <Text style={styles.title}>Are you in an emergency?</Text>
        <Text style={styles.description}>Press the button below. Your location and encrypted SOS will be sent automatically.</Text>

        <View style={styles.sosOuterHalo}>
          <View style={styles.sosInnerHalo}>
            <Pressable style={({ pressed }) => [styles.sosButton, pressed && styles.sosButtonPressed, sendingSos && styles.disabledButton]} onPress={() => void sendSos()} disabled={!identity || sendingSos} accessibilityRole="button" accessibilityLabel="Send emergency SOS">
              {sendingSos ? <ActivityIndicator color="#FFFFFF" size="large" /> : <Text style={styles.sosLabel}>SOS</Text>}
            </Pressable>
          </View>
        </View>

        <View style={styles.locationCard}>
          <Text style={styles.cardLabel}>YOUR CURRENT LOCATION</Text>
          <Text style={styles.cardValue}>{locating ? 'Getting the best available GPS fix…' : location ? `${location.latitude.toFixed(5)}, ${location.longitude.toFixed(5)}` : 'Captured automatically when you press SOS'}</Text>
          {location ? <Text style={styles.cardHint}>Accuracy approximately {Math.round(location.accuracyMeters)} metres</Text> : null}
        </View>

        <View style={styles.networkRow}>
          <View style={[styles.statusDot, group.groupFormed ? styles.statusConnected : styles.statusSearching]} />
          <Text style={styles.networkText}>{networkLabel}</Text>
        </View>

        {networkError ? <Text style={styles.error}>{networkError}</Text> : null}
        {transportStatus === 'unavailable' ? <View>
          <Pressable accessibilityRole="button" onPress={() => void Linking.openSettings().catch(() => setNetworkError('Open Android Settings → Apps → Mirage Civilian → Permissions.'))}><Text style={styles.deliveryStatus}>Open app permissions</Text></Pressable>
          <Pressable accessibilityRole="button" onPress={() => void transport.start().catch(() => undefined)}><Text style={styles.deliveryStatus}>Retry nearby connection</Text></Pressable>
        </View> : null}
        {locationError ? <Text style={styles.error}>{locationError}</Text> : null}
        {identityError ? <Text style={styles.error}>{identityError}</Text> : null}
        {!HOSPITAL_PUBLIC_MANIFEST ? <Text style={styles.error}>This APK is not provisioned with a Hospital key. SOS cannot be encrypted until it is rebuilt after provisioning.</Text> : null}
        {HOSPITAL_PUBLIC_MANIFEST ? <Text style={styles.traceText}>Hospital: {HOSPITAL_PUBLIC_MANIFEST.keyId}</Text> : null}
        <Text style={currentDelivery?.state === 'delivered' ? styles.success : styles.deliveryStatus}>{deliveryMessage ?? (HOSPITAL_PUBLIC_MANIFEST ? 'Ready. Nearby connection and relay setup happen automatically.' : 'Waiting for a provisioned Civilian build.')}</Text>
        {routingTrace[0] ? <Text style={styles.traceText}>{routingTrace[0]}</Text> : null}
      </ScrollView>
      <View style={page === 'messages' ? styles.visiblePage : styles.hiddenPage}>
        <MessagesScreen service={chat} state={chatState} identity={identity} peers={peers} error={chatError} active={page === 'messages'} onHome={() => setPage('sos')} />
      </View>
      <View style={styles.navigation}>
        <Pressable accessibilityRole="tab" accessibilityState={{ selected: page === 'sos' }} onPress={() => setPage('sos')} style={[styles.tab, page === 'sos' && styles.activeTab]}><Text style={styles.tabText}>Home · SOS</Text></Pressable>
        <Pressable accessibilityRole="tab" accessibilityState={{ selected: page === 'messages' }} onPress={() => setPage('messages')} style={[styles.tab, page === 'messages' && styles.activeTab]}><Text style={styles.tabText}>Messages{chatState && (chatState.messages.some((m) => !m.read) || chatState.friends.some((f) => f.status === 'incoming')) ? ' •' : ''}</Text></Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  hiddenPage: { display: 'none' },
  visiblePage: { flex: 1 },
  navigation: { flexDirection: 'row', gap: 10, padding: 12, backgroundColor: '#FFFFFF', borderTopWidth: 1, borderTopColor: '#EFDFE3' },
  tab: { flex: 1, alignItems: 'center', padding: 13, borderRadius: 12 },
  activeTab: { backgroundColor: '#F5E5E9' },
  tabText: { color: '#922B41', fontWeight: '700', fontSize: 14 },
  safeArea: { flex: 1, backgroundColor: '#F8E8E9' },
  container: { flexGrow: 1, paddingHorizontal: 24, paddingVertical: 28, alignItems: 'center' },
  header: { alignSelf: 'stretch', marginBottom: 28 },
  welcome: { color: '#8A7778', fontSize: 13 },
  userName: { color: '#191314', fontSize: 18, fontWeight: '700', marginTop: 2 },
  title: { color: '#171112', fontSize: 25, fontWeight: '900', textAlign: 'center' },
  description: { color: '#9B8587', fontSize: 14, lineHeight: 21, marginTop: 12, maxWidth: 300, textAlign: 'center' },
  sosOuterHalo: { alignItems: 'center', backgroundColor: '#FBEFF0', borderRadius: 118, height: 236, justifyContent: 'center', marginVertical: 30, width: 236 },
  sosInnerHalo: { alignItems: 'center', backgroundColor: '#F8D6D8', borderRadius: 94, height: 188, justifyContent: 'center', width: 188 },
  sosButton: { alignItems: 'center', backgroundColor: '#EF5959', borderRadius: 76, elevation: 8, height: 152, justifyContent: 'center', shadowColor: '#9C3030', shadowOffset: { width: 0, height: 7 }, shadowOpacity: 0.28, shadowRadius: 8, width: 152 },
  sosButtonPressed: { transform: [{ scale: 0.96 }] },
  sosLabel: { color: '#FFFFFF', fontSize: 34, fontWeight: '900' },
  disabledButton: { opacity: 0.55 },
  locationCard: { alignSelf: 'stretch', backgroundColor: '#FFFFFF', borderRadius: 8, elevation: 3, minHeight: 92, padding: 16, shadowColor: '#3A2224', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.18, shadowRadius: 3 },
  cardLabel: { color: '#504344', fontSize: 12, fontWeight: '800', letterSpacing: 0.5 },
  cardValue: { color: '#33292A', fontSize: 14, fontWeight: '600', marginTop: 8 },
  cardHint: { color: '#8A7778', fontSize: 12, marginTop: 5 },
  networkRow: { alignItems: 'center', alignSelf: 'stretch', flexDirection: 'row', marginTop: 20 },
  statusDot: { borderRadius: 5, height: 10, marginRight: 9, width: 10 },
  statusConnected: { backgroundColor: '#36A269' },
  statusSearching: { backgroundColor: '#E4A23A' },
  networkText: { color: '#665556', flex: 1, fontSize: 12, lineHeight: 17 },
  deliveryStatus: { color: '#705F60', fontSize: 12, lineHeight: 18, marginTop: 14, textAlign: 'center' },
  error: { color: '#B4232D', fontSize: 12, lineHeight: 18, marginTop: 10, textAlign: 'center' },
  success: { color: '#18794E', fontSize: 13, fontWeight: '700', lineHeight: 19, marginTop: 14, textAlign: 'center' },
  traceText: { color: '#8A7778', fontFamily: 'monospace', fontSize: 10, lineHeight: 15, marginTop: 8, textAlign: 'center' },
});
