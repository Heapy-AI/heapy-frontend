// 작성자: 김진우 — 최근 7일의 자체 점수와 기록 충족 상태를 표시한다.
import React, { useEffect, useState } from 'react';
import { AppState, Pressable, StyleSheet, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { healthApi } from './healthApi';
import { HealthChart } from './HealthChart';
import { koreanDay } from './healthModel';
import { hs } from './healthStyles';
import { scoreReasons, scoreSeries } from './lifestyleScoreModel';
import LinearGradient from 'react-native-linear-gradient';
import { MetricIcon } from './MetricIcon';
import { HealthRequestState } from './HealthRequestState';
import Svg, { Circle, Path } from 'react-native-svg';

export function LifestyleScoreCard({ active }: { active: boolean }) {
  const [day, setDay] = useState(koreanDay);
  const [details, setDetails] = useState(false);
  const [retrying, setRetrying] = useState(false);
  useEffect(() => {
    const update = () => setDay(koreanDay());
    const timer = setInterval(update, 60000);
    const subscription = AppState.addEventListener('change', state => {
      if (state === 'active') update();
    });
    return () => {
      clearInterval(timer);
      subscription.remove();
    };
  }, []);
  const query = useQuery({
    queryKey: ['health', 'score', day],
    queryFn: ({ signal }) => healthApi.score(signal),
    enabled: active,
    staleTime: 60000,
    retry: false,
  });
  const report = query.data,
    latest = report?.latest;
  return (
    <LinearGradient
      colors={['#FFFFFF', '#F2FCF9']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.card}
    >
      <View style={hs.between}>
        <View style={styles.heading}>
          <Text style={styles.title}>생활습관 관리 점수</Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="계산 기준"
          accessibilityState={{ expanded: details }}
          onPress={() => setDetails(!details)}
          style={styles.criteria}
        >
          <Svg width={16} height={16} viewBox="0 0 24 24">
            <Circle
              cx={12}
              cy={12}
              r={9}
              fill="none"
              stroke="#168166"
              strokeWidth={1.7}
            />
            <Path
              d="M12 11v6m0-10v.1"
              stroke="#168166"
              strokeWidth={2}
              strokeLinecap="round"
            />
          </Svg>
          <Text style={styles.link}>계산 기준</Text>
        </Pressable>
      </View>
      <Text style={styles.caption}>
        HEAPY 자체 기준 · 의학적 진단이 아니에요
      </Text>
      {query.isPending && !retrying ? (
        <HealthRequestState
          busy
          title="점수를 불러오고 있어요"
          description="최근 기록을 확인하고 있어요. 잠시만 기다려 주세요."
        />
      ) : null}
      {query.isError || retrying ? (
        <HealthRequestState
          title="점수를 불러오지 못했어요"
          description="잠시 후 다시 시도해 주세요."
          retry={() => {
            setRetrying(true);
            query.refetch().finally(() => setRetrying(false));
          }}
          busy={query.isFetching}
        />
      ) : null}
      {!query.isPending && !query.isError && !latest && (
        <HealthRequestState
          title="아직 계산된 점수가 없어요"
          description="수면·활동·체성분 기록이 쌓이면 점수를 확인할 수 있어요."
        />
      )}
      {latest && !query.isError ? (
        <>
          <LinearGradient
            colors={['#DFFAF0', '#E4F5FF']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.hero}
          >
            <Text style={styles.heroLabel}>
              {latest.score === null
                ? '기록을 모으고 있어요'
                : '나의 생활습관 점수'}
            </Text>
            <Text testID="lifestyle-score-value" style={styles.score}>
              {latest.score ?? '—'}
              <Text style={styles.unit}> / 100점</Text>
            </Text>
            {latest.score !== null && (
              <View
                accessibilityRole="progressbar"
                accessibilityLabel="생활습관 관리 점수"
                accessibilityValue={{ min: 0, max: 100, now: latest.score }}
                style={styles.track}
              >
                <View
                  style={[
                    styles.fill,
                    { width: `${Math.max(0, Math.min(100, latest.score))}%` },
                  ]}
                />
              </View>
            )}
            <Text style={hs.muted}>{latest.date} 기준</Text>
          </LinearGradient>
          <View style={hs.row}>
            {(
              [
                ['수면', latest.sleep.score, '45%', 'sleep', '#8B65CF'],
                ['활동', latest.activity.score, '45%', 'steps', '#228FC6'],
                ['BMI', latest.bmiScore, '10%', 'weight_kg', '#17A28B'],
              ] as const
            ).map(([label, value, weight, icon, color]) => (
              <View key={label} style={styles.component}>
                <MetricIcon field={icon} color={color} />
                <Text style={hs.muted}>
                  {label} · {weight}
                </Text>
                <Text style={styles.value}>
                  {value === null ? '—' : Math.round(value)}
                  <Text style={hs.muted}> 점</Text>
                </Text>
              </View>
            ))}
          </View>
          {latest.reasons.length > 0 && (
            <View style={styles.details}>
              {latest.reasons.map(reason => (
                <Text key={reason} style={styles.caption}>
                  {scoreReasons[reason] ?? '점수를 계산할 기록이 부족해요.'}
                </Text>
              ))}
            </View>
          )}
        </>
      ) : null}
      {report && !query.isError ? (
        <HealthChart
          title="최근 7일 추이"
          series={[scoreSeries(report)]}
          kind="bar"
          period={report.period}
          maximum={100}
        />
      ) : null}
      {details ? (
        <View style={styles.details}>
          <Text style={hs.text}>수면 45% + 활동 45% + BMI 10%</Text>
          <Text style={hs.muted}>
            수면: 7~9시간은 100점. 7시간보다 짧으면 시간당 25점, 9시간보다 길면
            시간당 15점을 낮춰요. 최근 7일 중 5일 이상 기록의 평균이에요.
          </Text>
          <Text style={hs.muted}>
            활동: 하루 8,000보 또는 운동 30분의 달성률 중 높은 값을 사용해요.
            최근 14일 중 7일 이상 기록의 평균이에요.
          </Text>
          <Text style={hs.muted}>
            BMI: 18.5~25는 100점. 범위를 벗어나면 1당 10점을 낮춰요. 해당 날짜를
            포함한 최근 90일의 마지막 측정값을 사용해요.
          </Text>
          <Text style={hs.muted}>
            영역별 점수는 0~100점이며 종합 점수만 최종 반올림해요. 모든 영역의
            기록이 있어야 종합 점수를 표시해요. 막대가 없는 날짜는 기록 부족이며
            0점과 달라요.
          </Text>
          <Text style={hs.muted}>
            매일 전날 점수를 저장하고 최근 7일을 보여드려요. 계산 후 도착한
            기록은 다음 날짜 점수부터 반영돼요. 겹친 수면·운동 세션은 가장 긴
            기록 하나만 반영해요. 만 20세 이상용 참고 지표이며 임신 등 일반 BMI
            해석이 맞지 않는 경우에는 적합하지 않아요.
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="계산 기준 접기"
            onPress={() => setDetails(false)}
            style={({ pressed }) => [
              styles.collapse,
              pressed && styles.pressed,
            ]}
          >
            <Svg width={20} height={20} viewBox="0 0 24 24">
              <Path
                d="m6 14 6-6 6 6"
                stroke="#168166"
                strokeWidth={2}
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </Svg>
            <Text style={styles.link}>접기</Text>
          </Pressable>
        </View>
      ) : null}
    </LinearGradient>
  );
}
const styles = StyleSheet.create({
  card: {
    padding: 18,
    gap: 14,
    borderRadius: 26,
    borderWidth: 1,
    borderColor: '#DBF0E9',
    boxShadow: '0px 8px 20px rgba(29, 144, 125, 0.10)',
  },
  heading: { flexDirection: 'row', alignItems: 'center', gap: 9, flex: 1 },
  headingIcon: {
    width: 38,
    height: 38,
    borderRadius: 13,
    backgroundColor: '#DDFAF0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontSize: 15, fontWeight: '800', color: '#2C5260', flexShrink: 1 },
  criteria: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    minHeight: 44,
    paddingHorizontal: 10,
    borderRadius: 13,
    backgroundColor: '#EAF8F3',
    justifyContent: 'center',
  },
  collapse: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    borderTopWidth: 1,
    borderTopColor: '#E1ECE7',
    marginTop: 4,
  },
  pressed: { opacity: 0.65 },
  caption: { fontSize: 11, lineHeight: 18, color: '#728990' },
  heroLabel: { fontSize: 12, color: '#438C83', fontWeight: '600' },
  track: {
    height: 7,
    borderRadius: 4,
    backgroundColor: '#FFFFFFCC',
    overflow: 'hidden',
    marginVertical: 6,
  },
  fill: { height: 7, borderRadius: 4, backgroundColor: '#1EB99A' },
  link: { fontSize: 12, color: '#168166', fontWeight: '600' },
  hero: { padding: 20, borderRadius: 20, gap: 5 },
  score: { fontSize: 44, fontWeight: '800', color: '#159F90' },
  unit: { fontSize: 13, fontWeight: '500', color: '#74847E' },
  component: {
    flex: 1,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E4F0EE',
    padding: 10,
    gap: 6,
  },
  value: { fontSize: 20, fontWeight: '700', color: '#254A3F' },
  details: {
    gap: 8,
    borderRadius: 16,
    padding: 12,
    backgroundColor: '#F7FAF8',
  },
});
