import React, { useState } from 'react';
import { StyleSheet, View, SafeAreaView, Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { COLORS } from './src/theme/colors';
import { ScreenType } from './src/types';
import { BottomNav } from './src/components/BottomNav';
import { HomeScreen } from './src/screens/HomeScreen';
import { MessagesListScreen } from './src/screens/MessagesListScreen';
import { ChatScreen } from './src/screens/ChatScreen';
import { ProfileScreen } from './src/screens/ProfileScreen';

export default function App() {
  const [activeScreen, setActiveScreen] = useState<ScreenType>('home');
  const [selectedPeer, setSelectedPeer] = useState<string>('Anshul Gupta');

  const handleSelectConversation = (peerName: string) => {
    setSelectedPeer(peerName);
    setActiveScreen('chat');
  };

  const handleEmergencyBroadcast = () => {
    // Navigate to broadcast or active chat
    setSelectedPeer('SOS Mesh Broadcast Channel');
    setActiveScreen('chat');
  };

  return (
    <SafeAreaProvider>
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
                peerName={selectedPeer}
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
