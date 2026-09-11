// 작성자: 김진우 — 가장자리 끌기로 상담 기록을 열고 세로 스크롤은 유지한다.
import React, {
  PropsWithChildren,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Animated,
  Easing,
  PanResponder,
  Platform,
  StyleSheet,
  View,
} from 'react-native';
import { useReducedMotion } from '../../shared/hooks/useReducedMotion';
import { ScreenTransition } from '../../shared/components/ScreenTransition';
import { chatColors } from '../../shared/theme/tokens';
import { HistorySwipeHint } from './HistorySwipeHint';

type Props = PropsWithChildren<{
  open: boolean;
  disabled: boolean;
  history: React.ReactNode;
  contentKey: string;
  onOpen: () => void;
  onClose: () => void;
}>;

export function HistorySwipeView({
  open,
  disabled,
  history,
  contentKey,
  onOpen,
  onClose,
  children,
}: Props) {
  const reduced = useReducedMotion();
  const progress = useRef(new Animated.Value(open ? 1 : 0)).current;
  const root = useRef<View>(null);
  const [width, setWidth] = useState(0);
  const origin = useRef({ x: 0, y: 0 });
  const touchStart = useRef({ x: 0, y: 0 });
  const [visible, setVisible] = useState(open);
  const dragging = useRef(false);
  const actions = useRef({ onOpen, onClose });
  actions.current = { onOpen, onClose };
  const settle = useCallback(
    (next: boolean) => {
      progress.stopAnimation();
      Animated.timing(progress, {
        toValue: next ? 1 : 0,
        duration: reduced ? 0 : 230,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: Platform.OS !== 'web',
      }).start(({ finished }) => {
        if (finished && !next) setVisible(false);
      });
    },
    [progress, reduced],
  );
  useEffect(() => {
    if (open) setVisible(true);
    if (!dragging.current) {
      const animation = Animated.timing(progress, {
        toValue: open ? 1 : 0,
        duration: reduced ? 0 : 230,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: Platform.OS !== 'web',
      });
      animation.start(({ finished }) => {
        if (finished && !open) setVisible(false);
      });
      return () => animation.stop();
    }
  }, [open, reduced, progress]);
  useEffect(() => () => progress.stopAnimation(), [progress]);
  const gestures = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponderCapture: event => {
          touchStart.current = {
            x: event.nativeEvent.pageX,
            y: event.nativeEvent.pageY,
          };
          const startX = event.nativeEvent.pageX - origin.current.x;
          if (
            Platform.OS === 'web' &&
            !disabled &&
            !open &&
            startX >= 0 &&
            startX <= 24
          )
            event.preventDefault();
          return false;
        },
        onMoveShouldSetPanResponderCapture: (event, state) => {
          if (disabled || !width || state.numberActiveTouches !== 1)
            return false;
          if (
            Math.abs(state.dx) < 12 ||
            Math.abs(state.dx) < Math.abs(state.dy) * 1.6
          )
            return false;
          const startX = touchStart.current.x - origin.current.x;
          const startY = touchStart.current.y - origin.current.y;
          const capture = open
            ? state.dx < 0 && startY > 76
            : state.dx > 0 && startX >= 0 && startX <= 36;
          if (capture) event.preventDefault();
          return capture;
        },
        onPanResponderGrant: () => {
          dragging.current = true;
          progress.stopAnimation();
          setVisible(true);
        },
        onPanResponderMove: (_event, state) =>
          progress.setValue(
            Math.max(0, Math.min(1, (open ? 1 : 0) + state.dx / width)),
          ),
        onPanResponderRelease: (_event, state) => {
          dragging.current = false;
          const next = open
            ? !(state.dx < -width * 0.25 || state.vx < -0.5)
            : state.dx > width * 0.25 || (state.dx > 24 && state.vx > 0.5);
          settle(next);
          if (next !== open) {
            if (next) actions.current.onOpen();
            else actions.current.onClose();
          }
        },
        onPanResponderTerminate: () => {
          dragging.current = false;
          settle(open);
        },
        onPanResponderTerminationRequest: () => false,
      }),
    [disabled, width, open, progress, settle],
  );
  return (
    <View
      ref={root}
      testID="chat-swipe-area"
      style={s.root}
      {...gestures.panHandlers}
      onLayout={event => {
        setWidth(event.nativeEvent.layout.width);
        root.current?.measureInWindow((x, y) => {
          origin.current = { x, y };
        });
      }}
    >
      <View
        style={s.root}
        pointerEvents={open ? 'none' : 'auto'}
        accessibilityElementsHidden={open}
        importantForAccessibility={open ? 'no-hide-descendants' : 'auto'}
      >
        <ScreenTransition transitionKey={contentKey}>
          {children}
        </ScreenTransition>
      </View>
      {!open && !disabled && (
        <View accessible={false} pointerEvents="auto" style={s.edge} />
      )}
      <HistorySwipeHint
        enabled={!disabled && contentKey === 'conversation'}
        open={open}
        engaged={visible}
        onOpen={onOpen}
      />
      {(visible || open) && (
        <Animated.View
          testID="chat-history-panel"
          pointerEvents={open ? 'auto' : 'none'}
          style={[
            s.panel,
            {
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
          {history}
        </Animated.View>
      )}
    </View>
  );
}
const s = StyleSheet.create({
  edge: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 24 },
  root: { flex: 1, minHeight: 0, overflow: 'hidden' },
  panel: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: chatColors.surface,
  },
});
