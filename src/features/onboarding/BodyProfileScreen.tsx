import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { RootStackParamList } from '../../navigation/routes';
import { OnboardingLayout } from '../../shared/components/OnboardingLayout';
import { PrimaryButton } from '../../shared/components/PrimaryButton';
import { FormField } from '../../shared/components/FormField';
import { useOnboardingProfile } from './useOnboardingProfile';
import { onboardingDraft } from './onboardingDraft';
import { colors } from '../../shared/theme/tokens';
import { ONBOARDING_STEPS } from '../../navigation/onboardingFlow';
const schema = z.object({
  heightCm: z.string().refine(value => {
    const number = Number(value);
    return number >= 30 && number <= 250;
  }),
  weightKg: z.string().refine(value => {
    const number = Number(value);
    return number >= 2 && number <= 500;
  }),
});
type Values = z.infer<typeof schema>;
type Props = NativeStackScreenProps<RootStackParamList, 'BodyProfile'>;
export function BodyProfileScreen({ navigation }: Props) {
  const profile = useOnboardingProfile();
  const {
    control,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: onboardingDraft.readField<Values>('body', { heightCm: '170', weightKg: '65' }),
  });
  React.useEffect(() => {
    const subscription = watch(values => onboardingDraft.writeField('body', values));
    return () => subscription.unsubscribe();
  }, [watch]);
  const height = Number(watch('heightCm'));
  const weight = Number(watch('weightKg'));
  const bmi =
    height > 0 && weight > 0 ? (weight / (height / 100) ** 2).toFixed(1) : '-';
  const mutation = useMutation({
    mutationFn: (v: Values) =>
      profile.saveDraft({
        heightCm: Number(v.heightCm),
        weightKg: Number(v.weightKg),
        onboardingStep: ONBOARDING_STEPS.bodyProfile,
      }),
    onSuccess: () => navigation.navigate('Lifestyle'),
  });
  return (
    <OnboardingLayout
      title="신체 정보"
      step={ONBOARDING_STEPS.bodyProfile}
      headline={'현재 신체 정보를\n입력해 주세요'}
      description="맞춤형 건강 해석과 목표 추천에 활용해요"
      onBack={() => navigation.goBack()}
      footer={
        <PrimaryButton
          label="다음"
          loading={mutation.isPending}
          onPress={handleSubmit(v => mutation.mutate(v))}
        />
      }
    >
      <Controller
        control={control}
        name="heightCm"
        render={({ field: { value, onChange } }) => (
          <FormField
            label="키 (cm)"
            value={value}
            onChangeText={onChange}
            keyboardType="decimal-pad"
            error={
              errors.heightCm ? '30~250cm 사이로 입력해 주세요.' : undefined
            }
          />
        )}
      />
      <Controller
        control={control}
        name="weightKg"
        render={({ field: { value, onChange } }) => (
          <FormField
            label="몸무게 (kg)"
            value={value}
            onChangeText={onChange}
            keyboardType="decimal-pad"
            error={
              errors.weightKg ? '2~500kg 사이로 입력해 주세요.' : undefined
            }
          />
        )}
      />
      <View style={styles.bmi}>
        <Text style={styles.badge}>BMI</Text>
        <View>
          <Text style={styles.caption}>현재 입력 기준</Text>
          <Text style={styles.value}>{bmi}</Text>
        </View>
        <Text style={styles.note}>참고용 지표</Text>
      </View>
      {mutation.error ? (
        <Text style={styles.error}>{mutation.error.message}</Text>
      ) : null}
    </OnboardingLayout>
  );
}
const styles = StyleSheet.create({
  bmi: {
    height: 64,
    borderRadius: 18,
    backgroundColor: '#ECF8F4',
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  badge: { color: colors.primaryDark, fontSize: 11, fontWeight: '800' },
  caption: { fontSize: 11, color: colors.textMuted },
  value: { fontSize: 16, fontWeight: '800', color: colors.text },
  note: { marginLeft: 'auto', fontSize: 11, color: colors.textMuted },
  error: { fontSize: 12, color: colors.danger },
});
