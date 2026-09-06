import React, { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated, Easing } from 'react-native';
import { COLORS } from '../theme/colors';

interface SosButtonProps {
  onPress: () => void;
  isEmergencyActive?: boolean;
}

export const SosButton: React.FC<SosButtonProps> = ({ onPress, isEmergencyActive = false }) => {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const rippleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Continuous subtle breathing ripple effect
    const rippleLoop = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(rippleAnim, {
            toValue: 1.08,
            duration: 1800,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1.03,
            duration: 1800,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(rippleAnim, {
            toValue: 1,
            duration: 1800,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1800,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
      ])
    );

    rippleLoop.start();
    return () => rippleLoop.stop();
  }, [rippleAnim, pulseAnim]);

  return (
    <View style={styles.outerWrapper}>
      {/* Outermost Concentric Ring */}
      <Animated.View
        style={[
          styles.outerRing,
          {
            transform: [{ scale: rippleAnim }],
          },
          isEmergencyActive && styles.activeOuterRing,
        ]}
      />

      {/* Middle Concentric Ring */}
      <Animated.View
        style={[
          styles.middleRing,
          {
            transform: [{ scale: pulseAnim }],
          },
          isEmergencyActive && styles.activeMiddleRing,
        ]}
      />

      {/* Central Interactive SOS Circle */}
      <TouchableOpacity
        activeOpacity={0.88}
        onPress={onPress}
        style={[styles.sosButton, isEmergencyActive && styles.activeSosButton]}
      >
        <Text style={styles.sosText}>SOS</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  outerWrapper: {
    width: 320,
    height: 320,
    alignItems: 'center',
    justifyContent: 'center',
  },
  outerRing: {
    position: 'absolute',
    width: 310,
    height: 310,
    borderRadius: 155,
    backgroundColor: COLORS.sosRippleOuter,
  },
  activeOuterRing: {
    backgroundColor: 'rgba(226, 92, 84, 0.22)',
  },
  middleRing: {
    position: 'absolute',
    width: 246,
    height: 246,
    borderRadius: 123,
    backgroundColor: COLORS.sosRippleMiddle,
  },
  activeMiddleRing: {
    backgroundColor: 'rgba(226, 92, 84, 0.38)',
  },
  sosButton: {
    width: 176,
    height: 176,
    borderRadius: 88,
    backgroundColor: COLORS.primaryRed,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.primaryRed,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 18,
    elevation: 12,
  },
  activeSosButton: {
    backgroundColor: COLORS.primaryRedDark,
    transform: [{ scale: 1.04 }],
  },
  sosText: {
    color: COLORS.textWhite,
    fontSize: 44,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
});
