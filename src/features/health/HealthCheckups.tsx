import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useQuery } from '@tanstack/react-query';
import { dataConnectionApi } from '../dataConnection/dataConnectionApi';
import { CheckupDetail } from '../dataConnection/types';
import { CheckupOpinionSections } from '../dataConnection/CheckupOpinionSections';
import { findingCards } from '../dataConnection/CheckupFindings';
import { hs } from './healthStyles';
import { format } from './healthModel';
import {
  CheckupResultCard,
  CheckupStatusBadge,
  checkupTone,
} from './CheckupResultCard';

// 작성자: 김진우 — 결과값 증감을 임의의 개선·악화로 판정하지 않고 기관 상태를 보존한다.
export function HealthCheckups({
  mode,
  onMode,
  onRegister,
  analysis,
}: {
  mode: 'overview' | 'compare' | 'all';
  onMode: (mode: 'overview' | 'compare' | 'all') => void;
  onRegister: () => void;
  analysis: React.ReactNode;
}) {
  const records = useQuery({
    queryKey: ['health', 'checkups'],
    queryFn: ({ signal }) => dataConnectionApi.getCheckups(signal),
    retry: false,
  });
  const [currentId, setCurrent] = useState(''),
    [previousId, setPrevious] = useState(''),
    [filter, setFilter] = useState('전체');
  const current = currentId || records.data?.[0]?.recordId,
    previous = previousId || records.data?.[1]?.recordId;
  const detail = useQuery({
    queryKey: ['health', 'checkup', current],
    queryFn: ({ signal }) => dataConnectionApi.getCheckup(current!, signal),
    enabled: !!current,
    retry: false,
  });
  const before = useQuery({
    queryKey: ['health', 'checkup', previous],
    queryFn: ({ signal }) => dataConnectionApi.getCheckup(previous!, signal),
    enabled: mode === 'compare' && !!previous,
    retry: false,
  });
  const all = detail.data?.results ?? [];
  const statuses = [...new Set(all.map(r => r.status || '판정 미제공'))];
  function selector(
    label: string,
    value: string | undefined,
    set: (value: string) => void,
  ) {
    return (
      <View style={hs.card}>
        <Text style={hs.muted}>{label}</Text>
        <View style={[hs.row, { flexWrap: 'wrap' }]}>
          {records.data?.map(r => (
            <Pressable
              key={r.recordId}
              accessibilityRole="radio"
              accessibilityState={{ checked: r.recordId === value }}
              onPress={() => {
                set(r.recordId);
                setFilter('전체');
              }}
              style={[hs.pill, r.recordId === value && hs.active]}
            >
              <Text style={[hs.pillText, r.recordId === value && hs.white]}>
                {r.measuredAt || '날짜 미제공'}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>
    );
  }
  if (records.isPending || (detail.isPending && !!current))
    return <Text style={hs.muted}>검진 기록을 불러오고 있어요.</Text>;
  if (records.isError || detail.isError)
    return (
      <View style={hs.card}>
        <Text style={hs.error}>검진 기록을 불러오지 못했어요.</Text>
        <Pressable
          onPress={() => {
            records.refetch();
            detail.refetch();
          }}
        >
          <Text style={hs.pillText}>다시 불러오기</Text>
        </Pressable>
      </View>
    );
  if (!records.data?.length)
    return (
      <View style={hs.card}>
        <Text style={hs.section}>아직 검진 기록이 없어요.</Text>
        <Pressable onPress={onRegister} style={hs.pill}>
          <Text style={hs.pillText}>검진 결과 등록하기</Text>
        </Pressable>
      </View>
    );
  return (
    <>
      {mode !== 'overview' &&
        selector(
          mode === 'compare' ? '현재 회차' : '검진 회차',
          current,
          setCurrent,
        )}
      {mode === 'compare' &&
        selector('비교할 이전 회차', previous, setPrevious)}
      {analysis}
      {mode === 'overview' && (
        <View style={hs.card}>
          <View style={hs.between}>
            <Text style={hs.section}>최근 검진 핵심 수치</Text>
            <Text style={hs.muted}>{detail.data?.measuredAt}</Text>
          </View>
          <Text style={hs.muted}>
            {detail.data?.providerName || '기관 미제공'}
          </Text>
          <View style={[hs.row, { flexWrap: 'wrap' }]}>
            {all.slice(0, 4).map((r, i) => (
              <CheckupResultCard
                key={`${r.itemCode}-${i}`}
                result={r}
                index={i}
                compact
              />
            ))}
          </View>
        </View>
      )}
      {mode !== 'compare' && (
        <>
          <View style={[hs.row, { flexWrap: 'wrap' }]}>
            {statuses.map(status => (
              <View
                key={status}
                style={[
                  hs.metric,
                  {
                    minWidth: 76,
                    padding: 10,
                    backgroundColor: checkupTone(status).background,
                    borderColor: checkupTone(status).border,
                  },
                ]}
              >
                <CheckupStatusBadge status={status} />
                <Text style={[hs.value, { color: checkupTone(status).color }]}>
                  {
                    all.filter(r => (r.status || '판정 미제공') === status)
                      .length
                  }
                  개
                </Text>
              </View>
            ))}
          </View>
          {mode === 'all' && (
            <>
              <View style={[hs.row, { flexWrap: 'wrap' }]}>
                {['전체', ...statuses].map(status => (
                  <Pressable
                    key={status}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: filter === status }}
                    onPress={() => setFilter(status)}
                    style={[
                      hs.pill,
                      {
                        borderWidth: 1,
                        borderColor: checkupTone(status).border,
                        backgroundColor:
                          filter === status
                            ? checkupTone(status).color
                            : checkupTone(status).background,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        hs.pillText,
                        { color: checkupTone(status).color },
                        filter === status && hs.white,
                      ]}
                    >
                      {status} ·{' '}
                      {status === '전체'
                        ? all.length
                        : all.filter(
                            r => (r.status || '판정 미제공') === status,
                          ).length}
                    </Text>
                  </Pressable>
                ))}
              </View>
              <View style={{ gap: 12 }}>
                <Text style={hs.section}>결과 전체 보기 · {all.length}개</Text>
                <Text style={hs.muted}>
                  검사기관에서 제공한 수치와 판정이에요.
                </Text>
                {all
                  .filter(
                    r =>
                      filter === '전체' ||
                      (r.status || '판정 미제공') === filter,
                  )
                  .map(r => (
                    <CheckupResultCard
                      key={`${r.itemCode}-${all.indexOf(r)}`}
                      result={r}
                      index={all.indexOf(r)}
                    />
                  ))}
              </View>
              <CheckupOpinionSections
                examinations={findingCards(detail.data?.findings ?? []).map(
                  r => ({ ...r, editable: false }),
                )}
                overall={findingCards(detail.data?.overallOpinions ?? []).map(
                  r => ({ ...r, editable: false }),
                )}
              />
            </>
          )}
          {mode === 'overview' && (
            <View style={hs.row}>
              <Pressable
                onPress={() => onMode('compare')}
                style={[hs.pill, hs.spacer]}
              >
                <Text style={hs.pillText}>과거 검진과 비교</Text>
              </Pressable>
              <Pressable
                onPress={() => onMode('all')}
                style={[hs.pill, hs.active, hs.spacer]}
              >
                <Text style={[hs.pillText, hs.white]}>결과 전체 보기</Text>
              </Pressable>
            </View>
          )}
        </>
      )}
      {mode === 'compare' &&
        (previous === current ? (
          <Text style={hs.error}>서로 다른 회차를 선택해 주세요.</Text>
        ) : !previous ? (
          <Text style={hs.muted}>
            비교하려면 검진 기록이 2회 이상 필요해요.
          </Text>
        ) : before.isPending ? (
          <Text style={hs.muted}>이전 회차를 불러오고 있어요.</Text>
        ) : before.isError ? (
          <Text style={hs.error}>이전 회차를 불러오지 못했어요.</Text>
        ) : (
          <Compare before={before.data} current={detail.data} />
        ))}
    </>
  );
}
function Compare({
  before,
  current,
}: {
  before?: CheckupDetail;
  current?: CheckupDetail;
}) {
  const codes = [
    ...new Set(
      [...(before?.results ?? []), ...(current?.results ?? [])].map(
        r => r.itemCode,
      ),
    ),
  ];
  return (
    <View style={cs.section}>
      <LinearGradient
        colors={['#F0EAFF', '#EAF4FB']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={cs.summary}
      >
        <Text style={cs.eyebrow}>검진 기록 비교</Text>
        <View style={hs.between}>
          <Text accessibilityRole="header" style={cs.title}>
            주요 항목 변화
          </Text>
          <View style={cs.count}>
            <Text style={cs.countText}>{codes.length}개 항목</Text>
          </View>
        </View>
        <Text style={cs.description}>
          두 회차의 수치와 기관 판정을 함께 살펴보세요.
        </Text>
      </LinearGradient>
      {codes.map((code, index) => {
        const a = before?.results.find(r => r.itemCode === code),
          b = current?.results.find(r => r.itemCode === code);
        const numeric = a?.numericValue != null && b?.numericValue != null;
        const same = a && b && !!a.unit && a.unit === b.unit;
        const change =
          same && numeric
            ? Number(b.numericValue) - Number(a.numericValue)
            : null;
        return (
          <View key={code} style={cs.card}>
            <View style={cs.heading}>
              <View style={cs.number}>
                <Text style={cs.numberText}>
                  {String(index + 1).padStart(2, '0')}
                </Text>
              </View>
              <Text style={cs.itemName}>{b?.itemName || a?.itemName}</Text>
            </View>
            <View style={cs.values}>
              <View style={cs.previous}>
                <Text style={cs.label}>이전 검진</Text>
                <Text style={cs.date}>
                  {before?.measuredAt || '날짜 미제공'}
                </Text>
                <Text style={cs.value}>{a?.value ?? '미기록'}</Text>
                {!!a?.unit && <Text style={cs.unit}>{a.unit}</Text>}
                <CheckupStatusBadge status={a?.status ?? null} />
              </View>
              <View style={cs.current}>
                <Text style={[cs.label, cs.purple]}>현재 검진</Text>
                <Text style={cs.date}>
                  {current?.measuredAt || '날짜 미제공'}
                </Text>
                <Text style={[cs.value, cs.purple]}>
                  {b?.value ?? '미기록'}
                </Text>
                {!!b?.unit && <Text style={cs.unit}>{b.unit}</Text>}
                <CheckupStatusBadge status={b?.status ?? null} />
              </View>
              <View accessible={false} style={cs.arrow}>
                <Text style={cs.arrowText}>→</Text>
              </View>
            </View>
            <View style={cs.change}>
              <Text style={cs.changeLabel}>수치 차이</Text>
              <Text style={cs.changeValue}>
                {change !== null
                  ? `${change > 0 ? '+' : ''}${format(change)} ${b?.unit}`
                  : a && b && !same
                  ? '단위가 달라 수치 비교 불가'
                  : '비교 수치 미제공'}
              </Text>
            </View>
            <Text style={cs.statusChange}>
              기관 판정 · {a?.status || '판정 미제공'} →{' '}
              {b?.status || '판정 미제공'}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

// 작성자: 김진우 — 증감은 중립색으로 표시하고 현재 회차의 시각적 강조와 분리한다.
const cs = StyleSheet.create({
  section: { gap: 14 },
  summary: { borderRadius: 24, padding: 20, gap: 10 },
  eyebrow: {
    fontSize: 11,
    color: '#80749A',
    fontWeight: '600',
    letterSpacing: 1,
  },
  title: { fontSize: 19, fontWeight: '800', color: '#40345D', flexShrink: 1 },
  count: {
    backgroundColor: '#FFFFFFB3',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  countText: { fontSize: 11, fontWeight: '700', color: '#756095' },
  description: { fontSize: 12, lineHeight: 19, color: '#827893' },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 16,
    gap: 14,
    borderWidth: 1,
    borderColor: '#EAE6F2',
    boxShadow: '0 5px 18px rgba(75,55,105,0.05)',
  },
  heading: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  number: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: '#F1EBFA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  numberText: { fontSize: 11, color: '#9177B4', fontWeight: '700' },
  itemName: {
    fontSize: 15,
    lineHeight: 21,
    fontWeight: '700',
    color: '#514268',
    flex: 1,
  },
  values: { flexDirection: 'row', gap: 12, position: 'relative' },
  previous: {
    flex: 1,
    minWidth: 0,
    backgroundColor: '#F5F7FA',
    borderRadius: 17,
    padding: 12,
    gap: 8,
  },
  current: {
    flex: 1,
    minWidth: 0,
    backgroundColor: '#F2EDFC',
    borderRadius: 17,
    padding: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: '#E4D8F6',
  },
  label: { fontSize: 11, fontWeight: '700', color: '#83909F' },
  date: { fontSize: 10, color: '#8A92A3' },
  value: {
    fontSize: 27,
    lineHeight: 34,
    fontWeight: '800',
    color: '#657185',
    marginTop: 4,
  },
  purple: { color: '#7653A5' },
  unit: { fontSize: 11, color: '#8A92A3' },
  arrow: {
    position: 'absolute',
    left: '50%',
    top: 71,
    marginLeft: -12,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrowText: { color: '#9F8AB9', fontSize: 15 },
  change: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#F7F8FB',
  },
  changeLabel: { fontSize: 11, color: '#8B93A2' },
  changeValue: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64728A',
    flexShrink: 1,
  },
  statusChange: {
    fontSize: 11,
    lineHeight: 17,
    color: '#9097A5',
    paddingHorizontal: 2,
  },
});
