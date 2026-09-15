// 작성자: 김진우 — 홈 카드와 AI 브리핑을 실제 서버 기록과 연결한다.
import { MissionSummaryCard } from '../missions/MissionSummaryCard';
import { NotificationBell } from '../notifications/NotificationBell';
import { HomeMedicationCard } from '../medication/HomeMedicationCard';
import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../shared/api/client';
import { HomeData, formatValue } from './homeData';
import { WeeklyCard } from './WeeklyCard';
import { useHomeBriefing } from './useHomeBriefing';
import { AnalysisDetailModal } from '../../shared/components/AnalysisDetailModal';
import {
  HomeCardHeading,
  HomeIcon,
  MetricCards,
  SettingChoice,
  metricDesign,
} from './HomeCardDesign';
import { useMedicationToday } from '../medication/useMedicationToday';
import { refreshSamsungConnection } from '../health/healthRefresh';
import {
  Animated,
  AppState,
  RefreshControl,
  BackHandler,
  PanResponder,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import LinearGradient from 'react-native-linear-gradient';
import { CompanionAvatar } from '../chat/CompanionAvatar';
import { ScreenTransition } from '../../shared/components/ScreenTransition';
import { AmbientEffect } from '../../shared/components/AmbientEffect';
import { usePressFeedback } from '../../shared/hooks/usePressFeedback';
import {
  defaultHomeSettings,
  HomeSettings,
  MetricId,
  metrics,
  ModuleId,
  moduleLabels,
  moveItem,
} from './homeModel';

type Props = {
  active?: boolean;
  resetVersion?: number;
  onEditingChange?: (editing: boolean) => void;
  onConnect: () => void;
  onCheckup: () => void;
  onMedication: () => void;
  onNotifications: () => void;
  onDetail: (id: string) => void;
  onChat: () => void;
  onMissions?: (id?: string) => void;
  onHealth?: () => void;
};
const descriptions: Record<ModuleId, string> = {
  briefing: '오늘의 종합 분석 · 자동 구성',
  metrics: '수면 · 걸음 수',
  medication: '다음 복약 · 오늘 완료 현황',
  mission: '분석 기반 행동 추천',
  weekly: '걸음 수 · 이전 7일 비교',
  checkup: '최근 결과와 주의 항목',
};
function Action({ title, onPress }: { title: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress}>
      <LinearGradient
        colors={['#14B995', '#25ABCF']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={s.action}
      >
        <Text style={s.whiteBold}>{title}</Text>
      </LinearGradient>
    </Pressable>
  );
}
function DragRow({
  id,
  index,
  onMove,
  onRemove,
  onSettings,
  drag,
  count,
  onDrag,
}: {
  id: ModuleId;
  index: number;
  onMove: (from: number, to: number) => void;
  onRemove: () => void;
  onSettings: () => void;
  drag?: { from: number; to: number };
  count: number;
  onDrag: (value?: { from: number; to: number }) => void;
}) {
  const offset = React.useRef(new Animated.Value(0)).current;
  const lift = React.useRef(new Animated.Value(0)).current;
  React.useEffect(
    () => () => {
      offset.stopAnimation();
      lift.stopAnimation();
    },
    [offset, lift],
  );
  const live = React.useRef({ index, count, onMove, onDrag });
  live.current = { index, count, onMove, onDrag };
  const active = drag?.from === index;
  const displacement =
    drag && !active
      ? drag.from < index && index <= drag.to
        ? -66
        : drag.to <= index && index < drag.from
        ? 66
        : 0
      : 0;
  React.useLayoutEffect(() => {
    if (active) return;
    if (!drag) {
      offset.setValue(0);
      return;
    }
    const animation = Animated.spring(offset, {
      toValue: displacement,
      useNativeDriver: false,
      speed: 22,
      bounciness: 3,
    });
    animation.start();
    return () => animation.stop();
  }, [active, drag, displacement, offset]);
  // 작성자: 김진우 — 이동 후보 위치를 미리 비우고, 손을 놓으면 해당 슬롯으로 부드럽게 정착시킨다.
  const responder = React.useMemo(() => {
    const destination = (dy: number) =>
      Math.max(
        0,
        Math.min(
          live.current.count - 1,
          live.current.index + Math.round(dy / 66),
        ),
      );
    const settle = (to: number, commit: boolean) => {
      Animated.parallel([
        Animated.spring(offset, {
          toValue: (to - live.current.index) * 66,
          useNativeDriver: false,
          speed: 24,
          bounciness: 3,
        }),
        Animated.timing(lift, {
          toValue: 0,
          duration: 160,
          useNativeDriver: false,
        }),
      ]).start(({ finished }) => {
        if (!finished) return;
        if (commit) live.current.onMove(live.current.index, to);
        live.current.onDrag(undefined);
      });
    };
    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        offset.stopAnimation();
        live.current.onDrag({
          from: live.current.index,
          to: live.current.index,
        });
        Animated.timing(lift, {
          toValue: 1,
          duration: 130,
          useNativeDriver: false,
        }).start();
      },
      onPanResponderMove: (_, g) => {
        offset.setValue(
          Math.max(
            -live.current.index * 66 - 12,
            Math.min(
              (live.current.count - 1 - live.current.index) * 66 + 12,
              g.dy,
            ),
          ),
        );
        live.current.onDrag({
          from: live.current.index,
          to: destination(g.dy),
        });
      },
      onPanResponderRelease: (_, g) => {
        settle(destination(g.dy), true);
      },
      onPanResponderTerminate: () => settle(live.current.index, false),
      onPanResponderTerminationRequest: () => false,
    });
  }, [lift, offset]);
  const configurable = ['metrics', 'medication', 'weekly'].includes(id);
  return (
    <Animated.View
      testID={`home-order-${id}`}
      style={[
        s.selectedRow,
        active && s.draggingRow,
        {
          transform: [
            { translateY: offset },
            {
              scale: lift.interpolate({
                inputRange: [0, 1],
                outputRange: [1, 1.025],
              }),
            },
          ],
          zIndex: active ? 5 : 1,
        },
      ]}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${moduleLabels[id]} ${
          configurable ? '설정' : '선택됨'
        }`}
        disabled={!configurable}
        onPress={configurable ? onSettings : undefined}
        style={[s.circle, !configurable && { backgroundColor: '#24B88A' }]}
      >
        {configurable && (
          <Svg width={16} height={16} viewBox="0 0 16 16">
            <Path
              d="M6.4 2.33333H9.6L9.96667 3.78667C10.2898 3.93026 10.5961 4.10912 10.88 4.32L12.2933 3.9L13.8933 6.66667L12.84 7.7C12.8667 7.9 12.8867 8.10667 12.8867 8.33333C12.8867 8.56 12.8667 8.76667 12.84 8.96667L13.8933 10L12.2933 12.7667L10.88 12.3467C10.5961 12.5575 10.2898 12.7364 9.96667 12.88L9.6 14.3333H6.4L6.03333 12.88C5.71017 12.7364 5.40387 12.5575 5.12 12.3467L3.70667 12.7667L2.10667 10L3.16 8.96667C3.10072 8.54652 3.10072 8.12014 3.16 7.7L2.10667 6.66667L3.70667 3.9L5.12 4.32C5.40387 4.10912 5.71017 3.93026 6.03333 3.78667L6.4 2.33333Z"
              stroke="#434343"
              strokeWidth={1.13333}
              fill="none"
            />
            <Path
              d="M8 10.3333C9.10457 10.3333 10 9.4379 10 8.33333C10 7.22876 9.10457 6.33333 8 6.33333C6.89543 6.33333 6 7.22876 6 8.33333C6 9.4379 6.89543 10.3333 8 10.3333Z"
              stroke="#434343"
              strokeWidth={1.13333}
              fill="none"
            />
          </Svg>
        )}
      </Pressable>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={s.rowTitle} numberOfLines={1}>
          {moduleLabels[id]}
        </Text>
        <Text style={s.caption} numberOfLines={1}>
          {descriptions[id]}
        </Text>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${moduleLabels[id]} 숨기기`}
        accessibilityHint="홈에서 숨기고 추가할 수 있는 항목으로 이동합니다"
        onPress={onRemove}
        style={s.removeButton}
      >
        <Text style={s.removeLabel}>−</Text>
      </Pressable>
      <View
        {...responder.panHandlers}
        accessible
        accessibilityRole="adjustable"
        accessibilityLabel={`${moduleLabels[id]} 순서 변경`}
        accessibilityActions={[
          { name: 'increment', label: '아래로' },
          { name: 'decrement', label: '위로' },
        ]}
        onAccessibilityAction={e =>
          onMove(
            index,
            index + (e.nativeEvent.actionName === 'increment' ? 1 : -1),
          )
        }
        style={s.drag}
      >
        <Text style={s.small}>≡</Text>
      </View>
    </Animated.View>
  );
}
export function HomeDashboard(_props: Props) {
  const briefingPress = usePressFeedback();
  const today = useMedicationToday();
  const briefing = useHomeBriefing(today, _props.active !== false);
  const refreshInProgress = React.useRef(false);
  const client = useQueryClient();
  const home = useQuery({
    queryKey: ['home', today],
    queryFn: async ({ signal }) =>
      (await apiClient.get<HomeData>('/api/home', { signal })).data,
    enabled: _props.active !== false,
    retry: false,
    refetchInterval: _props.active === false ? false : 60000,
  });
  const [refreshing, setRefreshing] = useState(false);
  const [syncError, setSyncError] = useState('');
  React.useEffect(() => {
    if (_props.active === false) return;
    const sub = AppState.addEventListener('change', state => {
      if (state === 'active') {
        void client.invalidateQueries({ queryKey: ['home'] });
        void client.invalidateQueries({ queryKey: ['medication-intakes'] });
      }
    });
    return () => sub.remove();
  }, [_props.active, client]);
  const refresh = async () => {
    if (refreshInProgress.current) return;
    refreshInProgress.current = true;
    setRefreshing(true);
    setSyncError('');
    try {
      if (Platform.OS === 'android') await refreshSamsungConnection();
    } catch (error) {
      setSyncError(
        error instanceof Error
          ? error.message
          : '건강 기록 동기화를 완료하지 못했어요.',
      );
    } finally {
      try {
        await briefing.retryFailed();
      } catch {
        setSyncError(
          previous => previous || '브리핑 재시도 요청을 보내지 못했어요.',
        );
      }
      await Promise.allSettled([
        client.invalidateQueries({ queryKey: ['home'] }),
        client.invalidateQueries({ queryKey: ['medication-intakes'] }),
        client.invalidateQueries({ queryKey: ['health'] }),
      ]);
      refreshInProgress.current = false;
      setRefreshing(false);
    }
  };
  const { onEditingChange } = _props;
  const [saved, setSaved] = useState(defaultHomeSettings);
  const [draft, setDraft] = useState(defaultHomeSettings);
  const [drag, setDrag] = useState<{ from: number; to: number }>();
  const updateDrag = React.useCallback(
    (value?: { from: number; to: number }) => {
      setDrag(previous =>
        previous?.from === value?.from && previous?.to === value?.to
          ? previous
          : value,
      );
    },
    [],
  );
  const [screen, setScreen] = useState<
    'home' | 'edit' | 'preview' | 'metrics' | 'medication' | 'weekly'
  >('home');
  const [detail, setDetail] = useState<string>();
  React.useEffect(() => {
    if (screen !== 'edit') setDrag(undefined);
  }, [screen]);

  const [settingDraft, setSettingDraft] = useState(defaultHomeSettings);
  const pageScroll = React.useRef<ScrollView>(null);
  // 작성자: 김진우 — 탭 복귀 시 탐색 상태만 비우고 저장한 홈 구성은 유지한다.
  React.useEffect(() => {
    setScreen('home');
    setDetail(undefined);
    pageScroll.current?.scrollTo({ y: 0, animated: false });
  }, [_props.resetVersion]);
  const configuring = ['metrics', 'medication', 'weekly'].includes(screen);
  const back = () => {
    if (detail) setDetail(undefined);
    else setScreen(screen === 'preview' || configuring ? 'edit' : 'home');
  };
  React.useEffect(() => {
    onEditingChange?.(screen !== 'home');
  }, [screen, onEditingChange]);
  React.useEffect(() => {
    if (Platform.OS !== 'android') return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (_props.active === false || (screen === 'home' && !detail))
        return false;
      back();
      return true;
    });
    return () => sub.remove();
  });
  const change = (patch: Partial<HomeSettings>) =>
    setSettingDraft(value => ({ ...value, ...patch }));
  const renderModule = (id: ModuleId, config: HomeSettings) => {
    if (
      id !== 'briefing' &&
      id !== 'medication' &&
      (id !== 'metrics' || screen !== 'metrics') &&
      (!home.data || !home.data.cards || home.isError)
    ) {
      return (
        <Pressable
          key={id}
          style={s.card}
          accessibilityRole="button"
          onPress={() => home.refetch()}
        >
          <Text style={s.heading}>{moduleLabels[id]}</Text>
          <Text style={s.small}>
            {home.isError
              ? '불러오지 못했어요. 눌러서 다시 시도'
              : home.isPending
              ? '불러오는 중…'
              : '홈 데이터 API 업데이트가 필요해요.'}
          </Text>
        </Pressable>
      );
    }
    if (id === 'briefing')
      return (
        <Pressable
          accessibilityRole="button"
          key={id}
          onPress={() => setDetail('브리핑')}
          onPressIn={briefingPress.onPressIn}
          onPressOut={briefingPress.onPressOut}
        >
          <Animated.View
            testID="briefing-press-feedback"
            style={briefingPress.style}
          >
            <LinearGradient
              colors={['#17B9A6', '#25B7D1', '#609CEC']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0.6 }}
              style={s.briefing}
            >
              <AmbientEffect
                active={
                  _props.active !== false &&
                  (screen === 'home' || screen === 'preview') &&
                  !detail
                }
                testID="home-wave"
              />
              <View style={{ flex: 1, gap: 6 }}>
                <View style={s.inline}>
                  <HomeIcon name="briefing" color="#E2FFFA" size={17} />
                  <Text style={s.whiteSmall}>오늘의 AI 건강 브리핑</Text>
                </View>
                <Text style={s.briefingTitle}>{briefing.headline}</Text>
                {!!briefing.chip && (
                  <Text style={s.briefChip}>{briefing.chip}</Text>
                )}
              </View>
              <CompanionAvatar />
            </LinearGradient>
          </Animated.View>
        </Pressable>
      );
    if (id === 'metrics')
      return (
        <View key={id} style={screen === 'home' ? { gap: 12 } : s.card}>
          <View style={s.row}>
            <Text style={s.heading}>오늘의 핵심 데이터</Text>
            {screen === 'metrics' ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="핵심 데이터 자리 바꾸기"
                accessibilityHint="선택한 두 지표의 좌우 위치를 바꿉니다"
                disabled={config.metrics.length !== 2}
                accessibilityState={{ disabled: config.metrics.length !== 2 }}
                onPress={() =>
                  change({ metrics: [...config.metrics].reverse() })
                }
                style={[s.swapButton, config.metrics.length !== 2 && s.dim]}
              >
                <HomeIcon name="swap" color="#0C9E9A" size={21} />
              </Pressable>
            ) : (
              <Text style={s.caption}>나의 건강 기록</Text>
            )}
          </View>
          {home.isError || !home.data?.cards ? (
            <Text style={s.small}>
              {home.isPending
                ? '기록을 불러오는 중이에요.'
                : '기록을 불러오지 못했어요. 표시 항목과 순서는 설정할 수 있어요.'}
            </Text>
          ) : (
            <MetricCards ids={config.metrics} data={home.data} />
          )}
        </View>
      );
    if (id === 'medication')
      return (
        <HomeMedicationCard
          key={id}
          active={_props.active !== false}
          config={config}
          onOpen={_props.onMedication}
        />
      );
    if (id === 'mission')
      return (
        <MissionSummaryCard
          key={id}
          active={_props.active !== false}
          onOpen={_props.onMissions}
        />
      );
    if (id === 'weekly')
      return (
        <WeeklyCard
          key={id}
          data={home.data ?? { date: today, alerts: [] }}
          metric={config.weekly}
        />
      );
    const checkup = home.data?.latestCheckup;
    return (
      <Pressable
        accessibilityRole="button"
        key={id}
        style={s.card}
        onPress={() =>
          checkup ? _props.onDetail(checkup.recordId) : _props.onCheckup()
        }
      >
        <HomeCardHeading
          icon="checkup"
          title="최근 건강검진"
          detail="나의 검진 기록"
          color="#258DDB"
          tint="#E4F5FF"
        />
        <Text style={s.value}>
          {checkup?.measuredAt ?? '등록한 검진이 없어요'}
        </Text>
        {checkup && (
          <Text style={s.small}>
            {checkup.providerName || '검진 기관 미기록'} · 검사{' '}
            {checkup.resultCount}개 · 소견 {checkup.findingCount}개
          </Text>
        )}
        <Text style={s.link}>
          {checkup ? '검진 결과 확인하기 →' : '검진 결과 등록하기 →'}
        </Text>
      </Pressable>
    );
  };
  const title =
    screen === 'edit'
      ? '홈 편집'
      : screen === 'preview'
      ? '홈 미리보기'
      : screen === 'metrics'
      ? '핵심 데이터 설정'
      : screen === 'medication'
      ? '복약 항목 설정'
      : '주간 변화 설정';
  return (
    <ScreenTransition
      transitionKey={screen}
      style={[s.root, screen !== 'home' && { backgroundColor: '#F3FBFF' }]}
    >
      {screen !== 'home' && (
        <View style={s.header}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="뒤로"
            onPress={back}
            style={s.touch}
          >
            <Text style={s.back}>‹</Text>
          </Pressable>
          <Text style={s.heading}>{title}</Text>
          <Pressable
            accessibilityRole="button"
            style={s.touch}
            onPress={() => screen === 'edit' && setDraft(defaultHomeSettings())}
          >
            <Text style={s.link}>{screen === 'edit' ? '초기화' : ''}</Text>
          </Pressable>
        </View>
      )}
      <ScrollView
        scrollEnabled={!drag}
        ref={pageScroll}
        contentContainerStyle={s.page}
        refreshControl={
          screen === 'home' ? (
            <RefreshControl refreshing={refreshing} onRefresh={refresh} />
          ) : undefined
        }
      >
        {(screen === 'home' || screen === 'preview') && (
          <>
            <View style={s.row}>
              <Text style={s.rowTitle}>오늘의 건강</Text>
              {screen === 'home' && (
                <View
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}
                >
                  <NotificationBell
                    onPress={_props.onNotifications}
                    active={_props.active}
                  />
                  <Pressable
                    accessibilityRole="button"
                    style={s.editButton}
                    onPress={() => {
                      setDraft({
                        ...saved,
                        modules: [...saved.modules],
                        metrics: [...saved.metrics],
                      });
                      setScreen('edit');
                    }}
                  >
                    <Text style={s.link}>홈 편집</Text>
                  </Pressable>
                </View>
              )}
            </View>
            <Text style={s.title}>
              {home.data?.name ? `${home.data.name}님, ` : ''}오늘도{'\n'}함께
              관리해요
            </Text>
            {home.isPending && (
              <Text style={s.small}>건강 기록을 불러오고 있어요.</Text>
            )}
            {home.isError && (
              <Pressable
                accessibilityRole="button"
                onPress={() => home.refetch()}
              >
                <Text style={s.small}>
                  홈 정보를 불러오지 못했어요. 다시 시도
                </Text>
              </Pressable>
            )}
            {!!syncError && (
              <Pressable accessibilityRole="button" onPress={_props.onConnect}>
                <Text style={s.small}>{syncError}</Text>
              </Pressable>
            )}
            {home.data?.cards?.dataTruncated && (
              <Text style={s.small}>
                일부 기록이 많아 해당 지표의 집계를 표시하지 못했어요.
              </Text>
            )}
            {home.data?.alerts.map(alert => (
              <Pressable
                key={alert.alertId}
                style={s.card}
                accessibilityRole="button"
                onPress={_props.onHealth}
              >
                <Text style={s.rowTitle}>{alert.title}</Text>
                <Text style={s.small}>{alert.message}</Text>
                <Text style={s.link}>내 건강에서 확인하기 →</Text>
              </Pressable>
            ))}
            {(screen === 'home' ? saved : draft).modules.map(id =>
              renderModule(id, screen === 'home' ? saved : draft),
            )}

            {!(screen === 'home' ? saved : draft).modules.length && (
              <Text style={s.small}>
                홈 편집에서 표시할 항목을 추가해 주세요.
              </Text>
            )}
          </>
        )}
        {screen === 'edit' && (
          <>
            <View style={s.info}>
              <Text style={s.rowTitle}>
                항목을 고르고 순서와 내용을 편집해요
              </Text>
              <Text style={s.caption}>
                톱니바퀴로 설정하고, −로 빼고, 손잡이로 순서를 바꿔요.
              </Text>
            </View>
            <View style={s.row}>
              <Text style={s.rowTitle}>선택된 항목 {draft.modules.length}</Text>
              <Text style={s.caption}>≡ 순서 변경</Text>
            </View>
            <View style={{ gap: 8 }}>
              {drag && (
                <View
                  pointerEvents="none"
                  testID="home-drop-target"
                  style={[s.dropTarget, { top: drag.to * 66 }]}
                >
                  <Text style={s.dropLabel}>여기에 놓기</Text>
                </View>
              )}
              {draft.modules.map((id, index) => (
                <DragRow
                  key={id}
                  id={id}
                  index={index}
                  drag={drag}
                  count={draft.modules.length}
                  onDrag={updateDrag}
                  onMove={(from, to) =>
                    setDraft(v => ({
                      ...v,
                      modules: moveItem(v.modules, from, to),
                    }))
                  }
                  onRemove={() =>
                    setDraft(v => ({
                      ...v,
                      modules: v.modules.filter(value => value !== id),
                    }))
                  }
                  onSettings={() => {
                    setSettingDraft({ ...draft, metrics: [...draft.metrics] });
                    setScreen(id as 'metrics' | 'medication' | 'weekly');
                  }}
                />
              ))}
            </View>
            <Text style={[s.rowTitle, { marginTop: 16 }]}>
              추가할 수 있는 항목
            </Text>
            {(Object.keys(moduleLabels) as ModuleId[])
              .filter(id => !draft.modules.includes(id))
              .map(id => (
                <Pressable
                  accessibilityRole="button"
                  key={id}
                  accessibilityLabel={`${moduleLabels[id]} 추가`}
                  style={s.unselectedRow}
                  onPress={() =>
                    setDraft(v => ({ ...v, modules: [...v.modules, id] }))
                  }
                >
                  <Text style={s.back}>＋</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={s.rowTitle}>{moduleLabels[id]}</Text>
                    <Text style={s.caption}>{descriptions[id]}</Text>
                  </View>
                  <Text style={s.small}>추가</Text>
                </Pressable>
              ))}
          </>
        )}
        {screen === 'metrics' && (
          <>
            <View style={s.settingIntro}>
              <Text style={s.settingEyebrow}>핵심 데이터</Text>
              <Text style={s.settingTitle}>먼저 보고 싶은 기록을 골라요</Text>
              <Text style={s.small}>
                두 가지 지표를 선택하고, 교환 아이콘으로 자리를 바꿔 보세요.
              </Text>
            </View>
            {renderModule('metrics', settingDraft)}
            <Text style={s.rowTitle}>
              표시할 항목 · {settingDraft.metrics.length} / 2 선택
            </Text>
            <Text style={s.caption}>
              저장된 실제 기록으로 미리 볼 수 있어요.
            </Text>
            <View style={s.grid}>
              {(Object.keys(metrics) as MetricId[]).map(id => (
                <SettingChoice
                  key={id}
                  title={metrics[id][0]}
                  icon={id}
                  selected={settingDraft.metrics.includes(id)}
                  disabled={
                    !settingDraft.metrics.includes(id) &&
                    settingDraft.metrics.length >= 2
                  }
                  color={metricDesign[id].color}
                  tint={metricDesign[id].tint}
                  description={
                    home.isError
                      ? '기록 조회 실패'
                      : home.isPending
                      ? '기록 조회 중'
                      : formatValue(
                          id,
                          home.data?.cards?.metrics[id]?.value,
                          home.data?.cards?.metrics[id]?.secondary,
                        )
                  }
                  onPress={() =>
                    change({
                      metrics: settingDraft.metrics.includes(id)
                        ? settingDraft.metrics.filter(x => x !== id)
                        : settingDraft.metrics.length < 2
                        ? [...settingDraft.metrics, id]
                        : settingDraft.metrics,
                    })
                  }
                />
              ))}
            </View>
          </>
        )}
        {screen === 'medication' && (
          <>
            <View style={s.settingIntro}>
              <Text style={s.settingEyebrow}>복약 카드</Text>
              <Text style={s.settingTitle}>나에게 필요한 복용 정보만</Text>
              <Text style={s.small}>
                홈에 보이는 일정과 정보를 미리 확인해 보세요.
              </Text>
            </View>
            {renderModule('medication', settingDraft)}
            <Text style={s.rowTitle}>첫 화면에 무엇을 먼저 보여줄까요?</Text>
            <View style={s.grid}>
              {(['next', 'all'] as const).map(mode => (
                <SettingChoice
                  key={mode}
                  title={mode === 'next' ? '다음 복약 우선' : '오늘 전체 일정'}
                  description={
                    mode === 'next'
                      ? '남은 일정 한 개를 먼저 확인'
                      : '완료·건너뜀까지 한눈에'
                  }
                  icon={mode === 'next' ? 'medication' : 'count'}
                  selected={settingDraft.medicationMode === mode}
                  color="#8057DC"
                  tint="#EEE4FF"
                  onPress={() => change({ medicationMode: mode })}
                />
              ))}
            </View>
            <Text style={s.rowTitle}>표시 항목</Text>
            {(
              [
                'medicationName',
                'medicationButton',
                'medicationProgress',
              ] as const
            ).map((key, i) => (
              <View key={key} style={s.switchRow}>
                <Text style={s.rowTitle}>
                  {
                    ['약 이름과 복용량', '일정 확인 버튼', '오늘의 완료 현황'][
                      i
                    ]
                  }
                </Text>
                <Switch
                  accessibilityLabel={
                    ['약 이름과 복용량', '일정 확인 버튼', '오늘의 완료 현황'][
                      i
                    ]
                  }
                  value={settingDraft[key]}
                  onValueChange={v => change({ [key]: v })}
                  trackColor={{ true: '#A17AEE', false: '#DDE5E1' }}
                />
              </View>
            ))}
            <View style={s.info}>
              <Text style={s.caption}>
                실제 복약 일정의 표시 항목을 설정해요.
              </Text>
            </View>
          </>
        )}
        {screen === 'weekly' && (
          <>
            <View style={s.settingIntro}>
              <Text style={s.settingEyebrow}>주간 변화</Text>
              <Text style={s.settingTitle}>일주일의 변화를 한눈에</Text>
              <Text style={s.small}>
                꾸준히 살펴볼 대표 지표를 선택해 주세요.
              </Text>
            </View>
            {renderModule('weekly', settingDraft)}
            <Text style={s.rowTitle}>대표 지표를 선택해 주세요</Text>
            {(['steps', 'sleep', 'exercise'] as const).map(id => (
              <SettingChoice
                key={id}
                title={metrics[id][0]}
                description="최근 7일 평균과 이전 7일 비교"
                fullWidth
                icon={id}
                selected={settingDraft.weekly === id}
                color={metricDesign[id].color}
                tint={metricDesign[id].tint}
                onPress={() => change({ weekly: id })}
              />
            ))}
            <View style={s.info}>
              <Text style={s.small}>비교 기준 · 최근 7일 ↔ 이전 7일</Text>
            </View>
          </>
        )}
      </ScrollView>
      {screen !== 'home' && (
        <View style={s.footer}>
          {screen === 'preview' ? (
            <View style={s.row}>
              <Pressable
                accessibilityRole="button"
                onPress={() => setScreen('edit')}
                style={s.editButton}
              >
                <Text style={s.small}>다시 수정</Text>
              </Pressable>
              <View style={{ flex: 1 }}>
                <Action
                  title="이대로 저장"
                  onPress={() => {
                    setSaved(draft);
                    setScreen('home');
                  }}
                />
              </View>
            </View>
          ) : (
            <Action
              title={screen === 'edit' ? '미리보기' : '저장하고 홈 편집으로'}
              onPress={() => {
                if (screen === 'edit') setScreen('preview');
                else if (
                  screen !== 'metrics' ||
                  settingDraft.metrics.length === 2
                ) {
                  setDraft(settingDraft);
                  setScreen('edit');
                } else setDetail('핵심 데이터는 2개를 선택해 주세요.');
              }}
            />
          )}
        </View>
      )}
      <AnalysisDetailModal
        visible={!!detail}
        onClose={() => setDetail(undefined)}
        title={
          detail === '브리핑'
            ? '오늘의 AI 건강 브리핑'
            : detail === '검진'
            ? '최근 건강검진'
            : detail ?? ''
        }
        body={
          detail === '브리핑'
            ? briefing.body
            : '홈 UI 미리보기용 예시 화면입니다.'
        }
        sections={detail === '브리핑' ? briefing.sections : []}
      />
    </ScreenTransition>
  );
}
const s = StyleSheet.create({
  dropTarget: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 58,
    borderRadius: 16,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#1EBE8A',
    backgroundColor: '#CFF9E8',
    justifyContent: 'center',
    paddingLeft: 14,
    boxShadow: '0px 0px 12px rgba(25, 192, 132, 0.20)',
  },
  dropLabel: { color: '#07875E', fontSize: 12, fontWeight: '700' },
  draggingRow: {
    borderColor: '#30CC9B',
    backgroundColor: '#FFFFFF',
    boxShadow: '0px 10px 20px rgba(9, 139, 99, 0.24)',
  },
  inline: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  settingIntro: { gap: 8, paddingVertical: 8 },
  settingEyebrow: {
    color: '#179D99',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
  },
  settingTitle: {
    color: '#244956',
    fontSize: 23,
    lineHeight: 31,
    fontWeight: '800',
    letterSpacing: -0.6,
  },
  swapButton: {
    width: 44,
    height: 44,
    borderRadius: 15,
    backgroundColor: '#DCFAF1',
    borderWidth: 1,
    borderColor: '#C4F0E5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dim: { opacity: 0.4 },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    padding: 18,
    minHeight: 68,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E4EBE7',
  },
  missionItem: {
    gap: 7,
    backgroundColor: '#FFFFFFB3',
    padding: 14,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: '#E4EDDD',
  },
  root: { flex: 1 },
  page: { padding: 20, gap: 14, paddingBottom: 28 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    minHeight: 60,
  },
  touch: { minWidth: 48, minHeight: 44, justifyContent: 'center' },
  back: { fontSize: 27, color: '#143B30' },
  title: { fontSize: 26, lineHeight: 32, fontWeight: '800', color: '#17342D' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  heading: { fontSize: 16, fontWeight: '800', color: '#17342D' },
  rowTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#365148',
    flexShrink: 1,
  },
  small: { fontSize: 12, lineHeight: 18, color: '#617A70' },
  caption: { fontSize: 11, lineHeight: 18, color: '#7B8B84' },
  link: { fontSize: 11, fontWeight: '600', color: '#1AAD80' },
  purple: { fontSize: 11, color: '#7370ED' },
  whiteSmall: { fontSize: 11, color: 'white', lineHeight: 16 },
  whiteBold: { fontSize: 14, fontWeight: '700', color: 'white' },
  card: {
    padding: 20,
    gap: 17,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: '#E0E9E3',
    backgroundColor: '#FFFFFF',
    boxShadow: '0px 7px 18px rgba(44, 135, 162, 0.10)',
  },
  briefing: {
    padding: 22,
    borderRadius: 27,
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 166,
    overflow: 'hidden',
    position: 'relative',
    gap: 8,
    borderWidth: 1,
    borderColor: '#FFFFFF99',
    boxShadow: '0px 10px 22px rgba(20, 167, 190, 0.24)',
  },
  briefingTitle: {
    fontSize: 21,
    fontWeight: '800',
    lineHeight: 29,
    color: 'white',
  },
  briefChip: {
    color: 'white',
    fontSize: 10,
    backgroundColor: '#FFFFFF30',
    padding: 4,
    borderRadius: 10,
    alignSelf: 'flex-start',
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  metric: {
    flex: 1,
    padding: 12,
    borderWidth: 1,
    borderRadius: 16,
    gap: 7,
    minWidth: 120,
  },
  value: { fontSize: 22, fontWeight: '800', color: '#173A31' },
  medication: {
    backgroundColor: '#EEF5FF',
    padding: 12,
    borderRadius: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  miniButton: {
    backgroundColor: '#13A780',
    borderRadius: 15,
    minHeight: 44,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bars: { height: 62, flexDirection: 'row', gap: 12, alignItems: 'flex-end' },
  editButton: {
    padding: 12,
    borderRadius: 20,
    backgroundColor: '#FFFFFFCC',
    borderWidth: 1,
    borderColor: '#DBEBE5',
    minHeight: 44,
  },
  info: { padding: 18, borderRadius: 20, backgroundColor: '#E4F9F4', gap: 8 },
  selectedRow: {
    height: 58,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#D2E3D8',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    paddingLeft: 32,
    gap: 10,
  },
  circle: {
    height: 28,
    width: 28,
    borderRadius: 14,
    backgroundColor: '#E2F6F3',
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeButton: {
    position: 'absolute',
    left: 2,
    top: 2,
    width: 28,
    height: 28,
    zIndex: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeLabel: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#E15B5B',
    color: '#FFFFFF',
    fontSize: 21,
    lineHeight: 22,
    fontWeight: '600',
    textAlign: 'center',
    includeFontPadding: false,
  },
  drag: {
    width: 48,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unselectedRow: {
    minHeight: 58,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#D4DED9',
    backgroundColor: '#F6FCFF',
  },
  option: {
    flexGrow: 1,
    flexBasis: '45%',
    borderRadius: 18,
    padding: 14,
    minHeight: 64,
    gap: 5,
    borderWidth: 1,
    borderColor: '#DBEBE5',
    backgroundColor: 'white',
  },
  selected: { backgroundColor: '#E6FAF3', borderColor: '#24B88A' },
  footer: { padding: 20, backgroundColor: '#F3FBFF' },
  action: {
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#FFFFFF66',
    boxShadow: '0px 6px 14px rgba(15, 171, 171, 0.22)',
  },
  overlay: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#122D2570',
  },
});
