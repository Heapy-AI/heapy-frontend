import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  BackHandler,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { RootStackParamList } from '../../navigation/routes';
import { createSessionNavigationState } from '../../navigation/onboardingFlow';
import { heapyApi } from '../../shared/api/heapyApi';
import { ApiError } from '../../shared/api/client';
import { tokenStorage } from '../../shared/storage/tokenStorage';
import { colors } from '../../shared/theme/tokens';
import { clearSamsungSyncState } from '../dataConnection/samsungSync';
import { onboardingDraft } from '../onboarding/onboardingDraft';

type Props = NativeStackScreenProps<RootStackParamList, 'AccountWithdrawal'>;
const deletionItems = [
  ['계정과 프로필', '로그인 계정, 개인정보, 건강 배경, 약관 동의 및 앱 설정'],
  [
    '건강 기록과 분석',
    '건강검진 결과와 업로드 파일, 생활·삼성헬스 연동 기록, 건강 분석 및 브리핑',
  ],
  ['상담과 복약 정보', '상담 내용, 복용 약, 복약 일정·기록 및 알림 설정'],
  [
    '미션과 코인·아이템',
    '미션 진행 내역, 보유 코인, 구매 내역, 옷장 및 착용 정보',
  ],
];

/** 작성자: 김진우 — 삭제 범위를 안내하고 명시적 동의 후에만 탈퇴를 실행한다. */
export function AccountWithdrawalScreen({ navigation }: Props) {
  const client = useQueryClient();
  const [agreed, setAgreed] = useState(false);
  const started = useRef(false);
  const accountDeleted = useRef(false);
  const withdrawal = useMutation({
    mutationFn: async () => {
      // 작성자: 김진우 — 기기 정리 재시도 시 완료된 서버 삭제를 반복하지 않는다.
      if (!accountDeleted.current) {
        await heapyApi.withdrawAccount();
        accountDeleted.current = true;
      }
      clearSamsungSyncState();
      await client.cancelQueries();
      await tokenStorage.clear();
      onboardingDraft.clear();
      client.clear();
      navigation.reset(createSessionNavigationState('Login'));
    },
    onSettled: () => {
      started.current = false;
    },
    retry: false,
  });

  useEffect(() => {
    const subscription = BackHandler.addEventListener(
      'hardwareBackPress',
      () => started.current || accountDeleted.current,
    );
    return () => subscription.remove();
  }, []);

  const locked = withdrawal.isPending || accountDeleted.current;
  const disabled = !agreed || withdrawal.isPending;
  const error = withdrawal.isError
    ? accountDeleted.current
      ? '계정은 삭제됐지만 기기 정보 정리에 실패했어요. 아래 버튼을 눌러 다시 시도해 주세요.'
      : withdrawal.error instanceof ApiError &&
        withdrawal.error.code === 'WITHDRAWAL-001'
      ? withdrawal.error.message
      : '탈퇴 완료를 확인하지 못했어요. 잠시 후 다시 시도해 주세요.'
    : undefined;

  return (
    <SafeAreaView style={s.screen}>
      <View style={s.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="뒤로 가기"
          accessibilityState={{ disabled: locked }}
          disabled={locked}
          onPress={() => {
            if (!started.current && !accountDeleted.current)
              navigation.goBack();
          }}
          style={[s.back, locked && s.disabled]}
        >
          <Text style={s.backText}>‹</Text>
        </Pressable>
        <Text accessibilityRole="header" style={s.headerTitle}>
          회원 탈퇴
        </Text>
        <View style={s.back} />
      </View>
      <ScrollView contentContainerStyle={s.content}>
        <Text style={s.eyebrow}>탈퇴 전 확인해 주세요</Text>
        <Text accessibilityRole="header" style={s.title}>
          탈퇴하면 아래 정보가{`\n`}모두 삭제돼요
        </Text>
        <Text style={s.intro}>
          HEAPY에 저장된 계정과 활동 정보가 삭제되며, 삭제된 정보는 복구할 수
          없어요.
        </Text>
        <View style={s.card}>
          {deletionItems.map(([title, description], index) => (
            <View key={title} style={[s.item, index > 0 && s.itemBorder]}>
              <Text style={s.itemTitle}>{title}</Text>
              <Text style={s.itemDescription}>{description}</Text>
            </View>
          ))}
        </View>
        <View style={s.notice}>
          <Text style={s.noticeTitle}>
            다시 가입해도 이전 정보는 돌아오지 않아요
          </Text>
          <Text style={s.noticeText}>
            보유 코인과 구매한 아이템도 복구할 수 없어요. 삼성헬스 앱에 저장된
            원본 정보는 삭제되지 않아요.
          </Text>
        </View>
        <Pressable
          accessibilityRole="checkbox"
          accessibilityLabel="삭제 안내를 확인했으며 회원 탈퇴에 동의합니다"
          accessibilityState={{ checked: agreed, disabled: locked }}
          disabled={locked}
          onPress={() => {
            if (!started.current && !accountDeleted.current)
              setAgreed(value => !value);
          }}
          style={({ pressed }) => [
            s.consent,
            agreed && s.consentChecked,
            pressed && s.pressed,
          ]}
        >
          <View style={[s.checkbox, agreed && s.checkboxChecked]}>
            {agreed && <Text style={s.checkmark}>✓</Text>}
          </View>
          <Text style={s.consentText}>
            삭제 안내를 확인했으며{`\n`}회원 탈퇴에 동의합니다.
          </Text>
        </Pressable>
        {error && (
          <Text
            accessibilityRole="alert"
            accessibilityLiveRegion="polite"
            style={s.error}
          >
            {error}
          </Text>
        )}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={
            accountDeleted.current ? '기기 정보 정리 재시도' : '탈퇴하기'
          }
          accessibilityState={{ disabled, busy: withdrawal.isPending }}
          disabled={disabled}
          onPress={() => {
            if (!agreed || started.current) return;
            started.current = true;
            withdrawal.mutate();
          }}
          style={({ pressed }) => [
            s.submit,
            disabled && s.submitDisabled,
            pressed && !disabled && s.pressed,
          ]}
        >
          {withdrawal.isPending && <ActivityIndicator color={colors.surface} />}
          <Text style={s.submitText}>
            {withdrawal.isPending
              ? '정보를 삭제하고 있어요'
              : accountDeleted.current
              ? '기기 정보 정리 재시도'
              : '탈퇴하기'}
          </Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    height: 56,
  },
  back: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backText: { fontSize: 36, color: colors.text },
  headerTitle: { fontSize: 17, fontWeight: '700', color: colors.text },
  content: { padding: 24, paddingTop: 20, paddingBottom: 32 },
  eyebrow: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textMuted,
    marginBottom: 10,
  },
  title: {
    fontSize: 26,
    lineHeight: 36,
    fontWeight: '700',
    color: colors.text,
  },
  intro: {
    fontSize: 14,
    lineHeight: 22,
    color: colors.textMuted,
    marginTop: 12,
    marginBottom: 24,
  },
  card: {
    borderRadius: 24,
    backgroundColor: colors.surface,
    paddingHorizontal: 20,
  },
  item: { paddingVertical: 18 },
  itemBorder: { borderTopWidth: 1, borderTopColor: colors.line },
  itemTitle: { fontSize: 15, fontWeight: '700', color: colors.text },
  itemDescription: {
    fontSize: 13,
    lineHeight: 21,
    color: colors.textMuted,
    marginTop: 6,
  },
  notice: {
    padding: 18,
    borderRadius: 18,
    backgroundColor: '#FFF1EF',
    marginTop: 16,
  },
  noticeTitle: {
    fontSize: 13,
    lineHeight: 20,
    fontWeight: '700',
    color: '#A53B35',
  },
  noticeText: { fontSize: 12, lineHeight: 20, color: '#885B57', marginTop: 6 },
  consent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 18,
    marginTop: 24,
    backgroundColor: colors.surface,
  },
  consentChecked: {
    borderColor: colors.primaryDark,
    backgroundColor: '#EDF9F3',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderWidth: 1.5,
    borderColor: '#91A69E',
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: colors.primaryDark,
    borderColor: colors.primaryDark,
  },
  checkmark: { fontSize: 16, fontWeight: '700', color: colors.surface },
  consentText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 22,
    fontWeight: '600',
    color: colors.text,
  },
  submit: {
    minHeight: 54,
    padding: 16,
    borderRadius: 18,
    backgroundColor: colors.danger,
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  submitDisabled: { backgroundColor: '#B4BFBA' },
  submitText: { fontSize: 15, fontWeight: '700', color: colors.surface },
  error: { color: colors.danger, fontSize: 13, lineHeight: 21, marginTop: 16 },
  disabled: { opacity: 0.35 },
  pressed: { opacity: 0.7 },
});
