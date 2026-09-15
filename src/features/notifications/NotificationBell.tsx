import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SvgAsset as SvgXml } from './SvgAsset';
import { useQuery } from '@tanstack/react-query';
import assets from '../../assets/notifications/figmaAssets.json';
import { notificationApi, notificationKeys } from './notificationApi';
// 작성자: 김진우 — 홈 편집 왼쪽에서 실제 미열람 수와 알림 내역 진입을 제공한다.
export function NotificationBell({
  onPress,
  active = true,
}: {
  onPress: () => void;
  active?: boolean;
}) {
  const count = useQuery({
    queryKey: notificationKeys.badge,
    queryFn: ({ signal }) => notificationApi.list(undefined, signal, 1),
    enabled: active,
    staleTime: 15000,
    refetchInterval: active ? 60000 : false,
    retry: false,
  });
  const unreadCount = count.data?.unreadCount || 0;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={
        unreadCount ? `알림 내역, 읽지 않은 알림 ${unreadCount}개` : '알림 내역'
      }
      style={s.button}
    >
      <View style={s.bell}>
        <SvgXml xml={assets.bell} width={21} height={18} />
        <View style={s.bottom}>
          <SvgXml xml={assets.bellBottom} width={7} height={4} />
        </View>
      </View>
      {unreadCount > 0 && (
        <View style={s.badge}>
          <Text style={s.count}>{unreadCount > 99 ? '99+' : unreadCount}</Text>
        </View>
      )}
    </Pressable>
  );
}
const s = StyleSheet.create({
  button: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  bell: { width: 24, height: 26, alignItems: 'center', paddingTop: 2 },
  bottom: { marginTop: 0 },
  badge: {
    position: 'absolute',
    top: 2,
    right: 0,
    minWidth: 15,
    height: 15,
    borderRadius: 8,
    paddingHorizontal: 3,
    backgroundColor: '#26B889',
    alignItems: 'center',
    justifyContent: 'center',
  },
  count: { color: '#fff', fontSize: 9, fontWeight: '700' },
});
