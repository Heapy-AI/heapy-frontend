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
  return (
    <View
      style={[
        s.card,
        compact && s.compact,
        { backgroundColor: palette.background },
      ]}
    >
      <View style={[s.heading, compact && s.compactHeading]}>
        <View style={[s.icon, { backgroundColor: palette.tint }]}>
          <Svg width={19} height={19} viewBox="0 0 24 24" accessible={false}>
            <Path
              d="M9 3h6M10 3v6l-5 8a2 2 0 0 0 1.7 3h10.6a2 2 0 0 0 1.7-3l-5-8V3M8 14h8"
              fill="none"
              stroke={palette.ink}
              strokeWidth={1.7}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </Svg>
        </View>
        <Text style={[s.name, compact && { flex: 0 }, { color: palette.ink }]}>
          {result.itemName}
        </Text>
      </View>
      <View style={s.result}>
        <Text style={[s.value, compact && s.compactValue]}>{result.value}</Text>
        {!!result.unit && <Text style={s.unit}>{result.unit}</Text>}
      </View>
      <CheckupStatusBadge status={result.status} />
    </View>
  );
}

const s = StyleSheet.create({
  card: {
    borderRadius: 22,
    padding: 18,
    gap: 14,
    borderWidth: 1,
    borderColor: '#FFFFFF',
    minWidth: 0,
  },
  compact: { flexGrow: 1, flexBasis: '44%', padding: 13 },
  heading: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  compactHeading: { flexDirection: 'column', alignItems: 'flex-start' },
  icon: {
    width: 32,
    height: 32,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: { flex: 1, fontSize: 13, lineHeight: 19, fontWeight: '700' },
  result: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'baseline',
    gap: 5,
  },
  value: {
    color: '#263E49',
    fontSize: 29,
    lineHeight: 36,
    fontWeight: '800',
    flexShrink: 1,
  },
  compactValue: { fontSize: 25, lineHeight: 32 },
  unit: { color: '#72858F', fontSize: 12 },
  badge: {
    alignSelf: 'flex-start',
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
});
