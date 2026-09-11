// 작성자: 김진우 — 내용과 터치를 유지하는 장식용 물결·파동 효과.
import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  AppState,
  Easing,
  Platform,
  StyleSheet,
  View,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useReducedMotion } from '../hooks/useReducedMotion';

type Props = { active?: boolean; variant?: 'wave' | 'ripple'; testID?: string };

export function AmbientEffect({
  active = true,
  variant = 'wave',
  testID,
}: Props) {
  const reduced = useReducedMotion();
  const progress = useRef(new Animated.Value(0)).current;
  const [foreground, setForeground] = useState(
    AppState.currentState !== 'background' &&
      AppState.currentState !== 'inactive',
  );
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const subscription = AppState.addEventListener('change', state =>
      setForeground(state === 'active'),
    );
    return () => subscription.remove();
  }, []);
  useEffect(() => {
    progress.setValue(0);
    if (!active || reduced || !foreground || !width) return;
    const animation = Animated.loop(
      Animated.timing(progress, {
        toValue: 1,
        duration: variant === 'wave' ? 12000 : 3800,
        easing: Easing.linear,
        useNativeDriver: Platform.OS !== 'web',
        isInteraction: false,
      }),
    );
    animation.start();
    return () => animation.stop();
  }, [active, reduced, foreground, width, variant, progress]);
  const visible = active && !reduced && foreground;
  return (
    <View
      pointerEvents="none"
      accessible={false}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      testID={testID}
      style={[s.clip, variant === 'ripple' && s.rippleClip]}
      onLayout={event => setWidth(event.nativeEvent.layout.width)}
    >
      {visible &&
        width > 0 &&
        (variant === 'wave' ? (
          <>
            <Animated.View
              testID={testID ? `${testID}-motion` : undefined}
              style={[
                s.wave,
                {
                  width: width * 2,
                  transform: [
                    {
                      translateX: progress.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0, -width],
                      }),
                    },
                  ],
                },
              ]}
            >
              <Svg
                width="100%"
                height="100%"
                viewBox="0 0 800 160"
                preserveAspectRatio="none"
              >
                <Path
                  d="M0 58 C100 8 300 108 400 58 C500 8 700 108 800 58 L800 160 L0 160 Z"
                  fill="white"
                  fillOpacity={0.11}
                />
                <Path
                  d="M0 58 C100 8 300 108 400 58 C500 8 700 108 800 58"
                  fill="none"
                  stroke="white"
                  strokeOpacity={0.18}
                  strokeWidth={1}
                />
              </Svg>
            </Animated.View>
            <Animated.View
              style={[
                s.wave,
                s.frontWave,
                {
                  width: width * 2,
                  transform: [
                    {
                      translateX: progress.interpolate({
                        inputRange: [0, 1],
                        outputRange: [-width, 0],
                      }),
                    },
                  ],
                },
              ]}
            >
              <Svg
                width="100%"
                height="100%"
                viewBox="0 0 800 160"
                preserveAspectRatio="none"
              >
                <Path
                  d="M0 76 C140 126 260 26 400 76 C540 126 660 26 800 76 L800 160 L0 160 Z"
                  fill="white"
                  fillOpacity={0.1}
                />
              </Svg>
            </Animated.View>
          </>
        ) : (
          [0, 0.5].map(offset => {
            const phase = Animated.modulo(Animated.add(progress, offset), 1);
            return (
              <Animated.View
                key={offset}
                testID={testID ? `${testID}-motion-${offset}` : undefined}
                style={[
                  s.ring,
                  {
                    opacity: phase.interpolate({
                      inputRange: [0, 0.15, 1],
                      outputRange: [0, 0.48, 0],
                    }),
                    transform: [
                      {
                        scale: phase.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0.78, 1.12],
                        }),
                      },
                    ],
                  },
                ]}
              />
            );
          })
        ))}
    </View>
  );
}
const s = StyleSheet.create({
  clip: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    overflow: 'hidden',
    borderRadius: 24,
  },
  wave: { position: 'absolute', left: 0, bottom: -12, height: '85%' },
  frontWave: { bottom: -24 },
  rippleClip: { overflow: 'visible', borderRadius: 0 },
  ring: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: '100%',
    aspectRatio: 1,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: '#B6A2FF',
  },
});
