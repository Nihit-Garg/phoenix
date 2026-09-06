import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../theme/colors';
import { ChatMessage } from '../types';

interface ChatBubbleProps {
  message: ChatMessage;
}

export const ChatBubble: React.FC<ChatBubbleProps> = ({ message }) => {
  const isSelf = message.isSelf;

  return (
    <View style={[styles.row, isSelf ? styles.rowSelf : styles.rowOther]}>
      {/* Avatar on Left for incoming message */}
      {!isSelf && (
        <View style={styles.avatar}>
          <Ionicons name="person" size={20} color={COLORS.textWhite} />
        </View>
      )}

      {/* Speech Bubble Container */}
      <View style={[styles.bubbleWrapper, isSelf ? styles.bubbleWrapperSelf : styles.bubbleWrapperOther]}>
        <View style={[styles.bubble, isSelf ? styles.bubbleSelf : styles.bubbleOther]}>
          {message.priority === 'EMERGENCY' && (
            <View style={styles.emergencyTag}>
              <Ionicons name="warning" size={12} color={COLORS.textWhite} />
              <Text style={styles.emergencyTagText}>EMERGENCY</Text>
            </View>
          )}

          <Text style={styles.messageText}>{message.content}</Text>

          <View style={styles.metaRow}>
            {message.hops !== undefined && message.hops > 0 && (
              <Text style={styles.hopsText}>{message.hops} hop{message.hops > 1 ? 's' : ''}</Text>
            )}
            <Text style={styles.timestampText}>{message.timestamp}</Text>
            {isSelf && (
              <Ionicons
                name={message.status === 'delivered' ? 'checkmark-done' : 'checkmark'}
                size={14}
                color={COLORS.textMuted}
                style={{ marginLeft: 2 }}
              />
            )}
          </View>
        </View>
      </View>

      {/* Avatar on Right for sent message */}
      {isSelf && (
        <View style={styles.avatar}>
          <Ionicons name="person" size={20} color={COLORS.textWhite} />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginVertical: 10,
    paddingHorizontal: 14,
  },
  rowSelf: {
    justifyContent: 'flex-end',
  },
  rowOther: {
    justifyContent: 'flex-start',
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: COLORS.primaryRed,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
    shadowColor: COLORS.primaryRed,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    elevation: 3,
  },
  bubbleWrapper: {
    maxWidth: '74%',
  },
  bubbleWrapperOther: {
    marginLeft: 10,
  },
  bubbleWrapperSelf: {
    marginRight: 10,
  },
  bubble: {
    backgroundColor: COLORS.chatBubbleBg,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 16,
    minHeight: 52,
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  bubbleOther: {
    borderTopLeftRadius: 4,
  },
  bubbleSelf: {
    borderTopRightRadius: 4,
  },
  emergencyTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primaryRed,
    alignSelf: 'flex-start',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginBottom: 6,
    gap: 4,
  },
  emergencyTagText: {
    color: COLORS.textWhite,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  messageText: {
    fontSize: 15,
    color: COLORS.textPrimary,
    lineHeight: 21,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 6,
    gap: 4,
  },
  hopsText: {
    fontSize: 10,
    color: COLORS.meshBlue,
    fontWeight: '600',
    marginRight: 4,
  },
  timestampText: {
    fontSize: 11,
    color: COLORS.textMuted,
  },
});
