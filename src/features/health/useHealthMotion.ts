// 작성자: 김진우 — 카드가 보일 때 한 번 재생하고 동작 줄이기 설정에서는 즉시 완성 상태를 표시한다.
import { createContext, RefObject, useContext, useEffect, useRef } from 'react';
import { Animated, Easing, useWindowDimensions, View } from 'react-native';
import { useReducedMotion } from '../../shared/hooks/useReducedMotion';
export const HealthMotionContext = createContext(new Set<() => void>());
export function useHealthMotion(key: string, host: RefObject<View | null>) {
  const reduced = useReducedMotion();
  const listeners = useContext(HealthMotionContext);
  const { height: windowHeight } = useWindowDimensions();
  const progress = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    progress.stopAnimation();
    if (reduced) {
      progress.setValue(1);
      return;
    }
    progress.setValue(0);
    let started = false,
      disposed = false;
    const animation = Animated.timing(progress, {
      toValue: 1,
      duration: 620,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
      isInteraction: false,
    });
    const reveal = () => {
      if (started || disposed) return;
      host.current?.measureInWindow((_x, y, width, height) => {
        if (
          !disposed &&
          !started &&
          width > 0 &&
          height > 0 &&
          y < windowHeight - 100 &&
          y + height > 80
        ) {
          started = true;
          listeners.delete(reveal);
          animation.start();
        }
      });
    };
    listeners.add(reveal);
    const frame = requestAnimationFrame(reveal);
    return () => {
      disposed = true;
      listeners.delete(reveal);
      cancelAnimationFrame(frame);
      animation.stop();
    };
  }, [key, reduced, progress, host, listeners, windowHeight]);
  return progress;
}
