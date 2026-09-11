// 작성자: 김진우 — 누름과 취소에 반응하며 놓으면 원래 크기로 복원한다.
import { useEffect, useRef } from 'react';
import { Animated, Easing, Platform } from 'react-native';
import { useReducedMotion } from './useReducedMotion';

export function usePressFeedback(pressedScale = 0.97) {
  const reduced = useReducedMotion();
  const progress = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    progress.stopAnimation();
    progress.setValue(0);
    return () => progress.stopAnimation();
  }, [reduced, progress]);
  const onPressIn = () => {
    progress.stopAnimation();
    Animated.timing(progress, {
      toValue: 1,
      duration: reduced ? 0 : 90,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: Platform.OS !== 'web',
      isInteraction: false,
    }).start();
  };
  const onPressOut = () => {
    progress.stopAnimation();
    if (reduced) {
      progress.setValue(0);
      return;
    }
    Animated.spring(progress, {
      toValue: 0,
      speed: 24,
      bounciness: 4,
      useNativeDriver: Platform.OS !== 'web',
      isInteraction: false,
    }).start();
  };
  return {
    onPressIn,
    onPressOut,
    style: {
      opacity: progress.interpolate({
        inputRange: [0, 1],
        outputRange: [1, 0.86],
        extrapolate: 'clamp',
      }),
      transform: [
        {
          scale: progress.interpolate({
            inputRange: [0, 1],
            outputRange: [1, reduced ? 1 : pressedScale],
          }),
        },
      ],
    },
  };
}
