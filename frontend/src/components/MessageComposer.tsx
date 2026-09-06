import React, { useState } from 'react';
import { View, TextInput, TouchableOpacity, StyleSheet, Text, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../theme/colors';

interface MessageComposerProps {
  onSend: (text: string, priority: 'NORMAL' | 'HIGH' | 'EMERGENCY') => void;
}

export const MessageComposer: React.FC<MessageComposerProps> = ({ onSend }) => {
  const [text, setText] = useState('');
  const [priority, setPriority] = useState<'NORMAL' | 'EMERGENCY'>('NORMAL');

  const handleSend = () => {
    if (!text.trim()) return;
    onSend(text.trim(), priority);
    setText('');
    setPriority('NORMAL');
  };

  return (
    <View style={styles.container}>
      {priority === 'EMERGENCY' && (
        <View style={styles.priorityIndicator}>
          <Ionicons name="warning" size={13} color={COLORS.textWhite} />
          <Text style={styles.priorityIndicatorText}>Emergency Priority Broadcast</Text>
          <TouchableOpacity onPress={() => setPriority('NORMAL')}>
            <Ionicons name="close-circle" size={16} color={COLORS.textWhite} />
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.inputRow}>
        {/* Priority Toggle Button */}
        <TouchableOpacity
          style={[styles.priorityBtn, priority === 'EMERGENCY' && styles.priorityBtnActive]}
          onPress={() => setPriority(priority === 'NORMAL' ? 'EMERGENCY' : 'NORMAL')}
          activeOpacity={0.8}
        >
          <Ionicons
            name={priority === 'EMERGENCY' ? 'warning' : 'shield-outline'}
            size={18}
            color={priority === 'EMERGENCY' ? COLORS.primaryRed : COLORS.textSecondary}
          />
        </TouchableOpacity>

        {/* Text Input */}
        <TextInput
          style={styles.textInput}
          placeholder="Type a message..."
          placeholderTextColor={COLORS.textMuted}
          value={text}
          onChangeText={setText}
          multiline
          maxLength={300}
        />

        {/* Send Button */}
        <TouchableOpacity
          style={[styles.sendButton, !text.trim() && styles.sendButtonDisabled]}
          onPress={handleSend}
          disabled={!text.trim()}
          activeOpacity={0.8}
        >
          <Ionicons name="send" size={18} color={COLORS.textWhite} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.cardBg,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: COLORS.navBorder,
  },
  priorityIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.primaryRed,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginBottom: 8,
  },
  priorityIndicatorText: {
    color: COLORS.textWhite,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  priorityBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  priorityBtnActive: {
    backgroundColor: 'rgba(226, 92, 84, 0.15)',
  },
  textInput: {
    flex: 1,
    minHeight: 40,
    maxHeight: 100,
    backgroundColor: '#F9FAFB',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: Platform.OS === 'ios' ? 10 : 8,
    fontSize: 15,
    color: COLORS.textPrimary,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primaryRed,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.primaryRed,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  sendButtonDisabled: {
    backgroundColor: '#D1D5DB',
    shadowOpacity: 0,
    elevation: 0,
  },
});
