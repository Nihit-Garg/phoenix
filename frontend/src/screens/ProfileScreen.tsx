import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Switch,
  Platform,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../theme/colors';
import { SIGNALING_URL } from '../lib/constants';
import { useMeshStore } from '../stores/useMeshStore';
import { usePacketStore } from '../stores/usePacketStore';

interface ProfileScreenProps {
  onAddressChange?: (newAddress: string) => void;
}

export const ProfileScreen: React.FC<ProfileScreenProps> = () => {
  const [address, setAddress] = useState('151 ABC BANGALORE');
  const [isEditingAddress, setIsEditingAddress] = useState(false);
  const [autoRelayEnabled, setAutoRelayEnabled] = useState(true);
  const [highPriorityVibrate, setHighPriorityVibrate] = useState(true);
  const { displayName, localNodeId, peers, connectionStatus } = useMeshStore();
  const { scfQueue } = usePacketStore();

  const handleSaveAddress = () => {
    setIsEditingAddress(false);
    Alert.alert('Address Updated', `Emergency location set to: ${address}`);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Top Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Node Profile & Settings</Text>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* User Identity Card */}
          <View style={styles.profileCard}>
            <View style={styles.avatar}>
              <Ionicons name="person" size={38} color={COLORS.textWhite} />
            </View>
            <Text style={styles.name}>{displayName || 'Loading identity…'}</Text>
            <View style={styles.nodeIdBadge}>
              <Ionicons name="hardware-chip-outline" size={13} color={COLORS.meshBlue} />
              <Text style={styles.nodeIdText}>Node ID: {localNodeId || 'Loading…'}</Text>
            </View>
          </View>

          {/* Current Address Setting Card */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <View style={styles.iconCircle}>
                <Ionicons name="location" size={18} color={COLORS.primaryRed} />
              </View>
              <Text style={styles.sectionTitle}>Emergency Location</Text>
            </View>

            {isEditingAddress ? (
              <View style={styles.editRow}>
                <TextInput
                  style={styles.addressInput}
                  value={address}
                  onChangeText={setAddress}
                  placeholder="Enter current address..."
                  autoFocus
                />
                <TouchableOpacity
                  style={styles.saveBtn}
                  onPress={handleSaveAddress}
                  activeOpacity={0.8}
                >
                  <Ionicons name="checkmark" size={18} color={COLORS.textWhite} />
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.addressDisplayRow}>
                <View>
                  <Text style={styles.addressLabel}>Current Address</Text>
                  <Text style={styles.addressValue}>{address}</Text>
                </View>
                <TouchableOpacity
                  style={styles.editBtn}
                  onPress={() => setIsEditingAddress(true)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="pencil" size={16} color={COLORS.textSecondary} />
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Mesh Network Diagnostics Card */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <View style={styles.iconCircle}>
                <Ionicons name="radio" size={18} color={COLORS.primaryRed} />
              </View>
              <Text style={styles.sectionTitle}>Mirage Mesh Status</Text>
            </View>

            <View style={styles.statusItem}>
              <Text style={styles.statusLabel}>Signaling Server</Text>
              <Text style={connectionStatus === 'connected' ? styles.statusValueOnline : styles.statusValue}>
                {connectionStatus === 'connected' ? `Connected (${SIGNALING_URL})` : connectionStatus}
              </Text>
            </View>

            <View style={styles.statusItem}>
              <Text style={styles.statusLabel}>WebRTC DataChannels</Text>
              <Text style={styles.statusValue}>{peers.size} Active Peer{peers.size === 1 ? '' : 's'}</Text>
            </View>

            <View style={styles.statusItem}>
              <Text style={styles.statusLabel}>Store-Carry-Forward Buffer</Text>
              <Text style={styles.statusValue}>{scfQueue.length} Queued Packet{scfQueue.length === 1 ? '' : 's'}</Text>
            </View>

            <View style={styles.statusItem}>
              <Text style={styles.statusLabel}>Duplicate Cache</Text>
              <Text style={styles.statusValue}>Session-only duplicate cache</Text>
            </View>
          </View>

          {/* Protocol Preferences */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <View style={styles.iconCircle}>
                <Ionicons name="settings-outline" size={18} color={COLORS.primaryRed} />
              </View>
              <Text style={styles.sectionTitle}>Mesh Preferences</Text>
            </View>

            <View style={styles.toggleRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.toggleLabel}>Background Packet Relay</Text>
                <Text style={styles.toggleSub}>Relay encrypted packets for nearby devices</Text>
              </View>
              <Switch
                value={autoRelayEnabled}
                onValueChange={setAutoRelayEnabled}
                trackColor={{ false: '#D1D5DB', true: COLORS.primaryRedLight }}
                thumbColor={autoRelayEnabled ? COLORS.primaryRed : '#F4F3F4'}
              />
            </View>

            <View style={[styles.toggleRow, { borderBottomWidth: 0 }]}>
              <View style={{ flex: 1 }}>
                <Text style={styles.toggleLabel}>Emergency Siren & Haptics</Text>
                <Text style={styles.toggleSub}>Alert loudly on incoming SOS broadcast</Text>
              </View>
              <Switch
                value={highPriorityVibrate}
                onValueChange={setHighPriorityVibrate}
                trackColor={{ false: '#D1D5DB', true: COLORS.primaryRedLight }}
                thumbColor={highPriorityVibrate ? COLORS.primaryRed : '#F4F3F4'}
              />
            </View>
          </View>
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
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? 36 : 14,
    paddingBottom: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.navBorder,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 24,
    gap: 14,
  },
  profileCard: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.cardBorder,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: COLORS.primaryRed,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.primaryRed,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4,
    marginBottom: 12,
  },
  name: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  nodeIdBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 6,
    marginTop: 6,
  },
  nodeIdText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.meshBlue,
  },
  sectionCard: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 14,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.cardBorder,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
  },
  iconCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(226, 92, 84, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  addressDisplayRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
    padding: 12,
  },
  addressLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textMuted,
  },
  addressValue: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginTop: 2,
  },
  editBtn: {
    padding: 6,
  },
  editRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  addressInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: COLORS.primaryRed,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    color: COLORS.textPrimary,
    backgroundColor: '#FFFFFF',
  },
  saveBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: COLORS.primaryRed,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#F3F4F6',
  },
  statusLabel: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  statusValue: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  statusValueOnline: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.onlineGreen,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#F3F4F6',
  },
  toggleLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  toggleSub: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 2,
  },
});
