import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../theme/colors';
import { ChatBubble } from '../components/ChatBubble';
import { MessageComposer } from '../components/MessageComposer';
import { usePeerMessages } from '../hooks/usePeerMessages';
import { useMeshStore } from '../stores/useMeshStore';
import { ChatMessage } from '../types';

interface ChatScreenProps {
  peerId?: string;
  peerName?: string;
  onBack?: () => void;
}

export const ChatScreen: React.FC<ChatScreenProps> = ({
  peerId = '*',
  peerName = 'Mesh Peer',
  onBack,
}) => {
  const scrollRef = useRef<ScrollView>(null);
  const { messages, send } = usePeerMessages(peerId);
  const { connectionStatus, peers } = useMeshStore();

  const peer = peers.get(peerId);
  const isOnline = peer?.status === 'alive';
  const hopCount = peerId === '*' ? 0 : 1; // simplified — would come from routingTable

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
  }, [messages.length]);

  const handleSend = (text: string, priority: 'NORMAL' | 'HIGH' | 'EMERGENCY') => {
    send(text, priority);
  };

  // Convert UIMessage → ChatMessage shape for ChatBubble
  const chatMessages: ChatMessage[] = messages.map((m) => ({
    id: m.id,
    senderId: m.senderId,
    senderName: m.isSelf ? 'You' : (peer?.displayName ?? peerName),
    isSelf: m.isSelf,
    content: m.content,
    timestamp: new Date(m.timestamp).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    }),
    hops: m.hops,
    priority: m.priority as any,
    status: m.status,
  }));

  const statusLabel = () => {
    if (peerId === '*') return 'Broadcast to all reachable nodes';
    if (connectionStatus !== 'connected') return 'Connecting to mesh...';
    if (isOnline) return `Mesh Connected (${hopCount === 0 ? 'Direct P2P' : `${hopCount} hop${hopCount > 1 ? 's' : ''}`})`;
    return 'Peer offline — SCF queuing';
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Header Bar */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            {onBack && (
              <TouchableOpacity onPress={onBack} style={styles.backBtn} activeOpacity={0.7}>
                <Ionicons name="chevron-back" size={24} color={COLORS.textPrimary} />
              </TouchableOpacity>
            )}
            <View style={[styles.headerAvatar, peerId === '*' && styles.headerAvatarBroadcast]}>
              <Ionicons
                name={peerId === '*' ? 'megaphone' : 'person'}
                size={22}
                color={COLORS.textWhite}
              />
            </View>
            <View style={styles.headerTextGroup}>
              <Text style={styles.headerTitle}>{peerName}</Text>
              <View style={styles.statusRow}>
                <View
                  style={[
                    styles.onlineDot,
                    !isOnline && peerId !== '*' && styles.offlineDot,
                    connectionStatus !== 'connected' && styles.connectingDot,
                  ]}
                />
                <Text style={styles.statusText}>{statusLabel()}</Text>
              </View>
            </View>
          </View>

          <View style={styles.headerRight}>
            <TouchableOpacity style={styles.iconBtn}>
              <Ionicons name="radio-outline" size={20} color={COLORS.textSecondary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Message Thread Body */}
        <ScrollView
          ref={scrollRef}
          style={styles.messagesScroll}
          contentContainerStyle={styles.messagesContainer}
          showsVerticalScrollIndicator={false}
        >
          {chatMessages.length === 0 && (
            <View style={styles.emptyState}>
              <Ionicons name="chatbubbles-outline" size={48} color={COLORS.textMuted} />
              <Text style={styles.emptyStateText}>No messages yet</Text>
              <Text style={styles.emptyStateSubtext}>
                {connectionStatus === 'connected'
                  ? 'Send a message to start the conversation'
                  : 'Connecting to mesh network...'}
              </Text>
            </View>
          )}
          {chatMessages.map((item) => (
            <ChatBubble key={item.id} message={item} />
          ))}
        </ScrollView>

        {/* Interactive Message Input Composer */}
        <MessageComposer onSend={handleSend} />
      </KeyboardAvoidingView>
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
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.navBorder,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 3,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  backBtn: {
    paddingRight: 4,
  },
  headerAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: COLORS.primaryRed,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.primaryRed,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  headerAvatarBroadcast: {
    backgroundColor: '#7C3AED',
  },
  headerTextGroup: {
    justifyContent: 'center',
    flex: 1,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: COLORS.textPrimary,
    letterSpacing: 0.2,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 2,
  },
  onlineDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: COLORS.onlineGreen,
  },
  offlineDot: {
    backgroundColor: '#9CA3AF',
  },
  connectingDot: {
    backgroundColor: '#F59E0B',
  },
  statusText: {
    fontSize: 11,
    color: COLORS.textMuted,
    fontWeight: '500',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  messagesScroll: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  messagesContainer: {
    paddingVertical: 14,
    flexGrow: 1,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
    gap: 12,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  emptyStateSubtext: {
    fontSize: 13,
    color: COLORS.textMuted,
    textAlign: 'center',
    maxWidth: 240,
  },
});
