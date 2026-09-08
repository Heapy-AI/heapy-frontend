import React, { useRef } from 'react';
import { useDraftState } from './useDraftState';
import { onboardingDraft } from './onboardingDraft';
import { tokenStorage } from '../../shared/storage/tokenStorage';
import { StyleSheet, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useMutation } from '@tanstack/react-query';
import { RootStackParamList } from '../../navigation/routes';
import { OnboardingLayout } from '../../shared/components/OnboardingLayout';
import { PrimaryButton } from '../../shared/components/PrimaryButton';
import { ChoicePill } from '../../shared/components/ChoicePill';
import { FormField } from '../../shared/components/FormField';
import { heapyApi } from '../../shared/api/heapyApi';
import { useOnboardingProfile } from './useOnboardingProfile';
import { createIdempotencyKey } from '../../shared/utils/idempotency';
import { colors } from '../../shared/theme/tokens';
import {
  createSessionNavigationState,
  ONBOARDING_STEPS,
} from '../../navigation/onboardingFlow';
type Props = NativeStackScreenProps<RootStackParamList, 'HealthBackground'>;
const options = [
  ['hypertension', '고혈압'],
  ['diabetes', '당뇨'],
  ['dyslipidemia', '고지혈증'],
  ['other', '기타'],
] as const;
export function HealthBackgroundScreen({ navigation }: Props) {
  const profile = useOnboardingProfile();
  const [conditions, setConditions] = useDraftState<Set<string>>('conditions', new Set());
  const [allergies, setAllergies] = useDraftState('allergies', '');
  const [cautions, setCautions] = useDraftState('cautions', '');
  const key = useRef(createIdempotencyKey());
  const mutation = useMutation({
    mutationFn: async () => {
      await profile.saveDraft({
        chronicConditions: [...conditions].map(value => ({
          canonicalKey: value,
          displayName: options.find(v => v[0] === value)?.[1] ?? value,
          source: 'user',
        })),
        allergies: allergies
          .split(',')
          .map(v => v.trim())
          .filter(Boolean)
          .map(v => ({ displayName: v, source: 'user' })),
        healthCautions: cautions.trim(),
        onboardingStep: ONBOARDING_STEPS.complete,
      });
      return heapyApi.completeOnboarding(key.current, onboardingDraft.get());
    },
    onSuccess: async data => {
      if (data.nextStep === 'home') {
        const tokens = await tokenStorage.get();
        if (tokens) await tokenStorage.save({ ...tokens, nextStep: 'home' });
        onboardingDraft.clear();
        navigation.reset(createSessionNavigationState('ProfileComplete'));
      }
    },
  });
  const toggle = (value: string) => {
    setConditions(current => {
      const next = new Set(current);
      next.has(value) ? next.delete(value) : next.add(value);
      return next;
    });
  };
  return (
    <OnboardingLayout
      title="건강 배경"
      step={ONBOARDING_STEPS.healthBackground}
      headline={'건강 배경을\n선택해 주세요'}
      description="더 정확한 해석을 위한 선택 정보예요"
      onBack={() => navigation.goBack()}
      footer={
        <PrimaryButton
          label="완료하고 시작하기"
          loading={mutation.isPending}
          onPress={() => mutation.mutate()}
        />
      }
    >
      <View style={styles.group}>
        <Text style={styles.label}>진단받은 질환</Text>
        <View style={styles.row}>
          <ChoicePill
            label="없음"
            compact
            selected={conditions.size === 0}
            onPress={() => {
              setConditions(new Set());
            }}
          />
          {options.map(([value, label]) => (
            <ChoicePill
              key={value}
              compact
              label={label}
              selected={conditions.has(value)}
              onPress={() => toggle(value)}
            />
          ))}
        </View>
      </View>
      <FormField
        label="알레르기 (선택, 쉼표로 구분)"
        placeholder="예: 땅콩, 페니실린"
        value={allergies}
        onChangeText={value => {
          setAllergies(value);
        }}
      />
      <FormField
        label="건강 주의사항 (선택)"
        placeholder="비워두셔도 돼요"
        value={cautions}
        onChangeText={value => {
          setCautions(value);
        }}
        maxLength={1000}
        multiline
      />
      {mutation.error ? (
        <Text style={styles.error}>{mutation.error.message}</Text>
      ) : null}
    </OnboardingLayout>
  );
}
const styles = StyleSheet.create({
  group: { gap: 10 },
  label: { fontSize: 13, fontWeight: '700', color: colors.text },
  row: { flexDirection: 'row', gap: 4 },
  error: { fontSize: 12, color: colors.danger },
});
