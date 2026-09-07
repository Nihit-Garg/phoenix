import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Modal,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../theme/colors';
import { SosButton } from '../components/SosButton';
import { AddressCard } from '../components/AddressCard';
import { useMeshStore } from '../stores/useMeshStore';

interface HomeScreenProps {
  onAddressPress?: () => void;
  onEmergencyBroadcast?: () => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  onAddressPress,
  onEmergencyBroadcast,
}) => {
  const [isEmergencyActive, setIsEmergencyActive] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);

  const { peers, connectionStatus, displayName } = useMeshStore();

  const peerCount = peers.size;
  const onlineCount = Array.from(peers.values()).filter((p) => p.status === 'alive').length;

  const handleSosPress = () => {
    setIsEmergencyActive(true);
    setModalVisible(true);
    // App owns the actual send so Home and the broadcast chat do not create
    // two separate emergency packets for a single user gesture.
    if (onEmergencyBroadcast) onEmergencyBroadcast();
  };

  const cancelEmergency = () => {
    setIsEmergencyActive(false);
    setModalVisible(false);
  };

  const connStatusLabel = () => {
    if (connectionStatus === 'connecting') return 'Connecting to mesh...';
    if (connectionStatus === 'disconnected') return 'Mesh offline';
    if (peerCount === 0) return 'Mesh online — no peers in range';
    return `Mesh online — ${onlineCount} peer${onlineCount !== 1 ? 's' : ''} in range`;
  };

  const connStatusColor = () => {
    if (connectionStatus !== 'connected') return '#F59E0B';
    if (peerCount === 0) return '#6B7280';
    return COLORS.onlineGreen;
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />

      <View style={styles.container}>
        {/* Top Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.welcomeText}>Welcome back,</Text>
            <Text style={styles.nameText}>{displayName || 'Loading...'}</Text>
          </View>
          {/* Live connection badge */}
          <View style={[styles.connBadge, { borderColor: connStatusColor() }]}>
            <View style={[styles.connDot, { backgroundColor: connStatusColor() }]} />
            <Text style={[styles.connLabel, { color: connStatusColor() }]}>
              {connectionStatus === 'connected' ? `${peerCount} peers` : connectionStatus}
            </Text>
          </View>
        </View>

        {/* Status strip */}
        <View style={styles.statusStrip}>
          <Ionicons
            name={connectionStatus === 'connected' ? 'radio' : 'cloud-offline-outline'}
            size={13}
            color={connStatusColor()}
          />
          <Text style={[styles.statusStripText, { color: connStatusColor() }]}>
            {connStatusLabel()}
          </Text>
        </View>

        {/* Emergency Prompt Section */}
        <View style={styles.emergencyPromptSection}>
          <Text style={styles.headingText}>Are you in an emergency?</Text>
          <Text style={styles.subheadingText}>
            Press the button below — your SOS will be relayed across all reachable mesh nodes.
          </Text>
        </View>

        {/* Center Pulsing SOS Button */}
        <View style={styles.sosContainer}>
          <SosButton
            onPress={handleSosPress}
            isEmergencyActive={isEmergencyActive}
          />
        </View>

        {/* Bottom Address Card */}
        <View style={styles.addressWrapper}>
          <AddressCard
            address="151 ABC BANGALORE"
            onPress={onAddressPress}
          />
        </View>
      </View>

      {/* Emergency Active Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={cancelEmergency}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalBadge}>
              <Ionicons name="warning" size={32} color={COLORS.textWhite} />
            </View>
            <Text style={styles.modalTitle}>EMERGENCY SOS ACTIVE</Text>
            <Text style={styles.modalDesc}>
              Broadcasting your emergency across all reachable mesh nodes via store-carry-forward routing.
            </Text>

            <View style={styles.modalMetrics}>
              <View style={styles.metricItem}>
                <Ionicons name="radio" size={18} color={COLORS.primaryRed} />
                <Text style={styles.metricLabel}>Mesh Relay: Active</Text>
              </View>
              <View style={styles.metricItem}>
                <Ionicons name="people" size={18} color={COLORS.primaryRed} />
                <Text style={styles.metricLabel}>
                  {peerCount > 0
                    ? `${peerCount} Peer${peerCount !== 1 ? 's' : ''} Reached`
                    : 'SCF queuing — no peers yet'}
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.cancelButton}
              onPress={cancelEmergency}
              activeOpacity={0.85}
            >
              <Text style={styles.cancelButtonText}>Cancel Emergency</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.background },
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    paddingHorizontal: 24,
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'android' ? 36 : 12,
    paddingBottom: 20,
  },
  header: {
    marginTop: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  welcomeText: { fontSize: 16, color: COLORS.textSecondary, fontWeight: '400', letterSpacing: 0.2 },
  nameText: { fontSize: 22, fontWeight: '800', color: COLORS.textPrimary, marginTop: 2, letterSpacing: 0.2 },
  connBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginTop: 4,
  },
  connDot: { width: 7, height: 7, borderRadius: 3.5 },
  connLabel: { fontSize: 11, fontWeight: '700' },
  statusStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E5E7EB',
  },
  statusStripText: { fontSize: 12, fontWeight: '600' },
  emergencyPromptSection: { alignItems: 'center', marginTop: 8 },
  headingText: {
    fontSize: 26,
    fontWeight: '800',
    color: COLORS.textPrimary,
    textAlign: 'center',
    letterSpacing: -0.4,
  },
  subheadingText: {
    fontSize: 14,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginTop: 10,
    lineHeight: 20,
    maxWidth: 260,
  },
  sosContainer: { alignItems: 'center', justifyContent: 'center', marginVertical: 10 },
  addressWrapper: { width: '100%', alignItems: 'center', marginBottom: 4 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  modalContent: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    width: '100%',
    maxWidth: 340,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 14,
    elevation: 8,
  },
  modalBadge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: COLORS.primaryRed,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.primaryRed,
    textAlign: 'center',
    marginBottom: 8,
  },
  modalDesc: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 18,
  },
  modalMetrics: {
    width: '100%',
    backgroundColor: '#FEF2F2',
    borderRadius: 12,
    padding: 12,
    marginBottom: 20,
    gap: 8,
  },
  metricItem: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  metricLabel: { fontSize: 13, fontWeight: '600', color: '#991B1B' },
  cancelButton: {
    backgroundColor: '#111827',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 28,
    width: '100%',
    alignItems: 'center',
  },
  cancelButtonText: { color: COLORS.textWhite, fontSize: 15, fontWeight: '700' },
});
