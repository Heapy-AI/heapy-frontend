// 작성자: 김진우 — 작은 가장자리 손잡이와 일회성 안내로 상담 기록 끌기를 알린다.
import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useReducedMotion } from '../../shared/hooks/useReducedMotion';
import { historyHintStorage } from './historyHintStorage';

let seenThisRun = false;

export function HistorySwipeHint({
  enabled,
  open,
  engaged,
  onOpen,
}: {
  enabled: boolean;
  open: boolean;
  engaged: boolean;
  onOpen: () => void;
}) {
  const [ready, setReady] = useState(false);
  const [hint, setHint] = useState(false);
  const reduced = useReducedMotion();
  const nudge = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    let active = true;
    historyHintStorage
      .hasSeen()
      .then(seen => {
        if (seen) seenThisRun = true;
        if (active) setReady(true);
      })
      .catch(() => {
        if (active) setReady(true);
      });
    return () => {
      active = false;
    };
  }, []);
  useEffect(() => {
    if (open) {
      seenThisRun = true;
      setHint(false);
      void historyHintStorage.markSeen().catch(() => {});
    }
  }, [open]);
  useEffect(() => {
    if (!ready || !enabled || open || seenThisRun) return;
    seenThisRun = true;
    setHint(true);
    void historyHintStorage.markSeen().catch(() => {});
  }, [ready, enabled, open]);
  useEffect(() => {
    if (!hint) return;
    const timer = setTimeout(() => setHint(false), 4500);
    return () => clearTimeout(timer);
  }, [hint]);
  useEffect(() => {
    nudge.setValue(0);
    if (!hint || reduced || !enabled || engaged || open) return;
    const motion = Animated.sequence([
      Animated.delay(350),
      Animated.timing(nudge, {
        toValue: 5,
        duration: 550,
        easing: Easing.inOut(Easing.cubic),
        useNativeDriver: Platform.OS !== 'web',
      }),
      Animated.timing(nudge, {
        toValue: 0,
        duration: 550,
        easing: Easing.inOut(Easing.cubic),
        useNativeDriver: Platform.OS !== 'web',
      }),
    ]);
    motion.start();
    return () => motion.stop();
  }, [hint, reduced, enabled, engaged, open, nudge]);

  if (!enabled || open) return null;
  return (
    <View pointerEvents="box-none" style={s.position}>
      <Animated.View style={{ transform: [{ translateX: nudge }] }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="손잡이로 상담 기록 열기"
          accessibilityHint="누르거나 오른쪽으로 밀어 상담 기록을 엽니다."
          onPress={onOpen}
          style={s.target}
        >
          {({ pressed }) => (
            <View style={[s.handle, (pressed || engaged) && s.active]} />
          )}
        </Pressable>
      </Animated.View>
      {hint && !engaged && (
        <View pointerEvents="none" style={s.hint}>
          <Text style={s.hintText}>밀어서 상담 기록 보기</Text>
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  position: {
    position: 'absolute',
    left: 0,
    top: 0,
    flexDirection: 'row',
    alignItems: 'center',
  },
  target: {
    width: 24,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
  },
  handle: { width: 4, height: 32, borderRadius: 2, backgroundColor: '#BBA3EF' },
  active: { backgroundColor: '#7947DE', width: 5 },
  hint: {
    alignSelf: 'flex-start',
    marginLeft: 2,
    marginTop: 2,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E3D6FC',
    backgroundColor: '#F4EEFF',
  },
  hintText: { fontSize: 12, color: '#67469A' },
});
