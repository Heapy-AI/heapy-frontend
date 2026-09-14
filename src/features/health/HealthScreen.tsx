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
    description: '심박수 · 혈압 · 체중 · BMI',
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
    title: '수면 기록',
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
// 작성자: 고수연 — 수치 카드가 쓰는 고정 조회 기간. 오늘·최근 기록만 필요해 짧게 잡는다.
const CARD_PERIOD: PeriodCode = '7d';
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
// 작성자: 고수연 — 점수를 내지 못한 이유. 서버가 내려주는 코드를 사람 말로 옮긴다.
const scoreReasons: Record<string, string> = {
  sleep_insufficient: '수면 기록이 더 필요해요.',
  activity_insufficient: '활동 기록이 더 필요해요.',
  bmi_missing: '체중이나 체성분 기록이 필요해요.',
  bmi_stale: '체중 기록이 오래되어 최근 값이 필요해요.',
  age_unavailable: '생년월일을 입력하면 점수를 낼 수 있어요.',
  age_not_supported: '아직 만 20세 이상만 점수를 제공해요.',
  data_limit_exceeded: '기록이 너무 많아 오늘 점수를 확정하지 못했어요.',
  no_record: '아직 기록이 없어요.',
};

function ScoreCard() {
  const query = useQuery({
    queryKey: ['health', 'score', koreanDay()],
    queryFn: ({ signal }) => healthApi.score('7d', signal),
    retry: false,
    staleTime: 60000,
  });
  const latest = query.data?.latest;
  const total = latest?.score ?? null;
  // 점수가 없을 때는 첫 번째 사유만 보여준다. 여러 개를 늘어놓으면 읽지 않는다.
  const message = query.isPending
    ? '점수를 불러오고 있어요.'
    : query.isError
    ? '점수를 불러오지 못했어요.'
    : scoreReasons[latest?.reasons?.[0] ?? ''] ??
      '기록이 더 쌓이면 점수를 보여드릴게요.';

  return (
    <View style={[hs.card, { minHeight: 200 }]}>
      <Text style={hs.section}>전체 건강 흐름</Text>
      <Text style={hs.muted}>오늘의 건강 종합 점수</Text>
      <View style={{ flex: 1, justifyContent: 'center', minHeight: 110 }}>
        {total === null ? (
          <>
            <Text style={[hs.text, { textAlign: 'center' }]}>{message}</Text>
            <Text style={[hs.muted, { textAlign: 'center' }]}>
              영역별 기록에서 실제 수치와 변화를 확인할 수 있어요.
            </Text>
          </>
        ) : (
          <>
            <Text
              accessibilityLabel={`오늘의 건강 종합 점수 ${total}점`}
              style={[
                hs.value,
                { textAlign: 'center', fontSize: 48, lineHeight: 56 },
              ]}
            >
              {total}
              <Text style={[hs.muted, { fontSize: 18 }]}>점</Text>
            </Text>
            <View style={[hs.row, { justifyContent: 'center', gap: 18 }]}>
              <ScorePart label="수면" value={latest?.sleep?.score} />
              <ScorePart label="활동" value={latest?.activity?.score} />
              <ScorePart label="BMI" value={latest?.bmiScore} />
            </View>
          </>
        )}
      </View>
    </View>
  );
}

function ScorePart({ label, value }: { label: string; value?: number | null }) {
  return (
    <View style={{ alignItems: 'center' }}>
      <Text style={hs.muted}>{label}</Text>
      <Text style={hs.text}>
        {value === null || value === undefined ? '—' : Math.round(value)}
      </Text>
    </View>
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
// 작성자: 고수연 — 조회 기간 선택. 수치 카드는 오늘·최근 기록만 보여주므로 그래프 바로
// 위에 둔다. 기록이 많아 그래프를 못 그릴 때도 기간을 줄일 수 있어야 해서 따로 뺐다.
function PeriodPicker({
  period,
  setPeriod,
  page,
}: {
  period: PeriodCode;
  setPeriod: (code: PeriodCode) => void;
  page?: HealthPage;
}) {
  return (
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
            <Text style={[hs.pillText, period === p.code && hs.white]}>
              {p.label}
            </Text>
          </Pressable>
        ))}
      </View>
      <Text style={hs.muted}>
        {page?.period.from} – {page?.period.to}
        {period === '90d' || period === '180d' || period === '1y'
          ? ' · 구간별 기록일 평균'
          : ''}
      </Text>
    </>
  );
}

// 작성자: 고수연 — 분을 [숫자, 단위] 쌍으로 쪼갠다. 한 시간이 안 되면 분만 남긴다.
function hourParts(value: number | null): Array<[string, string]> {
  if (value === null || !Number.isFinite(value)) return [['—', '']];
  const total = Math.round(value);
  const hours = Math.floor(total / 60);
  const minutes = total % 60;
  if (!hours) return [[String(minutes), '분']];
  return minutes
    ? [[String(hours), '시간'], [String(minutes), '분']]
    : [[String(hours), '시간']];
}

function MetricCard({
  label,
  page,
  field,
  unit,
  color = '#20BA8A',
  today = false,
  minutes = false,
  factor = 1,
}: {
  label: string;
  page?: HealthPage;
  field: string;
  unit: string;
  color?: string;
  today?: boolean;
  // 작성자: 고수연 — 분으로 담긴 값을 '7시간 30분'으로 읽는다. 단위 글자는 따로 쓰지 않는다.
  minutes?: boolean;
  // 저장 단위와 보여줄 단위가 다를 때 곱한다. 물은 mL 로 담고 잔으로 읽는다.
  factor?: number;
}) {
  const record = latest(page, field);
  const raw = today
    ? sumToday(page, field)
    : record
    ? numeric(record, field)
    : null;
  const value = raw === null ? null : raw * factor;
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
        {minutes ? (
          // 작성자: 고수연 — '시간'과 '분'도 단위다. 다른 카드처럼 작고 흐리게 둔다.
          hourParts(value).map(([amount, suffix]) => (
            <View key={suffix} style={hs.metricAmount}>
              <Text style={[hs.value, { color }]}>{amount}</Text>
              <Text style={hs.metricUnit}>{suffix}</Text>
            </View>
          ))
        ) : (
          <>
            <Text style={[hs.value, { color }]}>{format(value)}</Text>
            <Text style={hs.metricUnit}>{unit}</Text>
          </>
        )}
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
  // 작성자: 고수연 — 화면을 바꾸면 스크롤을 맨 위로 올린다. 하나의 ScrollView 가 내용만
  // 갈아끼우는 구조라, 그냥 두면 이전 화면에서 내려둔 위치가 그대로 남는다.
  const scroller = useRef<ScrollView>(null);
  useEffect(() => {
    scroller.current?.scrollTo({ y: 0, animated: false });
  }, [route, tab, entry]);
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
  // 작성자: 고수연 — 수치 카드는 오늘·최근 기록만 보여주므로 기간 선택과 무관해야 한다.
  // 그래프용 조회와 분리해 7일로 고정한다. 같은 데이터를 쓰면 90일을 고르는 순간
  // 카드의 '최근 기록'까지 그 구간 기준으로 바뀐다.
  const cardPages = useQueries({
    queries: metrics.map(metric => ({
      queryKey: ['health', 'page', metric, CARD_PERIOD],
      queryFn: ({ signal }: { signal: AbortSignal }) =>
        healthApi.page(metric, CARD_PERIOD, signal),
      enabled: active && !entry && route !== 'entries' && tab === 'life',
      retry: false,
      staleTime: 60000,
    })),
  });
  const cards = Object.fromEntries(
    metrics.map((m, i) => [m, cardPages[i]?.data]),
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
        ref={scroller}
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
                    label="수면시간"
                    page={cards.sleep}
                    field="total_sleep_minutes"
                    unit="분"
                    minutes
                    color="#8057E0"
                  />
                  <MetricCard
                    label="심박수"
                    page={cards.bio}
                    field="heart_rate_bpm"
                    unit="bpm"
                    color="#F04066"
                  />
                </View>
                <View style={hs.row}>
                  <MetricCard
                    label="걸음 수"
                    page={cards.activity}
                    field="steps"
                    unit="걸음"
                    today
                  />
                  <MetricCard
                    label="물 섭취"
                    page={cards.water}
                    field="amount_ml"
                    unit="잔"
                    factor={1 / 250}
                    color="#4285F4"
                    today
                  />
                </View>
                <ScoreCard />
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
                {data[route as Metric]?.dataTruncated ? (
                  <>
                    <PeriodPicker
                      period={period}
                      setPeriod={setPeriod}
                      page={data[route as Metric]}
                    />
                    <Text style={hs.error}>
                      기록이 많아 전체 그래프를 표시하지 못했어요. 짧은 기간을
                      선택해 주세요.
                    </Text>
                  </>
                ) : (
                  <DetailGraphs
                    route={route as 'bio' | 'activity' | 'nutrition' | 'sleep'}
                    data={data}
                    cards={cards}
                    onWater={() => setEntry('water')}
                    periodPicker={
                      <PeriodPicker
                        period={period}
                        setPeriod={setPeriod}
                        page={data[route as Metric]}
                      />
                    }
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
  cards,
  onWater,
  periodPicker,
}: {
  route: 'bio' | 'activity' | 'nutrition' | 'sleep';
  // 그래프용. 선택한 기간을 따른다.
  data: Partial<Record<Metric, HealthPage>>;
  // 수치 카드용. 기간과 무관하게 고정 구간을 본다.
  cards: Partial<Record<Metric, HealthPage>>;
  onWater: () => void;
  periodPicker: React.ReactNode;
}) {
  if (route === 'bio')
    return (
      <>
        <View style={hs.row}>
          <MetricCard
            label="심박수"
            page={cards.bio}
            field="heart_rate_bpm"
            unit="bpm"
          />
          <MetricCard
            label="체중"
            page={cards.bio}
            field="weight_kg"
            unit="kg"
          />
        </View>
        {periodPicker}
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
            label="걸음 수"
            page={cards.activity}
            field="steps"
            unit="걸음"
          />
          <MetricCard
            label="운동 열량"
            page={cards.exercise}
            field="calories_kcal"
            unit="kcal"
          />
        </View>
        {periodPicker}
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
        {periodPicker}
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
          label="수면시간"
          page={cards.sleep}
          field="total_sleep_minutes"
          unit="분"
          minutes
          color="#8057E0"
        />
        <MetricCard
          label="삼성 수면점수"
          page={cards.sleep}
          field="sleep_score"
          unit="점"
          color="#8057E0"
        />
      </View>
      {periodPicker}
      {/* 작성자: 고수연 — 막대 높이가 곧 그날 수면시간이라 따로 두지 않고 하나로 합쳤다.
          단계가 없는 밤은 총 수면시간이 한 칸으로 그려진다. */}
      <HealthChart
        period={data.sleep?.period}
        title="수면시간"
        kind="stack"
        series={sleepStages(data.sleep)}
      />
      <HealthChart
        period={data.sleep?.period}
        title="수면점수 추이"
        series={series(data.sleep, ['sleep_score'])}
      />
    </>
  );
}
