import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import { SvgAsset as SvgXml } from './SvgAsset';
import { RootStackParamList } from '../../navigation/routes';
import { ScreenBackground } from '../../shared/components/ScreenBackground';
import { ScreenTransition } from '../../shared/components/ScreenTransition';
import { PrimaryButton } from '../../shared/components/PrimaryButton';
import { useResponsiveLayout } from '../../shared/hooks/useResponsiveLayout';
import assets from '../../assets/notifications/figmaAssets.json';
import {
  notificationApi,
  notificationKeys,
  NotificationItem,
  createIdempotencyKey,
} from './notificationApi';
import {
  dayInKorea,
  notificationIcon,
  notificationTime,
  relativeTime,
  unread,
} from './notificationModel';

// 작성자: 김진우 — 와이어프레임의 날짜 구분·전체 읽음·미열람 표시를 실제 알림 이력에 연결한다.
export function NotificationScreen({
  navigation,
}: NativeStackScreenProps<RootStackParamList, 'Notifications'>) {
  const client = useQueryClient();
  const { padding } = useResponsiveLayout();
  const [focused, setFocused] = useState(true);
  const [now, setNow] = useState(Date.now());
  const [error, setError] = useState('');
  const opening = useRef(false);
  const allKey = useRef(createIdempotencyKey());
  useEffect(() => {
    const focus = navigation.addListener('focus', () => setFocused(true));
    const blur = navigation.addListener('blur', () => setFocused(false));
    const timer = setInterval(() => setNow(Date.now()), 60000);
    return () => {
      focus();
      blur();
      clearInterval(timer);
    };
  }, [navigation]);
  const query = useInfiniteQuery({
    queryKey: notificationKeys.list,
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam, signal }) => notificationApi.list(pageParam, signal),
    getNextPageParam: page =>
      page.hasNext ? page.nextCursor || undefined : undefined,
    enabled: focused,
    retry: false,
    staleTime: 0,
  });
  const rows = Array.from(
    new Map(
      query.data?.pages
        .flatMap(page => page.items)
        .map(item => [item.notificationId, item]) ?? [],
    ).values(),
  );
  const today = rows.filter(
    item => dayInKorea(notificationTime(item)) === dayInKorea(now),
  );
  const earlier = rows.filter(
    item => dayInKorea(notificationTime(item)) !== dayInKorea(now),
  );
  const count = query.data?.pages[0]?.unreadCount || 0;
  const summary = rows.find(item => unread(item)) || rows[0];
  const refresh = () =>
    client.invalidateQueries({ queryKey: notificationKeys.all });
  const all = useMutation({
    mutationFn: () => notificationApi.readAll(allKey.current),
    onSuccess: async () => {
      allKey.current = createIdempotencyKey();
      setError('');
      await refresh();
    },
    onError: () => setError('읽음 처리하지 못했어요. 다시 시도해 주세요.'),
  });
  const open = useMutation({
    mutationFn: (item: NotificationItem) =>
      notificationApi.open(item.notificationId, createIdempotencyKey()),
    onSuccess: async result => {
      setError('');
      await refresh();
      if (result.intakeId)
        navigation.navigate('MedicationManagement', {
          tab: 'schedule',
          notificationId: result.notificationId,
          intakeId: result.intakeId,
          scheduledAt: result.scheduledAt,
        });
      else if (result.targetType === 'checkup_record' && result.targetId)
        navigation.navigate('CheckupDetail', { recordId: result.targetId });
    },
    onError: () => setError('알림을 열지 못했어요. 다시 시도해 주세요.'),
    onSettled: () => {
      opening.current = false;
    },
  });
  const press = (item: NotificationItem) => {
    if (opening.current || all.isPending) return;
    opening.current = true;
    open.mutate(item);
  };
  const card = (item: NotificationItem, previous = false) => {
    const kind = notificationIcon(item.notificationType);
    return (
      <Pressable
        key={item.notificationId}
        accessibilityRole="button"
        accessibilityLabel={`${item.title}, ${
          unread(item) ? '읽지 않음' : '읽음'
        }`}
        disabled={open.isPending || all.isPending}
        onPress={() => press(item)}
        style={({ pressed }) => [
          s.card,
          previous && { minHeight: 74, paddingHorizontal: 18 },
          pressed && s.pressed,
        ]}
      >
        {!previous && (
          <View
            style={[
              s.icon,
              {
                backgroundColor:
                  kind === 'care'
                    ? '#E0F6ED'
                    : kind === 'checkup'
                    ? '#FFF1E5'
                    : '#EEF3FF',
              },
            ]}
          >
            <SvgXml xml={assets[kind]} width={21} height={21} />
          </View>
        )}
        <View style={s.cardText}>
          <View style={s.titleRow}>
            <Text style={s.cardTitle}>{item.title}</Text>
            {unread(item) && <View style={s.dot} />}
          </View>
          <Text style={s.body}>{item.body}</Text>
          <Text style={s.time}>
            {relativeTime(notificationTime(item), now)}
          </Text>
        </View>
      </Pressable>
    );
  };
  return (
    <ScreenBackground>
      <ScreenTransition transitionKey="notifications">
        <View style={[s.header, { paddingHorizontal: padding }]}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="이전 화면"
            onPress={() => navigation.goBack()}
            style={s.headerButton}
          >
            <SvgXml xml={assets.back} width={40} height={40} />
          </Pressable>
          <Text accessibilityRole="header" style={s.heading}>
            알림
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="전체 읽음"
            disabled={!count || all.isPending || open.isPending}
            onPress={() => all.mutate()}
            style={[
              s.headerButton,
              s.readAll,
              (!count || all.isPending) && s.disabled,
            ]}
          >
            {all.isPending ? (
              <ActivityIndicator color="#26B889" size="small" />
            ) : (
              <Text style={s.readText}>전체 읽음</Text>
            )}
          </Pressable>
        </View>
        <ScrollView
          contentContainerStyle={[s.content, { paddingHorizontal: padding }]}
          refreshControl={
            <RefreshControl
              refreshing={query.isRefetching && !query.isFetchingNextPage}
              onRefresh={() => {
                void refresh();
              }}
            />
          }
        >
          {!!error && (
            <Text accessibilityRole="alert" style={s.error}>
              {error}
            </Text>
          )}
          {query.isPending ? (
            <View style={s.state}>
              <ActivityIndicator color="#26B889" />
              <Text style={s.body}>알림을 불러오고 있어요.</Text>
            </View>
          ) : query.isError && !rows.length ? (
            <View style={s.state}>
              <Text style={s.stateTitle}>알림을 불러오지 못했어요</Text>
              <PrimaryButton
                label="다시 시도"
                onPress={() => {
                  void query.refetch();
                }}
              />
            </View>
          ) : !rows.length ? (
            <View style={s.state}>
              <Text style={s.stateTitle}>아직 도착한 알림이 없어요</Text>
              <Text style={s.body}>
                새로운 소식이 오면 이곳에 알려드릴게요.
              </Text>
            </View>
          ) : (
            <>
              {summary && (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="최근 알림 확인"
                  onPress={() => press(summary)}
                  style={s.summary}
                >
                  <View style={[s.icon, { backgroundColor: '#DDF5EB' }]}>
                    <SvgXml xml={assets.care} width={21} height={18} />
                  </View>
                  <View style={s.cardText}>
                    <Text style={s.cardTitle}>{summary.title}</Text>
                    <Text style={s.body} numberOfLines={2}>
                      {summary.body}
                    </Text>
                  </View>
                </Pressable>
              )}
              {!!today.length && (
                <>
                  <Text style={s.section}>오늘</Text>
                  {today.map(item => card(item))}
                </>
              )}
              {!!earlier.length && (
                <>
                  <Text style={s.section}>이전 알림</Text>
                  {earlier.map(item => card(item, true))}
                </>
              )}
              {query.isError && (
                <Text accessibilityRole="alert" style={s.error}>
                  최신 알림을 불러오지 못했어요.
                </Text>
              )}
              {query.hasNextPage && (
                <Pressable
                  accessibilityRole="button"
                  disabled={query.isFetchingNextPage}
                  style={s.more}
                  onPress={() => {
                    void query.fetchNextPage();
                  }}
                >
                  {query.isFetchingNextPage ? (
                    <ActivityIndicator color="#26B889" />
                  ) : (
                    <Text style={s.readText}>
                      {query.isFetchNextPageError
                        ? '다시 시도'
                        : '이전 알림 더 보기'}
                    </Text>
                  )}
                </Pressable>
              )}
            </>
          )}
        </ScrollView>
      </ScreenTransition>
    </ScreenBackground>
  );
}
const s = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 10,
    paddingBottom: 18,
  },
  headerButton: {
    width: 48,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heading: { fontSize: 17, fontWeight: '700', color: '#1C3E35' },
  readAll: { borderRadius: 24, backgroundColor: '#fff' },
  readText: { fontSize: 11, fontWeight: '700', color: '#26B889' },
  disabled: { opacity: 0.45 },
  content: { paddingTop: 8, paddingBottom: 36, flexGrow: 1 },
  summary: {
    padding: 16,
    borderRadius: 26,
    backgroundColor: '#EDFAF5',
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
    marginBottom: 4,
    minHeight: 70,
  },
  section: {
    fontSize: 14,
    fontWeight: '700',
    color: '#173A31',
    marginTop: 14,
    marginBottom: 14,
  },
  card: {
    padding: 14,
    borderRadius: 26,
    backgroundColor: '#fff',
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
    minHeight: 88,
  },
  pressed: { opacity: 0.75 },
  icon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardText: { flex: 1, gap: 5 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardTitle: {
    flexShrink: 1,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '700',
    color: '#173A31',
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#26B889',
    marginLeft: 'auto',
  },
  body: { fontSize: 11.5, lineHeight: 17, color: '#526963' },
  time: { fontSize: 10.5, lineHeight: 14, color: '#8A9994' },
  state: { paddingVertical: 80, gap: 18, alignItems: 'center' },
  stateTitle: { fontSize: 17, fontWeight: '700', color: '#173A31' },
  error: {
    fontSize: 13,
    lineHeight: 20,
    color: '#B54242',
    paddingVertical: 10,
  },
  more: { alignItems: 'center', padding: 18 },
});
