import React, { useState } from 'react';
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
import { ChatMessage } from '../types';

interface ChatScreenProps {
  peerName?: string;
  onBack?: () => void;
}

export const ChatScreen: React.FC<ChatScreenProps> = ({
  peerName = 'Anshul Gupta',
  onBack,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'm-1',
      senderId: 'peer-anshul',
      senderName: 'Anshul Gupta',
      isSelf: false,
      content: 'Are you within mesh range? Please confirm your status.',
      timestamp: '10:41 AM',
      hops: 1,
      status: 'delivered',
    },
    {
      id: 'm-2',
      senderId: 'self',
      senderName: 'You',
      isSelf: true,
      content: 'Yes! Connected directly via WebRTC DataChannel. Standing by at 151 ABC Bangalore.',
      timestamp: '10:42 AM',
      hops: 0,
      status: 'delivered',
    },
    {
      id: 'm-3',
      senderId: 'peer-anshul',
      senderName: 'Anshul Gupta',
      isSelf: false,
      content: 'Rescue beacon received. Packet routed across 2 hops successfully.',
      timestamp: '10:44 AM',
      hops: 2,
      status: 'delivered',
    },
    {
      id: 'm-4',
      senderId: 'self',
      senderName: 'You',
      isSelf: true,
      content: 'Understood. Battery level is 85%. Keeping mesh node active.',
      timestamp: '10:45 AM',
      hops: 0,
      status: 'delivered',
    },
  ]);

  const handleSend = (text: string, priority: 'NORMAL' | 'HIGH' | 'EMERGENCY') => {
    const newMessage: ChatMessage = {
      id: `m-${Date.now()}`,
      senderId: 'self',
      senderName: 'You',
      isSelf: true,
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      hops: 0,
      priority,
      status: 'delivered',
    };
    setMessages((prev) => [...prev, newMessage]);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Header Bar matching Screenshot 2 */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            {onBack && (
              <TouchableOpacity onPress={onBack} style={styles.backBtn} activeOpacity={0.7}>
                <Ionicons name="chevron-back" size={24} color={COLORS.textPrimary} />
              </TouchableOpacity>
            )}
            <View style={styles.headerAvatar}>
              <Ionicons name="person" size={22} color={COLORS.textWhite} />
            </View>
            <View style={styles.headerTextGroup}>
              <Text style={styles.headerTitle}>{peerName}</Text>
              <View style={styles.statusRow}>
                <View style={styles.onlineDot} />
                <Text style={styles.statusText}>Mesh Connected (Direct P2P)</Text>
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
          style={styles.messagesScroll}
          contentContainerStyle={styles.messagesContainer}
          showsVerticalScrollIndicator={false}
        >
          {messages.map((item) => (
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
  headerTextGroup: {
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
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
  },
});
