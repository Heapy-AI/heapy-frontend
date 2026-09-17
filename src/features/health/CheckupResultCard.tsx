// 작성자: 김진우 — 기관 판정 원문은 유지하고 배지의 색과 기호로 상태를 구분한다.
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { CheckupDetail } from '../dataConnection/types';

export function checkupTone(status: string | null) {
  const label = (status ?? '').trim();
  if (['정상', '정상A', '정상(A)', '이상 없음', '이상없음'].includes(label))
    return {
      color: '#087B60',
      background: '#E1F5EC',
      border: '#B5E5D2',
      symbol: '✓',
    };
  if (['경계', '주의', '정상B', '정상(B)', '경계성'].includes(label))
    return {
      color: '#96600B',
      background: '#FFF1CF',
      border: '#F0D595',
      symbol: '!',
    };
  if (
    ['이상', '비정상', '질환의심', '질환 의심', '높음', '낮음'].includes(label)
  )
    return {
      color: '#B03E5A',
      background: '#FCE7EC',
      border: '#EFB8C6',
      symbol: '◆',
    };
  return {
    color: '#667383',
    background: '#EEF1F5',
    border: '#D8DFE7',
    symbol: '−',
  };
}

export function CheckupStatusBadge({ status }: { status: string | null }) {
  const tone = checkupTone(status);
  return (
    <View
      style={[
        s.badge,
        { backgroundColor: tone.background, borderColor: tone.border },
      ]}
    >
      <Text accessible={false} style={[s.symbol, { color: tone.color }]}>
        {tone.symbol}
      </Text>
      <Text style={[s.badgeText, { color: tone.color }]}>
        {status || '판정 미제공'}
      </Text>
    </View>
  );
}

const palettes = [
  { background: '#FFF2E8', ink: '#A7602F', tint: '#FFE2CB' },
  { background: '#EAF8F2', ink: '#247C68', tint: '#CEF0E1' },
  { background: '#F3EDFF', ink: '#7855A8', tint: '#E5D8FA' },
  { background: '#ECF3FF', ink: '#466FA9', tint: '#D6E6FE' },
];

function Icon({ color }: { color: string }) {
  return (
    <Svg width={17} height={17} viewBox="0 0 24 24" accessible={false}>
      <Path
        d="M9 3h6M10 3v6l-5 8a2 2 0 0 0 1.7 3h10.6a2 2 0 0 0 1.7-3l-5-8V3M8 14h8"
        fill="none"
        stroke={color}
        strokeWidth={1.7}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

// 김진우 수정: compact(2열 그리드) 와 전체 너비 리스트는 서로 다른 레이아웃을 쓴다.
// - compact: 폭이 좁아 아이콘+이름 → 큰 수치 → 배지 순으로 세로로 쌓는다(기존 디자인 유지).
// - 전체 너비: 이름 / 수치 / 판정을 고정 비율의 3컬럼으로 나눠, 리스트를 스크롤할 때
//   항목마다 이름 길이가 달라도 수치·배지 위치가 항상 같은 자리에 오도록 한다.
//   이름이 길면 그 컬럼 안에서만 줄바꿈되고 옆 컬럼은 밀리지 않는다.
export function CheckupResultCard({
  result,
  index,
  compact = false,
}: {
  result: CheckupDetail['results'][number];
  index: number;
  compact?: boolean;
}) {
  const palette = palettes[index % palettes.length]!;

  if (compact) {
    return (
      <View
        style={[s.card, s.compact, { backgroundColor: palette.background }]}
      >
        <View style={s.compactHeading}>
          <View style={[s.icon, s.compactIcon, { backgroundColor: palette.tint }]}>
            <Icon color={palette.ink} />
          </View>
          <Text style={[s.compactName, { color: palette.ink }]}>
            {result.itemName}
          </Text>
        </View>
        <View style={s.compactValueGroup}>
          <Text style={s.compactValue}>{result.value}</Text>
          {!!result.unit && <Text style={s.unit}>{result.unit}</Text>}
        </View>
        <CheckupStatusBadge status={result.status} />
      </View>
    );
  }

  return (
    <View style={[s.card, { backgroundColor: palette.background }]}>
      <View style={s.row}>
        <View style={s.nameCol}>
          <View style={[s.icon, { backgroundColor: palette.tint }]}>
            <Icon color={palette.ink} />
          </View>
          <Text style={[s.name, { color: palette.ink }]}>
            {result.itemName}
          </Text>
        </View>
        <View style={s.valueCol}>
          <Text style={s.value}>{result.value}</Text>
          {!!result.unit && <Text style={s.unit}>{result.unit}</Text>}
        </View>
        <View style={s.badgeCol}>
          <CheckupStatusBadge status={result.status} />
        </View>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  card: {
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    borderColor: '#FFFFFF',
    boxShadow: '0px 5px 12px rgba(67, 115, 143, 0.12)',
    minWidth: 0,
  },
  // 김진우 수정: 전체 너비 카드의 3컬럼 행. flex 비율을 고정해 항목마다
  // 이름 길이가 달라도 수치·배지 컬럼의 시작 위치가 흔들리지 않게 한다.
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: 8,
  },
  nameCol: {
    flex: 1.2,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  name: {
    flexShrink: 1,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '700',
  },
  valueCol: {
    flex: 0.85,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  badgeCol: {
    flex: 0.85,
    minWidth: 0,
    alignItems: 'flex-end',
  },
  icon: {
    width: 30,
    height: 30,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#FFFFFF',
    boxShadow: '0px 3px 6px rgba(67, 115, 143, 0.13)',
    flexShrink: 0,
  },
  value: {
    color: '#263E49',
    fontSize: 18,
    lineHeight: 23,
    fontWeight: '800',
  },
  unit: { color: '#72858F', fontSize: 11 },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: 1,
    maxWidth: '100%',
  },
  symbol: { fontWeight: '800', fontSize: 11 },
  badgeText: { fontSize: 11, fontWeight: '700', flexShrink: 1 },

  // 김진우 수정: compact(2열 그리드) 카드는 원래 디자인대로 세로로 쌓는다.
  compact: { flexGrow: 1, flexBasis: '44%', padding: 13, gap: 14 },
  compactHeading: { flexDirection: 'column', alignItems: 'flex-start', gap: 8 },
  compactIcon: { width: 32, height: 32, borderRadius: 11 },
  compactName: { fontSize: 13, lineHeight: 19, fontWeight: '700' },
  compactValueGroup: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'baseline',
    gap: 5,
  },
  compactValue: {
    color: '#263E49',
    fontSize: 25,
    lineHeight: 32,
    fontWeight: '800',
  },
});