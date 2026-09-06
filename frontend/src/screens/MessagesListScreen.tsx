import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../theme/colors';
import { useMeshStore } from '../stores/useMeshStore';
import { usePacketStore } from '../stores/usePacketStore';
import { MirageNode } from '../engine/types';

interface MessagesListScreenProps {
  onSelectConversation: (peerId: string, peerName: string) => void;
  onEmergencyBroadcast?: () => void;
}

export const MessagesListScreen: React.FC<MessagesListScreenProps> = ({
  onSelectConversation,
  onEmergencyBroadcast,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const { peers, connectionStatus, localNodeId } = useMeshStore();
  const { getMessagesForPeer } = usePacketStore();

  // Convert live peers Map to array
  const peerList = Array.from(peers.values());

  // Filter by search
  const filtered = peerList.filter((p) =>
    p.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.nodeId.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const peerCount = peerList.length;
  const onlineCount = peerList.filter((p) => p.status === 'alive').length;

  const getLastMessage = (peer: MirageNode) => {
    const msgs = getMessagesForPeer(peer.nodeId, localNodeId);
    if (msgs.length === 0) return 'No messages yet — tap to start';
    return msgs[msgs.length - 1].content;
  };

  const getUnreadCount = (peer: MirageNode) => {
    const msgs = getMessagesForPeer(peer.nodeId, localNodeId);
    return msgs.filter((m) => !m.isSelf && m.status !== 'delivered').length;
  };

  const statusLabel = () => {
    if (connectionStatus === 'connecting') return 'Connecting to mesh...';
    if (connectionStatus === 'disconnected') return 'Not connected';
    if (peerCount === 0) return 'No peers in range';
    return `${peerCount} Mesh Peer${peerCount !== 1 ? 's' : ''} in Range (P2P)`;
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Header Bar */}
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Messages</Text>
            <View style={styles.peerBadgeRow}>
              <View
                style={[
                  styles.onlineDot,
                  connectionStatus === 'connecting' && styles.connectingDot,
                  connectionStatus === 'disconnected' && styles.offlineDot,
                ]}
              />
              <Text style={styles.peerBadgeText}>{statusLabel()}</Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.newChatBtn}
            activeOpacity={0.8}
            onPress={() => onSelectConversation('*', 'SOS Mesh Broadcast Channel')}
          >
            <Ionicons name="add" size={22} color={COLORS.textWhite} />
          </TouchableOpacity>
        </View>

        {/* Search Bar */}
        <View style={styles.searchSection}>
          <View style={styles.searchBox}>
            <Ionicons name="search" size={18} color={COLORS.textMuted} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search peers or messages..."
              placeholderTextColor={COLORS.textMuted}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={16} color={COLORS.textMuted} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        <ScrollView
          style={styles.listScrollView}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
        >
          {/* Emergency Broadcast Channel Banner */}
          <TouchableOpacity
            style={styles.broadcastCard}
            activeOpacity={0.88}
            onPress={onEmergencyBroadcast}
          >
            <View style={styles.broadcastIconWrapper}>
              <Ionicons name="megaphone" size={22} color={COLORS.textWhite} />
            </View>
            <View style={styles.broadcastContent}>
              <Text style={styles.broadcastTitle}>SOS Mesh Broadcast Channel</Text>
              <Text style={styles.broadcastSubtitle}>
                {peerCount > 0
                  ? `Instant broadcast to all ${peerCount} reachable device${peerCount !== 1 ? 's' : ''}`
                  : 'No peers in range — SCF will queue your message'}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={COLORS.primaryRed} />
          </TouchableOpacity>

          <Text style={styles.sectionLabel}>
            {peerList.length > 0 ? 'CONNECTED PEERS' : 'DIRECT CONVERSATIONS'}
          </Text>

          {/* Empty state */}
          {peerList.length === 0 && connectionStatus === 'connected' && (
            <View style={styles.emptyState}>
              <Ionicons name="wifi-outline" size={48} color={COLORS.textMuted} />
              <Text style={styles.emptyStateText}>No peers in range</Text>
              <Text style={styles.emptyStateSubtext}>
                Other devices running Mirage on the same network will appear here automatically.
              </Text>
            </View>
          )}

          {connectionStatus !== 'connected' && (
            <View style={styles.emptyState}>
              <Ionicons name="cloud-offline-outline" size={48} color={COLORS.textMuted} />
              <Text style={styles.emptyStateText}>
                {connectionStatus === 'connecting' ? 'Connecting...' : 'Disconnected'}
              </Text>
              <Text style={styles.emptyStateSubtext}>
                Make sure the signaling server is running on your local network.
              </Text>
            </View>
          )}

          {/* Live Peer Conversation Cards */}
          {filtered.map((peer) => {
            const lastMsg = getLastMessage(peer);
            const unread = getUnreadCount(peer);
            const isOnline = peer.status === 'alive';

            return (
              <TouchableOpacity
                key={peer.nodeId}
                style={styles.convoCard}
                activeOpacity={0.85}
                onPress={() => onSelectConversation(peer.nodeId, peer.displayName)}
              >
                {/* Avatar */}
                <View style={[styles.avatar, !isOnline && styles.avatarOffline]}>
                  <Ionicons name="person" size={24} color={COLORS.textWhite} />
                  {isOnline && <View style={styles.onlineBadge} />}
                </View>

                {/* Message Details */}
                <View style={styles.convoBody}>
                  <View style={styles.convoTopRow}>
                    <Text style={styles.peerName} numberOfLines={1}>
                      {peer.displayName}
                    </Text>
                    <Text style={styles.nodeIdLabel} numberOfLines={1}>
                      {peer.nodeId.slice(-6)}
                    </Text>
                  </View>

                  <View style={styles.convoBottomRow}>
                    <Text
                      style={[styles.lastMessage, unread > 0 && styles.lastMessageUnread]}
                      numberOfLines={1}
                    >
                      {lastMsg}
                    </Text>

                    <View style={styles.hopBadge}>
                      <Text style={styles.hopText}>
                        {peer.status === 'alive' ? 'Direct' : peer.status}
                      </Text>
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.cardBg },
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    backgroundColor: COLORS.cardBg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? 36 : 14,
    paddingBottom: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.navBorder,
  },
  title: { fontSize: 26, fontWeight: '800', color: COLORS.textPrimary, letterSpacing: -0.5 },
  peerBadgeRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  onlineDot: { width: 7, height: 7, borderRadius: 3.5, backgroundColor: COLORS.onlineGreen },
  connectingDot: { backgroundColor: '#F59E0B' },
  offlineDot: { backgroundColor: '#9CA3AF' },
  peerBadgeText: { fontSize: 12, color: COLORS.textMuted, fontWeight: '600' },
  newChatBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primaryRed,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.primaryRed,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  searchSection: { paddingHorizontal: 16, paddingVertical: 12 },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.cardBg,
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 44,
    gap: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.cardBorder,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  searchInput: { flex: 1, fontSize: 14, color: COLORS.textPrimary },
  listScrollView: { flex: 1 },
  listContainer: { paddingHorizontal: 16, paddingBottom: 20 },
  broadcastCard: {
    backgroundColor: '#FFF1F0',
    borderRadius: 14,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: '#FECDD3',
    marginBottom: 16,
    shadowColor: COLORS.primaryRed,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 1,
  },
  broadcastIconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.primaryRed,
    alignItems: 'center',
    justifyContent: 'center',
  },
  broadcastContent: { flex: 1 },
  broadcastTitle: { fontSize: 15, fontWeight: '700', color: COLORS.primaryRedDark },
  broadcastSubtitle: { fontSize: 12, color: '#9F1239', marginTop: 2 },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textMuted,
    letterSpacing: 0.8,
    marginBottom: 10,
    marginLeft: 4,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 40,
    gap: 12,
    paddingBottom: 20,
  },
  emptyStateText: { fontSize: 18, fontWeight: '700', color: COLORS.textSecondary },
  emptyStateSubtext: {
    fontSize: 13,
    color: COLORS.textMuted,
    textAlign: 'center',
    maxWidth: 260,
    lineHeight: 18,
  },
  convoCard: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 14,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.cardBorder,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.primaryRed,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    shadowColor: COLORS.primaryRed,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  avatarOffline: { backgroundColor: '#9CA3AF' },
  onlineBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 13,
    height: 13,
    borderRadius: 6.5,
    backgroundColor: COLORS.onlineGreen,
    borderWidth: 2,
    borderColor: COLORS.cardBg,
  },
  convoBody: { flex: 1 },
  convoTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  peerName: { fontSize: 16, fontWeight: '700', color: COLORS.textPrimary, flex: 1 },
  nodeIdLabel: { fontSize: 11, color: COLORS.textMuted, fontFamily: 'monospace' },
  convoBottomRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  lastMessage: { flex: 1, fontSize: 13, color: COLORS.textSecondary, marginRight: 8 },
  lastMessageUnread: { fontWeight: '700', color: COLORS.textPrimary },
  hopBadge: { backgroundColor: '#F3F4F6', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  hopText: { color: COLORS.textMuted, fontSize: 10, fontWeight: '600' },
});
