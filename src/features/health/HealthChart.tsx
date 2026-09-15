// 작성자: 김진우 — 터치한 실측값만 말풍선에 표시하고 결측 간격은 점선으로 구분한다.
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  PanResponder,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Svg, { Circle, G, Line, Rect, Text as SvgText } from 'react-native-svg';
import { HealthPage, Series } from './types';
import { chartDates, format } from './healthModel';
import { axisMaximum, lineSegments } from './chartGeometry';
import { useHealthMotion } from './useHealthMotion';
import { hs } from './healthStyles';
import { durationHours, formatHours } from '../../shared/utils/duration';

// 작성자: 김진우 — 그래프·말풍선·수치표는 동일한 시간 단위를 사용하고 원본 계열은 변경하지 않는다.
const hourlySeries = (items: Series[]) =>
  items.map(item =>
    ['분', '초', 'MINUTE', 'SECOND'].includes(item.unit)
      ? {
          ...item,
          unit: '시간',
          points: item.points.map(point => ({
            ...point,
            value: durationHours(point.value, item.unit)!,
          })),
        }
      : item,
  );
const AnimatedRect = Animated.createAnimatedComponent(Rect);
const AnimatedGroup = Animated.createAnimatedComponent(G);
const palette = [
  '#25B793',
  '#6295F4',
  '#9B7BE5',
  '#F1A061',
  '#E886A4',
  '#438F99',
];
// 작성자: 고수연 — 계열이 color 를 들고 있으면 그 색을 쓰고, 없을 때만 기본 팔레트를 쓴다.
const colorOf = (entry: Series, index: number) =>
  entry.color ?? palette[index % palette.length];
export function HealthChart({
  title,
  series: sourceSeries,
  kind = 'line',
  note,
  tableSeries: sourceTableSeries,
  period,
  maximum: sourceMaximum,
}: {
  title: string;
  series: Series[];
  kind?: 'line' | 'bar' | 'stack';
  note?: string;
  tableSeries?: Series[];
  period?: HealthPage['period'];
  maximum?: number;
}) {
  const series = useMemo(() => hourlySeries(sourceSeries), [sourceSeries]);
  const tableSeries = useMemo(
    () => (sourceTableSeries ? hourlySeries(sourceTableSeries) : undefined),
    [sourceTableSeries],
  );
  const maximum =
    sourceMaximum == null
      ? sourceMaximum
      : durationHours(sourceMaximum, sourceSeries[0]?.unit) ?? sourceMaximum;
  const [width, setWidth] = useState(300),
    [zoom, setZoom] = useState(1),
    [table, setTable] = useState(false),
    [selected, setSelected] = useState('');
  const scope =
    title + '|' + period?.from + '|' + period?.to + '|' + period?.aggregation;
  const host = useRef<View>(null);
  const progress = useHealthMotion(
    scope +
      JSON.stringify(series.map(s => s.points.map(p => [p.date, p.value]))),
    host,
  );
  useEffect(() => {
    setSelected('');
    setZoom(1);
  }, [scope]);
  const gesture = useRef({ distance: 1, zoom: 1 });
  const zoomRef = useRef(zoom);
  zoomRef.current = zoom;
  const responder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: e => e.nativeEvent.touches.length === 2,
        onPanResponderGrant: e => {
          const [a, b] = e.nativeEvent.touches;
          if (a && b)
            gesture.current = {
              distance: Math.hypot(a.pageX - b.pageX, a.pageY - b.pageY),
              zoom: zoomRef.current,
            };
        },
        onPanResponderMove: e => {
          const [a, b] = e.nativeEvent.touches;
          if (a && b)
            setZoom(
              Math.min(
                4,
                Math.max(
                  1,
                  (gesture.current.zoom *
                    Math.hypot(a.pageX - b.pageX, a.pageY - b.pageY)) /
                    Math.max(1, gesture.current.distance),
                ),
              ),
            );
        },
      }),
    [],
  );
  const dates = chartDates(series, period),
    chartWidth = width * zoom,
    left = 34,
    right = 12,
    top = 30,
    bottom = 192;
  // 작성자: 김진우 — 팀원의 3시간 축 간격을 시간 단위로 환산된 계열에 적용한다.
  const hourAxis = series[0]?.unit === '시간';
  const peak = Math.max(
    0,
    ...dates.map(d =>
      kind === 'stack'
        ? series.reduce(
            (sum, s) => sum + (s.points.find(p => p.date === d)?.value ?? 0),
            0,
          )
        : Math.max(
            0,
            ...series.map(s => s.points.find(p => p.date === d)?.value ?? 0),
          ),
    ),
  );
  // 작성자: 김진우 — 최댓값까지 축을 올려 수면 막대의 실제 높이가 잘리지 않게 한다.
  const max =
    maximum ??
    (hourAxis ? Math.max(3, Math.ceil(peak / 3) * 3) : axisMaximum(peak));
  const ticks =
    hourAxis && maximum == null
      ? Array.from({ length: max / 3 + 1 }, (_, i) => (i * 3) / max)
      : [0, 0.25, 0.5, 0.75, 1];
  const slot = (chartWidth - left - right) / Math.max(1, dates.length);
  const x = (i: number) => left + (i + 0.5) * slot,
    y = (value: number) =>
      Math.max(top, bottom - (value / max) * (bottom - top));
  const selectedValues = series
    .map((s, i) => ({
      series: s,
      point: s.points.find(p => p.date === selected),
      color: colorOf(s, i),
    }))
    .filter(v => v.point);
  const choose = (date: string) =>
    setSelected(prior => (prior === date ? '' : date));
  const barWidth = Math.min(28, slot * 0.56);
  return (
    <Animated.View
      ref={host}
      testID={'health-chart-' + title}
      style={[
        hs.card,
        s.card,
        {
          opacity: progress.interpolate({
            inputRange: [0, 1],
            outputRange: [0.4, 1],
          }),
          transform: [
            {
              translateY: progress.interpolate({
                inputRange: [0, 1],
                outputRange: [10, 0],
              }),
            },
          ],
        },
      ]}
      onLayout={e => setWidth(Math.max(150, e.nativeEvent.layout.width - 40))}
    >
      <View style={hs.between}>
        <Text accessibilityRole="header" style={s.title}>
          {title}
        </Text>
        {hourAxis ? null : (
          <View style={s.unit}>
            <Text style={s.unitText}>{series[0]?.unit ?? ''}</Text>
          </View>
        )}
      </View>
      <View style={s.legend}>
        {/* 작성자: 고수연 — legendHidden 계열은 범례에서 뺀다. 말풍선에는 이름이 나온다. */}
        {series.map((a, i) =>
          !a.legendHidden ? (
            <View key={a.key} style={s.legendItem}>
              <View style={[s.dot, { backgroundColor: colorOf(a, i) }]} />
              <Text style={s.legendText}>{a.label}</Text>
            </View>
          ) : null,
        )}
      </View>
      {!dates.length ? (
        <Text style={s.empty}>아직 표시할 기록이 없어요.</Text>
      ) : (
        <View {...responder.panHandlers}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={{ width: chartWidth, height: 226 }}>
              <Svg width={chartWidth} height={226}>
                {ticks.map(r => (
                  <G key={r}>
                    <Line
                      x1={left}
                      x2={chartWidth - right}
                      y1={y(max * r)}
                      y2={y(max * r)}
                      stroke="#EAF0F2"
                      strokeDasharray={r ? '3 5' : undefined}
                    />
                    <SvgText
                      x={left - 8}
                      y={y(max * r) + 3}
                      textAnchor="end"
                      fontSize={9}
                      fill="#9AA9B1"
                    >
                      {hourAxis
                        ? `${formatHours(max * r)}시간`
                        : format(max * r, max < 10 ? 1 : 0)}
                    </SvgText>
                  </G>
                ))}
                {selectedValues.length > 0 && (
                  <Line
                    x1={x(dates.indexOf(selected))}
                    x2={x(dates.indexOf(selected))}
                    y1={top}
                    y2={bottom}
                    stroke="#BECFD4"
                    strokeDasharray="3 4"
                  />
                )}
                {series.map((a, si) =>
                  kind === 'line' ? (
                    <AnimatedGroup key={a.key} opacity={progress}>
                      {lineSegments(a.points, dates).map(segment => (
                        <Line
                          key={segment.to.date}
                          testID={
                            segment.gap ? 'health-gap-segment' : undefined
                          }
                          x1={x(dates.indexOf(segment.from.date))}
                          y1={y(segment.from.value)}
                          x2={x(dates.indexOf(segment.to.date))}
                          y2={y(segment.to.value)}
                          stroke={colorOf(a, si)}
                          strokeWidth={2.2}
                          strokeLinecap="round"
                          strokeDasharray={segment.gap ? '4 5' : undefined}
                          opacity={segment.gap ? 0.55 : 1}
                        />
                      ))}
                      {a.points.map(p => (
                        <G key={p.date}>
                          {selected === p.date && (
                            <Circle
                              cx={x(dates.indexOf(p.date))}
                              cy={y(p.value)}
                              r={9}
                              fill={colorOf(a, si)}
                              fillOpacity={0.13}
                            />
                          )}
                          <Circle
                            testID="health-chart-point"
                            cx={x(dates.indexOf(p.date))}
                            cy={y(p.value)}
                            r={3.5}
                            fill="white"
                            stroke={colorOf(a, si)}
                            strokeWidth={2}
                            onPress={() => choose(p.date)}
                          />
                        </G>
                      ))}
                    </AnimatedGroup>
                  ) : (
                    a.points
                      .filter(
                        p =>
                          kind !== 'stack' ||
                          series.every(v =>
                            v.points.some(q => q.date === p.date),
                          ),
                      )
                      .map(p => {
                        const base =
                          kind === 'stack'
                            ? series
                                .slice(0, si)
                                .reduce(
                                  (n, v) =>
                                    n +
                                    (v.points.find(q => q.date === p.date)
                                      ?.value ?? 0),
                                  0,
                                )
                            : 0;
                        const height = Math.max(0, y(base) - y(base + p.value));
                        return (
                          <AnimatedRect
                            testID="health-chart-bar"
                            key={a.key + p.date}
                            x={x(dates.indexOf(p.date)) - barWidth / 2}
                            y={progress.interpolate({
                              inputRange: [0, 1],
                              outputRange: [bottom, y(base + p.value)],
                            })}
                            width={barWidth}
                            height={progress.interpolate({
                              inputRange: [0, 1],
                              outputRange: [0, height],
                            })}
                            fill={colorOf(a, si)}
                            rx={kind === 'stack' ? 2 : 5}
                            onPress={() => choose(p.date)}
                          />
                        );
                      })
                  ),
                )}
                {dates.map((d, i) => (
                  <G key={d}>
                    {(dates.length < 9 ||
                      i % Math.ceil(dates.length / 5) === 0 ||
                      i === dates.length - 1) && (
                      <SvgText
                        x={x(i)}
                        y={217}
                        textAnchor="middle"
                        fontSize={9}
                        fill="#91A2AB"
                      >
                        {d.slice(5).replace('-', '/')}
                      </SvgText>
                    )}
                  </G>
                ))}
              </Svg>
              {/* 작성자: 김진우 — 작은 점에도 충분한 터치 영역과 키보드 접근을 제공한다. */}
              <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
                {dates
                  .filter(d =>
                    series.some(a => a.points.some(p => p.date === d)),
                  )
                  .map(d => (
                    <Pressable
                      key={d}
                      testID="health-chart-hit"
                      accessibilityRole="button"
                      accessibilityLabel={`${title} ${d} 수치 보기`}
                      accessibilityHint="빈 날짜 사이 점선은 측정값 사이의 간격을 나타냅니다."
                      onPress={() => choose(d)}
                      style={{
                        position: 'absolute',
                        left: x(dates.indexOf(d)) - slot / 2,
                        top: top,
                        width: slot,
                        height: bottom - top,
                      }}
                    />
                  ))}
              </View>
              {selectedValues.length > 0 && (
                <View
                  testID="health-chart-tooltip"
                  accessibilityLiveRegion="polite"
                  style={[
                    s.tooltip,
                    {
                      left: Math.max(
                        0,
                        Math.min(
                          chartWidth - 190,
                          x(dates.indexOf(selected)) - 95,
                        ),
                      ),
                      top: 2,
                    },
                  ]}
                >
                  <View style={hs.between}>
                    <Text style={s.tooltipDate}>
                      {selected.replace(/-/g, '.')}
                    </Text>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="수치 말풍선 닫기"
                      onPress={() => setSelected('')}
                      hitSlop={8}
                    >
                      <Text style={s.close}>×</Text>
                    </Pressable>
                  </View>
                  {selectedValues.map(v => (
                    <View key={v.series.key} style={s.tooltipRow}>
                      <View style={[s.dot, { backgroundColor: v.color }]} />
                      <Text style={s.tooltipLabel}>{v.series.label}</Text>
                      <Text style={s.tooltipValue}>
                        {v.series.unit === '시간'
                          ? formatHours(v.point?.value)
                          : format(v.point?.value)}{' '}
                        <Text style={s.tooltipUnit}>{v.series.unit}</Text>
                      </Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          </ScrollView>
        </View>
      )}
      <View style={s.footer}>
        <Pressable
          accessibilityRole="button"
          onPress={() => setTable(v => !v)}
          hitSlop={8}
        >
          <Text style={s.tableToggle}>
            {table ? '수치표 접기' : '수치표 보기'}
          </Text>
        </Pressable>
        <View style={s.zoom}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="그래프 축소"
            disabled={zoom <= 1}
            onPress={() => setZoom(z => Math.max(1, z - 0.5))}
            style={s.zoomButton}
          >
            <Text style={[s.zoomText, zoom <= 1 && s.disabled]}>−</Text>
          </Pressable>
          <View style={s.divider} />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="그래프 확대"
            disabled={zoom >= 4}
            onPress={() => setZoom(z => Math.min(4, z + 0.5))}
            style={s.zoomButton}
          >
            <Text style={[s.zoomText, zoom >= 4 && s.disabled]}>＋</Text>
          </Pressable>
        </View>
      </View>
      {table && (
        <View style={s.table}>
          {!!note && <Text style={hs.muted}>{note}</Text>}
          {dates.map(d => (
            <View key={d} style={s.tableRow}>
              <Text style={s.tableDate}>{d}</Text>
              {(tableSeries ?? series).map(a => {
                const p = a.points.find(v => v.date === d);
                return (
                  <Text key={a.key} style={hs.muted}>
                    {a.label}:{' '}
                    {a.unit === '시간'
                      ? formatHours(p?.value)
                      : format(p?.value)}{' '}
                    {a.unit}
                    {p
                      ? ` · 기록 ${p.recordedDays}일 / 구간 ${p.spanDays}일`
                      : ''}
                  </Text>
                );
              })}
            </View>
          ))}
        </View>
      )}
    </Animated.View>
  );
}
const s = StyleSheet.create({
  card: {
    padding: 19,
    gap: 14,
    borderColor: '#DFEDF2',
    borderTopColor: '#FFFFFF',
    borderRadius: 26,
    boxShadow:
      '0px 8px 20px rgba(47, 123, 158, 0.12), 0px 2px 3px rgba(47, 123, 158, 0.04)',
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.4,
    color: '#294C4A',
  },
  unit: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: '#E7F7F5',
    borderWidth: 1,
    borderColor: '#D7EFEA',
  },
  unitText: { fontSize: 10, color: '#8A9C9F', fontWeight: '600' },
  legend: { flexDirection: 'row', gap: 12, flexWrap: 'wrap' },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  legendText: { fontSize: 10, color: '#7A9193' },
  empty: {
    fontSize: 12,
    color: '#98ABAB',
    textAlign: 'center',
    paddingVertical: 64,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#F2F5F5',
    paddingTop: 10,
  },
  tableToggle: { fontSize: 11, fontWeight: '600', color: '#8A9E9D' },
  chevron: { fontSize: 15 },
  zoom: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 11,
    backgroundColor: '#F0FAF8',
    borderWidth: 1,
    borderColor: '#DBEDE8',
    boxShadow: '0px 2px 5px rgba(40, 129, 130, 0.09)',
  },
  zoomButton: {
    width: 34,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  zoomText: { fontSize: 17, color: '#668B87' },
  disabled: { color: '#C8D5D3' },
  divider: { height: 12, width: 1, backgroundColor: '#E5ECEB' },
  tooltip: {
    position: 'absolute',
    width: 190,
    padding: 12,
    gap: 8,
    borderRadius: 16,
    backgroundColor: '#254C4B',
    boxShadow: '0 5px 16px rgba(21,57,55,0.16)',
    zIndex: 3,
  },
  tooltipDate: { fontSize: 10, fontWeight: '600', color: '#BFD8D3' },
  close: { fontSize: 18, color: '#D8EBE7' },
  tooltipRow: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  tooltipLabel: { fontSize: 10, color: '#DCEBE8' },
  tooltipValue: {
    fontSize: 13,
    fontWeight: '700',
    color: 'white',
    marginLeft: 'auto',
  },
  tooltipUnit: { fontSize: 9, fontWeight: '400', color: '#BFD8D3' },
  table: { gap: 6 },
  tableRow: {
    gap: 3,
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F4F3',
  },
  tableDate: { fontSize: 11, fontWeight: '600', color: '#5B7E77' },
});
