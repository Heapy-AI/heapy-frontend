// 작성자: 김진우 — 화면 상태를 유지하며 짧은 페이드와 이동 전환을 제공한다.
import React, { PropsWithChildren, useEffect, useRef } from 'react';
import {
  Animated,
  Easing,
  Platform,
  StyleProp,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import { useReducedMotion } from '../hooks/useReducedMotion';

export function ScreenTransition({
  children,
  transitionKey,
  style,
  enabled = true,
}: PropsWithChildren<{
  transitionKey: string;
  style?: StyleProp<ViewStyle>;
  enabled?: boolean;
}>) {
  const reduced = useReducedMotion();
  const progress = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (!enabled || reduced) {
      progress.setValue(1);
      return;
    }
    progress.setValue(0);
    const animation = Animated.timing(progress, {
      toValue: 1,
      duration: 240,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: Platform.OS !== 'web',
    });
    animation.start();
    return () => animation.stop();
  }, [transitionKey, reduced, enabled, progress]);
  return (
    <Animated.View
      style={[
        s.fill,
        style,
        {
          opacity: progress.interpolate({
            inputRange: [0, 1],
            outputRange: [0.65, 1],
          }),
          transform: [
            {
              translateY: progress.interpolate({
                inputRange: [0, 1],
                outputRange: [8, 0],
              }),
            },
          ],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
}
const s = StyleSheet.create({ fill: { flex: 1, minHeight: 0 } });
