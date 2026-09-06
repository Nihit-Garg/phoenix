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
import { Conversation } from '../types';

interface MessagesListScreenProps {
  onSelectConversation: (peerName: string) => void;
  onEmergencyBroadcast?: () => void;
}

export const MessagesListScreen: React.FC<MessagesListScreenProps> = ({
  onSelectConversation,
  onEmergencyBroadcast,
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  const [conversations] = useState<Conversation[]>([
    {
      id: 'c-1',
      peerId: 'peer-anshul',
      peerName: 'Anshul Gupta',
      lastMessage: 'Understood. Battery level is 85%. Keeping mesh node active.',
      timestamp: '10:45 AM',
      unreadCount: 0,
      hopCount: 1,
      isOnline: true,
    },
    {
      id: 'c-2',
      peerId: 'peer-alpha',
      peerName: 'Disaster Relief Alpha',
      lastMessage: 'Emergency supplies arriving near ABC Bangalore zone within 20 mins.',
      timestamp: '10:30 AM',
      unreadCount: 2,
      isEmergency: true,
      hopCount: 2,
      isOnline: true,
    },
    {
      id: 'c-3',
      peerId: 'peer-station4',
      peerName: 'Medical Station 4',
      lastMessage: 'First-aid post established at sector 12. Power generator live.',
      timestamp: '09:55 AM',
      unreadCount: 0,
      hopCount: 1,
      isOnline: true,
    },
    {
      id: 'c-4',
      peerId: 'peer-volunteer',
      peerName: 'Relief Volunteer Node',
      lastMessage: 'Packet Store-Carry-Forward queue cleared. All peers synced.',
      timestamp: 'Yesterday',
      unreadCount: 0,
      hopCount: 3,
      isOnline: false,
    },
  ]);

  const filteredConversations = conversations.filter(
    (c) =>
      c.peerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.lastMessage.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Header Bar */}
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Messages</Text>
            <View style={styles.peerBadgeRow}>
              <View style={styles.onlineDot} />
              <Text style={styles.peerBadgeText}>3 Mesh Peers in Range (Offline P2P)</Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.newChatBtn}
            activeOpacity={0.8}
            onPress={() => onSelectConversation('New Mesh Peer')}
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
                Instant broadcast to all 3 reachable devices
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={COLORS.primaryRed} />
          </TouchableOpacity>

          <Text style={styles.sectionLabel}>DIRECT CONVERSATIONS</Text>

          {/* Conversation Cards */}
          {filteredConversations.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={styles.convoCard}
              activeOpacity={0.85}
              onPress={() => onSelectConversation(item.peerName)}
            >
              {/* Avatar matching Screenshot 2 */}
              <View style={styles.avatar}>
                <Ionicons name="person" size={24} color={COLORS.textWhite} />
                {item.isOnline && <View style={styles.onlineBadge} />}
              </View>

              {/* Message Details */}
              <View style={styles.convoBody}>
                <View style={styles.convoTopRow}>
                  <Text style={styles.peerName} numberOfLines={1}>
                    {item.peerName}
                  </Text>
                  <Text style={styles.timestamp}>{item.timestamp}</Text>
                </View>

                <View style={styles.convoBottomRow}>
                  <Text
                    style={[
                      styles.lastMessage,
                      item.unreadCount > 0 && styles.lastMessageUnread,
                    ]}
                    numberOfLines={1}
                  >
                    {item.lastMessage}
                  </Text>

                  {item.unreadCount > 0 ? (
                    <View style={styles.unreadBadge}>
                      <Text style={styles.unreadText}>{item.unreadCount}</Text>
                    </View>
                  ) : (
                    <View style={styles.hopBadge}>
                      <Text style={styles.hopText}>
                        {item.hopCount === 1 ? 'Direct' : `${item.hopCount} hops`}
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.cardBg,
  },
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
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
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: COLORS.textPrimary,
    letterSpacing: -0.5,
  },
  peerBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  onlineDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: COLORS.onlineGreen,
  },
  peerBadgeText: {
    fontSize: 12,
    color: COLORS.textMuted,
    fontWeight: '600',
  },
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
  searchSection: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
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
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: COLORS.textPrimary,
  },
  listScrollView: {
    flex: 1,
  },
  listContainer: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
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
  broadcastContent: {
    flex: 1,
  },
  broadcastTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.primaryRedDark,
  },
  broadcastSubtitle: {
    fontSize: 12,
    color: '#9F1239',
    marginTop: 2,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textMuted,
    letterSpacing: 0.8,
    marginBottom: 10,
    marginLeft: 4,
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
  convoBody: {
    flex: 1,
  },
  convoTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  peerName: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  timestamp: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  convoBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  lastMessage: {
    flex: 1,
    fontSize: 13,
    color: COLORS.textSecondary,
    marginRight: 8,
  },
  lastMessageUnread: {
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  unreadBadge: {
    backgroundColor: COLORS.primaryRed,
    borderRadius: 10,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  unreadText: {
    color: COLORS.textWhite,
    fontSize: 11,
    fontWeight: '800',
  },
  hopBadge: {
    backgroundColor: '#F3F4F6',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  hopText: {
    color: COLORS.textMuted,
    fontSize: 10,
    fontWeight: '600',
  },
});
