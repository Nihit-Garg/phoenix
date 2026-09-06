import React, { useState } from 'react';
import { StyleSheet, View, Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { COLORS } from './src/theme/colors';
import { ScreenType } from './src/types';
import { BottomNav } from './src/components/BottomNav';
import { HomeScreen } from './src/screens/HomeScreen';
import { MessagesListScreen } from './src/screens/MessagesListScreen';
import { ChatScreen } from './src/screens/ChatScreen';
import { ProfileScreen } from './src/screens/ProfileScreen';
import { useMeshEngine } from './src/hooks/useMeshEngine';

/**
 * App root.
 *
 * useMeshEngine() is called here at the top level so the engine
 * initializes once and its events flow into Zustand stores for all screens.
 */
function AppInner() {
  const [activeScreen, setActiveScreen] = useState<ScreenType>('home');
  const [selectedPeerId, setSelectedPeerId] = useState<string>('');
  const [selectedPeerName, setSelectedPeerName] = useState<string>('');

  // ── Boot the mesh engine (runs once on mount) ──────────────────────────
  const { sendEmergency } = useMeshEngine();

  const handleSelectConversation = (peerId: string, peerName: string) => {
    setSelectedPeerId(peerId);
    setSelectedPeerName(peerName);
    setActiveScreen('chat');
  };

  const handleEmergencyBroadcast = () => {
    sendEmergency('SOS — Emergency broadcast from this node', 'HIGH');
    setSelectedPeerId('*');
    setSelectedPeerName('SOS Mesh Broadcast Channel');
    setActiveScreen('chat');
  };

  return (
    <View style={styles.outerContainer}>
      <StatusBar style="dark" />
      <View style={styles.mobileShell}>
        {/* Active Screen View */}
        <View style={styles.screenContent}>
          {activeScreen === 'home' && (
            <HomeScreen
              onAddressPress={() => setActiveScreen('profile')}
              onEmergencyBroadcast={handleEmergencyBroadcast}
            />
          )}

          {activeScreen === 'messages' && (
            <MessagesListScreen
              onSelectConversation={handleSelectConversation}
              onEmergencyBroadcast={handleEmergencyBroadcast}
            />
          )}

          {activeScreen === 'chat' && (
            <ChatScreen
              peerId={selectedPeerId}
              peerName={selectedPeerName}
              onBack={() => setActiveScreen('messages')}
            />
          )}

          {activeScreen === 'profile' && (
            <ProfileScreen />
          )}
        </View>

        {/* Bottom Navigation Bar */}
        <BottomNav
          activeScreen={activeScreen}
          onNavigate={(screen) => setActiveScreen(screen)}
        />
      </View>
    </View>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AppInner />
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  outerContainer: {
    flex: 1,
    backgroundColor: '#EBE3DE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mobileShell: {
    flex: 1,
    width: '100%',
    maxWidth: Platform.OS === 'web' ? 440 : undefined,
    maxHeight: Platform.OS === 'web' ? 900 : undefined,
    backgroundColor: COLORS.background,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: Platform.OS === 'web' ? 0.12 : 0,
    shadowRadius: 24,
    elevation: Platform.OS === 'web' ? 10 : 0,
    borderRadius: Platform.OS === 'web' ? 28 : 0,
  },
  screenContent: {
    flex: 1,
  },
});
