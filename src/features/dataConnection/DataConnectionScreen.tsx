import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  AppState,
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
  needsDeveloperMode,
  readSamsungTodaySteps,
  SAMSUNG_BETA_DEVELOPER_MODE,
} from './samsungHealth';
import { SamsungSetupGuide } from './SamsungSetupGuide';
import { SamsungSteps } from './types';
import LinearGradient from 'react-native-linear-gradient';
import Svg, { Path } from 'react-native-svg';

export function DataConnectionScreen({
  navigation,
  route,
}: NativeStackScreenProps<RootStackParamList, 'DataConnection'>) {
  const client = useQueryClient();
  const [todaySteps, setTodaySteps] = useState<SamsungSteps>();
  const [syncProgress, setSyncProgress] = useState('');
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  // 작성자: 고수연 — 삼성 헬스로 내보낸 뒤 돌아오는 순간을 지킨다. 설정을 마치고 왔는데
  // 다시 '연결하기'를 찾아 눌러야 한다면 안내한 보람이 없다.
  const leftForSamsung = useRef(false);
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
  useEffect(() => {
    const listener = AppState.addEventListener('change', state => {
      if (state !== 'active' || !leftForSamsung.current) return;
      leftForSamsung.current = false;
      setGuideOpen(false);
      // 이미 돌고 있으면 또 부르지 않는다. 권한 창이 두 번 뜬다.
      if (!connect.isPending) connect.mutate();
    });
    return () => listener.remove();
  }, [connect]);
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
        <Text style={styles.eyebrow}>나의 건강을 잇는 연결</Text>
        <Text style={styles.headline}>매일의 건강, 한곳에</Text>
        <Text style={styles.introDescription}>
          삼성헬스의 기록을 HEAPY와 연결해요.
        </Text>
      </View>
      <LinearGradient
        colors={['#10234E', '#173D80', '#2455A8']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.card}
      >
        <View pointerEvents="none" style={styles.orbit} />
        <View pointerEvents="none" style={styles.orbitInner} />
        <View style={styles.statusRow}>
          <Text style={styles.brand}>Samsung Health</Text>
          <View style={styles.status}>
            <View
              style={[styles.statusDot, connected && styles.connectedDot]}
            />
            <Text accessibilityLiveRegion="polite" style={styles.statusText}>
              {connect.isPending
                ? '동기화 중'
                : connected
                ? '연결됨'
                : connections.isPending
                ? '확인 중'
                : connections.isError
                ? '확인 필요'
                : '연결 전'}
            </Text>
          </View>
        </View>
        <View style={styles.cardHero}>
          <View style={styles.iconTile}>
            <Image
              source={require('../../assets/my/samsung-health-cutout.png')}
              style={styles.icon}
              resizeMode="contain"
              accessibilityLabel="삼성헬스 아이콘"
            />
          </View>
          <View style={styles.heroCopy}>
            <Text style={styles.cardTitle}>건강 기록{'\n'}동기화</Text>
            <Text style={styles.cardSubtitle}>
              나의 건강 기록을 한눈에
            </Text>
          </View>
        </View>
        <View style={styles.divider} />
        <Text style={styles.sectionLabel}>함께 연결되는 건강 기록</Text>
        <View style={styles.categories}>
          {[
            {
              label: '활동',
              detail: '걸음 · 운동',
              path: 'M4 17h4l3-11 3 14 3-9 3 6',
            },
            {
              label: '수면',
              detail: '매일의 수면 기록',
              path: 'M20 14A8 8 0 0 1 10 4a8 8 0 1 0 10 10Z',
            },
            {
              label: '생체 기록',
              detail: '심박 · 혈압 · 혈당',
              path: 'M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z',
            },
            {
              label: '영양 · 물',
              detail: '식사 · 수분 섭취',
              path: 'M12 3S5 11 5 15a7 7 0 0 0 14 0c0-4-7-12-7-12Z',
            },
          ].map(item => (
            <View key={item.label} style={styles.category}>
              <Svg
                width={22}
                height={22}
                viewBox="0 0 24 24"
                accessible={false}
              >
                <Path
                  d={item.path}
                  fill="none"
                  stroke="#A8CEFF"
                  strokeWidth={1.6}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </Svg>
              <Text style={styles.categoryTitle}>{item.label}</Text>
              <Text style={styles.categoryDetail}>{item.detail}</Text>
            </View>
          ))}
        </View>
        {!!syncProgress && (
          <Text accessibilityLiveRegion="polite" style={styles.cardSubtitle}>
            {syncProgress}
          </Text>
        )}
        {todaySteps && (
          <View style={styles.steps}>
            <Text style={styles.stepsTitle}>
              {todaySteps.hasData
                ? `오늘 ${todaySteps.steps.toLocaleString()}걸음`
                : '오늘 저장된 걸음 기록이 아직 없어요'}
            </Text>
            <Text style={styles.cardSubtitle}>
              {todaySteps.date} · 삼성헬스에서 읽은 기록
            </Text>
          </View>
        )}
        {readSteps.error && (
          <Text style={styles.error}>{readSteps.error.message}</Text>
        )}
        <ConnectionAction
          label={connected ? '건강 기록 다시 동기화' : '삼성헬스 연결하기'}
          loading={connect.isPending}
          onPress={() => connect.mutate()}
        />
        {connect.error && (
          <Text accessibilityRole="alert" style={styles.error}>
            {permissionGranted
              ? '읽기 권한은 허용됐지만 건강 기록 동기화를 완료하지 못했어요. '
              : ''}
            {needsDeveloperMode(connect.error)
              ? SAMSUNG_BETA_DEVELOPER_MODE
              : connect.error.message}
          </Text>
        )}
        {/* 작성자: 고수연 — 연결이 막히는 가장 흔한 이유가 개발자 모드다. 오류가 났을 때만
            띄우지 않고 늘 둔다. 처음 연결하는 사람도 미리 보고 준비할 수 있어야 한다. */}
        <Pressable
          accessibilityRole="button"
          onPress={() => setGuideOpen(true)}
          style={styles.guideButton}
        >
          <Text style={styles.guideLabel}>연동이 안 되나요? 설정 방법 보기</Text>
        </Pressable>
        {connections.isError && (
          <Pressable
            accessibilityRole="button"
            onPress={() => connections.refetch()}
          >
            <Text style={styles.error}>
              연결 상태를 불러오지 못했어요. 다시 확인
            </Text>
          </Pressable>
        )}
        <Text style={styles.footnote}>
          연결 시 건강 기록의 읽기 권한을 요청해요.
        </Text>
      </LinearGradient>
      <SamsungSetupGuide
        visible={guideOpen}
        onClose={() => setGuideOpen(false)}
        onLeave={() => {
          leftForSamsung.current = true;
        }}
      />
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
      accessibilityState={{ disabled: loading, busy: loading }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.action,
        pressed && styles.actionPressed,
        loading && styles.actionLoading,
      ]}
    >
      {loading ? (
        <View style={styles.loadingRow}>
          <ActivityIndicator color="#FFFFFF" />
          <Text style={styles.actionText}>건강 기록 동기화 중</Text>
        </View>
      ) : (
        <>
          <Text style={styles.actionText}>{label}</Text>
          <Text style={styles.actionArrow}>↗</Text>
        </>
      )}
    </Pressable>
  );
}
const styles = StyleSheet.create({
  // 작성자: 김진우 — 삼성헬스 카드에 독립된 블루 팔레트와 높은 명도 대비를 적용한다.
  intro: { gap: 10, alignItems: 'center', paddingTop: 22, paddingBottom: 12 },
  eyebrow: {
    color: '#5075AC',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
  },
  introDescription: {
    color: '#65748C',
    fontSize: 13,
    lineHeight: 22,
    textAlign: 'center',
  },
  iconTile: {
    width: 80,
    height: 80,
    borderRadius: 25,
    backgroundColor: '#FFFFFF0D',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#FFFFFF22',
  },
  icon: { width: 72, height: 72 },
  headline: {
    color: '#152A4B',
    fontSize: 27,
    fontWeight: '800',
    letterSpacing: -0.8,
    textAlign: 'center',
  },
  brand: {
    color: '#D3E3FF',
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  cardHero: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginVertical: 8,
  },
  heroCopy: { flex: 1, gap: 8 },
  cardTitle: {
    color: '#FFFFFF',
    fontSize: 27,
    fontWeight: '800',
    lineHeight: 34,
    letterSpacing: -0.7,
  },
  cardSubtitle: { color: '#CDDEF9', fontSize: 12, lineHeight: 19 },
  divider: { height: 1, backgroundColor: '#FFFFFF20' },
  sectionLabel: {
    color: '#BFCEF0',
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  statusRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  status: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFFFFF12',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#FFFFFF24',
  },
  statusText: { color: '#E2ECFF', fontSize: 11, fontWeight: '600' },
  statusDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#9DB8E8',
  },
  connectedDot: { backgroundColor: '#7DE7CC' },
  categories: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 10,
  },
  category: {
    width: '48%',
    gap: 7,
    backgroundColor: '#FFFFFF09',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#FFFFFF16',
  },
  categoryTitle: { color: '#F4F7FF', fontSize: 13, fontWeight: '700' },
  categoryDetail: { color: '#BBCFED', fontSize: 10, lineHeight: 16 },
  steps: {
    gap: 6,
    padding: 14,
    backgroundColor: '#FFFFFF0C',
    borderRadius: 16,
  },
  stepsTitle: { color: '#FFFFFF', fontSize: 18, fontWeight: '700' },
  card: {
    position: 'relative',
    padding: 22,
    gap: 16,
    borderRadius: 28,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#41619C',
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
  },
  orbit: {
    position: 'absolute',
    width: 280,
    height: 280,
    borderRadius: 140,
    borderWidth: 1,
    borderColor: '#92BCFF12',
    top: -100,
    right: -100,
  },
  orbitInner: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    borderWidth: 1,
    borderColor: '#92BCFF12',
    top: -70,
    right: -70,
  },
  action: {
    minHeight: 54,
    borderRadius: 16,
    backgroundColor: '#367AF1',
    borderWidth: 1,
    borderColor: '#6FA4FF',
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    flexShrink: 1,
    textAlign: 'center',
  },
  actionArrow: { color: '#FFFFFF', fontSize: 22 },
  actionPressed: { backgroundColor: '#2465D6', transform: [{ scale: 0.985 }] },
  actionLoading: { opacity: 0.7 },
  loadingRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  footnote: {
    color: '#BACCEC',
    fontSize: 10,
    lineHeight: 16,
    textAlign: 'center',
  },
  error: { color: '#FFE0E2', fontSize: 13, lineHeight: 20 },
  guideButton: { minHeight: 44, justifyContent: 'center', alignItems: 'center' },
  guideLabel: {
    color: '#DFF3EA',
    fontSize: 13,
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
});
