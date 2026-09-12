// 작성자: 김진우 — 조회 실패 안내와 재시도 동작을 구분하고 요청 중 중복 실행을 막는다.
import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

export function HealthRequestState({
  title,
  description,
  retry,
  busy = false,
}: {
  title: string;
  description: string;
  retry?: () => void;
  busy?: boolean;
}) {
  return (
    <View style={s.panel}>
      <View style={s.header}>
        <View style={s.icon}>
          {busy ? (
            <ActivityIndicator color="#169D92" />
          ) : (
            <Svg width={24} height={24} viewBox="0 0 24 24">
              <Circle
                cx={12}
                cy={12}
                r={9}
                stroke="#C18A48"
                strokeWidth={1.7}
                fill="none"
              />
              <Path
                d="M12 7v6m0 3v.1"
                stroke="#C18A48"
                strokeWidth={2}
                strokeLinecap="round"
              />
            </Svg>
          )}
        </View>
        <View style={s.copy}>
          <Text accessibilityLiveRegion="polite" style={s.title}>
            {title}
          </Text>
          <Text style={s.description}>{description}</Text>
        </View>
      </View>
      {retry && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="다시 시도"
          accessibilityState={{ disabled: busy, busy }}
          disabled={busy}
          onPress={retry}
          style={({ pressed }) => [
            s.retry,
            pressed && s.pressed,
            busy && s.busy,
          ]}
        >
          {busy ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Svg width={18} height={18} viewBox="0 0 24 24">
              <Path
                d="M20 8a8 8 0 1 0 0 8M20 3v5h-5"
                stroke="#FFFFFF"
                strokeWidth={1.8}
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </Svg>
          )}
          <Text style={s.retryText}>{busy ? '불러오는 중' : '다시 시도'}</Text>
        </Pressable>
      )}
    </View>
  );
}
const s = StyleSheet.create({
  panel: {
    padding: 17,
    borderRadius: 20,
    gap: 16,
    backgroundColor: '#F8FBFC',
    borderWidth: 1,
    borderColor: '#E4EDF0',
  },
  header: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  icon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: '#FFF4E2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  copy: { flex: 1, minWidth: 0, gap: 5 },
  title: { fontSize: 14, lineHeight: 21, color: '#34535F', fontWeight: '700' },
  description: { fontSize: 12, lineHeight: 19, color: '#758990' },
  retry: {
    minHeight: 46,
    borderRadius: 14,
    backgroundColor: '#189F93',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  retryText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },
  pressed: { opacity: 0.85 },
  busy: { opacity: 0.65 },
});
