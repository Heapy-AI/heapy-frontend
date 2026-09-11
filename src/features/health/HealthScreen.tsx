import React, { useEffect, useRef, useState } from 'react';
import {
  AppState,
  BackHandler,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
import LinearGradient from 'react-native-linear-gradient';
import { Animated } from 'react-native';
import { AmbientEffect } from '../../shared/components/AmbientEffect';
import { MetricIcon } from './MetricIcon';
import { HealthMotionContext, useHealthMotion } from './useHealthMotion';
import { refreshSamsungConnection } from './healthRefresh';
import { syncSamsungHealth } from '../dataConnection/samsungSync';
import { HealthIcon } from './HealthIcon';
import { apiClient } from '../../shared/api/client';
import { createIdempotencyKey } from '../../shared/utils/idempotency';
import { ConfirmModal } from '../../shared/components/ConfirmModal';
import { healthApi } from './healthApi';
import { HealthChart } from './HealthChart';
import { HealthEntry } from './HealthEntry';
import { HealthCheckups } from './HealthCheckups';
import { Category, EntryKind, HealthPage, Metric, PeriodCode } from './types';
import {
  activityCalories,
  exerciseKinds,
  format,
  koreanDay,
  latest,
  macroSeries,
  numeric,
  periods,
  series,
  sumToday,
  sleepStages,
} from './healthModel';
import { hs } from './healthStyles';
import { healthIcons } from './healthIcons';

const domains = [
  {
    id: 'bio',
    title: '생체 기록',
    description: '심박 · 혈압 · 체중 · BMI',
    icon: 'bio',
    color: '#20BA8A',
  },
  {
    id: 'activity',
    title: '활동 기록',
    description: '걸음 · 거리 · 층수 · 운동',
    icon: 'activity',
    color: '#4285F4',
  },
  {
    id: 'nutrition',
    title: '영양 기록',
    description: '식사 · 영양소 · 수분 · 혈당',
    icon: 'nutrition',
    color: '#F17B4E',
  },
  {
    id: 'sleep',
    title: '수면',
    description: '수면시간 · 단계 · 규칙성',
    icon: 'sleep',
    color: '#8057E0',
  },
] as const;
const entries: { id: EntryKind; title: string; description: string }[] = [
  { id: 'sleep', title: '수면', description: '취침·기상 시각과 수면시간' },
  { id: 'blood_pressure', title: '혈압', description: '수축기·이완기·맥박' },
  { id: 'body_composition', title: '체성분', description: '체중·키·BMI' },
  { id: 'water', title: '물 섭취', description: '섭취 시각과 물의 양' },
  {
    id: 'blood_glucose',
    title: '혈당',
    description: '공복 여부·수치·인슐린 농도',
  },
];
const metrics: Metric[] = [
  'bio',
  'activity',
  'exercise',
  'nutrition',
  'water',
  'sleep',
];
type Route =
  | 'home'
  | 'entries'
  | 'compare'
  | 'all'
  | 'bio'
  | 'activity'
  | 'nutrition'
  | 'sleep';
const analysisMessages = {
  unavailable: '분석 서비스를 연결하고 있어요.',
  pending: '오늘의 분석을 기다리고 있어요.',
  generating: '최근 기록을 분석하고 있어요.',
  failed: '오늘의 분석을 완료하지 못했어요.',
  result_lost: '오늘의 분석 결과를 불러올 수 없어요.',
  data_insufficient: '분석할 기록이 더 필요해요.',
};
function AnalysisCard({
  category,
  active = true,
}: {
  category: Category;
  active?: boolean;
}) {
  const [day, setDay] = useState(koreanDay());
  useEffect(() => {
    const timer = setInterval(() => setDay(koreanDay()), 30000);
    return () => clearInterval(timer);
  }, []);
  const query = useQuery({
    queryKey: ['health', 'analysis', category, day],
    queryFn: ({ signal }) => healthApi.analysis(category, signal),
    retry: false,
    staleTime: 60000,
  });
  const data = query.data;
  const valid =
    data?.status === 'generated' &&
    data.analysisDate === day &&
    new Date(data.expiresAt).getTime() > Date.now();
  const text = valid
    ? data.report?.headline
    : query.isPending
    ? '분석 결과를 불러오고 있어요.'
    : query.isError
    ? '분석 결과를 불러오지 못했어요.'
    : data?.status && data.status !== 'generated'
    ? analysisMessages[data.status]
    : '오늘의 분석을 기다리고 있어요.';
  return (
    <LinearGradient
      colors={
        category === 'sleep'
          ? ['#8057E0', '#4C83ED']
          : category === 'nutrition'
          ? ['#F39A5C', '#EA7D6E']
          : category === 'checkup'
          ? ['#7E89F1', '#A06FD5']
          : ['#24BC94', '#488BFA']
      }
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0.6 }}
      style={{
        borderRadius: 26,
        padding: 22,
        gap: 12,
        minHeight: 145,
        overflow: 'hidden',
      }}
    >
      <AmbientEffect active={active} testID="health-analysis-wave" />
      <Text style={[hs.muted, hs.white, { fontSize: 10, letterSpacing: 0.5 }]}>
        HEAPY AI ·{' '}
        {category === 'overall' ? '종합 분석' : '최근·장기 기록 분석'}
      </Text>
      <Text style={[hs.section, hs.white, { fontSize: 19, lineHeight: 27 }]}>
        {text}
      </Text>
      {valid && (
        <Text style={[hs.text, hs.white]}>
          {data.report?.current_state ||
            data.report?.summary ||
            data.report?.overall_analysis}
        </Text>
      )}
      {valid && category === 'checkup' && !!data.report?.overall_analysis && (
        <Text style={[hs.text, hs.white]}>{data.report.overall_analysis}</Text>
      )}
      {valid &&
        (data.report?.actions ?? data.report?.recommendations ?? []).map(
          (action, index) => (
            <Text key={index} style={[hs.text, hs.white]}>
              • {action}
            </Text>
          ),
        )}
      <Text style={[hs.muted, hs.white]}>
        {valid
          ? `${data.analysisDate} 기준 · 하루 한 번 분석`
          : '측정 기록과 분석 결과는 별도로 업데이트돼요.'}
      </Text>
    </LinearGradient>
  );
}
function MissionCard({ category }: { category: Category }) {
  const client = useQueryClient(),
    [confirm, setConfirm] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [key] = useState(createIdempotencyKey);
  const query = useQuery({
    queryKey: ['health', 'missions', category],
    queryFn: async ({ signal }) =>
      (
        await apiClient.get<{
          items: {
            userMissionId: string;
            title: string;
            description: string;
          }[];
        }>('/api/missions/suggestions', { signal, params: { category } })
      ).data,
    retry: false,
  });
  const mission = query.data?.items?.[0];
  return (
    <View
      style={[hs.card, { backgroundColor: '#E0F8EF', borderColor: '#20BA8A' }]}
    >
      <Text style={hs.pillText}>HEAPY 추천 미션</Text>
      <View style={hs.between}>
        <View style={hs.spacer}>
          <Text style={hs.section}>
            {mission?.title ||
              (query.isError
                ? '추천 미션을 불러오지 못했어요.'
                : query.isPending
                ? '미션을 불러오고 있어요.'
                : '지금은 추천 미션이 없어요.')}
          </Text>
          {!!mission?.description && (
            <Text style={hs.muted}>{mission.description}</Text>
          )}
        </View>
        {mission && (
          <Pressable
            onPress={() => setConfirm(true)}
            style={[hs.pill, hs.active]}
          >
            <Text style={[hs.pillText, hs.white]}>추가하기</Text>
          </Pressable>
        )}
      </View>
      <ConfirmModal
        visible={confirm}
        title="오늘의 미션에 추가할까요?"
        description={mission?.title ?? ''}
        confirmLabel="추가하기"
        pending={busy}
        error={error}
        onCancel={() => setConfirm(false)}
        onConfirm={async () => {
          if (!mission || busy) return;
          setBusy(true);
          setError('');
          try {
            await apiClient.post(
              `/api/missions/${encodeURIComponent(
                mission.userMissionId,
              )}/accept`,
              {},
              { headers: { 'Idempotency-Key': key } },
            );
            setConfirm(false);
            await client.invalidateQueries({
              queryKey: ['health', 'missions'],
            });
          } catch (e) {
            setError(e instanceof Error ? e.message : '추가하지 못했어요.');
          } finally {
            setBusy(false);
          }
        }}
      />
    </View>
  );
}
function MetricCard({
  label,
  page,
  field,
  unit,
  color = '#20BA8A',
  today = false,
}: {
  label: string;
  page?: HealthPage;
  field: string;
  unit: string;
  color?: string;
  today?: boolean;
}) {
  const record = latest(page, field);
  const value = today
    ? sumToday(page, field)
    : record
    ? numeric(record, field)
    : null;
  const host = useRef<View>(null);
  const motion = useHealthMotion(label + field, host);
  return (
    <Animated.View
      ref={host}
      testID={'health-metric-' + field}
      style={[
        hs.metric,
        {
          opacity: motion.interpolate({
            inputRange: [0, 1],
            outputRange: [0.4, 1],
          }),
          transform: [
            {
              translateY: motion.interpolate({
                inputRange: [0, 1],
                outputRange: [12, 0],
              }),
            },
          ],
        },
      ]}
    >
      <View style={hs.between}>
        <View style={[hs.metricIcon, { backgroundColor: color + '12' }]}>
          <MetricIcon field={field} color={color} />
        </View>
        <Text style={hs.metricLabel}>{label}</Text>
      </View>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'baseline',
          gap: 5,
          flexWrap: 'wrap',
        }}
      >
        <Text style={[hs.value, { color }]}>{format(value)}</Text>
        <Text style={hs.metricUnit}>{unit}</Text>
      </View>
      <Text style={hs.metricDate}>
        {today ? koreanDay() : record?.date ?? '기록 없음'}
      </Text>
    </Animated.View>
  );
}

export function HealthScreen({
  active,
  onNestedChange,
  onExit,
  onRegister,
}: {
  active: boolean;
  onNestedChange: (nested: boolean) => void;
  onExit: () => void;
  onRegister: () => void;
}) {
  const [route, setRoute] = useState<Route>('home'),
    [tab, setTab] = useState<'life' | 'checkup'>('life'),
    [entry, setEntry] = useState<EntryKind | null>(null),
    [search, setSearch] = useState(''),
    [period, setPeriod] = useState<PeriodCode>('7d'),
    [refreshing, setRefreshing] = useState(false),
    [syncError, setSyncError] = useState(''),
    [syncNotice, setSyncNotice] = useState('');
  const motionListeners = useRef(new Set<() => void>());
  const client = useQueryClient();
  const pages = useQueries({
    queries: metrics.map(metric => ({
      queryKey: ['health', 'page', metric, period],
      queryFn: ({ signal }: { signal: AbortSignal }) =>
        healthApi.page(metric, period, signal),
      enabled: active && !entry && route !== 'entries' && tab === 'life',
      retry: false,
      staleTime: 60000,
    })),
  });
  const data = Object.fromEntries(
    metrics.map((m, i) => [m, pages[i]?.data]),
  ) as Partial<Record<Metric, HealthPage>>;
  const goBack = () => {
    if (entry) setEntry(null);
    else if (route !== 'home') setRoute('home');
    else onExit();
  };
  useEffect(() => {
    onNestedChange(!!entry || route === 'entries');
    return () => onNestedChange(false);
  }, [entry, route, onNestedChange]);
  useEffect(() => {
    if (!active || Platform.OS !== 'android') return;
    const back = BackHandler.addEventListener('hardwareBackPress', () => {
      goBack();
      return true;
    });
    return () => back.remove();
  });
  const isCheckup =
    (tab === 'checkup' && route === 'home') ||
    route === 'compare' ||
    route === 'all';
  // 작성자: 김진우 — 실제 동기화가 완료된 뒤 서버 기록을 다시 조회한다.
  const refresh = async () => {
    if (refreshing || isCheckup) return;
    setRefreshing(true);
    setSyncError('');
    setSyncNotice('');
    try {
      const result = await refreshSamsungConnection(setSyncNotice);
      setSyncNotice(result.message);
    } catch (error) {
      setSyncNotice('');
      setSyncError(
        error instanceof Error
          ? error.message
          : '삼성헬스 연결 상태를 확인하지 못했어요.',
      );
    } finally {
      await Promise.all([
        client.invalidateQueries({ queryKey: ['health'] }),
        client.invalidateQueries({ queryKey: ['health-connections'] }),
      ]);
      setRefreshing(false);
    }
  };
  useEffect(() => {
    if (!active || isCheckup || entry || route === 'entries') return;
    let mounted = true;
    const automatic = async () => {
      if (AppState.currentState && AppState.currentState !== 'active') return;
      try {
        await syncSamsungHealth({ automatic: true });
        if (mounted) setSyncError('');
        await client.invalidateQueries({ queryKey: ['health'] });
        await client.invalidateQueries({ queryKey: ['health-connections'] });
      } catch (error) {
        if (mounted)
          setSyncError(
            error instanceof Error
              ? error.message
              : '건강 기록 동기화를 완료하지 못했어요.',
          );
      }
    };
    void automatic();
    const timer = setInterval(() => {
      void automatic();
    }, 15 * 60000);
    const app = AppState.addEventListener('change', state => {
      if (state === 'active') void automatic();
    });
    return () => {
      mounted = false;
      clearInterval(timer);
      app.remove();
    };
  }, [active, client, isCheckup, entry, route]);
  if (entry) return <HealthEntry kind={entry} onBack={() => setEntry(null)} />;
  const category: Category =
    route === 'home'
      ? tab === 'checkup'
        ? 'checkup'
        : 'overall'
      : route === 'compare' || route === 'all'
      ? 'checkup'
      : route === 'entries'
      ? 'overall'
      : route;
  return (
    <HealthMotionContext.Provider value={motionListeners.current}>
      <ScrollView
        onScroll={() => motionListeners.current.forEach(reveal => reveal())}
        scrollEventThrottle={80}
        style={hs.root}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={hs.content}
        refreshControl={
          isCheckup ? undefined : (
            <RefreshControl
              refreshing={refreshing}
              onRefresh={refresh}
              tintColor="#20BA8A"
            />
          )
        }
      >
        <View style={[hs.between, { flexWrap: 'wrap' }]}>
          <View style={hs.row}>
            {route !== 'home' && (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="건강 상세 뒤로"
                onPress={goBack}
                style={hs.back}
              >
                <Text style={hs.backText}>‹</Text>
              </Pressable>
            )}
            <Text accessibilityRole="header" style={hs.title}>
              {route === 'home'
                ? '내 건강'
                : route === 'entries'
                ? '직접 입력'
                : route === 'compare'
                ? '과거 검진과 비교'
                : route === 'all'
                ? '결과 전체 보기'
                : domains.find(d => d.id === route)?.title}
            </Text>
          </View>
          {route !== 'entries' && !isCheckup && (
            <View style={hs.row}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="건강 기록 새로고침"
                disabled={refreshing}
                onPress={refresh}
                style={{ padding: 6 }}
              >
                <Text style={{ fontSize: 22, color: '#769B94' }}>
                  {refreshing ? '⋯' : '↻'}
                </Text>
              </Pressable>
              {!isCheckup && (
                <Pressable
                  accessibilityRole="button"
                  onPress={() => setRoute('entries')}
                  style={[hs.pill, hs.active]}
                >
                  <Text style={[hs.pillText, hs.white]}>+ 수치 입력</Text>
                </Pressable>
              )}
            </View>
          )}
        </View>
        {!isCheckup && !!syncNotice && (
          <Text accessibilityLiveRegion="polite" style={hs.syncNotice}>
            {syncNotice}
          </Text>
        )}
        {!isCheckup && !!syncError && (
          <Text accessibilityRole="alert" style={hs.error}>
            {syncError}
          </Text>
        )}
        {route === 'home' && (
          <View
            style={[
              hs.row,
              { backgroundColor: '#E8F2ED', padding: 4, borderRadius: 24 },
            ]}
          >
            {(['life', 'checkup'] as const).map((t, i) => (
              <Pressable
                accessibilityRole="tab"
                accessibilityState={{ selected: tab === t }}
                key={t}
                onPress={() => setTab(t)}
                style={[hs.pill, hs.spacer, tab === t && hs.active]}
              >
                <Text style={[hs.pillText, tab === t && hs.white]}>
                  {['생활 건강', '건강검진'][i]}
                </Text>
              </Pressable>
            ))}
          </View>
        )}
        {route === 'entries' ? (
          <>
            <Text style={hs.muted}>
              입력할 건강 기록을 검색하거나 목록에서 선택해요.
            </Text>
            <TextInput
              accessibilityLabel="입력할 항목 검색"
              placeholder="입력할 항목 검색"
              value={search}
              onChangeText={setSearch}
              style={hs.input}
            />
            <Text style={hs.section}>전체 항목</Text>
            {entries
              .filter(e => (e.title + e.description).includes(search))
              .map(e => (
                <Pressable
                  accessibilityRole="button"
                  key={e.id}
                  onPress={() => setEntry(e.id)}
                  style={[hs.card, hs.row, { minHeight: 78 }]}
                >
                  <View
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 14,
                      backgroundColor: '#DFF8EF',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <HealthIcon
                      xml={healthIcons[e.id]}
                      width={24}
                      height={24}
                    />
                  </View>
                  <View style={hs.spacer}>
                    <Text style={hs.section}>{e.title}</Text>
                    <Text style={hs.muted}>{e.description}</Text>
                  </View>
                  <Text style={hs.backText}>›</Text>
                </Pressable>
              ))}
          </>
        ) : isCheckup ? (
          <HealthCheckups
            mode={
              route === 'compare'
                ? 'compare'
                : route === 'all'
                ? 'all'
                : 'overview'
            }
            onMode={mode => setRoute(mode === 'overview' ? 'home' : mode)}
            onRegister={onRegister}
            analysis={<AnalysisCard category="checkup" active={active} />}
          />
        ) : (
          <>
            <AnalysisCard category={category} active={active} />
            {pages.some(p => p.isError) && (
              <View style={hs.card}>
                <Text accessibilityRole="alert" style={hs.error}>
                  일부 건강 기록을 불러오지 못했어요.
                </Text>
                <Pressable
                  onPress={() =>
                    client.invalidateQueries({ queryKey: ['health', 'page'] })
                  }
                >
                  <Text style={hs.pillText}>다시 불러오기</Text>
                </Pressable>
              </View>
            )}
            {pages.some(p => p.isPending) && (
              <Text style={hs.muted}>건강 기록을 불러오고 있어요.</Text>
            )}
            {route === 'home' ? (
              <>
                <Text style={hs.section}>오늘의 건강 상태</Text>
                <View style={[hs.row, { flexWrap: 'wrap' }]}>
                  <MetricCard
                    label="수면"
                    page={data.sleep}
                    field="total_sleep_minutes"
                    unit="분"
                    color="#8057E0"
                  />
                  <MetricCard
                    label="심박"
                    page={data.bio}
                    field="heart_rate_bpm"
                    unit="bpm"
                    color="#F04066"
                  />
                </View>
                <View style={hs.row}>
                  <MetricCard
                    label="오늘 활동"
                    page={data.activity}
                    field="steps"
                    unit="걸음"
                    today
                  />
                  <MetricCard
                    label="오늘 수분"
                    page={data.water}
                    field="amount_ml"
                    unit="mL"
                    color="#4285F4"
                    today
                  />
                </View>
                <View style={[hs.card, { minHeight: 200 }]}>
                  <Text style={hs.section}>전체 건강 흐름</Text>
                  <Text style={hs.muted}>수면·활동·영양 종합 점수</Text>
                  <View
                    style={{
                      flex: 1,
                      justifyContent: 'center',
                      minHeight: 110,
                    }}
                  >
                    <Text style={[hs.text, { textAlign: 'center' }]}>
                      생활습관 점수 기준을 준비하고 있어요.
                    </Text>
                    <Text style={[hs.muted, { textAlign: 'center' }]}>
                      영역별 기록에서 실제 수치와 변화를 확인할 수 있어요.
                    </Text>
                  </View>
                </View>
                <Text style={hs.section}>영역별 변화</Text>
                {domains.map(d => (
                  <Pressable
                    key={d.id}
                    accessibilityRole="button"
                    onPress={() => setRoute(d.id)}
                    style={[hs.card, hs.row, { minHeight: 72 }]}
                  >
                    <HealthIcon
                      xml={healthIcons[d.icon]}
                      width={28}
                      height={28}
                    />
                    <View style={hs.spacer}>
                      <Text style={hs.section}>{d.title}</Text>
                      <Text style={hs.muted}>{d.description}</Text>
                    </View>
                    <Text style={[hs.backText, { color: d.color }]}>›</Text>
                  </Pressable>
                ))}
              </>
            ) : (
              <>
                <View style={hs.row}>
                  {periods.map(p => (
                    <Pressable
                      accessibilityRole="radio"
                      accessibilityState={{ checked: period === p.code }}
                      key={p.code}
                      onPress={() => setPeriod(p.code)}
                      style={[
                        hs.pill,
                        { flex: 1, paddingHorizontal: 4 },
                        period === p.code && hs.active,
                      ]}
                    >
                      <Text
                        style={[hs.pillText, period === p.code && hs.white]}
                      >
                        {p.label}
                      </Text>
                    </Pressable>
                  ))}
                </View>
                <Text style={hs.muted}>
                  {data[route as Metric]?.period.from} –{' '}
                  {data[route as Metric]?.period.to}
                  {period === '90d' || period === '180d' || period === '1y'
                    ? ' · 구간별 기록일 평균'
                    : ''}
                </Text>
                {data[route as Metric]?.dataTruncated ? (
                  <Text style={hs.error}>
                    기록이 많아 전체 그래프를 표시하지 못했어요. 짧은 기간을
                    선택해 주세요.
                  </Text>
                ) : (
                  <DetailGraphs
                    route={route as 'bio' | 'activity' | 'nutrition' | 'sleep'}
                    data={data}
                    onWater={() => setEntry('water')}
                  />
                )}
                <MissionCard category={category} />
              </>
            )}
          </>
        )}
      </ScrollView>
    </HealthMotionContext.Provider>
  );
}
function DetailGraphs({
  route,
  data,
  onWater,
}: {
  route: 'bio' | 'activity' | 'nutrition' | 'sleep';
  data: Partial<Record<Metric, HealthPage>>;
  onWater: () => void;
}) {
  if (route === 'bio')
    return (
      <>
        <View style={hs.row}>
          <MetricCard
            label="심박"
            page={data.bio}
            field="heart_rate_bpm"
            unit="bpm"
          />
          <MetricCard
            label="체중"
            page={data.bio}
            field="weight_kg"
            unit="kg"
          />
        </View>
        <HealthChart
          period={data.bio?.period}
          title="체중 변화"
          series={series(data.bio, ['weight_kg'])}
        />
        <HealthChart
          period={data.bio?.period}
          title="BMI 변화"
          series={series(data.bio, ['bmi_value'])}
        />
        <HealthChart
          period={data.bio?.period}
          title="혈압 변화"
          series={series(data.bio, ['systolic_mmhg', 'diastolic_mmhg'])}
        />
        <HealthChart
          period={data.bio?.period}
          title="혈당 변화"
          series={series(data.bio, [
            'glucose_fasting',
            'glucose_nonfasting',
            'glucose_unknown',
          ])}
        />
        <HealthChart
          period={data.bio?.period}
          title="심박 변화"
          series={series(data.bio, ['heart_rate_bpm'])}
        />
      </>
    );
  if (route === 'activity')
    return (
      <>
        <View style={hs.row}>
          <MetricCard
            label="걸음"
            page={data.activity}
            field="steps"
            unit="걸음"
          />
          <MetricCard
            label="운동 열량"
            page={data.exercise}
            field="calories_kcal"
            unit="kcal"
          />
        </View>
        <HealthChart
          period={data.activity?.period}
          title="걸음 추이"
          kind="bar"
          series={series(data.activity, ['steps'])}
        />
        <HealthChart
          period={data.activity?.period}
          title="활동 열량"
          kind="stack"
          series={activityCalories(data.activity, data.exercise)}
          note="데모 기준으로 운동과 기타 활동을 나눠요. 기타 활동은 활동 열량에서 운동 열량을 뺀 값이며, 음수는 0으로 표시해요."
        />
        <HealthChart
          period={data.exercise?.period}
          title="운동시간 및 종류"
          kind="stack"
          series={exerciseKinds(data.exercise)}
        />
        <View style={hs.card}>
          <Text style={hs.section}>운동 기록</Text>
          {(data.exercise?.records.length ?? 0) > 100 && (
            <Text style={hs.muted}>
              최근 100개 기록을 표시해요. 그래프는 조회 기간 전체 기록으로
              계산해요.
            </Text>
          )}
          {data.exercise?.records.length ? (
            data.exercise.records.slice(0, 100).map(r => (
              <View key={r.recordId} style={hs.between}>
                <View style={hs.spacer}>
                  <Text style={hs.text}>
                    {String(r.values.exercise_type ?? '운동')}
                  </Text>
                  <Text style={hs.muted}>
                    {r.date} ·{' '}
                    {format(
                      numeric(r, 'duration_seconds') === null
                        ? null
                        : numeric(r, 'duration_seconds')! / 60,
                    )}
                    분
                  </Text>
                </View>
                <Text style={hs.text}>
                  {format(numeric(r, 'calories_kcal'))} kcal
                </Text>
              </View>
            ))
          ) : (
            <Text style={hs.muted}>기록이 없어요.</Text>
          )}
        </View>
      </>
    );
  if (route === 'nutrition')
    return (
      <>
        <View style={hs.card}>
          <Text style={hs.section}>오늘의 식사 기록</Text>
          {data.nutrition?.records
            .filter(r => r.date === koreanDay())
            .map(r => (
              <View key={r.recordId}>
                <Text style={hs.text}>
                  {String(r.values.meal_type ?? '식사')} ·{' '}
                  {String(r.values.title ?? '이름 미기록')}
                </Text>
                <Text style={hs.muted}>
                  {format(numeric(r, 'calories'))} kcal
                </Text>
              </View>
            ))}
          {!data.nutrition?.records.some(r => r.date === koreanDay()) && (
            <Text style={hs.muted}>오늘의 식사 기록이 없어요.</Text>
          )}
        </View>
        <HealthChart
          period={data.nutrition?.period}
          title="섭취 칼로리 추이"
          series={series(data.nutrition, ['calories'])}
        />
        <HealthChart
          period={data.bio?.period}
          title="혈당 추이"
          series={series(data.bio, [
            'glucose_fasting',
            'glucose_nonfasting',
            'glucose_unknown',
          ])}
        />
        <HealthChart
          period={data.nutrition?.period}
          title="영양소 구성"
          kind="stack"
          series={macroSeries(data.nutrition)}
          note="탄수화물·단백질 4kcal/g, 지방 9kcal/g. 세 영양소가 모두 기록된 날짜만 비교하며 섭취 칼로리와 구분해요."
        />
        <HealthChart
          period={data.water?.period}
          title="수분 섭취"
          kind="bar"
          series={series(data.water, ['amount_ml'], 1 / 250, '잔')}
          tableSeries={series(data.water, ['amount_ml'])}
          note="1잔은 250mL예요. 수치표에서는 mL로 확인해요."
        />
        <Pressable onPress={onWater} style={hs.card}>
          <Text style={hs.section}>물 섭취 기록 관리 ›</Text>
          <Text style={hs.muted}>
            앱에서 추가한 과거 기록도 편집·삭제할 수 있어요.
          </Text>
        </Pressable>
      </>
    );
  return (
    <>
      <View style={hs.row}>
        <MetricCard
          label="최근 총 수면"
          page={data.sleep}
          field="total_sleep_minutes"
          unit="분"
          color="#8057E0"
        />
        <MetricCard
          label="삼성 수면점수"
          page={data.sleep}
          field="sleep_score"
          unit="점"
          color="#8057E0"
        />
      </View>
      <HealthChart
        period={data.sleep?.period}
        title="수면 단계"
        kind="stack"
        series={sleepStages(data.sleep)}
      />
      <HealthChart
        period={data.sleep?.period}
        title="수면시간 추이"
        kind="bar"
        series={series(data.sleep, ['total_sleep_minutes'], 1 / 60, '시간')}
      />
      <HealthChart
        period={data.sleep?.period}
        title="수면점수 추이"
        series={series(data.sleep, ['sleep_score'])}
      />
    </>
  );
}
