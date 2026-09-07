import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Linking, Pressable, SafeAreaView, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { PeerEndpoint, TransportStatus } from '../../../../backend/src/transport/PeerTransport';
import { NearbyConnectionsTransport } from '../../core/transport/NearbyConnectionsTransport';
import { exportProvisioningManifest, HospitalIdentity, getOrCreateHospitalIdentity, publicManifest } from '../../core/security/identity';
import { MeshEngine } from '../../../../backend/src/mesh/engine';
import { PeerInfoExchange } from '../../core/transport/PeerInfoExchange';
import { createSosAckEnvelope, decryptSosEnvelope } from '../../core/security/envelope';
import { SosPayload } from '../../../../backend/src/domain/sos';

interface ReceivedSos { envelopeId: string; payload: SosPayload; receivedAt: number; }

/** Phase 1 shell for the Android-only hospital administrative app. */
export function HospitalDashboard() {
  const transport = useMemo(() => new NearbyConnectionsTransport('Mirage Hospital'), []);
  const [transportStatus, setTransportStatus] = useState<TransportStatus>('stopped');
  const [identity, setIdentity] = useState<HospitalIdentity | null>(null);
  const [identityError, setIdentityError] = useState<string | null>(null);
  const [alerts, setAlerts] = useState<ReceivedSos[]>([]);
  const [peers, setPeers] = useState<PeerEndpoint[]>([]);
  const [networkError, setNetworkError] = useState<string | null>(null);
  const [provisioningStatus, setProvisioningStatus] = useState<string | null>(null);
  const acceptedSosIds = useRef(new Set<string>());
  const [group, setGroup] = useState<{ groupFormed: boolean; isGroupOwner: boolean; groupOwnerAddress?: string }>({ groupFormed: false, isGroupOwner: false });
  const [routingTrace, setRoutingTrace] = useState<string[]>([]);

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
    void getOrCreateHospitalIdentity().then(setIdentity).catch((error: unknown) => {
      setIdentityError(error instanceof Error ? error.message : 'Unable to initialize protected hospital keys.');
    });
  }, []);

  useEffect(() => {
    if (!identity) return;
    const peerInfo = new PeerInfoExchange(transport, identity);
    const mesh = new MeshEngine(identity.encryptionPublicKey, identity.keyId, transport);
    const stopPeerInfo = peerInfo.start();
    mesh.start();
    const stopMesh = mesh.subscribe((event) => {
      const packet = event.packet;
      if (packet?.kind !== 'sos') return;
      setRoutingTrace((current) => [`${new Date().toLocaleTimeString()} · SOS ${event.disposition} at hop ${packet.hops ?? 0}`, ...current].slice(0, 8));
      if (event.disposition === 'dropped' && event.reason === 'Duplicate packet.' && acceptedSosIds.current.has(packet.envelopeId)) {
        void mesh.send(createSosAckEnvelope(packet, identity)).then(() => setRoutingTrace((current) => [`${new Date().toLocaleTimeString()} · duplicate SOS re-acknowledged`, ...current].slice(0, 8))).catch(() => undefined);
        return;
      }
      if (event.disposition !== 'delivered') return;
      try {
        const payload = decryptSosEnvelope(packet, identity);
        acceptedSosIds.current.add(packet.envelopeId);
        setAlerts((current) => current.some((alert) => alert.envelopeId === packet.envelopeId) ? current : [{ envelopeId: packet.envelopeId, payload, receivedAt: Date.now() }, ...current]);
        void mesh.send(createSosAckEnvelope(packet, identity)).then(() => setRoutingTrace((current) => [`${new Date().toLocaleTimeString()} · encrypted ACK transmitted`, ...current].slice(0, 8))).catch((error: unknown) => setNetworkError(error instanceof Error ? `SOS received, but acknowledgement failed: ${error.message}` : 'SOS received, but acknowledgement failed.'));
      } catch (error) {
        setIdentityError(error instanceof Error ? error.message : 'A nearby SOS packet could not be verified.');
      }
    });
    const stopAnnouncements = transport.subscribe((event) => {
      if (event.type === 'peer' && event.peer.status === 'connected') void peerInfo.announce(event.peer.peerId).catch(() => undefined);
    });
    transport.getPeers().filter((peer) => peer.status === 'connected').forEach((peer) => {
      void peerInfo.announce(peer.peerId).catch(() => undefined);
    });
    return () => { stopAnnouncements(); stopMesh(); stopPeerInfo(); mesh.stop(); };
  }, [identity, transport]);

  const nativeTransportReady = transportStatus === 'ready';
  const shareManifest = async () => {
    if (!identity) return;
    setProvisioningStatus(null);
    try {
      await Share.share({ title: 'Mirage Hospital public manifest', message: exportProvisioningManifest(identity) });
      setProvisioningStatus('Public manifest opened for administrator export. It contains no private keys.');
    } catch (error) { setProvisioningStatus(error instanceof Error ? error.message : 'Unable to export the public manifest.'); }
  };
  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.eyebrow}>MIRAGE HOSPITAL</Text>
        <Text style={styles.title}>Emergency operations dashboard</Text>
        <Text style={styles.description}>
          This offline Android app receives encrypted SOS alerts through automatically connected nearby Mirage devices.
        </Text>
        <View style={styles.card}>
          <Text style={styles.cardLabel}>NETWORK STATUS</Text>
          <Text style={styles.cardValue}>{nativeTransportReady ? 'Nearby transport ready' : transportStatus === 'unavailable' ? 'Nearby network needs attention' : 'Starting nearby transport'}</Text>
          <Text style={styles.cardHint}>{nativeTransportReady ? 'Advertising and discovering automatically through Google Nearby Connections.' : 'Requires an Android development build and Google Play services.'}</Text>
          <Text style={styles.groupStatus}>{group.groupFormed ? `${peers.filter((peer) => peer.status === 'connected').length} nearby connection${peers.filter((peer) => peer.status === 'connected').length === 1 ? '' : 's'} active` : 'Searching for nearby Mirage phones automatically.'}</Text>
          {networkError ? <Text style={styles.error}>{networkError}</Text> : null}
          {transportStatus === 'unavailable' ? <View>
            <Pressable style={styles.exportButton} onPress={() => void Linking.openSettings().catch(() => setNetworkError('Open Android Settings → Apps → Mirage Hospital → Permissions.'))}><Text style={styles.exportButtonText}>Open app permissions</Text></Pressable>
            <Pressable onPress={() => void transport.start().catch(() => undefined)}><Text style={styles.muted}>Retry nearby connection</Text></Pressable>
          </View> : null}
          {peers.filter((peer) => peer.status !== 'disconnected').map((peer) => <View style={styles.peerRow} key={peer.peerId}>
            <View style={styles.peerCopy}>
              <Text style={styles.peerName}>{peer.displayName ?? peer.ipAddress ?? 'Nearby device'}</Text>
            </View>
            <Text style={styles.peerStatus}>{peer.status === 'connected' ? 'Automatic link active' : peer.status}</Text>
          </View>)}
          {nativeTransportReady && peers.length === 0 ? <Text style={styles.muted}>No devices discovered yet.</Text> : null}
        </View>
        <View style={styles.card}>
          <Text style={styles.cardLabel}>DEMO ROUTING TRACE</Text>
          <Text style={styles.cardHint}>{routingTrace.length ? 'Newest event first' : 'Delivered SOS hop events will appear here.'}</Text>
          {routingTrace.map((entry, index) => <Text style={styles.traceText} key={`${entry}-${index}`}>{entry}</Text>)}
        </View>
        <View style={styles.card}>
          <Text style={styles.cardLabel}>HOSPITAL KEY</Text>
          <Text style={styles.cardValue}>{identity ? 'Protected hospital keys ready' : identityError ? 'Key setup failed' : 'Creating protected keys…'}</Text>
          <Text style={styles.cardHint}>{identity ? `Provisioning key ID: ${publicManifest(identity).keyId}` : identityError ?? 'Private keys remain on this Android device.'}</Text>
          <Pressable style={styles.exportButton} onPress={() => void shareManifest()} disabled={!identity}><Text style={styles.exportButtonText}>Export public manifest</Text></Pressable>
          {provisioningStatus ? <Text style={styles.muted}>{provisioningStatus}</Text> : null}
        </View>
        {alerts.length === 0 ? <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>No active SOS alerts</Text>
          <Text style={styles.emptyHint}>Verified nearby SOS alerts will appear here for this session.</Text>
        </View> : alerts.map((alert) => <View style={styles.alert} key={alert.envelopeId}>
          <Text style={styles.alertTitle}>{alert.payload.civilianName}</Text>
          <Text style={styles.alertText}>{alert.payload.injuryDescription}</Text>
          <Text style={styles.alertText}>{alert.payload.location.latitude.toFixed(6)}, {alert.payload.location.longitude.toFixed(6)} · ±{Math.round(alert.payload.location.accuracyMeters)} m</Text>
        </View>)}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F8FAFC' },
  container: { flexGrow: 1, padding: 24, gap: 22, justifyContent: 'center' },
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
  alert: { backgroundColor: '#FFFFFF', borderColor: '#FCA5A5', borderRadius: 16, borderWidth: 1, gap: 7, padding: 18 },
  alertTitle: { color: '#991B1B', fontSize: 20, fontWeight: '800' },
  alertText: { color: '#334155', fontSize: 14, lineHeight: 20 },
  error: { color: '#B91C1C', fontSize: 12, lineHeight: 18 },
  peerRow: { alignItems: 'center', borderTopColor: '#E2E8F0', borderTopWidth: 1, flexDirection: 'row', gap: 10, justifyContent: 'space-between', paddingTop: 10 },
  peerCopy: { flex: 1 },
  peerName: { color: '#0F172A', fontSize: 14, fontWeight: '700' },
  peerStatus: { color: '#64748B', fontSize: 12, textTransform: 'capitalize' },
  muted: { color: '#64748B', fontSize: 12 },
  exportButton: { alignItems: 'center', backgroundColor: '#0F172A', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10 },
  exportButtonText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },
  groupStatus: { color: '#92400E', fontSize: 13, fontWeight: '700' },
  traceText: { color: '#475569', fontFamily: 'monospace', fontSize: 11, lineHeight: 17 },
});
