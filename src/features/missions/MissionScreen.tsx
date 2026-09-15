// 작성자: 김진우 — 팀원 DEV의 목록·상세·피드백·달력을 실제 앱 데이터와 연결한다.
import React, { useEffect, useState } from 'react';
import { formatDurationText } from '../../shared/utils/duration';
import {
  AppState,
  Platform,
  BackHandler,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
import LinearGradient from 'react-native-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMedicationToday } from '../medication/useMedicationToday';
import { HealthIcon } from '../health/HealthIcon';
import { missionIcons } from './missionIcons';
import {
  missionApi,
  missionKeys,
  useMissions,
  weekDays,
  shiftMonth,
  statusText,
  unitText,
  Difficulty,
} from './missionApi';
import { ms } from './missionStyles';
import { MissionOptionsButton } from './MissionOptionsForm';
import { HealthEntry } from '../health/HealthEntry';
import { EntryKind } from '../health/types';
import { apiClient } from '../../shared/api/client';
import { MissionRecommendationCard } from './MissionRecommendationCard';

export function MissionScreen({
  active,
  onExit,
  onNestedChange,
  initialMissionId,
  onCheckup,
}: {
  active: boolean;
  onExit: () => void;
  onNestedChange: (nested: boolean) => void;
  initialMissionId?: string;
  onCheckup?: () => void;
}) {
  const today = useMedicationToday(),
    client = useQueryClient(),
    insets = useSafeAreaInsets();
  const [selectedDate, setSelectedDate] = useState(today);
  const [recommendScope, setRecommendScope] = useState('ACTIVITY');
  const [recordKind, setRecordKind] = useState<EntryKind | null>(null);
  const [abandonConfirm, setAbandonConfirm] = useState(false);
  const [month, setMonth] = useState(today.slice(0, 7));
  const [page, setPage] = useState<'list' | 'detail' | 'calendar'>(
    initialMissionId ? 'detail' : 'list',
  );
  const [missionId, setMissionId] = useState(initialMissionId ?? '');
  const [sheet, setSheet] = useState(false),
    [difficulty, setDifficulty] = useState<Difficulty | null>(null);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  const day = useMissions(active && page === 'list', selectedDate);
  const detail = useQuery({
    queryKey: [...missionKeys, 'detail', missionId],
    queryFn: ({ signal }) => missionApi.detail(missionId, signal),
    enabled: active && page === 'detail' && !!missionId,
    retry: false,
    staleTime: 0,
  });
  const week = weekDays(selectedDate);
  const months =
    page === 'calendar'
      ? [month]
      : Array.from(
          new Set(week.filter(d => d <= today).map(d => d.slice(0, 7))),
        );
  const calendars = useQueries({
    queries: months.map(m => ({
      queryKey: [...missionKeys, 'calendar', m],
      queryFn: ({ signal }: { signal: AbortSignal }) =>
        missionApi.calendar(m, signal),
      enabled: active && page !== 'detail',
      retry: false,
      staleTime: 15000,
    })),
  });
  const calendarDays = calendars.flatMap(q => q.data?.days ?? []);
  const mission = detail.data;
  const back = () => {
    if (sheet) {
      setSheet(false);
      return;
    }
    if (page !== 'list') {
      setPage('list');
      setError('');
      return;
    }
    onExit();
  };
  useEffect(() => {
    onNestedChange(page !== 'list');
    return () => onNestedChange(false);
  }, [page, onNestedChange]);
  useEffect(() => {
    if (!active || Platform.OS !== 'android') return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      back();
      return true;
    });
    return () => sub.remove();
  });
  useEffect(() => {
    setSelectedDate(today);
    setMonth(today.slice(0, 7));
  }, [today]);
  useEffect(() => {
    const sub = AppState.addEventListener('change', state => {
      if (state === 'active' && active)
        void client.invalidateQueries({ queryKey: missionKeys });
    });
    return () => sub.remove();
  }, [active, client]);
  const refresh = () => client.invalidateQueries({ queryKey: missionKeys });
  const invalidate = () =>
    Promise.all([refresh(), client.invalidateQueries({ queryKey: ['home'] })]);
  const open = (id: string) => {
    setMissionId(id);
    setPage('detail');
    setError('');
  };
  const finish = async () => {
    if (!mission || busy) return;
    setBusy(true);
    setError('');
    try {
      const saved = await missionApi.complete(
        mission.missionId,
        !!mission.manualAllowed && mission.status !== 'COMPLETABLE',
      );
      client.setQueryData([...missionKeys, 'detail', mission.missionId], saved);
      setDifficulty(saved.feedback ?? null);
      setSheet(saved.status === 'COMPLETED');
      await invalidate();
    } catch (e) {
      setError(e instanceof Error ? e.message : '완료하지 못했어요.');
      await refresh();
    } finally {
      setBusy(false);
    }
  };
  const saveFeedback = async () => {
    if (!mission || busy) return;
    setBusy(true);
    setError('');
    try {
      if (difficulty) await missionApi.feedback(mission.missionId, difficulty);
      await invalidate();
      setSheet(false);
      setPage('list');
    } catch (e) {
      setError(e instanceof Error ? e.message : '피드백을 저장하지 못했어요.');
    } finally {
      setBusy(false);
    }
  };
  const selected = calendarDays.find(d => d.date === selectedDate);
  const currentCalendar = calendars[0]?.data;
  const pending =
    page === 'detail'
      ? detail.isFetching
      : day.isFetching || calendars.some(q => q.isFetching);
  const calendarError = calendars.some(q => q.isError);
  return (
    <View style={ms.root}>
      <ScrollView
        contentContainerStyle={ms.content}
        refreshControl={
          <RefreshControl
            refreshing={pending && !busy}
            onRefresh={refresh}
            tintColor="#20B894"
          />
        }
      >
        <View style={ms.header}>
          {page !== 'list' ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="미션 뒤로"
              onPress={back}
              style={ms.iconButton}
            >
              <HealthIcon xml={missionIcons.back} width={40} height={40} />
            </Pressable>
          ) : (
            <View style={{ width: 44 }} />
          )}
          <Text accessibilityRole="header" style={ms.heading}>
            {page === 'list'
              ? '미션 현황'
              : page === 'calendar'
              ? '미션 캘린더'
              : '미션 상세'}
          </Text>
          <View style={{ width: 44 }} />
        </View>
        {page === 'list' && (
          <>
            <View style={ms.card}>
              <View style={ms.between}>
                <Text style={ms.text}>
                  {Number(selectedDate.slice(5, 7))}월{' '}
                  {Number(selectedDate.slice(8))}일 ·{' '}
                  {
                    ['일', '월', '화', '수', '목', '금', '토'][
                      new Date(selectedDate + 'T00:00:00Z').getUTCDay()
                    ]
                  }
                </Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="미션 달력 열기"
                  onPress={() => {
                    setMonth(selectedDate.slice(0, 7));
                    setPage('calendar');
                  }}
                  style={ms.iconButton}
                >
                  <HealthIcon
                    xml={missionIcons.calendar}
                    width={32}
                    height={32}
                  />
                </Pressable>
              </View>
              <View style={ms.week}>
                {week.map((date, i) => {
                  const d = calendarDays.find(v => v.date === date);
                  return (
                    <Pressable
                      key={date}
                      disabled={date > today}
                      accessibilityRole="button"
                      accessibilityLabel={`${date} 미션`}
                      onPress={() => setSelectedDate(date)}
                      style={[ms.day, date > today && ms.faded]}
                    >
                      <Text style={ms.tiny}>
                        {['월', '화', '수', '목', '금', '토', '일'][i]}
                      </Text>
                      <View
                        style={[ms.date, date === selectedDate && ms.selected]}
                      >
                        <Text
                          style={[ms.text, date === selectedDate && ms.white]}
                        >
                          {Number(date.slice(8))}
                        </Text>
                      </View>
                      {date <= today && (
                        <>
                          <View style={ms.weekProgress}>
                            <View
                              style={[
                                ms.fill,
                                { width: `${d?.completionRate ?? 0}%` },
                              ]}
                            />
                          </View>
                          <Text style={ms.tiny}>
                            {d?.completionRate == null
                              ? '—'
                              : `${d.completionRate}%`}
                          </Text>
                        </>
                      )}
                    </Pressable>
                  );
                })}
              </View>
              {day.data && !day.isError && (
                <View style={ms.soft}>
                  <View style={ms.between}>
                    <Text style={ms.muted}>
                      {selectedDate === today ? '오늘' : '선택한 날'} 미션{' '}
                      {day.data?.totalCount ?? 0}개 중{' '}
                      {day.data?.completedCount ?? 0}개 완료
                    </Text>
                    <Text style={ms.green}>
                      {day.data?.completionRate ?? 0}%
                    </Text>
                  </View>
                  <View style={ms.track}>
                    <View
                      style={[
                        ms.fill,
                        { width: `${day.data?.completionRate ?? 0}%` },
                      ]}
                    />
                  </View>
                </View>
              )}
              {calendarError && (
                <Pressable onPress={refresh}>
                  <Text style={ms.error}>
                    주간 기록을 불러오지 못했어요. 다시 시도
                  </Text>
                </Pressable>
              )}
            </View>
            <View style={ms.between}>
              <Text style={ms.title}>
                {selectedDate === today ? '오늘의 미션' : '이날의 미션'}
              </Text>
              <Text style={ms.green}>
                {day.data?.completedCount ?? 0} / {day.data?.totalCount ?? 0}{' '}
                완료
              </Text>
            </View>
            {selectedDate === today && (
              <>
                <MissionOptionsButton />
                <View style={ms.between}>
                  {(
                    [
                      ['ACTIVITY', '활동'],
                      ['SLEEP', '수면'],
                      ['NUTRITION', '수분'],
                      ['BIO', '생체'],
                      ['CHECKUP', '검진'],
                    ] as const
                  ).map(([scope, label]) => (
                    <Pressable
                      accessibilityRole="button"
                      key={scope}
                      onPress={() => setRecommendScope(scope)}
                      style={ms.smallButton}
                    >
                      <Text
                        style={scope === recommendScope ? ms.green : ms.muted}
                      >
                        {label}
                      </Text>
                    </Pressable>
                  ))}
                </View>
                <MissionRecommendationCard
                  key={recommendScope}
                  scope={recommendScope}
                  active={active}
                  onOpen={id => id && open(id)}
                />
              </>
            )}
            {day.isError ? (
              <Pressable
                accessibilityRole="button"
                onPress={() => day.refetch()}
                style={ms.card}
              >
                <Text style={ms.error}>
                  미션을 불러오지 못했어요. 다시 시도
                </Text>
              </Pressable>
            ) : day.isPending ? (
              <Text style={ms.muted}>미션을 불러오고 있어요.</Text>
            ) : !day.data?.missions.length ? (
              <View style={ms.card}>
                <Text style={ms.muted}>이날 등록된 미션이 없어요.</Text>
              </View>
            ) : (
              day.data.missions.map(m => (
                <Pressable
                  accessibilityRole="button"
                  key={m.missionId}
                  onPress={() => open(m.missionId)}
                  style={ms.mission}
                >
                  <View style={ms.status}>
                    <Text style={ms.statusMark}>
                      {m.status === 'COMPLETED'
                        ? '✓'
                        : m.status === 'IN_PROGRESS'
                        ? '→'
                        : '·'}
                    </Text>
                  </View>
                  <View style={ms.flex}>
                    <Text style={ms.text}>{formatDurationText(m.title)}</Text>
                    <Text style={ms.muted}>
                      {unitText(m, m.currentValue)} /{' '}
                      {unitText(m, m.targetValue)}
                    </Text>
                  </View>
                  <Text style={ms.green}>
                    {m.status === 'EXPIRED'
                      ? '기간 종료'
                      : m.status === 'READY'
                      ? '진행 전'
                      : `${m.progressPercent}%`}
                  </Text>
                </Pressable>
              ))
            )}
          </>
        )}
        {page === 'detail' &&
          (detail.isError ? (
            <Pressable onPress={() => detail.refetch()} style={ms.card}>
              <Text style={ms.error}>
                미션 상세를 불러오지 못했어요. 다시 시도
              </Text>
            </Pressable>
          ) : !mission ? (
            <Text style={ms.muted}>미션을 불러오고 있어요.</Text>
          ) : (
            <>
              <LinearGradient
                colors={['#2AB292', '#2E77D4']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={ms.hero}
              >
                <Text style={[ms.muted, ms.white]}>오늘의 행동 미션</Text>
                <Text style={ms.heroTitle}>
                  {formatDurationText(mission.title)}
                </Text>
                <Text style={[ms.muted, ms.white]}>
                  {formatDurationText(mission.description)}
                </Text>
                <Text style={ms.heroPercent}>{mission.progressPercent}%</Text>
                <View style={ms.heroTrack}>
                  <View
                    style={[
                      ms.heroFill,
                      { width: `${mission.progressPercent}%` },
                    ]}
                  />
                </View>
                <Text style={[ms.muted, ms.white]}>
                  {unitText(mission, mission.currentValue)} /{' '}
                  {unitText(mission, mission.targetValue)}
                </Text>
              </LinearGradient>
              <View style={ms.card}>
                <Text style={ms.text}>미션 정보</Text>
                {[
                  ['날짜', mission.missionDate],
                  ['목표', unitText(mission, mission.targetValue)],
                  ['현재', unitText(mission, mission.currentValue)],
                  ['상태', statusText[mission.status]],
                ].map(([label, value]) => (
                  <View style={ms.between} key={label}>
                    <Text style={ms.muted}>{label}</Text>
                    <Text style={ms.text}>{value}</Text>
                  </View>
                ))}
              </View>
              <View style={ms.soft}>
                <Text style={ms.green}>HEAPY 메모</Text>
                <Text style={ms.muted}>
                  {mission.status === 'COMPLETABLE'
                    ? '오늘 목표를 달성했어요! 완료 버튼을 눌러 기록해 주세요.'
                    : mission.status === 'COMPLETED'
                    ? '작은 행동이 건강한 흐름을 만들어요.'
                    : mission.status === 'EXPIRED'
                    ? '지난 미션 기록이에요. 오늘의 미션에서 다시 시작해 보세요.'
                    : '건강 기록을 동기화하면 진행률이 반영돼요. 무리하지 않는 범위에서 실천해 보세요.'}
                </Text>
              </View>
              {!!error && (
                <Text accessibilityRole="alert" style={ms.error}>
                  {error}
                </Text>
              )}
              {!!mission.endsAt && (
                <Text style={ms.muted}>
                  기한:{' '}
                  {new Date(mission.endsAt).toLocaleString('ko-KR', {
                    timeZone: 'Asia/Seoul',
                  })}
                </Text>
              )}
              {!!mission.parameters?.recordAction &&
                mission.status !== 'COMPLETED' &&
                mission.status !== 'EXPIRED' && (
                  <Pressable
                    accessibilityRole="button"
                    style={ms.smallButton}
                    onPress={() => {
                      const action = mission.parameters?.recordAction;
                      if (action === 'checkup') onCheckup?.();
                      else if (
                        action === 'sleep' ||
                        action === 'blood_pressure' ||
                        action === 'body_composition' ||
                        action === 'water'
                      )
                        setRecordKind(action);
                    }}
                  >
                    <Text style={ms.green}>기록하러 가기</Text>
                  </Pressable>
                )}
              {mission.status !== 'COMPLETED' &&
                mission.status !== 'EXPIRED' && (
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => setAbandonConfirm(true)}
                  >
                    <Text style={ms.muted}>미션 그만하기</Text>
                  </Pressable>
                )}
              {mission.status === 'COMPLETED' ? (
                <Pressable
                  onPress={() => {
                    setDifficulty(mission.feedback ?? null);
                    setSheet(true);
                  }}
                  style={[ms.button, ms.soft]}
                >
                  <Text style={ms.green}>완료한 미션 피드백</Text>
                </Pressable>
              ) : (
                <Pressable
                  accessibilityRole="button"
                  disabled={
                    busy ||
                    (mission.status !== 'COMPLETABLE' &&
                      !mission.manualAllowed) ||
                    mission.status === 'EXPIRED'
                  }
                  onPress={finish}
                >
                  <LinearGradient
                    colors={
                      mission.status === 'COMPLETABLE' ||
                      (mission.manualAllowed && mission.status !== 'EXPIRED')
                        ? ['#19B68E', '#458BFC']
                        : ['#D6DEDB', '#D6DEDB']
                    }
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={ms.button}
                  >
                    <Text style={ms.buttonText}>
                      {busy
                        ? '저장 중…'
                        : mission.status === 'COMPLETABLE'
                        ? '미션 완료'
                        : mission.manualAllowed && mission.status !== 'EXPIRED'
                        ? '직접 수행했어요'
                        : statusText[mission.status]}
                    </Text>
                  </LinearGradient>
                </Pressable>
              )}
            </>
          ))}
        {page === 'calendar' && (
          <>
            <View style={ms.between}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="이전 달"
                disabled={month <= '2000-01'}
                onPress={() => setMonth(shiftMonth(month, -1))}
                style={ms.iconButton}
              >
                <Text style={ms.title}>‹</Text>
              </Pressable>
              <Text style={ms.title}>
                {Number(month.slice(0, 4))}년 {Number(month.slice(5))}월
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="다음 달"
                disabled={month >= today.slice(0, 7)}
                onPress={() => setMonth(shiftMonth(month, 1))}
                style={[ms.iconButton, month >= today.slice(0, 7) && ms.faded]}
              >
                <Text style={ms.title}>›</Text>
              </Pressable>
            </View>
            {calendarError ? (
              <Pressable onPress={refresh}>
                <Text style={ms.error}>
                  달력을 불러오지 못했어요. 다시 시도
                </Text>
              </Pressable>
            ) : (
              <View style={ms.card}>
                <View style={ms.calendar}>
                  {['월', '화', '수', '목', '금', '토', '일'].map(w => (
                    <View style={[ms.cell, { minHeight: 26 }]} key={w}>
                      <Text style={ms.tiny}>{w}</Text>
                    </View>
                  ))}
                  {Array.from(
                    {
                      length:
                        (new Date(month + '-01T00:00:00Z').getUTCDay() + 6) % 7,
                    },
                    (_, i) => (
                      <View key={`empty-${i}`} style={ms.cell} />
                    ),
                  )}
                  {currentCalendar?.days.map(d => (
                    <Pressable
                      key={d.date}
                      disabled={d.date > today}
                      accessibilityRole="button"
                      accessibilityLabel={`${d.date} ${
                        d.completionRate ?? '기록 없음'
                      }`}
                      onPress={() => setSelectedDate(d.date)}
                      style={[
                        ms.cell,
                        d.date === selectedDate && ms.selectedCell,
                        d.date > today && ms.faded,
                      ]}
                    >
                      <Text style={ms.text}>{Number(d.date.slice(8))}</Text>
                      {d.completionRate !== null && (
                        <Text style={ms.rate}>{d.completionRate}%</Text>
                      )}
                    </Pressable>
                  ))}
                </View>
              </View>
            )}
            {currentCalendar && !calendarError && (
              <View style={ms.soft}>
                <View style={ms.between}>
                  <Text style={ms.text}>{Number(month.slice(5))}월 기록</Text>
                  <Text style={ms.title}>
                    {currentCalendar?.completionRate ?? 0}%
                  </Text>
                </View>
                <Text style={ms.muted}>
                  미션 {currentCalendar?.totalCount ?? 0}개 중{' '}
                  {currentCalendar?.completedCount ?? 0}개 완료
                </Text>
                <View style={ms.track}>
                  <View
                    style={[
                      ms.fill,
                      { width: `${currentCalendar?.completionRate ?? 0}%` },
                    ]}
                  />
                </View>
              </View>
            )}
            {currentCalendar &&
              !calendarError &&
              selectedDate.startsWith(month) && (
                <Pressable
                  accessibilityRole="button"
                  onPress={() => setPage('list')}
                  style={ms.card}
                >
                  <Text style={ms.text}>{selectedDate} 미션 보기 ›</Text>
                  <Text style={ms.muted}>
                    {selected?.totalCount
                      ? `${selected.completedCount} / ${selected.totalCount} 완료`
                      : '등록된 기록이 없어요.'}
                  </Text>
                </Pressable>
              )}
          </>
        )}
      </ScrollView>
      <Modal
        visible={recordKind !== null}
        animationType="slide"
        onRequestClose={() => setRecordKind(null)}
      >
        {recordKind && (
          <HealthEntry
            kind={recordKind}
            onBack={() => {
              setRecordKind(null);
              invalidate();
            }}
          />
        )}
      </Modal>
      <Modal
        visible={abandonConfirm}
        transparent
        animationType="fade"
        onRequestClose={() => setAbandonConfirm(false)}
      >
        <View style={ms.card}>
          <Text style={ms.text}>이 미션을 그만할까요?</Text>
          <Pressable
            accessibilityRole="button"
            disabled={busy}
            onPress={async () => {
              if (!mission) return;
              setBusy(true);
              try {
                await apiClient.post(
                  `/api/missions/${mission.missionId}/abandon`,
                );
                setAbandonConfirm(false);
                await invalidate();
              } catch {
                setError('미션 중단을 저장하지 못했어요.');
              } finally {
                setBusy(false);
              }
            }}
          >
            <Text style={ms.error}>그만하기</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={() => setAbandonConfirm(false)}
          >
            <Text style={ms.green}>계속하기</Text>
          </Pressable>
        </View>
      </Modal>
      <Modal
        visible={sheet}
        transparent
        animationType="slide"
        onRequestClose={() => {
          if (!busy) setSheet(false);
        }}
      >
        <View style={ms.overlay}>
          <ScrollView
            contentContainerStyle={[
              ms.sheet,
              { paddingBottom: Math.max(24, insets.bottom) },
            ]}
            style={{ flexGrow: 0 }}
          >
            <View style={ms.handle} />
            <View style={ms.center}>
              <HealthIcon
                xml={missionIcons.completed}
                width={100}
                height={100}
              />
              <Text style={ms.title}>미션을 완료했어요</Text>
              <Text style={ms.muted}>작은 행동이 건강한 흐름을 만들어요</Text>
            </View>
            <Text style={ms.text}>오늘 미션은 어땠나요?</Text>
            <View style={ms.row}>
              {(['EASY', 'JUST_RIGHT', 'HARD'] as const).map((v, i) => (
                <Pressable
                  key={v}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: difficulty === v }}
                  disabled={busy}
                  onPress={() => setDifficulty(v)}
                  style={[ms.feedback, difficulty === v && ms.chosen]}
                >
                  <Text style={ms.muted}>
                    {['쉬웠어요', '적당했어요', '어려웠어요'][i]}
                  </Text>
                </Pressable>
              ))}
            </View>
            {!!error && <Text style={ms.error}>{error}</Text>}
            <Pressable
              accessibilityRole="button"
              disabled={busy}
              onPress={saveFeedback}
            >
              <LinearGradient
                colors={['#19B68E', '#458BFC']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={ms.button}
              >
                <Text style={ms.buttonText}>
                  {busy ? '저장 중…' : '목록으로 돌아가기'}
                </Text>
              </LinearGradient>
            </Pressable>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}
