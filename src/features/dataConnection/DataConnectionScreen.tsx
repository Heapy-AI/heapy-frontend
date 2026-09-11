import React, { useState } from 'react';
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
import { createSessionNavigationState } from '../../navigation/onboardingFlow';
import { PrimaryButton } from '../../shared/components/PrimaryButton';
import { syncSamsungHealth } from './samsungSync';
import { ConnectionLayout, connectionStyles as s } from './ConnectionLayout';
import { dataConnectionApi } from './dataConnectionApi';
import {
  requestSamsungPermissions,
  hasRequiredSamsungPermissions,
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
  const [syncProgress, setSyncProgress] = useState('');
  const [permissionGranted, setPermissionGranted] = useState(false);
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
  const connect = useMutation({
    mutationFn: async () => {
      setPermissionGranted(false);
      setTodaySteps(undefined);
      readSteps.reset();
      const permissions = await requestSamsungPermissions();
      const complete = hasRequiredSamsungPermissions(
        permissions.grantedDataTypes,
      );
      setPermissionGranted(complete);
      const connection = await syncSamsungHealth({
        permission: permissions,
        onProgress: setSyncProgress,
      });
      client.invalidateQueries({ queryKey: ['health-connections'] });
      if (!complete || !connection.connected)
        throw new Error(
          '삼성 헬스를 연결하려면 요청한 11개 항목의 읽기 권한을 모두 허용해 주세요.',
        );
      try {
        await readSteps.mutateAsync();
      } catch {
        setTodaySteps(undefined);
      }
      return connection;
    },
    onSuccess: () => {
      setSyncProgress('삼성헬스 건강 기록을 동기화했어요.');
      client.invalidateQueries({ queryKey: ['health-connections'] });
      client.invalidateQueries({ queryKey: ['health'] });
    },
    onError: () => {
      setSyncProgress('');
      client.invalidateQueries({ queryKey: ['health-connections'] });
      client.invalidateQueries({ queryKey: ['health'] });
    },
  });
  const connected =
    connections.data?.some(
      item =>
        item.status === 'connected' &&
        hasRequiredSamsungPermissions(item.grantedDataTypes),
    ) || connect.isSuccess;
  const fromMy = route?.params?.from === 'my';
  const home = () =>
    fromMy
      ? navigation.goBack()
      : navigation.reset(createSessionNavigationState('Home'));
  return (
    <ConnectionLayout
      title="삼성헬스 연동"
      onBack={fromMy ? home : undefined}
      footer={
        !fromMy && (
          <>
            {connected && (
              <PrimaryButton label="홈으로 시작하기" onPress={home} />
            )}
            <Pressable
              accessibilityRole="button"
              onPress={home}
              style={s.textButton}
            >
              <Text style={s.textButtonLabel}>나중에 하기</Text>
            </Pressable>
          </>
        )
      }
    >
      <View style={styles.intro}>
        <View style={styles.iconTile}>
          <Image
            source={require('../../assets/my/samsung.png')}
            style={styles.icon}
          />
        </View>
        <Text style={styles.headline}>매일의 건강, 한곳에</Text>
        <Text style={s.description}>삼성헬스의 기록을 HEAPY와 연결해요.</Text>
      </View>
      <View style={[s.card, styles.card]}>
        <View style={styles.statusRow}>
          <Text style={s.cardTitle}>Samsung Health</Text>
          <Text style={styles.status}>
            {connect.isPending ? '동기화 중' : connected ? '연결됨' : '연결 전'}
          </Text>
        </View>
        <View style={styles.categories}>
          {['활동', '수면', '생체 기록', '영양 · 물'].map(label => (
            <Text key={label} style={styles.category}>
              {label}
            </Text>
          ))}
        </View>
        {!!syncProgress && (
          <Text accessibilityLiveRegion="polite" style={s.description}>
            {syncProgress}
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
        {readSteps.error && (
          <Text style={s.error}>{readSteps.error.message}</Text>
        )}
        <ConnectionAction
          label={connected ? '건강 기록 다시 동기화' : '삼성헬스 연결하기'}
          loading={connect.isPending}
          onPress={() => connect.mutate()}
        />
        {connect.error && (
          <Text accessibilityRole="alert" style={s.error}>
            {permissionGranted
              ? '읽기 권한은 허용됐지만 건강 기록 동기화를 완료하지 못했어요. '
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
      accessibilityLabel={label}
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
  intro: { gap: 12, alignItems: 'center', paddingVertical: 28 },
  iconTile: {
    width: 92,
    height: 92,
    borderRadius: 32,
    backgroundColor: '#E5F2EC',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  icon: { width: 52, height: 52 },
  headline: { color: colors.text, fontSize: 27, fontWeight: '800' },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  status: {
    color: colors.primaryDark,
    fontSize: 12,
    fontWeight: '700',
    backgroundColor: '#E9F7EE',
    padding: 8,
    borderRadius: 12,
  },
  categories: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingVertical: 10,
  },
  category: {
    color: '#54746C',
    fontSize: 12,
    backgroundColor: '#F3F7F5',
    padding: 9,
    borderRadius: 10,
  },
  steps: { gap: 6, paddingVertical: 8 },
  card: { padding: 22, gap: 16 },
  action: {
    minHeight: 48,
    borderRadius: 14,
    backgroundColor: '#EDF7F3',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionText: { color: colors.primaryDark, fontSize: 14, fontWeight: '700' },
});
