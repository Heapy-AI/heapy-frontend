// 작성자: 김진우 — 복약 요약과 일정 카드의 상태별 시각 표현을 통일한다.
import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Svg, { Circle, Path } from 'react-native-svg';
import { useQuery } from '@tanstack/react-query';
import { Intake, Medication, medicationApi } from './medicationApi';
import { koreaTime } from './medicationForm';
import { useMedicationToday } from './useMedicationToday';

const states = {
  pending: {
    label: '복용 예정',
    color: '#6550A6',
    background: '#F0EBFA',
    mark: '◷',
  },
  taken: {
    label: '복용 완료',
    color: '#287B66',
    background: '#E7F5EF',
    mark: '✓',
  },
  skipped: {
    label: '건너뜀',
    color: '#6D7585',
    background: '#F0F2F5',
    mark: '−',
  },
  missed: {
    label: '미복용',
    color: '#A15E32',
    background: '#FFF1E5',
    mark: '!',
  },
};

function PillMark() {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" accessible={false}>
      <Path
        d="M9 4a6 6 0 0 1 8.5 8.5l-5 5A6 6 0 0 1 4 9l5-5Z"
        fill="none"
        stroke="#7660B5"
        strokeWidth={1.6}
      />
      <Path d="m7 6 8.5 8.5" stroke="#7660B5" strokeWidth={1.6} />
    </Svg>
  );
}

export function TodayMedicationCard({
  active,
  onOpen,
}: {
  active?: boolean;
  onOpen: () => void;
}) {
  const date = useMedicationToday();
  const query = useQuery({
    queryKey: ['medication-intakes', date],
    queryFn: ({ signal }) => medicationApi.intakes(date, signal),
    enabled: active !== false,
    retry: false,
    refetchInterval: 60000,
  });
  const items = query.data ?? [];
  const taken = items.filter(item => item.status === 'taken').length;
  const remaining = items
    .filter(item => item.status === 'pending' || item.status === 'missed')
    .sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt));
  const next = remaining[0];
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="오늘의 복약 일정"
      onPress={onOpen}
      style={({ pressed }) => [styles.summaryShell, pressed && styles.pressed]}
    >
      <LinearGradient
        colors={['#F3EEFF', '#FAF8FF', '#FFFFFF']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.summary}
      >
        <View style={styles.header}>
          <View style={styles.symbol}>
            <PillMark />
          </View>
          <View style={styles.flex}>
            <Text style={styles.summaryTitle}>오늘의 복약 일정</Text>
            <Text style={styles.caption}>매일의 복용 기록을 차근차근</Text>
          </View>
          <Text style={styles.arrow}>›</Text>
        </View>
        {query.isPending ? (
          <View style={styles.empty}>
            <ActivityIndicator color="#7660B5" />
            <Text style={styles.caption}>일정을 불러오는 중이에요</Text>
          </View>
        ) : query.isError ? (
          <Text style={styles.error}>
            일정을 불러오지 못했어요. 눌러서 다시 확인해 주세요.
          </Text>
        ) : items.length ? (
          <>
            <View style={styles.progressRow}>
              <View style={styles.flex}>
                <Text style={styles.caption}>오늘의 복용 기록</Text>
                <Text style={styles.progressTitle}>
                  {taken}
                  <Text style={styles.progressUnit}>
                    {' '}
                    / {items.length}회 완료
                  </Text>
                </Text>
                <Text style={styles.caption}>
                  {remaining.length
                    ? `확인할 일정이 ${remaining.length}회 있어요`
                    : '오늘 남은 복약이 없어요'}
                </Text>
              </View>
              <View
                accessibilityRole="progressbar"
                accessibilityLabel="오늘 복약 완료율"
                accessibilityValue={{
                  min: 0,
                  max: items.length,
                  now: taken,
                  text: `${items.length}회 중 ${taken}회 완료`,
                }}
                style={styles.ring}
              >
                <Svg
                  width={76}
                  height={76}
                  viewBox="0 0 76 76"
                  accessible={false}
                >
                  <Circle
                    cx={38}
                    cy={38}
                    r={31}
                    stroke="#E7E0F4"
                    strokeWidth={6}
                    fill="none"
                  />
                  <Circle
                    cx={38}
                    cy={38}
                    r={31}
                    stroke="#8A72C5"
                    strokeWidth={6}
                    fill="none"
                    strokeDasharray={`${2 * Math.PI * 31}`}
                    strokeDashoffset={
                      2 * Math.PI * 31 * (1 - taken / items.length)
                    }
                    transform="rotate(-90 38 38)"
                  />
                </Svg>
                <Text style={styles.ringText}>
                  {Math.round((taken / items.length) * 100)}%
                </Text>
              </View>
            </View>
            {next && (
              <View style={styles.next}>
                <View style={styles.nextTime}>
                  <Text style={styles.nextLabel}>확인할 복약</Text>
                  <Text style={styles.nextClock}>
                    {koreaTime(next.scheduledAt)}
                  </Text>
                </View>
                <View style={styles.flex}>
                  <Text numberOfLines={1} style={styles.nextName}>
                    {next.displayName}
                  </Text>
                  <Text numberOfLines={1} style={styles.caption}>
                    {next.dosageText}
                  </Text>
                </View>
              </View>
            )}
          </>
        ) : (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>오늘 예정된 복약이 없어요</Text>
            <Text style={styles.caption}>
              약을 등록하면 이곳에서 일정을 확인할 수 있어요.
            </Text>
          </View>
        )}
        <View style={styles.summaryFooter}>
          <Text style={styles.footerText}>복약 일정 확인하기</Text>
          <Text style={styles.footerArrow}>↗</Text>
        </View>
      </LinearGradient>
    </Pressable>
  );
}

// 작성자: 김진우 — 등록한 약의 복용법·반복 시각·기간을 구획별로 표시한다.
export function RegisteredMedicationCard({
  medication,
  onOpen,
}: {
  medication: Medication;
  onOpen: () => void;
}) {
  const status =
    medication.status === 'active'
      ? { label: '복용 중', color: '#287B66', background: '#E7F5EF' }
      : {
          label: medication.status === 'completed' ? '기간 종료' : '복용 종료',
          color: '#766D82',
          background: '#F0EDF4',
        };
  const schedules = [...medication.schedules].sort((a, b) =>
    a.scheduledTime.localeCompare(b.scheduledTime),
  );
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${medication.displayName} 상세`}
      onPress={onOpen}
      style={({ pressed }) => [
        styles.registeredCard,
        pressed && styles.pressed,
      ]}
    >
      <View style={styles.header}>
        <View style={[styles.status, { backgroundColor: status.background }]}>
          <View style={[styles.statusDot, { backgroundColor: status.color }]} />
          <Text style={[styles.statusText, { color: status.color }]}>
            {status.label}
          </Text>
        </View>
        <Text style={styles.registeredHint}>나의 복용 기록</Text>
      </View>
      <View style={styles.registeredHeading}>
        <View style={styles.registeredIcon}>
          <PillMark />
        </View>
        <Text style={styles.registeredName}>{medication.displayName}</Text>
      </View>
      <View style={styles.detailBlock}>
        <Text style={styles.fieldLabel}>1회 복용량 · 복용법</Text>
        <Text numberOfLines={3} style={styles.dosageValue}>
          {medication.dosageText}
        </Text>
      </View>
      {!!medication.instructions && (
        <View style={styles.memo}>
          <Text style={styles.memoLabel}>메모</Text>
          <Text numberOfLines={2} style={styles.memoText}>
            {medication.instructions}
          </Text>
        </View>
      )}
      <View style={styles.schedulePanel}>
        <View style={styles.header}>
          <Text style={styles.scheduleLabel}>매일 복용 시간</Text>
          <Text style={styles.frequency}>
            {schedules.length ? `하루 ${schedules.length}회` : '일정 없음'}
          </Text>
        </View>
        <View style={styles.timeChips}>
          {schedules.map(schedule => {
            const [hour, minute] = schedule.scheduledTime.split(':');
            return (
              <View key={schedule.scheduleId} style={styles.timeChip}>
                <Text style={styles.chipPeriod}>
                  {Number(hour) < 12 ? '오전' : '오후'}
                </Text>
                <Text style={styles.chipClock}>
                  {Number(hour) % 12 || 12}:{minute}
                </Text>
              </View>
            );
          })}
        </View>
      </View>
      <View style={styles.periodRow}>
        <View style={styles.periodColumn}>
          <Text style={styles.fieldLabel}>시작일</Text>
          <Text style={styles.dateValue}>
            {medication.startDate.replace(/-/g, '.')}
          </Text>
        </View>
        <View style={styles.periodDivider} />
        <View style={styles.periodColumn}>
          <Text style={styles.fieldLabel}>종료일</Text>
          <Text style={styles.dateValue}>
            {medication.endDate?.replace(/-/g, '.') ?? '종료일 없음'}
          </Text>
        </View>
      </View>
      <View style={styles.summaryFooter}>
        <Text style={styles.footerText}>상세 정보 보기</Text>
        <Text style={styles.footerArrow}>↗</Text>
      </View>
    </Pressable>
  );
}

export function MedicationIntakeCard({
  item,
  actionable,
  onComplete,
  onSkip,
}: {
  item: Intake;
  actionable: boolean;
  onComplete: () => void;
  onSkip: () => void;
}) {
  const state = states[item.status];
  const time = koreaTime(item.scheduledAt);
  const [hour, minute] = time.split(':');
  return (
    <View style={styles.intake}>
      <View style={[styles.rail, { backgroundColor: state.color }]} />
      <View style={styles.intakeBody}>
        <View style={styles.header}>
          <View style={styles.clockRow}>
            <Text style={styles.period}>
              {Number(hour) < 12 ? '오전' : '오후'}
            </Text>
            <Text style={styles.clock}>
              {Number(hour) % 12 || 12}:{minute}
            </Text>
          </View>
          <View style={[styles.status, { backgroundColor: state.background }]}>
            <Text style={[styles.statusMark, { color: state.color }]}>
              {state.mark}
            </Text>
            <Text style={[styles.statusText, { color: state.color }]}>
              {state.label}
            </Text>
          </View>
        </View>
        <View style={styles.medicineRow}>
          <View style={styles.medicineIcon}>
            <PillMark />
          </View>
          <View style={styles.flex}>
            <Text style={styles.medicineName}>{item.displayName}</Text>
            <Text style={styles.dosage}>{item.dosageText}</Text>
          </View>
        </View>
        {actionable && (
          <View style={styles.actions}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`${item.displayName} ${time} 건너뛰기`}
              onPress={onSkip}
              style={({ pressed }) => [styles.skip, pressed && styles.pressed]}
            >
              <Text style={styles.skipText}>건너뛰기</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`${item.displayName} ${time} 복용 완료`}
              onPress={onComplete}
              style={({ pressed }) => [
                styles.complete,
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.completeText}>✓</Text>
              <Text style={styles.completeText}>복용 완료</Text>
            </Pressable>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  registeredCard: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    gap: 17,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: '#E7E0EF',
  },
  registeredHint: { color: '#9A8DA6', fontSize: 11 },
  registeredHeading: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
  },
  registeredIcon: {
    width: 44,
    height: 44,
    borderRadius: 15,
    backgroundColor: '#F2ECFA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  registeredName: {
    flex: 1,
    color: '#40314F',
    fontSize: 20,
    lineHeight: 28,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  detailBlock: { gap: 6 },
  fieldLabel: { color: '#8A7D96', fontSize: 11, fontWeight: '600' },
  dosageValue: {
    color: '#564B63',
    fontSize: 14,
    lineHeight: 22,
    fontWeight: '600',
  },
  memo: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  memoLabel: { color: '#9A8AA9', fontSize: 11, lineHeight: 20 },
  memoText: { flex: 1, color: '#82728F', fontSize: 12, lineHeight: 20 },
  schedulePanel: {
    backgroundColor: '#F7F3FC',
    borderRadius: 17,
    padding: 14,
    gap: 12,
  },
  scheduleLabel: { color: '#75618F', fontSize: 11, fontWeight: '600' },
  frequency: { color: '#71569C', fontSize: 11, fontWeight: '800' },
  timeChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  timeChip: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 5,
    paddingHorizontal: 11,
    paddingVertical: 9,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E9E0F5',
    borderRadius: 11,
  },
  chipPeriod: { color: '#9481AB', fontSize: 10, fontWeight: '600' },
  chipClock: {
    color: '#644A88',
    fontSize: 15,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  periodRow: { flexDirection: 'row', alignItems: 'stretch', gap: 15 },
  periodColumn: { flex: 1, gap: 6 },
  periodDivider: { width: 1, backgroundColor: '#EDE7F2' },
  dateValue: { color: '#61536F', fontSize: 13, fontWeight: '600' },
  statusDot: { width: 5, height: 5, borderRadius: 3 },
  flex: { flex: 1, minWidth: 0 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    justifyContent: 'space-between',
    flexWrap: 'wrap',
  },
  summaryShell: {
    marginTop: 18,
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E4DDF1',
  },
  summary: { padding: 20, gap: 18 },
  symbol: {
    width: 42,
    height: 42,
    borderRadius: 15,
    backgroundColor: '#FFFFFFB3',
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryTitle: {
    color: '#392F50',
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  caption: { color: '#7A7388', fontSize: 12, lineHeight: 19 },
  arrow: { color: '#9484AC', fontSize: 25 },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  progressTitle: {
    color: '#59418D',
    fontSize: 34,
    fontWeight: '800',
    marginVertical: 3,
  },
  progressUnit: { color: '#7C718F', fontSize: 14, fontWeight: '600' },
  ring: {
    width: 76,
    height: 76,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ringText: {
    position: 'absolute',
    fontSize: 16,
    fontWeight: '800',
    color: '#7257AD',
  },
  next: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 14,
    borderRadius: 16,
    backgroundColor: '#FFFFFFBF',
    borderWidth: 1,
    borderColor: '#ECE6F6',
  },
  nextTime: {
    gap: 4,
    borderRightWidth: 1,
    borderRightColor: '#EAE3F3',
    paddingRight: 14,
  },
  nextLabel: { fontSize: 10, color: '#8E7BA8', fontWeight: '600' },
  nextClock: {
    fontSize: 19,
    color: '#635087',
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  nextName: {
    color: '#433A52',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 3,
  },
  summaryFooter: {
    borderTopWidth: 1,
    borderTopColor: '#E9E2F3',
    paddingTop: 13,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  footerText: { color: '#71599E', fontSize: 12, fontWeight: '700' },
  footerArrow: { color: '#71599E', fontSize: 19 },
  empty: { paddingVertical: 12, gap: 8 },
  emptyTitle: { color: '#574867', fontSize: 15, fontWeight: '700' },
  error: { color: '#A34E59', fontSize: 13, lineHeight: 21 },
  intake: {
    borderRadius: 23,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E7E1ED',
    overflow: 'hidden',
    flexDirection: 'row',
  },
  rail: { width: 4 },
  intakeBody: { flex: 1, padding: 18, gap: 18 },
  clockRow: { flexDirection: 'row', alignItems: 'baseline', gap: 7 },
  period: { color: '#8B7C9E', fontSize: 12, fontWeight: '600' },
  clock: {
    color: '#4D3C66',
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: -0.6,
    fontVariant: ['tabular-nums'],
  },
  status: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 6,
    paddingHorizontal: 9,
    borderRadius: 20,
  },
  statusText: { fontSize: 11, fontWeight: '700' },
  statusMark: { fontSize: 13, fontWeight: '700' },
  medicineRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  medicineIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: '#F6F2FA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  medicineName: {
    color: '#3D344B',
    fontSize: 17,
    fontWeight: '700',
    lineHeight: 24,
  },
  dosage: { color: '#82768E', fontSize: 13, lineHeight: 21, marginTop: 4 },
  actions: {
    borderTopWidth: 1,
    borderTopColor: '#F0EBF4',
    paddingTop: 14,
    flexDirection: 'row',
    gap: 10,
  },
  skip: {
    flex: 1,
    minHeight: 46,
    padding: 10,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: '#E8E1EE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  complete: {
    flexDirection: 'row',
    gap: 6,
    flex: 1.35,
    minHeight: 46,
    padding: 10,
    borderRadius: 13,
    backgroundColor: '#7A62AF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  skipText: { color: '#85788E', fontSize: 13, fontWeight: '600' },
  completeText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },
  pressed: { opacity: 0.75 },
});
