import React from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/routes';
import { PrimaryButton } from '../../shared/components/PrimaryButton';
import { ConnectionLayout, connectionStyles as s } from './ConnectionLayout';
import { dataConnectionApi } from './dataConnectionApi';
import { CheckupGeneralResults } from './CheckupGeneralResults';
import { CheckupOpinionSections } from './CheckupOpinionSections';
import { findingCards } from './CheckupFindings';
import { validateFindings } from './checkupReviewContract';

export function CheckupDetailScreen({
  route,
  navigation,
}: NativeStackScreenProps<RootStackParamList, 'CheckupDetail'>) {
  // 작성자: 김진우 — 확정 기록은 서버에서 재조회하며 임시 OCR 캐시를 재사용하거나 영구 저장하지 않는다.
  const query = useQuery({
    queryKey: ['checkup-detail', route.params.recordId],
    queryFn: async ({ signal }) => {
      const detail = await dataConnectionApi.getCheckup(
        route.params.recordId,
        signal,
      );
      validateFindings(detail.findings ?? [], 'procedure_finding');
      validateFindings(detail.overallOpinions ?? [], 'overall_opinion');
      if (
        !Array.isArray(detail.results) ||
        detail.results.some(item => !item.itemCode) ||
        new Set(detail.results.map(item => item.itemCode)).size !==
          detail.results.length
      )
        throw new Error('저장된 검사의 식별 정보를 확인할 수 없어요.');
      return detail;
    },
    gcTime: 0,
    staleTime: 0,
    retry: false,
  });
  const detail = query.data;
  const empty =
    detail &&
    !detail.results.length &&
    !detail.findings?.length &&
    !detail.overallOpinions?.length;
  return (
    <ConnectionLayout
      title="확정 검진 기록"
      onBack={() => navigation.goBack()}
      footer={
        <PrimaryButton
          label="서버 기록 다시 조회"
          loading={query.isFetching}
          onPress={() => {
            query.refetch();
          }}
        />
      }
    >
      {query.isPending && (
        <ActivityIndicator accessibilityLabel="검진 기록 조회 중" />
      )}
      {query.isError && (
        <Text accessibilityRole="alert" style={s.error}>
          검진 기록을 조회하지 못했어요. 연결과 접근 권한을 확인한 뒤 다시
          시도해 주세요.
        </Text>
      )}
      {empty && (
        <Text accessibilityRole="alert" style={s.error}>
          저장된 검사나 소견이 없어요. 기록 확인이 필요해요.
        </Text>
      )}
      {detail && !empty && (
        <>
          <View style={s.card}>
            <Text style={s.description}>
              검진일: {detail.measuredAt ?? '기재 없음'}
            </Text>
            <Text style={s.description}>
              검진 기관: {detail.providerName ?? '기재 없음'}
            </Text>
          </View>
          <CheckupGeneralResults
            items={detail.results.map(item => ({
              ...item,
              fieldKey: item.itemCode!,
            }))}
          />
          <CheckupOpinionSections
            examinations={findingCards(detail.findings ?? [])}
            overall={findingCards(detail.overallOpinions ?? [])}
          />
        </>
      )}
    </ConnectionLayout>
  );
}
