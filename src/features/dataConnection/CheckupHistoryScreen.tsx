import React from 'react';
import { ActivityIndicator, Pressable, Text } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/routes';
import { PrimaryButton } from '../../shared/components/PrimaryButton';
import { ConnectionLayout, connectionStyles as s } from './ConnectionLayout';
import { dataConnectionApi } from './dataConnectionApi';

export function CheckupHistoryScreen({
  navigation,
}: NativeStackScreenProps<RootStackParamList, 'CheckupHistory'>) {
  const query = useQuery({
    queryKey: ['checkup-history'],
    queryFn: ({ signal }) => dataConnectionApi.getCheckups(signal),
    gcTime: 0,
    staleTime: 0,
    retry: false,
  });
  return (
    <ConnectionLayout
      title="이전 검진 기록"
      onBack={() => navigation.goBack()}
      footer={
        <PrimaryButton
          label="목록 다시 조회"
          loading={query.isFetching}
          onPress={() => {
            query.refetch();
          }}
        />
      }
    >
      <Text style={s.description}>
        서버에 확정된 최근 검진 기록을 최대 100건 표시해요.
      </Text>
      {query.isPending && (
        <ActivityIndicator accessibilityLabel="검진 목록 조회 중" />
      )}
      {query.isError && (
        <Text accessibilityRole="alert" style={s.error}>
          검진 목록을 조회하지 못했어요. 연결을 확인하고 잠시 후 다시 시도해 주세요.
        </Text>
      )}
      {query.data?.length === 0 && (
        <Text style={s.description}>아직 확정된 검진 기록이 없어요.</Text>
      )}
      {query.data?.map(record => (
        <Pressable
          key={record.recordId}
          accessibilityRole="button"
          style={s.card}
          onPress={() =>
            navigation.navigate('CheckupDetail', { recordId: record.recordId })
          }
        >
          <Text style={s.cardTitle}>
            {record.measuredAt ?? '검진일 기재 없음'}
          </Text>
          <Text style={s.description}>
            {record.providerName ?? '기관 기재 없음'}
          </Text>
        </Pressable>
      ))}
    </ConnectionLayout>
  );
}
