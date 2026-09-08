import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Linking, Pressable, SafeAreaView, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { MeshDisposition, MeshEngine } from '../../../../backend/src/mesh/engine';
import { PeerEndpoint, TransportStatus } from '../../../../backend/src/transport/PeerTransport';
import { SosPayload } from '../../../../backend/src/domain/sos';
import { NearbyConnectionsTransport } from '../../core/transport/NearbyConnectionsTransport';
import { exportProvisioningManifest, HospitalIdentity, getOrCreateHospitalIdentity, publicManifest } from '../../core/security/identity';
import { PeerInfoExchange } from '../../core/transport/PeerInfoExchange';
import { createSosAckEnvelope, decryptSosEnvelope } from '../../core/security/envelope';
import { HOSPITAL_DASHBOARD_CONFIG } from '../../config/dashboard';

interface ReceivedSos {
  envelopeId: string;
  payload: SosPayload;
  receivedAt: number;
  hops: number;
}

interface RoutingLog {
  id: string;
  occurredAt: number;
  kind: 'sos' | 'ack';
  disposition: MeshDisposition | 'sent' | 'failed';
  hops: number;
  detail: string;
}

const palette = {
  canvas: '#F4F7FB', surface: '#FFFFFF', ink: '#122033', muted: '#65758B', faint: '#94A3B8', line: '#E2E8F0',
  navy: '#16324F', red: '#D9364E', redDark: '#A51D34', redSoft: '#FFF1F3', green: '#16865C', greenSoft: '#EAF8F2',
  amber: '#A76012', amberSoft: '#FFF7E8', redBorder: '#FFD1D8', redBorderStrong: '#F3A7B3', greenBorder: '#CDEEE0', hopLine: '#B9C5D4',
} as const;

function formatTime(value: number): string {
  return new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function formatDateTime(value: number): string {
  return new Date(value).toLocaleString([], { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

function shortId(value: string): string {
  return value.length > 16 ? `${value.slice(0, 8)}…${value.slice(-6)}` : value;
}

function HopGraph({ hops }: { hops: number }) {
  const safeHops = Math.max(0, Math.floor(hops));
  const labels = ['Sender', ...Array.from({ length: safeHops }, (_, index) => `Relay ${index + 1}`), 'Hospital'];
  return (
    <View accessibilityLabel={`${safeHops} relay hops`} style={styles.hopGraph}>
      <View style={styles.hopTrack}>
        {labels.map((label, index) => (
          <React.Fragment key={`${label}-${index}`}>
            {index > 0 ? <View style={styles.hopLine} /> : null}
            <View style={[styles.hopNode, index === labels.length - 1 && styles.hopNodeHospital]} />
          </React.Fragment>
        ))}
      </View>
      <View style={styles.hopLabels}>
        {labels.map((label, index) => <Text numberOfLines={1} style={styles.hopLabel} key={`${label}-label-${index}`}>{label}</Text>)}
      </View>
    </View>
  );
}

function AlertCard({ alert, featured = false }: { alert: ReceivedSos; featured?: boolean }) {
  const routeLabel = alert.hops === 0 ? 'Direct delivery' : `${alert.hops} relay hop${alert.hops === 1 ? '' : 's'}`;
  return (
    <View style={[styles.alertCard, featured && styles.alertCardFeatured]}>
      <View style={styles.alertTopRow}>
        <View style={styles.sosBadge}><Text style={styles.sosBadgeText}>SOS</Text></View>
        <View style={styles.alertHeading}>
          <Text style={styles.alertName}>{alert.payload.civilianName}</Text>
          <Text style={styles.alertReceived}>Received {formatDateTime(alert.receivedAt)}</Text>
        </View>
        <View style={styles.liveBadge}><View style={styles.liveDot} /><Text style={styles.liveText}>ACTIVE</Text></View>
      </View>
      <Text style={styles.emergencyText}>{alert.payload.injuryDescription}</Text>
      <View style={styles.alertFacts}>
        <View style={styles.factBlock}>
          <Text style={styles.factLabel}>LOCATION</Text>
          <Text style={styles.factValue}>{alert.payload.location.latitude.toFixed(6)}, {alert.payload.location.longitude.toFixed(6)}</Text>
          <Text style={styles.factMeta}>±{Math.round(alert.payload.location.accuracyMeters)} m · captured {formatTime(alert.payload.location.capturedAt)}</Text>
        </View>
        <View style={styles.factBlockCompact}>
          <Text style={styles.factLabel}>ROUTE</Text>
          <Text style={styles.factValue}>{routeLabel}</Text>
          <Text style={styles.factMeta}>{shortId(alert.envelopeId)}</Text>
        </View>
      </View>
      <View style={styles.hopPanel}>
        <View style={styles.hopPanelHeader}>
          <Text style={styles.hopPanelTitle}>Delivery path</Text>
          <Text style={styles.hopCount}>{alert.hops} hop{alert.hops === 1 ? '' : 's'}</Text>
        </View>
        <HopGraph hops={alert.hops} />
      </View>
    </View>
  );
}

function Stat({ label, value, tone = 'default' }: { label: string; value: number | string; tone?: 'default' | 'danger' | 'success' }) {
  return (
    <View style={[styles.stat, tone === 'danger' && styles.statDanger, tone === 'success' && styles.statSuccess]}>
      <Text style={[styles.statValue, tone === 'danger' && styles.statValueDanger, tone === 'success' && styles.statValueSuccess]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

export function HospitalDashboard() {
  const transport = useMemo(() => new NearbyConnectionsTransport(HOSPITAL_DASHBOARD_CONFIG.nearbyEndpointName), []);
  const [transportStatus, setTransportStatus] = useState<TransportStatus>('stopped');
  const [identity, setIdentity] = useState<HospitalIdentity | null>(null);
  const [identityError, setIdentityError] = useState<string | null>(null);
  const [alerts, setAlerts] = useState<ReceivedSos[]>([]);
  const [peers, setPeers] = useState<PeerEndpoint[]>([]);
  const [networkError, setNetworkError] = useState<string | null>(null);
  const [provisioningStatus, setProvisioningStatus] = useState<string | null>(null);
  const acceptedSosIds = useRef(new Set<string>());
  const logSequence = useRef(0);
  const [groupFormed, setGroupFormed] = useState(false);
  const [routingLogs, setRoutingLogs] = useState<RoutingLog[]>([]);

  const appendLog = (entry: Omit<RoutingLog, 'id' | 'occurredAt'>) => {
    const occurredAt = Date.now();
    const id = `${occurredAt}-${++logSequence.current}`;
    setRoutingLogs((current) => [{ ...entry, id, occurredAt }, ...current].slice(0, HOSPITAL_DASHBOARD_CONFIG.eventLogLimit));
  };

  useEffect(() => {
    const unsubscribe = transport.subscribe((event) => {
      if (event.type === 'status') {
        setTransportStatus(event.status);
        if (event.status === 'starting' || event.status === 'ready') setNetworkError(null);
      }
      if (event.type === 'peer') setPeers([...transport.getPeers()]);
      if (event.type === 'error') setNetworkError(event.error.message);
      if (event.type === 'group') setGroupFormed(event.groupFormed);
    });
    void transport.start().catch((error: unknown) => setNetworkError(error instanceof Error ? error.message : 'Unable to start nearby discovery.'));
    return () => { unsubscribe(); void transport.stop(); };
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
      const hops = packet.hops ?? 0;
      appendLog({ kind: 'sos', disposition: event.disposition, hops, detail: event.reason ?? (event.disposition === 'delivered' ? 'SOS reached this Hospital.' : 'SOS forwarded to another connected device.') });
      if (event.disposition === 'dropped' && event.reason === 'Duplicate packet.' && acceptedSosIds.current.has(packet.envelopeId)) {
        const acknowledgement = createSosAckEnvelope(packet, identity);
        void mesh.send(acknowledgement).then(() => {
          appendLog({ kind: 'ack', disposition: 'sent', hops: acknowledgement.hops ?? 0, detail: 'Duplicate SOS safely ignored and acknowledgement re-sent.' });
        }).catch((error: unknown) => {
          appendLog({ kind: 'ack', disposition: 'failed', hops: acknowledgement.hops ?? 0, detail: error instanceof Error ? error.message : 'Unable to re-send the acknowledgement.' });
        });
        return;
      }
      if (event.disposition !== 'delivered') return;
      try {
        const payload = decryptSosEnvelope(packet, identity);
        acceptedSosIds.current.add(packet.envelopeId);
        setAlerts((current) => current.some((alert) => alert.envelopeId === packet.envelopeId) ? current : [{ envelopeId: packet.envelopeId, payload, receivedAt: Date.now(), hops }, ...current]);
        const acknowledgement = createSosAckEnvelope(packet, identity);
        void mesh.send(acknowledgement).then(() => {
          appendLog({ kind: 'ack', disposition: 'sent', hops: acknowledgement.hops ?? 0, detail: 'Encrypted acknowledgement transmitted to the sender.' });
        }).catch((error: unknown) => {
          const message = error instanceof Error ? error.message : 'Acknowledgement transmission failed.';
          setNetworkError(`SOS received, but acknowledgement failed: ${message}`);
          appendLog({ kind: 'ack', disposition: 'failed', hops: acknowledgement.hops ?? 0, detail: message });
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'A nearby SOS packet could not be verified.';
        setIdentityError(message);
        appendLog({ kind: 'sos', disposition: 'failed', hops, detail: message });
      }
    });
    const stopAnnouncements = transport.subscribe((event) => {
      if (event.type === 'peer' && event.peer.status === 'connected') void peerInfo.announce(event.peer.peerId).catch(() => undefined);
    });
    transport.getPeers().filter((peer) => peer.status === 'connected').forEach((peer) => { void peerInfo.announce(peer.peerId).catch(() => undefined); });
    return () => { stopAnnouncements(); stopMesh(); stopPeerInfo(); mesh.stop(); };
  }, [identity, transport]);

  const connectedPeers = peers.filter((peer) => peer.status === 'connected');
  const visiblePeers = peers.filter((peer) => peer.status !== 'disconnected');
  const latestAlert = alerts[0];
  const previousAlerts = alerts.slice(1, HOSPITAL_DASHBOARD_CONFIG.visiblePreviousAlerts + 1);
  const nativeTransportReady = transportStatus === 'ready';
  const networkHealthy = nativeTransportReady && groupFormed;
  const networkLabel = transportStatus === 'unavailable' ? 'Action needed' : networkHealthy ? 'Nearby network active' : nativeTransportReady ? 'Ready and searching' : 'Starting network';

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
        <View style={styles.header}>
          <View style={styles.headerCopy}>
            <Text style={styles.eyebrow}>MIRAGE HOSPITAL</Text>
            <Text style={styles.title}>Emergency operations</Text>
            <Text style={styles.description}>Offline SOS monitoring and response</Text>
          </View>
          <View style={[styles.networkBadge, networkHealthy && styles.networkBadgeHealthy]}>
            <View style={[styles.networkDot, networkHealthy && styles.networkDotHealthy]} />
            <Text style={[styles.networkBadgeText, networkHealthy && styles.networkBadgeTextHealthy]}>{networkLabel}</Text>
          </View>
        </View>

        <View style={styles.statsRow}>
          <Stat label="Active SOS" value={alerts.length} tone={alerts.length ? 'danger' : 'default'} />
          <Stat label="Connected devices" value={connectedPeers.length} tone={connectedPeers.length ? 'success' : 'default'} />
          <Stat label="Latest route" value={latestAlert ? `${latestAlert.hops} hop${latestAlert.hops === 1 ? '' : 's'}` : '—'} />
        </View>

        <View style={styles.sectionHeader}>
          <View><Text style={styles.sectionEyebrow}>PRIORITY</Text><Text style={styles.sectionTitle}>Incoming emergencies</Text></View>
          {alerts.length ? <Text style={styles.alertCount}>{alerts.length} active</Text> : null}
        </View>

        {latestAlert ? <AlertCard alert={latestAlert} featured /> : (
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}><View style={styles.emptyIconDot} /></View>
            <View style={styles.emptyCopy}><Text style={styles.emptyTitle}>No active SOS alerts</Text><Text style={styles.emptyHint}>Verified emergencies will appear here immediately, above network diagnostics.</Text></View>
          </View>
        )}

        {previousAlerts.length ? <View style={styles.previousAlerts}><Text style={styles.subsectionTitle}>Previous alerts</Text>{previousAlerts.map((alert) => <AlertCard alert={alert} key={alert.envelopeId} />)}</View> : null}

        <View style={styles.sectionHeader}>
          <View><Text style={styles.sectionEyebrow}>ACTIVITY</Text><Text style={styles.sectionTitle}>Routing logs</Text></View>
          <Text style={styles.logCount}>{routingLogs.length} events</Text>
        </View>
        <View style={styles.card}>
          {routingLogs.length ? routingLogs.map((log, index) => {
            const success = log.disposition === 'delivered' || log.disposition === 'sent';
            const failed = log.disposition === 'dropped' || log.disposition === 'failed';
            return (
              <View style={[styles.logRow, index > 0 && styles.rowDivider]} key={log.id}>
                <View style={[styles.logMarker, success && styles.logMarkerSuccess, failed && styles.logMarkerFailed]} />
                <View style={styles.logBody}>
                  <View style={styles.logHeading}><Text style={styles.logTitle}>{log.kind.toUpperCase()} · {log.disposition.toUpperCase()}</Text><Text style={styles.logTime}>{formatTime(log.occurredAt)}</Text></View>
                  <Text style={styles.logDetail}>{log.detail}</Text>
                </View>
                <View style={styles.logHopBadge}><Text style={styles.logHopText}>{log.hops}H</Text></View>
              </View>
            );
          }) : <Text style={styles.emptyLog}>Routing and acknowledgement events will appear here.</Text>}
        </View>

        <View style={styles.sectionHeader}>
          <View><Text style={styles.sectionEyebrow}>SYSTEM</Text><Text style={styles.sectionTitle}>Nearby network</Text></View>
          <Text style={[styles.systemStatus, networkHealthy && styles.systemStatusHealthy]}>{networkLabel}</Text>
        </View>
        <View style={styles.card}>
          <View style={styles.networkSummary}>
            <View><Text style={styles.cardLabel}>CONNECTED DEVICES</Text><Text style={styles.cardValue}>{connectedPeers.length}</Text></View>
            <Text style={styles.cardHint}>{nativeTransportReady ? 'Advertising and discovering automatically' : 'Nearby transport is starting'}</Text>
          </View>
          {networkError ? <View style={styles.errorBox}><Text style={styles.error}>{networkError}</Text></View> : null}
          {transportStatus === 'unavailable' ? <View style={styles.actionsRow}>
            <Pressable style={styles.primaryButton} onPress={() => void Linking.openSettings().catch(() => setNetworkError('Open Android Settings, select Mirage Hospital, then allow its permissions.'))}><Text style={styles.primaryButtonText}>Open permissions</Text></Pressable>
            <Pressable style={styles.secondaryButton} onPress={() => void transport.start().catch(() => undefined)}><Text style={styles.secondaryButtonText}>Retry</Text></Pressable>
          </View> : null}
          {visiblePeers.length ? visiblePeers.map((peer, index) => <View style={[styles.peerRow, index > 0 && styles.rowDivider]} key={peer.peerId}>
            <View style={[styles.peerAvatar, peer.status === 'connected' && styles.peerAvatarConnected]}><Text style={styles.peerAvatarText}>{(peer.displayName ?? 'D').charAt(0).toUpperCase()}</Text></View>
            <View style={styles.peerCopy}><Text style={styles.peerName}>{peer.displayName ?? 'Nearby device'}</Text><Text style={styles.peerMeta}>Last seen {formatTime(peer.lastSeenAt)}</Text></View>
            <Text style={[styles.peerStatus, peer.status === 'connected' && styles.peerStatusConnected]}>{peer.status === 'connected' ? 'LINK ACTIVE' : peer.status.toUpperCase()}</Text>
          </View>) : <Text style={styles.emptyLog}>No nearby devices discovered yet.</Text>}
        </View>

        <View style={styles.card}>
          <View style={styles.securityHeader}>
            <View style={styles.securityCopy}>
              <Text style={styles.cardLabel}>HOSPITAL IDENTITY</Text>
              <Text style={styles.securityTitle}>{identity ? 'Protected keys ready' : identityError ? 'Key setup needs attention' : 'Creating protected keys'}</Text>
              <Text style={styles.securityMeta}>{identity ? `Key ID · ${publicManifest(identity).keyId}` : identityError ?? 'Private keys remain protected on this device.'}</Text>
            </View>
            <View style={[styles.securityBadge, identity && styles.securityBadgeReady]}><Text style={styles.securityBadgeText}>{identity ? 'READY' : 'SETUP'}</Text></View>
          </View>
          <Pressable style={[styles.primaryButton, !identity && styles.buttonDisabled]} onPress={() => void shareManifest()} disabled={!identity}><Text style={styles.primaryButtonText}>Export public manifest</Text></Pressable>
          {provisioningStatus ? <Text style={styles.provisioningStatus}>{provisioningStatus}</Text> : null}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: palette.canvas },
  container: { flexGrow: 1, gap: 16, paddingBottom: 40, paddingHorizontal: 18, paddingTop: 18 },
  header: { alignItems: 'flex-start', flexDirection: 'row', gap: 12, justifyContent: 'space-between' }, headerCopy: { flex: 1 },
  eyebrow: { color: palette.red, fontSize: 11, fontWeight: '900', letterSpacing: 1.6 }, title: { color: palette.ink, fontSize: 30, fontWeight: '900', letterSpacing: -0.7, lineHeight: 35, marginTop: 5 },
  description: { color: palette.muted, fontSize: 14, lineHeight: 20, marginTop: 4 },
  networkBadge: { alignItems: 'center', backgroundColor: palette.amberSoft, borderRadius: 99, flexDirection: 'row', gap: 6, marginTop: 3, maxWidth: 118, paddingHorizontal: 10, paddingVertical: 7 },
  networkBadgeHealthy: { backgroundColor: palette.greenSoft }, networkDot: { backgroundColor: palette.amber, borderRadius: 5, height: 8, width: 8 }, networkDotHealthy: { backgroundColor: palette.green },
  networkBadgeText: { color: palette.amber, flexShrink: 1, fontSize: 9, fontWeight: '900', letterSpacing: 0.3, textTransform: 'uppercase' }, networkBadgeTextHealthy: { color: palette.green },
  statsRow: { flexDirection: 'row', gap: 8 }, stat: { backgroundColor: palette.surface, borderColor: palette.line, borderRadius: 14, borderWidth: 1, flex: 1, minHeight: 82, padding: 12 },
  statDanger: { backgroundColor: palette.redSoft, borderColor: palette.redBorder }, statSuccess: { backgroundColor: palette.greenSoft, borderColor: palette.greenBorder },
  statValue: { color: palette.ink, fontSize: 21, fontWeight: '900' }, statValueDanger: { color: palette.redDark }, statValueSuccess: { color: palette.green }, statLabel: { color: palette.muted, fontSize: 10, fontWeight: '700', lineHeight: 14, marginTop: 4, textTransform: 'uppercase' },
  sectionHeader: { alignItems: 'flex-end', flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 }, sectionEyebrow: { color: palette.faint, fontSize: 10, fontWeight: '900', letterSpacing: 1.5 },
  sectionTitle: { color: palette.ink, fontSize: 21, fontWeight: '900', marginTop: 3 }, alertCount: { backgroundColor: palette.redSoft, borderRadius: 99, color: palette.redDark, fontSize: 11, fontWeight: '900', overflow: 'hidden', paddingHorizontal: 10, paddingVertical: 6 }, logCount: { color: palette.muted, fontSize: 12, fontWeight: '700' },
  alertCard: { backgroundColor: palette.surface, borderColor: palette.line, borderRadius: 18, borderWidth: 1, gap: 14, padding: 16 },
  alertCardFeatured: { borderColor: palette.redBorderStrong, borderLeftColor: palette.red, borderLeftWidth: 5, elevation: 3, shadowColor: palette.redDark, shadowOffset: { height: 3, width: 0 }, shadowOpacity: 0.12, shadowRadius: 7 },
  alertTopRow: { alignItems: 'center', flexDirection: 'row', gap: 10 }, sosBadge: { alignItems: 'center', backgroundColor: palette.red, borderRadius: 12, height: 44, justifyContent: 'center', width: 44 }, sosBadgeText: { color: palette.surface, fontSize: 13, fontWeight: '900', letterSpacing: 0.5 },
  alertHeading: { flex: 1 }, alertName: { color: palette.ink, fontSize: 19, fontWeight: '900' }, alertReceived: { color: palette.muted, fontSize: 11, marginTop: 3 },
  liveBadge: { alignItems: 'center', backgroundColor: palette.redSoft, borderRadius: 99, flexDirection: 'row', gap: 5, paddingHorizontal: 8, paddingVertical: 6 }, liveDot: { backgroundColor: palette.red, borderRadius: 4, height: 6, width: 6 }, liveText: { color: palette.redDark, fontSize: 9, fontWeight: '900', letterSpacing: 0.7 },
  emergencyText: { color: palette.ink, fontSize: 16, fontWeight: '700', lineHeight: 23 }, alertFacts: { backgroundColor: palette.canvas, borderRadius: 12, flexDirection: 'row', gap: 12, padding: 12 },
  factBlock: { flex: 1.35 }, factBlockCompact: { flex: 1 }, factLabel: { color: palette.faint, fontSize: 9, fontWeight: '900', letterSpacing: 1 }, factValue: { color: palette.ink, fontSize: 12, fontWeight: '800', marginTop: 5 }, factMeta: { color: palette.muted, fontSize: 10, marginTop: 4 },
  hopPanel: { borderColor: palette.line, borderRadius: 12, borderWidth: 1, padding: 12 }, hopPanelHeader: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' }, hopPanelTitle: { color: palette.ink, fontSize: 12, fontWeight: '800' }, hopCount: { color: palette.redDark, fontSize: 11, fontWeight: '900' },
  hopGraph: { marginTop: 12 }, hopTrack: { alignItems: 'center', flexDirection: 'row', paddingHorizontal: 13 }, hopNode: { backgroundColor: palette.navy, borderColor: palette.surface, borderRadius: 8, borderWidth: 3, height: 15, width: 15 }, hopNodeHospital: { backgroundColor: palette.red }, hopLine: { backgroundColor: palette.hopLine, flex: 1, height: 3 }, hopLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 7 }, hopLabel: { color: palette.muted, flex: 1, fontSize: 8, textAlign: 'center' },
  emptyState: { alignItems: 'center', backgroundColor: palette.surface, borderColor: palette.line, borderRadius: 18, borderWidth: 1, flexDirection: 'row', gap: 14, padding: 18 }, emptyIcon: { alignItems: 'center', backgroundColor: palette.greenSoft, borderRadius: 24, height: 48, justifyContent: 'center', width: 48 }, emptyIconDot: { backgroundColor: palette.green, borderRadius: 7, height: 14, width: 14 }, emptyCopy: { flex: 1 }, emptyTitle: { color: palette.ink, fontSize: 16, fontWeight: '900' }, emptyHint: { color: palette.muted, fontSize: 12, lineHeight: 18, marginTop: 4 }, previousAlerts: { gap: 10 }, subsectionTitle: { color: palette.muted, fontSize: 12, fontWeight: '900', letterSpacing: 0.5, textTransform: 'uppercase' },
  card: { backgroundColor: palette.surface, borderColor: palette.line, borderRadius: 18, borderWidth: 1, overflow: 'hidden', padding: 16 }, logRow: { alignItems: 'flex-start', flexDirection: 'row', gap: 10, paddingVertical: 10 }, rowDivider: { borderTopColor: palette.line, borderTopWidth: 1 },
  logMarker: { backgroundColor: palette.amber, borderRadius: 5, height: 9, marginTop: 5, width: 9 }, logMarkerSuccess: { backgroundColor: palette.green }, logMarkerFailed: { backgroundColor: palette.red }, logBody: { flex: 1 }, logHeading: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' }, logTitle: { color: palette.ink, fontSize: 11, fontWeight: '900', letterSpacing: 0.4 }, logTime: { color: palette.faint, fontSize: 10 }, logDetail: { color: palette.muted, fontSize: 11, lineHeight: 16, marginTop: 3 }, logHopBadge: { backgroundColor: palette.canvas, borderRadius: 7, paddingHorizontal: 7, paddingVertical: 4 }, logHopText: { color: palette.navy, fontSize: 9, fontWeight: '900' }, emptyLog: { color: palette.muted, fontSize: 12, lineHeight: 18, paddingVertical: 6 },
  systemStatus: { color: palette.amber, fontSize: 11, fontWeight: '900', textTransform: 'uppercase' }, systemStatusHealthy: { color: palette.green }, networkSummary: { alignItems: 'flex-end', flexDirection: 'row', justifyContent: 'space-between', paddingBottom: 10 }, cardLabel: { color: palette.faint, fontSize: 10, fontWeight: '900', letterSpacing: 1.1 }, cardValue: { color: palette.ink, fontSize: 30, fontWeight: '900', marginTop: 3 }, cardHint: { color: palette.muted, flexShrink: 1, fontSize: 11, maxWidth: '60%', textAlign: 'right' },
  errorBox: { backgroundColor: palette.redSoft, borderRadius: 10, marginVertical: 8, padding: 10 }, error: { color: palette.redDark, fontSize: 11, lineHeight: 17 }, actionsRow: { flexDirection: 'row', gap: 8, marginVertical: 8 }, primaryButton: { alignItems: 'center', backgroundColor: palette.navy, borderRadius: 10, flex: 1, justifyContent: 'center', minHeight: 43, paddingHorizontal: 14 }, primaryButtonText: { color: palette.surface, fontSize: 12, fontWeight: '900' }, secondaryButton: { alignItems: 'center', borderColor: palette.line, borderRadius: 10, borderWidth: 1, justifyContent: 'center', minHeight: 43, paddingHorizontal: 18 }, secondaryButtonText: { color: palette.navy, fontSize: 12, fontWeight: '900' },
  peerRow: { alignItems: 'center', flexDirection: 'row', gap: 10, paddingVertical: 11 }, peerAvatar: { alignItems: 'center', backgroundColor: palette.canvas, borderRadius: 18, height: 36, justifyContent: 'center', width: 36 }, peerAvatarConnected: { backgroundColor: palette.greenSoft }, peerAvatarText: { color: palette.navy, fontSize: 13, fontWeight: '900' }, peerCopy: { flex: 1 }, peerName: { color: palette.ink, fontSize: 13, fontWeight: '800' }, peerMeta: { color: palette.faint, fontSize: 10, marginTop: 2 }, peerStatus: { color: palette.amber, fontSize: 9, fontWeight: '900' }, peerStatusConnected: { color: palette.green },
  securityHeader: { alignItems: 'flex-start', flexDirection: 'row', gap: 10, marginBottom: 14 }, securityCopy: { flex: 1 }, securityTitle: { color: palette.ink, fontSize: 16, fontWeight: '900', marginTop: 5 }, securityMeta: { color: palette.muted, fontSize: 11, marginTop: 4 }, securityBadge: { backgroundColor: palette.amberSoft, borderRadius: 99, paddingHorizontal: 9, paddingVertical: 6 }, securityBadgeReady: { backgroundColor: palette.greenSoft }, securityBadgeText: { color: palette.navy, fontSize: 9, fontWeight: '900' }, buttonDisabled: { opacity: 0.45 }, provisioningStatus: { color: palette.muted, fontSize: 11, lineHeight: 17, marginTop: 9 },
});
