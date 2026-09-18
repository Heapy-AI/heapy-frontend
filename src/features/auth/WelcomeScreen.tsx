import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Easing,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { HeapyLogo } from '../../shared/components/HeapyLogo';
import { useReducedMotion } from '../../shared/hooks/useReducedMotion';

/** 기존 앱 로고가 부드럽게 떠오르고 빛이 퍼지는 첫 진입 화면. 작성자: 김진우 */
export function WelcomeScreen({ onComplete }: { onComplete: () => void }) {
  const reduced = useReducedMotion();
  const { height } = useWindowDimensions();
  const compact = height < 640;
  const entrance = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(0)).current;
  const copy = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const timer = setTimeout(onComplete, 2100);
    return () => clearTimeout(timer);
  }, [onComplete]);

  useEffect(() => {
    if (reduced) {
      entrance.setValue(1);
      copy.setValue(1);
      pulse.setValue(0);
      return;
    }
    const reveal = Animated.stagger(170, [
      Animated.timing(entrance, {
        toValue: 1,
        duration: 750,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(copy, {
        toValue: 1,
        duration: 750,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]);
    const breathing = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 1600,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 1600,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    );
    reveal.start();
    breathing.start();
    return () => {
      reveal.stop();
      breathing.stop();
    };
  }, [reduced, entrance, copy, pulse]);

  return (
    <LinearGradient colors={['#F5FCF8', '#E7F8F2', '#EAF4FC']} style={s.screen}>
      <View pointerEvents="none" style={s.washTop} />
      <View pointerEvents="none" style={s.washBottom} />
      <SafeAreaView style={s.safe}>
        <View style={s.center}>
          <Animated.View
            style={[
              s.orbit,
              compact && s.compactOrbit,
              {
                opacity: entrance,
                transform: [
                  {
                    translateY: entrance.interpolate({
                      inputRange: [0, 1],
                      outputRange: [22, 0],
                    }),
                  },
                ],
              },
            ]}
          >
            <Animated.View
              pointerEvents="none"
              style={[
                s.ring,
                s.outerRing,
                compact && s.compactOuterRing,
                {
                  opacity: pulse.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.35, 0.7],
                  }),
                  transform: [
                    {
                      scale: pulse.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.93, 1.05],
                      }),
                    },
                  ],
                },
              ]}
            />
            <View pointerEvents="none" style={[s.ring, s.middleRing]} />
            <View pointerEvents="none" style={s.orbitDot} />
            <Animated.View
              style={[
                s.logoTile,
                compact && s.compactLogoTile,
                {
                  transform: [
                    {
                      translateY: pulse.interpolate({
                        inputRange: [0, 1],
                        outputRange: [3, -5],
                      }),
                    },
                    {
                      scale: entrance.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.84, 1],
                      }),
                    },
                  ],
                },
              ]}
            >
              <HeapyLogo size={compact ? 80 : 96} />
            </Animated.View>
          </Animated.View>
          <Animated.View
            style={[
              s.copy,
              {
                opacity: copy,
                transform: [
                  {
                    translateY: copy.interpolate({
                      inputRange: [0, 1],
                      outputRange: [16, 0],
                    }),
                  },
                ],
              },
            ]}
          >
            <Text style={s.wordmark}>HEAPY</Text>
            <View style={[s.divider, compact && s.compactDivider]} />
            <Text
              accessibilityRole="header"
              style={[s.headline, compact && s.compactHeadline]}
            >
              나의 건강에,{`\n`}작은 변화를.
            </Text>
          </Animated.View>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, overflow: 'hidden' },
  safe: { flex: 1, paddingHorizontal: 28 },
  washTop: {
    position: 'absolute',
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundColor: '#BDECD833',
    top: -130,
    right: -150,
  },
  washBottom: {
    position: 'absolute',
    width: 360,
    height: 360,
    borderRadius: 180,
    backgroundColor: '#C9E8FB40',
    bottom: -220,
    left: -100,
  },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  orbit: {
    width: 268,
    height: 268,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  compactOrbit: { width: 236, height: 218, marginBottom: 8 },
  compactOuterRing: { width: 206, height: 206, borderRadius: 103 },
  compactLogoTile: { width: 126, height: 126, borderRadius: 38 },
  compactDivider: { marginTop: 16, marginBottom: 16 },
  ring: { position: 'absolute', borderWidth: 1, borderColor: '#9AD4C2' },
  outerRing: { width: 250, height: 250, borderRadius: 125 },
  middleRing: {
    width: 202,
    height: 202,
    borderRadius: 101,
    borderColor: '#FFFFFFCC',
    backgroundColor: '#FFFFFF20',
  },
  orbitDot: {
    position: 'absolute',
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: '#7CD0BA',
    top: 43,
    right: 40,
    borderWidth: 2,
    borderColor: '#F4FCF9',
  },
  logoTile: {
    width: 142,
    height: 142,
    borderRadius: 43,
    backgroundColor: '#FFFFFFF2',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#FFFFFF',
    boxShadow: '0px 18px 45px rgba(38, 139, 124, 0.13)',
  },
  copy: { alignItems: 'center' },
  wordmark: {
    color: '#244F49',
    fontSize: 29,
    fontWeight: '800',
    letterSpacing: 6,
  },
  divider: {
    width: 26,
    height: 2,
    backgroundColor: '#9AD6C5',
    marginTop: 22,
    marginBottom: 24,
    borderRadius: 2,
  },
  headline: {
    color: '#244F49',
    fontSize: 30,
    lineHeight: 43,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: -0.8,
  },
  compactHeadline: { fontSize: 25, lineHeight: 35 },
});
