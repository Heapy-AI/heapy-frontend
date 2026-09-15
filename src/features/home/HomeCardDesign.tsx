// 작성자: 김진우 — 홈 카드와 설정 화면에서 같은 지표 아이콘·색상·정보 위계를 사용한다.
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import LinearGradient from 'react-native-linear-gradient';
import { HomeData, formatValue } from './homeData';
import { MetricId, metrics } from './homeModel';

export const metricDesign = {
  sleep: {
    color: '#8057DC',
    tint: '#EEE4FF',
    label: '일 합계',
    path: 'M20 14A8 8 0 0 1 10 4a8 8 0 1 0 10 10Z',
  },
  steps: {
    color: '#158BC6',
    tint: '#DCF3FF',
    label: '일 합계',
    path: 'M8 12c3 1 4 4 2 6s-5 1-6-1-1-6 4-5Zm8-9c3-1 5 2 5 5s-3 4-5 2-3-6 0-7ZM6 8V5m-3 4L2 7m12 8v4m3-5 2 3',
  },
  exercise: {
    color: '#079F83',
    tint: '#D9FAEE',
    label: '일 합계',
    path: 'M9 2h6m-3 0v3m6 1 2-2M12 10v4l3 2M20 14a8 8 0 1 1-16 0 8 8 0 0 1 16 0Z',
  },
  count: {
    color: '#B87916',
    tint: '#FFF1C9',
    label: '최근 7일',
    path: 'M5 5h14v16H5ZM8 2v6m8-6v6M5 10h14m-11 5 3 3 5-5',
  },
  heart: {
    color: '#D34F87',
    tint: '#FFE2EF',
    label: '일평균',
    path: 'M20 12c6-8-5-13-8-6C9-1-2 4 4 12l8 9 8-9ZM3 12h5l2-3 3 7 2-4h6',
  },
  pressure: {
    color: '#596CE0',
    tint: '#E5E9FF',
    label: '최근 측정',
    path: 'M4 19a10 10 0 1 1 16 0M12 4v3M5 8l2 2m12-2-2 2M12 15l5-4m-7 6a2 2 0 1 1 4 0 2 2 0 0 1-4 0Z',
  },
} as const;
const otherPaths = {
  medication: 'M9 4a6 6 0 0 1 8.5 8.5l-5 5A6 6 0 0 1 4 9l5-5Zm-2 2 8.5 8.5',
  mission: 'M21 12a9 9 0 1 1-9-9m4 9a4 4 0 1 1-4-4m0 4 9-9m-5 0h5v5',
  weekly: 'M4 3v18h17M8 16v-5m5 5V7m5 9V4',
  checkup: 'M7 3h10v3h3v15H4V6h3Zm0 0v5h10V3M8 13h8m-8 4h5',
  briefing: 'm12 2 3 7 7 3-7 3-3 7-3-7-7-3 7-3Z',
  swap: 'M4 7h15m-4-4 4 4-4 4M20 17H5m4-4-4 4 4 4',
} as const;
export type HomeIconName = MetricId | keyof typeof otherPaths;
export function HomeIcon({
  name,
  color = '#557D78',
  size = 22,
}: {
  name: HomeIconName;
  color?: string;
  size?: number;
}) {
  const path =
    name in metricDesign
      ? metricDesign[name as MetricId].path
      : otherPaths[name as keyof typeof otherPaths];
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" accessible={false}>
      <Path
        d={path}
        stroke={color}
        strokeWidth={1.6}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </Svg>
  );
}
export function HomeCardHeading({
  icon,
  title,
  detail,
  color = '#557D78',
  tint = '#EEF6F3',
}: {
  icon: HomeIconName;
  title: string;
  detail?: string;
  color?: string;
  tint?: string;
}) {
  return (
    <View style={h.headingRow}>
      <View style={[h.iconTile, { backgroundColor: tint }]}>
        <HomeIcon name={icon} color={color} />
      </View>
      <View style={h.flex}>
        <Text style={h.title}>{title}</Text>
        {detail && <Text style={h.caption}>{detail}</Text>}
      </View>
    </View>
  );
}
export function MetricCards({
  ids,
  data,
}: {
  ids: MetricId[];
  data?: HomeData;
}) {
  return (
    <View style={h.grid}>
      {ids.map(id => {
        const design = metricDesign[id];
        const value = data?.cards?.metrics[id];
        return (
          <View
            key={id}
            testID={`home-metric-${id}`}
            style={[
              h.metric,
              {
                backgroundColor: design.tint,
                borderColor: `${design.color}22`,
              },
            ]}
          >
            <LinearGradient
              pointerEvents="none"
              colors={['#FFFFFF', design.tint, design.tint]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={h.metricSurface}
            />
            <View style={h.metricIcon}>
              <HomeIcon name={id} color={design.color} size={25} />
            </View>
            <Text style={h.metricLabel}>{metrics[id][0]}</Text>
            <Text style={[h.value, { color: design.color }]}>
              {formatValue(id, value?.value, value?.secondary)}
            </Text>
            <View style={h.metricFoot}>
              <Text style={h.metricDate}>
                {value?.date ?? '아직 기록이 없어요'}
              </Text>
              <Text style={h.metricPeriod}>
                {value?.date ? design.label : '동기화 또는 직접 기록'}
              </Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}
export function SettingChoice({
  title,
  description,
  icon,
  selected,
  onPress,
  disabled = false,
  fullWidth = false,
  color = '#547E74',
  tint = '#EDF5F1',
}: {
  title: string;
  description: string;
  icon: HomeIconName;
  selected: boolean;
  onPress: () => void;
  disabled?: boolean;
  fullWidth?: boolean;
  color?: string;
  tint?: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ selected, disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        h.choice,
        fullWidth && h.fullWidthChoice,
        selected && { borderColor: color, backgroundColor: tint },
        disabled && h.dim,
        pressed && h.pressed,
      ]}
    >
      <LinearGradient
        pointerEvents="none"
        colors={selected ? ['#FFFFFFDD', tint] : ['#FFFFFF', '#F9FDFF']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={h.choiceSurface}
      />
      <View style={h.choiceTop}>
        <View
          style={[
            h.iconTile,
            { backgroundColor: selected ? '#FFFFFFCC' : tint },
          ]}
        >
          <HomeIcon name={icon} color={color} />
        </View>
        <View
          style={[
            h.selection,
            selected && { backgroundColor: color, borderColor: color },
          ]}
        >
          {selected && <Text style={h.check}>✓</Text>}
        </View>
      </View>
      <Text style={h.choiceTitle}>{title}</Text>
      <Text style={h.caption}>{description}</Text>
    </Pressable>
  );
}
export const h = StyleSheet.create({
  flex: { flex: 1, minWidth: 0 },
  card: {
    borderRadius: 25,
    padding: 20,
    gap: 17,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2EBE7',
  },
  headingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    flexShrink: 1,
  },
  iconTile: {
    width: 39,
    height: 39,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FFFFFFE6',
    boxShadow: '0px 3px 6px rgba(69, 115, 150, 0.10)',
  },
  title: {
    color: '#244956',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  caption: { color: '#687F8D', fontSize: 11, lineHeight: 18 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  metric: {
    flex: 1,
    minWidth: 105,
    borderRadius: 23,
    borderWidth: 1,
    padding: 15,
    gap: 10,
    position: 'relative',
    boxShadow:
      '0px 8px 16px rgba(60, 125, 164, 0.13), 0px 2px 3px rgba(60, 125, 164, 0.04)',
  },
  metricSurface: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    borderRadius: 22,
  },
  choiceSurface: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    borderRadius: 20,
  },
  metricIcon: {
    width: 44,
    height: 44,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#FFFFFF',
    boxShadow: '0px 5px 9px rgba(87, 123, 166, 0.16)',
  },
  metricLabel: { fontSize: 12, fontWeight: '600', color: '#567080' },
  value: {
    fontSize: 23,
    fontWeight: '800',
    letterSpacing: -0.6,
    lineHeight: 30,
    fontVariant: ['tabular-nums'],
  },
  metricFoot: {
    gap: 3,
    borderTopWidth: 1,
    borderTopColor: '#FFFFFFB3',
    paddingTop: 10,
    marginTop: 2,
  },
  metricDate: { fontSize: 10, color: '#627B8B', lineHeight: 16 },
  metricPeriod: { fontSize: 10, color: '#627B8B', lineHeight: 16 },
  choice: {
    flexGrow: 1,
    flexBasis: '45%',
    padding: 16,
    gap: 9,
    borderRadius: 21,
    borderWidth: 1,
    borderColor: '#E0E9E5',
    backgroundColor: '#FFFFFF',
    boxShadow: '0px 5px 12px rgba(61, 125, 158, 0.08)',
  },
  choiceTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  fullWidthChoice: { flexBasis: 'auto', flexGrow: 0 },
  choiceTitle: { color: '#315264', fontSize: 14, fontWeight: '700' },
  selection: {
    width: 21,
    height: 21,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: '#D6E1DC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  check: { color: '#FFFFFF', fontSize: 12, fontWeight: '800' },
  dim: { opacity: 0.72 },
  pressed: { opacity: 0.9, transform: [{ scale: 0.98 }] },
});
