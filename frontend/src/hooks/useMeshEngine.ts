/**
 * src/hooks/useMeshEngine.ts
 *
 * Central integration hook.
 *
 * On mount:
 *   1. Gets or creates the persistent nodeId and displayName
 *   2. Connects signalingClient to the server
 *   3. Initializes meshEngine with the signalingClient
 *   4. Subscribes all Zustand stores to engine events
 *
 * Returns { sendPacket, sendEmergency, localNodeId, connectionStatus }
 * so screens don't need to import engine internals directly.
 */

import { useEffect, useRef, useCallback } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { meshEngine } from '../engine/MeshEngine';
import { signalingClient } from '../lib/signaling';
import { getOrCreateNodeId, getOrCreateDisplayName } from '../lib/nodeId';
import { SIGNALING_URL } from '../lib/constants';
import { useMeshStore } from '../stores/useMeshStore';
import { usePacketStore, UIMessage, PacketTraceEntry } from '../stores/usePacketStore';
import { useEmergencyStore } from '../stores/useEmergencyStore';
import { PacketPriority, EmergencyPayload } from '../engine/types';

let _initialized = false;

export function useMeshEngine() {
  const initializedRef = useRef(false);

  const { setLocalIdentity, addOrUpdatePeer, removePeer, setRoutingTable, setConnectionStatus } =
    useMeshStore();
  const { addDeliveredMessage, addOutgoingMessage, enqueuePacket, addTraceEntry } =
    usePacketStore();
  const { addEmergency } = useEmergencyStore();

  useEffect(() => {
    if (_initialized) return;
    _initialized = true;
    initializedRef.current = true;

    let localNodeId = '';
    let localDisplayName = '';

    async function init() {
      try {
        localNodeId = await getOrCreateNodeId();
        localDisplayName = await getOrCreateDisplayName();

        setLocalIdentity(localNodeId, localDisplayName);
        setConnectionStatus('connecting');

        // ── Wire engine events → Zustand stores ──────────────────────────────

        meshEngine.on('peer-connected', (node) => {
          addOrUpdatePeer(node);
        });

        meshEngine.on('peer-disconnected', (nodeId) => {
          removePeer(nodeId);
        });

        meshEngine.on('route-updated', (table) => {
          setRoutingTable(table);
        });

        meshEngine.on('packet-received', (packet) => {
          addTraceEntry({
            packetId: packet.packetId,
            type: packet.type,
            originId: packet.originId,
            destId: packet.destId,
            hopTrace: packet.hopTrace ?? [],
            timestamp: Date.now(),
            status: 'forwarded',
          } as PacketTraceEntry);
        });

        meshEngine.on('packet-delivered', (packet) => {
          if (packet.type !== 'DATA') return;
          const payload = packet.payload as any;
          const msg: UIMessage = {
            id: packet.packetId,
            packetId: packet.packetId,
            senderId: packet.originId,
            senderName: packet.originId,
            destId: packet.destId,
            content: payload.text ?? '',
            timestamp: Date.now(),
            hops: packet.hopCount,
            priority: packet.priority,
            status: 'delivered',
            isSelf: false,
          };
          addDeliveredMessage(msg);
        });

        meshEngine.on('packet-queued', (entry) => {
          enqueuePacket(entry);
        });

        meshEngine.on('packet-forwarded', (packet) => {
          addTraceEntry({
            packetId: packet.packetId,
            type: packet.type,
            originId: packet.originId,
            destId: packet.destId,
            hopTrace: packet.hopTrace ?? [],
            timestamp: Date.now(),
            status: 'forwarded',
          } as PacketTraceEntry);
        });

        meshEngine.on('emergency', (marker) => {
          addEmergency(marker);
        });

        // ── Connect signaling client ──────────────────────────────────────────

        signalingClient.onError = () => setConnectionStatus('disconnected');

        signalingClient.connect(SIGNALING_URL);

        // Wait a tick for socket connect event, then join
        setTimeout(async () => {
          try {
            signalingClient.join(localNodeId, localDisplayName);
            setConnectionStatus('connected');
            await meshEngine.initialize(localNodeId, localDisplayName, signalingClient);
          } catch (e) {
            console.warn('[useMeshEngine] init error:', e);
            setConnectionStatus('disconnected');
          }
        }, 800);
      } catch (e) {
        console.warn('[useMeshEngine] setup error:', e);
        setConnectionStatus('disconnected');
      }
    }

    init();

    // ── Handle app going to background / foreground ────────────────────────
    const sub = AppState.addEventListener('change', (nextState: AppStateStatus) => {
      if (nextState === 'background') {
        signalingClient.sendLeave();
      } else if (nextState === 'active' && localNodeId) {
        // Re-join on resume
        signalingClient.join(localNodeId, localDisplayName);
      }
    });

    return () => {
      sub.remove();
    };
  }, []);

  const sendPacket = useCallback(
    (destId: string, text: string, priority: PacketPriority = 'NORMAL') => {
      const { localNodeId, displayName } = useMeshStore.getState();

      // Optimistically add to local message list
      const outgoing: UIMessage = {
        id: `out-${Date.now()}`,
        packetId: `out-${Date.now()}`,
        senderId: localNodeId,
        senderName: 'You',
        destId,
        content: text,
        timestamp: Date.now(),
        hops: 0,
        priority,
        status: 'sent',
        isSelf: true,
      };
      addOutgoingMessage(outgoing);

      meshEngine.sendPacket(destId, text, priority);
    },
    [addOutgoingMessage]
  );

  const sendEmergency = useCallback(
    (text: string, severity: EmergencyPayload['severity']) => {
      meshEngine.sendEmergency(text, severity);
    },
    []
  );

  return { sendPacket, sendEmergency };
}
