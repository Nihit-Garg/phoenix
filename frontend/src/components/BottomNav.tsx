import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../theme/colors';
import { ScreenType } from '../types';

interface BottomNavProps {
  activeScreen: ScreenType;
  onNavigate: (screen: ScreenType) => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ activeScreen, onNavigate }) => {
  const isHome = activeScreen === 'home';
  const isMessages = activeScreen === 'messages' || activeScreen === 'chat';
  const isProfile = activeScreen === 'profile';

  return (
    <View style={styles.container}>
      <View style={styles.innerBar}>
        {/* Tab 1: Home */}
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => onNavigate('home')}
          style={[styles.tabButton, isHome && styles.activePill]}
        >
          <Ionicons
            name={isHome ? 'home' : 'home-outline'}
            size={22}
            color={isHome ? COLORS.textWhite : COLORS.navInactive}
          />
          {isHome && <Text style={styles.pillText}>Home</Text>}
        </TouchableOpacity>

        {/* Tab 2: Message */}
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => onNavigate('messages')}
          style={[styles.tabButton, isMessages && styles.activePill]}
        >
          <Ionicons
            name={isMessages ? 'chatbubble-ellipses' : 'chatbubble-ellipses-outline'}
            size={22}
            color={isMessages ? COLORS.textWhite : COLORS.navInactive}
          />
          {isMessages && <Text style={styles.pillText}>Message</Text>}
        </TouchableOpacity>

        {/* Tab 3: Profile */}
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => onNavigate('profile')}
          style={[styles.tabButton, isProfile && styles.activePill]}
        >
          <Ionicons
            name={isProfile ? 'person' : 'person-outline'}
            size={22}
            color={isProfile ? COLORS.textWhite : COLORS.navInactive}
          />
          {isProfile && <Text style={styles.pillText}>Profile</Text>}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.cardBg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: COLORS.navBorder,
    paddingBottom: Platform.OS === 'ios' ? 24 : 12,
    paddingTop: 10,
    paddingHorizontal: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 8,
  },
  innerBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    height: 48,
  },
  tabButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    minWidth: 44,
  },
  activePill: {
    backgroundColor: COLORS.primaryRed,
    paddingVertical: 9,
    paddingHorizontal: 20,
    borderRadius: 10,
    gap: 8,
    shadowColor: COLORS.primaryRed,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  pillText: {
    color: COLORS.textWhite,
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});
