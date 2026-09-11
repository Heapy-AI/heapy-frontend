import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { RootStackParamList } from '../../navigation/routes';
import { PrimaryButton } from '../../shared/components/PrimaryButton';
import { ConfirmModal } from '../../shared/components/ConfirmModal';
import { createIdempotencyKey } from '../../shared/utils/idempotency';
import { ConnectionLayout } from '../dataConnection/ConnectionLayout';
import { medicationApi, Intake } from './medicationApi';
import { koreaDate, koreaTime, shiftDate } from './medicationForm';
import { colors } from '../../shared/theme/tokens';

export function MedicationScreen({
  navigation,
  route,
}: NativeStackScreenProps<RootStackParamList, 'MedicationManagement'>) {
  const [focused, setFocused] = useState(true);
  useEffect(() => {
    const focus = navigation.addListener('focus', () => setFocused(true));
    const blur = navigation.addListener('blur', () => setFocused(false));
    return () => {
      focus();
      blur();
    };
  }, [navigation]);
  const client = useQueryClient();
  const [tab, setTab] = useState<'medications' | 'schedule'>(
    route.params?.tab ?? 'medications',
  );
  const [history, setHistory] = useState(false);
  const [date, setDate] = useState(koreaDate());
  const [pendingAction, setPendingAction] = useState<{
    item: Intake;
    action: 'complete' | 'skip';
    key: string;
  }>();
  const acting = useRef(false);
  const medications = useQuery({
    queryKey: ['medications', history],
    queryFn: ({ signal }) =>
      medicationApi.list(history ? 'all' : 'active', signal),
    enabled: focused,
    retry: false,
  });
  const intakes = useQuery({
    queryKey: ['medication-intakes', date],
    queryFn: ({ signal }) => medicationApi.intakes(date, signal),
    enabled: focused,
    refetchInterval: 60000,
    retry: false,
  });
  const action = useMutation({
    mutationFn: (value: NonNullable<typeof pendingAction>) =>
      medicationApi.act(value.item.intakeId, value.action, value.key),
    onSuccess: async () => {
      setPendingAction(undefined);
      await client.invalidateQueries({ queryKey: ['medication-intakes'] });
      await client.invalidateQueries({ queryKey: ['home'] });
    },
    onSettled: () => {
      acting.current = false;
    },
  });
  const error = tab === 'schedule' ? intakes.error : medications.error;
  return (
    <ConnectionLayout
      title="복약 정보 관리"
      onBack={() => navigation.goBack()}
      footer={
        tab === 'medications' ? (
          <PrimaryButton
            label="약 등록하기"
            onPress={() => navigation.navigate('MedicationRegistration')}
          />
        ) : undefined
      }
    >
      <View style={s.hero}>
        <View style={s.iconTile}>
          <Image
            source={require('../../assets/my/medication.png')}
            style={s.icon}
          />
        </View>
        <View style={s.flex}>
          <Text style={s.title}>매일, 잊지 않고</Text>
          <Text style={s.muted}>나의 약과 복용 일정을 한곳에</Text>
        </View>
      </View>
      <View style={s.tabs}>
        {(['medications', 'schedule'] as const).map(value => (
          <Pressable
            key={value}
            accessibilityRole="tab"
            accessibilityState={{ selected: tab === value }}
            onPress={() => setTab(value)}
            style={[s.tab, tab === value && s.selected]}
          >
            <Text style={s.tabText}>
              {value === 'medications' ? '나의 약' : '복약 일정'}
            </Text>
          </Pressable>
        ))}
      </View>
      {!!error && (
        <Pressable
          accessibilityRole="button"
          onPress={() =>
            tab === 'schedule' ? intakes.refetch() : medications.refetch()
          }
        >
          <Text style={s.error}>{error.message} · 다시 시도</Text>
        </Pressable>
      )}
      {tab === 'medications' ? (
        <>
          <View style={s.row}>
            <Text style={s.section}>
              등록한 약 {medications.data?.length ?? 0}
            </Text>
            <Pressable
              accessibilityRole="checkbox"
              accessibilityState={{ checked: history }}
              onPress={() => setHistory(!history)}
              style={s.smallButton}
            >
              <Text style={s.link}>
                {history ? '✓ 종료한 약 포함' : '종료한 약 보기'}
              </Text>
            </Pressable>
          </View>
          {medications.isPending ? (
            <ActivityIndicator />
          ) : medications.data?.length === 0 ? (
            <View style={s.empty}>
              <Text style={s.section}>등록한 약이 없어요</Text>
              <Text style={s.muted}>
                약봉투를 촬영하거나 직접 입력해 보세요.
              </Text>
            </View>
          ) : (
            medications.data?.map(med => (
              <Pressable
                key={med.medicationId}
                accessibilityRole="button"
                accessibilityLabel={`${med.displayName} 상세`}
                onPress={() =>
                  navigation.navigate('MedicationRegistration', {
                    medicationId: med.medicationId,
                  })
                }
                style={s.card}
              >
                <View style={s.row}>
                  <Text style={s.section}>{med.displayName}</Text>
                  <Text style={s.badge}>
                    {med.status === 'active'
                      ? '복용 중'
                      : med.status === 'completed'
                      ? '기간 종료'
                      : '복용 종료'}
                  </Text>
                </View>
                <Text style={s.body}>{med.dosageText}</Text>
                {!!med.instructions && (
                  <Text style={s.muted}>{med.instructions}</Text>
                )}
                <View style={s.chips}>
                  {med.schedules.map(time => (
                    <Text key={time.scheduleId} style={s.time}>
                      {time.scheduledTime.slice(0, 5)}
                    </Text>
                  ))}
                </View>
                <Text style={s.muted}>
                  {med.startDate} ~ {med.endDate ?? '종료일 없음'}
                </Text>
              </Pressable>
            ))
          )}
        </>
      ) : (
        <>
          <View style={s.row}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="이전 날짜"
              onPress={() => setDate(shiftDate(date, -1))}
              style={s.smallButton}
            >
              <Text style={s.section}>‹</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="오늘로 이동"
              onPress={() => setDate(koreaDate())}
            >
              <Text style={s.section}>
                {date === koreaDate() ? '오늘 · ' : ''}
                {date.slice(5).replace('-', '월 ')}일
              </Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="다음 날짜"
              disabled={date >= shiftDate(koreaDate(), 6)}
              onPress={() => setDate(shiftDate(date, 1))}
              style={s.smallButton}
            >
              <Text style={s.section}>›</Text>
            </Pressable>
          </View>
          {intakes.isPending ? (
            <ActivityIndicator />
          ) : intakes.data?.length === 0 ? (
            <View style={s.empty}>
              <Text style={s.section}>예정된 복약이 없어요</Text>
              <Text style={s.muted}>
                등록한 약의 복용 기간과 시각을 확인해 주세요.
              </Text>
            </View>
          ) : (
            intakes.data?.map(item => (
              <View key={item.intakeId} style={s.card}>
                <View style={s.row}>
                  <Text style={s.clock}>{koreaTime(item.scheduledAt)}</Text>
                  <Text style={s.badge}>
                    {
                      {
                        pending: '복용 예정',
                        taken: '복용 완료',
                        skipped: '건너뜀',
                        missed: '미복용',
                      }[item.status]
                    }
                  </Text>
                </View>
                <Text style={s.section}>{item.displayName}</Text>
                <Text style={s.muted}>{item.dosageText}</Text>
                {['pending', 'missed'].includes(item.status) &&
                  date <= koreaDate() && (
                    <View style={s.row}>
                      <Pressable
                        accessibilityRole="button"
                        onPress={() => {
                          action.reset();
                          setPendingAction({
                            item,
                            action: 'skip',
                            key: createIdempotencyKey(),
                          });
                        }}
                        style={s.smallButton}
                      >
                        <Text style={s.muted}>건너뛰기</Text>
                      </Pressable>
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={`${item.displayName} ${koreaTime(
                          item.scheduledAt,
                        )} 복용 완료`}
                        onPress={() => {
                          action.reset();
                          setPendingAction({
                            item,
                            action: 'complete',
                            key: createIdempotencyKey(),
                          });
                        }}
                        style={s.done}
                      >
                        <Text style={s.link}>복용 완료</Text>
                      </Pressable>
                    </View>
                  )}
              </View>
            ))
          )}
        </>
      )}
      {pendingAction && (
        <ConfirmModal
          visible={!!pendingAction}
          title={
            pendingAction?.action === 'complete'
              ? '복용하셨나요?'
              : '이번 복용을 건너뛸까요?'
          }
          description={`${pendingAction?.item.displayName ?? ''} · ${
            pendingAction ? koreaTime(pendingAction.item.scheduledAt) : ''
          }`}
          confirmLabel={
            pendingAction?.action === 'complete' ? '복용 완료' : '건너뛰기'
          }
          pending={action.isPending}
          error={action.error?.message}
          onCancel={() => {
            if (!acting.current) setPendingAction(undefined);
          }}
          onConfirm={() => {
            if (pendingAction && !acting.current) {
              acting.current = true;
              action.mutate(pendingAction);
            }
          }}
        />
      )}
    </ConnectionLayout>
  );
}
export const medicationStyles = StyleSheet.create({
  flex: { flex: 1 },
  hero: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingVertical: 12,
  },
  iconTile: {
    width: 64,
    height: 64,
    borderRadius: 23,
    backgroundColor: '#DDF5EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: { width: 36, height: 36 },
  title: {
    fontSize: 25,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 6,
  },
  section: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
    flexShrink: 1,
  },
  muted: { fontSize: 13, lineHeight: 21, color: colors.textMuted },
  body: { fontSize: 15, color: colors.text, lineHeight: 23 },
  tabs: {
    flexDirection: 'row',
    borderRadius: 18,
    backgroundColor: '#E8EFED',
    padding: 4,
  },
  tab: { flex: 1, padding: 14, alignItems: 'center', borderRadius: 14 },
  selected: { backgroundColor: '#fff' },
  tabText: { fontSize: 14, fontWeight: '700', color: colors.text },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  card: {
    padding: 20,
    borderRadius: 24,
    backgroundColor: '#fff',
    gap: 10,
    borderWidth: 1,
    borderColor: '#E8F0EC',
  },
  empty: {
    paddingVertical: 38,
    paddingHorizontal: 16,
    gap: 12,
    alignItems: 'center',
  },
  smallButton: { padding: 12, minHeight: 44, justifyContent: 'center' },
  link: { fontSize: 13, fontWeight: '700', color: colors.primaryDark },
  badge: {
    fontSize: 11,
    color: colors.primaryDark,
    backgroundColor: '#EDF7F3',
    padding: 7,
    borderRadius: 9,
    overflow: 'hidden',
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  time: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#F3F6FB',
    color: '#426995',
    borderRadius: 10,
    fontSize: 13,
    fontWeight: '600',
  },
  clock: { fontSize: 23, fontWeight: '800', color: colors.primaryDark },
  done: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    backgroundColor: '#E3F6ED',
    borderRadius: 14,
  },
  error: { fontSize: 13, lineHeight: 21, color: colors.danger },
});
const s = medicationStyles;
