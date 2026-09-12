import React, { useState } from 'react';
import LinearGradient from 'react-native-linear-gradient';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { HomeData, formatValue, weeklyData } from './homeData';
import { HomeSettings, metrics } from './homeModel';
import { HomeCardHeading, metricDesign } from './HomeCardDesign';

// 작성자: 김진우 — 실제 날짜별 막대를 누르면 해당 기록값을 표시한다.
export function WeeklyCard({
  data,
  metric,
}: {
  data: HomeData;
  metric: HomeSettings['weekly'];
}) {
  const [selected, setSelected] = useState<string>();
  const weekly = weeklyData(data.cards?.trends[metric] ?? [], data.date);
  const maximum = Math.max(1, ...weekly.days.map(p => p.value ?? 0));
  const point = weekly.days.find(p => p.date === selected);
  return (
    <LinearGradient
      colors={['#FFFFFF', '#F1FAFF']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={s.card}
    >
      <HomeCardHeading
        icon={metric}
        title={`주간 ${metrics[metric][0]} 변화`}
        detail="최근 7일의 기록"
        color={metricDesign[metric].color}
        tint={metricDesign[metric].tint}
      />
      <Text style={s.value}>
        {weekly.average === null
          ? '최근 7일 기록이 없어요'
          : `평균 ${formatValue(metric, weekly.average)}`}
      </Text>
      <Text style={s.note}>
        {weekly.change === null
          ? '이전 기간과 비교할 기록이 부족해요'
          : `이전 7일 대비 ${
              weekly.change > 0 ? '+' : ''
            }${weekly.change.toFixed(1)}%`}
      </Text>
      <View style={s.graph}>
        {weekly.days.map(p => (
          <Pressable
            key={p.date}
            style={s.column}
            accessibilityRole="button"
            accessibilityLabel={`${p.date} ${formatValue(metric, p.value)}`}
            onPress={() => setSelected(p.date)}
          >
            <View style={s.track}>
              <View
                style={{
                  width: '100%',
                  borderRadius: 6,
                  height:
                    p.value === null
                      ? 0
                      : Math.max(3, (p.value / maximum) * 70),
                  backgroundColor:
                    selected === p.date
                      ? metricDesign[metric].color
                      : `${metricDesign[metric].color}70`,
                }}
              />
            </View>
            <Text style={s.date}>{p.date.slice(5).replace('-', '/')}</Text>
            {p.value === null && <Text style={s.date}>—</Text>}
          </Pressable>
        ))}
      </View>
      {point && (
        <Text accessibilityLiveRegion="polite" style={s.note}>
          {point.date} · {formatValue(metric, point.value)}
        </Text>
      )}
      <Text style={s.note}>
        어제까지 · 기록일 평균 ({weekly.recordedDays}일 / 이전{' '}
        {weekly.previousDays}일)
      </Text>
    </LinearGradient>
  );
}
const s = StyleSheet.create({
  card: {
    backgroundColor: 'white',
    borderRadius: 25,
    padding: 20,
    gap: 17,
    borderWidth: 1,
    borderColor: '#DDEEF8',
    boxShadow: '0px 7px 18px rgba(54, 141, 183, 0.10)',
  },
  title: { color: '#17342D', fontSize: 16, fontWeight: '800' },
  value: {
    color: '#315465',
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  note: { color: '#7D8C85', fontSize: 11, lineHeight: 18 },
  graph: { flexDirection: 'row', gap: 8 },
  column: { flex: 1, alignItems: 'center', gap: 4 },
  track: {
    height: 74,
    width: '100%',
    justifyContent: 'flex-end',
    backgroundColor: '#EDF7FC',
    borderRadius: 10,
  },
  date: { fontSize: 10, color: '#617A70' },
});
