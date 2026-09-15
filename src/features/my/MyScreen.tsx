import React, { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  ImageSourcePropType,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { RootStackParamList } from '../../navigation/routes';
import { createSessionNavigationState } from '../../navigation/onboardingFlow';
import { heapyApi } from '../../shared/api/heapyApi';
import { tokenStorage } from '../../shared/storage/tokenStorage';
import { colors } from '../../shared/theme/tokens';
import { createIdempotencyKey } from '../../shared/utils/idempotency';
import { onboardingDraft } from '../onboarding/onboardingDraft';
import { ConfirmModal } from '../../shared/components/ConfirmModal';
import { useResponsiveLayout } from '../../shared/hooks/useResponsiveLayout';
import { TodayMedicationCard } from '../medication/MedicationCards';
import { AmbientEffect } from '../../shared/components/AmbientEffect';

type Props = {
  active?: boolean;
  navigation: NativeStackNavigationProp<RootStackParamList, 'Home'>;
};
const icons = {
  profile: require('../../assets/my/profile.png'),
  medication: require('../../assets/my/medication.png'),
  checkup: require('../../assets/my/checkup.png'),
  samsung: require('../../assets/my/samsung.png'),
  chevron: require('../../assets/my/chevron.png'),
};

function MenuRow({
  title,
  description,
  icon,
  tone,
  onPress,
}: {
  title: string;
  description: string;
  icon: ImageSourcePropType;
  tone: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityHint={description}
      onPress={onPress}
      style={({ pressed }) => [s.menu, pressed && s.pressed]}
    >
      <View style={[s.iconTile, { backgroundColor: tone }]}>
        <Image source={icon} style={s.menuIcon} accessible={false} />
      </View>
      <View style={s.menuCopy}>
        <Text style={s.menuTitle}>{title}</Text>
        <Text style={s.menuDescription}>{description}</Text>
      </View>
      <Image source={icons.chevron} style={s.chevron} accessible={false} />
    </Pressable>
  );
}

export function MyScreen({ navigation, active = true }: Props) {
  const client = useQueryClient();
  const [confirmLogout, setConfirmLogout] = useState(false);
  const { compact, padding } = useResponsiveLayout();
  const logoutStarted = useRef(false);
  const logoutKey = useRef(createIdempotencyKey());
  const profile = useQuery({
    queryKey: ['me'],
    queryFn: ({ signal }) => heapyApi.getMe(signal),
    retry: false,
  });
  const logout = useMutation({
    mutationFn: async () => {
      await heapyApi.logout(logoutKey.current);
      await client.cancelQueries();
      await tokenStorage.clear();
      onboardingDraft.clear();
      client.clear();
      navigation.reset(createSessionNavigationState('Login'));
    },
    retry: false,
  });
  const data = profile.data;
  const bmi =
    data?.heightCm && data?.weightKg
      ? (data.weightKg / (data.heightCm / 100) ** 2).toFixed(1)
      : '—';
  return (
    <View style={s.screen}>
      <ScrollView
        contentContainerStyle={[s.content, { paddingHorizontal: padding }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={profile.isRefetching}
            onRefresh={() => profile.refetch()}
            tintColor={colors.primary}
          />
        }
      >
        <Text accessibilityRole="header" style={s.heading}>
          마이
        </Text>
        {profile.isPending ? (
          <View style={s.stateCard}>
            <ActivityIndicator color={colors.primary} />
            <Text style={s.stateText}>프로필을 불러오고 있어요.</Text>
          </View>
        ) : profile.isError ? (
          <View style={s.stateCard}>
            <Text accessibilityRole="alert" style={s.stateText}>
              프로필을 불러오지 못했어요.
            </Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => profile.refetch()}
              style={s.retry}
            >
              <Text style={s.retryText}>다시 시도</Text>
            </Pressable>
          </View>
        ) : (
          data && (
            <LinearGradient
              colors={['#25BE8D', '#4C8DFF']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={s.profile}
            >
              <AmbientEffect
                active={active && !confirmLogout}
                testID="profile-wave"
              />
              <View style={[s.profileTop, compact && { flexWrap: 'wrap' }]}>
                <View style={s.avatar}>
                  <Image
                    source={icons.profile}
                    style={s.avatarImage}
                    accessible={false}
                  />
                </View>
                <View style={s.identity}>
                  <Text style={s.name}>
                    {data.name || '사용자'}
                    <Text style={s.nameSuffix}> 님</Text>
                  </Text>
                  <Text style={s.birth}>
                    {data.birthDate?.replace(/-/g, '.') || '생년월일 미등록'} ·{' '}
                    {data.sex === 'Male'
                      ? '남성'
                      : data.sex === 'Female'
                      ? '여성'
                      : '성별 미등록'}
                  </Text>
                </View>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => navigation.navigate('ProfileEdit')}
                  style={[s.edit, compact && { marginLeft: 'auto' }]}
                >
                  <Text style={s.editText}>프로필 수정</Text>
                </Pressable>
              </View>
              <View style={s.stats}>
                {[
                  ['키', data.heightCm ? data.heightCm + ' cm' : '미등록'],
                  ['체중', data.weightKg ? data.weightKg + ' kg' : '미등록'],
                  ['BMI', bmi],
                ].map(([label, value]) => (
                  <View key={label} style={s.stat}>
                    <Text style={s.statLabel}>{label}</Text>
                    <Text style={s.statValue}>{value}</Text>
                  </View>
                ))}
              </View>
              <View style={s.conditions}>
                <View style={s.conditionCopy}>
                  <Text style={s.statLabel}>질환 정보</Text>
                  <Text style={s.conditionValue}>
                    {data.chronicConditions
                      .map(item => item.displayName)
                      .join(' · ') || '등록된 질환 없음'}
                  </Text>
                </View>
                {data.chronicConditions.length > 0 && (
                  <View style={s.badge}>
                    <Text style={s.badgeText}>관리 중</Text>
                  </View>
                )}
              </View>
            </LinearGradient>
          )
        )}
        <TodayMedicationCard
          active={active}
          onOpen={() =>
            navigation.navigate('MedicationManagement', { tab: 'schedule' })
          }
        />
        <Text accessibilityRole="header" style={s.sectionHeading}>
          관리
        </Text>
        <MenuRow
          title="복약 정보 관리"
          description="복용 약과 일정을 관리해요"
          icon={icons.medication}
          tone="#ECF9F3"
          onPress={() => navigation.navigate('MedicationManagement')}
        />
        <MenuRow
          title="건강검진 등록 및 관리"
          description="검진 결과와 이전 기록을 확인해요"
          icon={icons.checkup}
          tone="#EDF3FF"
          onPress={() =>
            navigation.navigate('CheckupRegistration', { from: 'my' })
          }
        />
        <MenuRow
          title="삼성헬스 연동"
          description="데이터와 권한 상태를 관리해요"
          icon={icons.samsung}
          tone="#F1ECFF"
          onPress={() => navigation.navigate('DataConnection', { from: 'my' })}
        />
        <Text accessibilityRole="header" style={s.sectionHeading}>
          설정
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="로그아웃"
          accessibilityState={{
            disabled: logout.isPending,
            busy: logout.isPending,
          }}
          disabled={logout.isPending}
          onPress={() => {
            logout.reset();
            setConfirmLogout(true);
          }}
          style={({ pressed }) => [s.logout, pressed && s.pressed]}
        >
          {logout.isPending ? (
            <ActivityIndicator color={colors.danger} />
          ) : (
            <Text style={s.logoutText}>로그아웃</Text>
          )}
        </Pressable>
      </ScrollView>
      <ConfirmModal
        visible={confirmLogout}
        title="로그아웃 하시겠습니까"
        description="다시 이용하려면 로그인해 주세요."
        confirmLabel="로그아웃"
        pending={logout.isPending}
        error={
          logout.isError
            ? '로그아웃하지 못했어요. 다시 시도해 주세요.'
            : undefined
        }
        onCancel={() => {
          setConfirmLogout(false);
          logout.reset();
        }}
        onConfirm={() => {
          if (logoutStarted.current) return;
          logoutStarted.current = true;
          logout.mutate(undefined, {
            onSettled: () => {
              logoutStarted.current = false;
            },
          });
        }}
      />
    </View>
  );
}
const s = StyleSheet.create({
  screen: { flex: 1, minHeight: 0 },
  content: { paddingHorizontal: 24, paddingTop: 12, paddingBottom: 24 },
  heading: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 20,
  },
  profile: { borderRadius: 28, padding: 16, overflow: 'hidden' },
  profileTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#FFFFFF29',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarImage: { width: 34, height: 34 },
  identity: { flex: 1, minWidth: 0 },
  name: { color: colors.surface, fontSize: 20, fontWeight: '700' },
  nameSuffix: { fontSize: 13, fontWeight: '500' },
  birth: { color: '#F0FBF7', fontSize: 11, lineHeight: 17, marginTop: 3 },
  edit: {
    backgroundColor: '#FFFFFF29',
    paddingHorizontal: 9,
    minHeight: 44,
    borderRadius: 13,
    justifyContent: 'center',
  },
  editText: { color: colors.surface, fontSize: 10.5, fontWeight: '700' },
  stats: { flexDirection: 'row', gap: 7, marginTop: 16 },
  stat: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 16,
    backgroundColor: '#FFFFFF29',
  },
  statLabel: { color: '#F1FCF8', fontSize: 11, lineHeight: 16 },
  statValue: {
    color: colors.surface,
    fontSize: 17,
    fontWeight: '700',
    marginTop: 3,
  },
  conditions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 16,
    backgroundColor: '#FFFFFF29',
    marginTop: 12,
  },
  conditionCopy: { flex: 1 },
  conditionValue: {
    color: colors.surface,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '600',
    marginTop: 2,
  },
  badge: {
    backgroundColor: '#FFFFFF33',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  badgeText: { color: colors.surface, fontSize: 10, fontWeight: '700' },
  sectionHeading: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginTop: 24,
    marginBottom: 12,
  },
  menu: {
    minHeight: 80,
    padding: 12,
    borderRadius: 22,
    backgroundColor: colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 10,
  },
  iconTile: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuIcon: { width: 26, height: 26 },
  menuCopy: { flex: 1, minWidth: 0 },
  menuTitle: {
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 20,
    color: colors.text,
  },
  menuDescription: {
    fontSize: 11,
    lineHeight: 17,
    color: colors.textMuted,
    marginTop: 4,
  },
  chevron: { width: 10, height: 18 },
  logout: {
    marginTop: 20,
    minHeight: 48,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  logoutText: { color: colors.danger, fontSize: 14, fontWeight: '600' },
  stateCard: {
    padding: 24,
    borderRadius: 28,
    backgroundColor: colors.surface,
    alignItems: 'center',
    gap: 14,
  },
  stateText: { color: colors.textMuted, fontSize: 14 },
  retry: { padding: 12 },
  retryText: { color: colors.primaryDark, fontWeight: '700' },
  error: { color: colors.danger, fontSize: 12, lineHeight: 20, marginTop: 12 },
  pressed: { opacity: 0.7 },
});
