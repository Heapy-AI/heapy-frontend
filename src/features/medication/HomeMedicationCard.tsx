import React from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { HomeSettings } from '../home/homeModel';
import { medicationApi } from './medicationApi';
import { koreaTime } from './medicationForm';
import { useMedicationToday } from './useMedicationToday';
import { medicationStyles as s } from './MedicationScreen';

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
    <View style={s.card}>
      <View style={s.row}>
        <Text style={s.section}>오늘의 복약</Text>
        {config.medicationProgress && (
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
          <View key={item.intakeId} style={s.row}>
            <View style={s.flex}>
              <Text style={s.link}>{koreaTime(item.scheduledAt)}</Text>
              {config.medicationName && (
                <Text style={s.body}>{item.displayName}</Text>
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
    </View>
  );
}
