import React from 'react';
import LinearGradient from 'react-native-linear-gradient';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { HomeSettings } from '../home/homeModel';
import { medicationApi } from './medicationApi';
import { koreaTime } from './medicationForm';
import { useMedicationToday } from './useMedicationToday';
import { HomeCardHeading } from '../home/HomeCardDesign';

export function HomeMedicationCard({
  active,
  config,
  onOpen,
}: {
  active: boolean;
  config: HomeSettings;
  onOpen: () => void;
}) {
  const date = useMedicationToday();
  const query = useQuery({
    queryKey: ['medication-intakes', date],
    queryFn: ({ signal }) => medicationApi.intakes(date, signal),
    enabled: active,
    retry: false,
    refetchInterval: 60000,
  });
  const items = query.data ?? [];
  const pending = items.filter(item =>
    ['pending', 'missed'].includes(item.status),
  );
  const visible = config.medicationMode === 'all' ? items : pending.slice(0, 1);
  return (
    <LinearGradient
      colors={['#FFFFFF', '#FAF3FF']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={s.card}
    >
      <View style={s.row}>
        <HomeCardHeading
          icon="medication"
          title="오늘의 복약"
          detail="하루의 복용 기록"
          color="#9660E6"
          tint="#F0E5FF"
        />
        {config.medicationProgress && !query.isPending && !query.isError && (
          <Text style={s.link}>
            {items.filter(item => item.status === 'taken').length} /{' '}
            {items.length} 완료
          </Text>
        )}
      </View>
      {query.isPending ? (
        <ActivityIndicator />
      ) : query.isError ? (
        <Pressable accessibilityRole="button" onPress={() => query.refetch()}>
          <Text style={s.error}>일정을 불러오지 못했어요. 다시 시도</Text>
        </Pressable>
      ) : visible.length ? (
        visible.map(item => (
          <View key={item.intakeId} style={s.intake}>
            <View style={s.flex}>
              <Text style={s.link}>{koreaTime(item.scheduledAt)}</Text>
              {config.medicationName && (
                <>
                  <Text style={s.body}>{item.displayName}</Text>
                  <Text style={s.muted}>{item.dosageText}</Text>
                </>
              )}
              <Text style={s.muted}>
                {
                  {
                    pending: '복용 예정',
                    missed: '미복용',
                    taken: '복용 완료',
                    skipped: '건너뜀',
                  }[item.status]
                }
              </Text>
            </View>
            {config.medicationButton && (
              <Pressable
                accessibilityRole="button"
                onPress={onOpen}
                style={s.done}
              >
                <Text style={s.link}>일정 확인</Text>
              </Pressable>
            )}
          </View>
        ))
      ) : (
        <Text style={s.muted}>
          {items.length
            ? '오늘 남은 복약이 없어요'
            : '오늘 예정된 복약이 없어요'}
        </Text>
      )}
      <Pressable
        accessibilityRole="button"
        onPress={onOpen}
        style={s.smallButton}
      >
        <Text style={s.link}>복약 일정 보기 ›</Text>
      </Pressable>
    </LinearGradient>
  );
}

// 작성자: 김진우 — 홈 복약 카드의 표현은 마이페이지 복약 디자인과 같은 라벤더 계열을 사용한다.
const s = StyleSheet.create({
  card: {
    padding: 20,
    gap: 16,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: '#EADFFA',
    boxShadow: '0px 7px 18px rgba(145, 101, 197, 0.11)',
    backgroundColor: '#FFFFFF',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    flexWrap: 'wrap',
  },
  intake: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 17,
    backgroundColor: '#F7F0FF',
  },
  flex: { flex: 1, minWidth: 0, gap: 5 },
  link: { color: '#8653CC', fontSize: 12, fontWeight: '700' },
  body: { color: '#50445D', fontSize: 14, fontWeight: '700', lineHeight: 21 },
  muted: { color: '#8A7D94', fontSize: 12, lineHeight: 19 },
  done: {
    padding: 11,
    borderRadius: 12,
    backgroundColor: '#EBDDFF',
    minHeight: 44,
    justifyContent: 'center',
  },
  smallButton: {
    borderTopWidth: 1,
    borderTopColor: '#EEE8F4',
    paddingTop: 14,
    minHeight: 44,
    justifyContent: 'center',
  },
  error: { color: '#A75060', fontSize: 12, lineHeight: 19 },
});
