import React, { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { RootStackParamList } from '../../navigation/routes';
import { createSessionNavigationState } from '../../navigation/onboardingFlow';
import { PrimaryButton } from '../../shared/components/PrimaryButton';
import { createIdempotencyKey } from '../../shared/utils/idempotency';
import { ConnectionLayout, connectionStyles as s } from './ConnectionLayout';
import { dataConnectionApi } from './dataConnectionApi';
import {
  requestSamsungPermissions,
  readSamsungTodaySteps,
} from './samsungHealth';
import { SamsungSteps } from './types';
import { colors } from '../../shared/theme/tokens';

export function DataConnectionScreen({
  navigation,
  route,
}: NativeStackScreenProps<RootStackParamList, 'DataConnection'>) {
  const client = useQueryClient();
  const [todaySteps, setTodaySteps] = useState<SamsungSteps>();
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [grantedTypes, setGrantedTypes] = useState<string[]>([]);
  const readSteps = useMutation({
    mutationFn: readSamsungTodaySteps,
    onSuccess: setTodaySteps,
    onError: () => setTodaySteps(undefined),
  });
  const connections = useQuery({
    queryKey: ['health-connections'],
    queryFn: dataConnectionApi.getConnections,
    retry: false,
  });
  const checkup = useQuery({
    queryKey: ['checkup-registered'],
    queryFn: async () => false,
    staleTime: Infinity,
  });
  const connect = useMutation({
    mutationFn: async () => {
      setPermissionGranted(false);
      setGrantedTypes([]);
      setTodaySteps(undefined);
      readSteps.reset();
      const permissions = await requestSamsungPermissions();
      setPermissionGranted(true);
      setGrantedTypes(permissions.grantedDataTypes);
      try {
        if (permissions.grantedDataTypes.includes('steps'))
          await readSteps.mutateAsync();
      } catch {
        setTodaySteps(undefined);
      }
      return dataConnectionApi.connectSamsung(
        permissions,
        createIdempotencyKey(),
      );
    },
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ['health-connections'] });
    },
  });
  const connected =
    connections.data?.some(item => item.status === 'connected') ||
    connect.isSuccess;
  const fromMy = route?.params?.from === 'my';
  const home = () =>
    fromMy
      ? navigation.goBack()
      : navigation.reset(createSessionNavigationState('Home'));
  return (
    <ConnectionLayout
      title="건강 데이터 연결"
      onBack={fromMy ? home : undefined}
      footer={
        <>
          {(connected || checkup.data) && (
            <PrimaryButton
              label={fromMy ? '마이로 돌아가기' : '홈으로 시작하기'}
              onPress={home}
            />
          )}
          <Pressable
            accessibilityRole="button"
            onPress={home}
            style={s.textButton}
          >
            <Text style={s.textButtonLabel}>
              {fromMy ? '마이로 돌아가기' : '나중에 하기'}
            </Text>
          </Pressable>
        </>
      }
    >
      <View style={styles.intro}>
        <Text style={s.eyebrow}>나를 더 잘 이해하는 첫걸음</Text>
        <Text style={s.headline}>건강 데이터를{'\n'}연결해 주세요</Text>
        <Text style={s.description}>
          생활 기록과 검진 결과를 한곳에서 확인하세요.{'\n'}지금 연결하지 않아도
          괜찮아요.
        </Text>
      </View>
      <View style={[s.card, styles.card]}>
        <Text style={s.badge}>생활 건강 · 선택</Text>
        <Text style={s.cardTitle}>Samsung Health</Text>
        <Text style={s.description}>
          수면, 심박수, 혈당, 혈압, 체성분, 운동, 오른 층수, 걸음 수, 활동 요약,
          물 섭취, 영양의 읽기 권한을 요청해요. 허용할 항목을 직접 선택할 수
          있어요.
        </Text>
        {(connected || permissionGranted) && (
          <Text style={s.badge}>
            {permissionGranted
              ? `휴대폰 읽기 권한 ${grantedTypes.length}/11개 허용됨`
              : '저장된 연결 기록 있음'}
          </Text>
        )}
        {todaySteps && (
          <View style={styles.steps}>
            <Text style={s.cardTitle}>
              {todaySteps.hasData
                ? `오늘 ${todaySteps.steps.toLocaleString()}걸음`
                : '오늘 저장된 걸음 기록이 아직 없어요'}
            </Text>
            <Text style={s.description}>
              {todaySteps.date} · 삼성헬스에서 읽은 기록
            </Text>
          </View>
        )}
        {grantedTypes.includes('steps') && (
          <ConnectionAction
            label="오늘 걸음 수 다시 읽기"
            loading={readSteps.isPending}
            onPress={() => readSteps.mutate()}
          />
        )}
        {readSteps.error && (
          <Text style={s.error}>{readSteps.error.message}</Text>
        )}
        <ConnectionAction
          label={connected ? '연결 권한 다시 확인' : '삼성헬스 연결하기'}
          loading={connect.isPending}
          onPress={() => connect.mutate()}
        />
        {connect.error && (
          <Text accessibilityRole="alert" style={s.error}>
            {permissionGranted
              ? '읽기 권한은 허용됐지만 연결 정보를 저장하지 못했어요. '
              : ''}
            {connect.error.message}
          </Text>
        )}
        {connections.isError && (
          <Pressable
            accessibilityRole="button"
            onPress={() => connections.refetch()}
          >
            <Text style={s.error}>
              연결 상태를 불러오지 못했어요. 다시 확인
            </Text>
          </Pressable>
        )}
      </View>
      <View style={[s.card, styles.card]}>
        <Text style={s.badge}>건강검진 · 선택</Text>
        <Text style={s.cardTitle}>건강검진 결과 등록</Text>
        <Text style={s.description}>
          PDF를 선택하거나 결과지를 촬영해 주세요. 인식한 결과를 확인하고 수정한
          뒤 저장해요.
        </Text>
        {checkup.data && <Text style={s.badge}>검진 결과 저장 완료</Text>}
        <ConnectionAction
          label={checkup.data ? '검진 결과 추가 등록' : '검진 결과 등록하기'}
          onPress={() => navigation.navigate('CheckupRegistration')}
        />
      </View>
      <Text style={s.description}>
        연결과 등록은 나중에도 홈에서 할 수 있어요.
      </Text>
    </ConnectionLayout>
  );
}

function ConnectionAction({
  label,
  loading,
  onPress,
}: {
  label: string;
  loading?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={loading}
      onPress={onPress}
      style={styles.action}
    >
      {loading ? (
        <ActivityIndicator color={colors.primaryDark} />
      ) : (
        <Text style={styles.actionText}>{label} ›</Text>
      )}
    </Pressable>
  );
}
const styles = StyleSheet.create({
  intro: { gap: 10 },
  steps: { gap: 6, paddingVertical: 8 },
  card: { padding: 18, gap: 10 },
  action: {
    minHeight: 48,
    borderRadius: 14,
    backgroundColor: '#EDF7F3',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionText: { color: colors.primaryDark, fontSize: 14, fontWeight: '700' },
});
