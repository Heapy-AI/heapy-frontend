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
import { BirthDateField } from '../../shared/components/BirthDateField';
import { isValidBirthDate } from '../../shared/utils/birthDate';
import { ChoicePill } from '../../shared/components/ChoicePill';
import { useOnboardingProfile } from './useOnboardingProfile';
import { onboardingDraft } from './onboardingDraft';
import { Sex } from '../../shared/types/api';
import { colors } from '../../shared/theme/tokens';
import { ONBOARDING_STEPS } from '../../navigation/onboardingFlow';
const schema = z.object({
  name: z.string().trim().min(1, '이름을 입력해 주세요.').max(50),
  birthDate: z
    .string()
    .refine(isValidBirthDate, '달력에서 생년월일을 선택해 주세요.'),
  sex: z.enum(['Male', 'Female']),
});
type Values = z.infer<typeof schema>;
type Props = NativeStackScreenProps<RootStackParamList, 'BasicProfile'>;
export function BasicProfileScreen({ navigation }: Props) {
  const profile = useOnboardingProfile();
  const {
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: onboardingDraft.readField<Values>('basic', { name: '', birthDate: '', sex: 'Male' }),
  });
  React.useEffect(() => {
    const subscription = watch(values => onboardingDraft.writeField('basic', values));
    return () => subscription.unsubscribe();
  }, [watch]);
  const sex = watch('sex');
  const mutation = useMutation({
    mutationFn: (v: Values) =>
      profile.saveDraft({
        ...v,
        name: v.name.trim(),
        sex: v.sex as Sex,
        onboardingStep: ONBOARDING_STEPS.basicProfile,
      }),
    onSuccess: () => navigation.navigate('BodyProfile'),
  });
  return (
    <OnboardingLayout
      title="기본 정보"
      step={ONBOARDING_STEPS.basicProfile}
      headline={'기본 정보를\n알려주세요'}
      description="연령과 성별에 따라 건강 기준을 다르게 확인해요"
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
        name="name"
        render={({ field: { value, onChange, onBlur } }) => (
          <FormField
            label="이름 또는 닉네임"
            value={value}
            onChangeText={onChange}
            onBlur={onBlur}
            error={errors.name?.message}
          />
        )}
      />
      <Controller
        control={control}
        name="birthDate"
        render={({ field: { value, onChange } }) => (
          <BirthDateField
            value={value}
            onChange={onChange}
            error={errors.birthDate?.message}
          />
        )}
      />
      <View style={styles.group}>
        <Text style={styles.label}>성별</Text>
        <View style={styles.row}>
          <ChoicePill
            label="남성"
            flex
            selected={sex === 'Male'}
            onPress={() => setValue('sex', 'Male')}
          />
          <ChoicePill
            label="여성"
            flex
            selected={sex === 'Female'}
            onPress={() => setValue('sex', 'Female')}
          />
        </View>
      </View>
      {mutation.error ? (
        <Text style={styles.error}>{mutation.error.message}</Text>
      ) : null}
    </OnboardingLayout>
  );
}
const styles = StyleSheet.create({
  group: { gap: 9 },
  label: { fontSize: 13, fontWeight: '700', color: colors.text },
  row: { flexDirection: 'row', gap: 10 },
  error: { color: colors.danger, fontSize: 12 },
});
