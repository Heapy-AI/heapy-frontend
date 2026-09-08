import React from 'react';
import { useDraftState } from './useDraftState';
import { StyleSheet, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useMutation } from '@tanstack/react-query';
import { RootStackParamList } from '../../navigation/routes';
import { OnboardingLayout } from '../../shared/components/OnboardingLayout';
import { PrimaryButton } from '../../shared/components/PrimaryButton';
import { ChoicePill } from '../../shared/components/ChoicePill';
import { useOnboardingProfile } from './useOnboardingProfile';
import { AlcoholFrequency, SmokingStatus } from '../../shared/types/api';
import { colors } from '../../shared/theme/tokens';
import { ONBOARDING_STEPS } from '../../navigation/onboardingFlow';
type Props = NativeStackScreenProps<RootStackParamList, 'Lifestyle'>;
const smoking: Array<[SmokingStatus, string]> = [
  ['never', '비흡연'],
  ['former', '과거 흡연'],
  ['current', '현재 흡연'],
];
const alcohol: Array<[AlcoholFrequency, string]> = [
  ['none', '안 마심'],
  ['monthly_1_2', '월 1~2회'],
  ['weekly_1_2', '주 1~2회'],
  ['weekly_3_plus', '주 3회+'],
];
export function LifestyleScreen({ navigation }: Props) {
  const profile = useOnboardingProfile();
  const [smokingStatus, setSmoking] = useDraftState<SmokingStatus>('smoking', 'never');
  const [alcoholFrequency, setAlcohol] = useDraftState<AlcoholFrequency>('alcohol', 'none');
  const mutation = useMutation({
    mutationFn: () =>
      profile.saveDraft({
        smokingStatus,
        alcoholFrequency,
        onboardingStep: ONBOARDING_STEPS.lifestyle,
      }),
    onSuccess: () => navigation.navigate('HealthBackground'),
  });
  return (
    <OnboardingLayout
      title="생활 정보"
      step={ONBOARDING_STEPS.lifestyle}
      headline={'평소 생활 습관을\n알려주세요'}
      onBack={() => navigation.goBack()}
      footer={
        <PrimaryButton
          label="다음"
          loading={mutation.isPending}
          onPress={() => mutation.mutate()}
        />
      }
    >
      <View style={styles.group}>
        <Text style={styles.label}>흡연</Text>
        <View style={styles.row}>
          {smoking.map(([value, label]) => (
            <ChoicePill
              key={value}
              compact
              label={label}
              selected={smokingStatus === value}
              onPress={() => {
                setSmoking(value);
              }}
            />
          ))}
        </View>
      </View>
      <View style={styles.group}>
        <Text style={styles.label}>음주 빈도</Text>
        <View style={styles.row}>
          {alcohol.map(([value, label]) => (
            <ChoicePill
              key={value}
              compact
              label={label}
              selected={alcoholFrequency === value}
              onPress={() => {
                setAlcohol(value);
              }}
            />
          ))}
        </View>
      </View>
      <Text style={styles.note}>
        운동 빈도와 수면 패턴은 Samsung Health 연동 후 자동으로 분석할
        예정이에요.
      </Text>
      {mutation.error ? (
        <Text style={styles.error}>{mutation.error.message}</Text>
      ) : null}
    </OnboardingLayout>
  );
}
const styles = StyleSheet.create({
  group: { gap: 10 },
  label: { fontSize: 13, fontWeight: '700', color: colors.text },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  note: {
    fontSize: 12,
    lineHeight: 18,
    color: colors.textMuted,
    backgroundColor: '#F3F8F6',
    borderRadius: 14,
    padding: 14,
  },
  error: { fontSize: 12, color: colors.danger },
});
