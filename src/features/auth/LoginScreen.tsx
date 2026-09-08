import React from 'react';
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { RootStackParamList } from '../../navigation/routes';
import {
  createSessionNavigationState,
  routeForNextStep,
} from '../../navigation/onboardingFlow';
import { ScreenBackground } from '../../shared/components/ScreenBackground';
import { FormField } from '../../shared/components/FormField';
import { PrimaryButton } from '../../shared/components/PrimaryButton';
import { heapyApi } from '../../shared/api/heapyApi';
import { tokenStorage } from '../../shared/storage/tokenStorage';
import { onboardingDraft } from '../onboarding/onboardingDraft';
import { ApiError } from '../../shared/api/client';
import { colors } from '../../shared/theme/tokens';
import { KeyboardAwareScrollView } from '../../shared/components/KeyboardAwareScrollView';

const schema = z.object({
  email: z.string().trim().email('이메일 형식을 확인해 주세요.'),
  password: z.string().min(8, '비밀번호는 8자 이상이어야 합니다.').max(256),
});
type FormValues = z.infer<typeof schema>;
type Props = NativeStackScreenProps<RootStackParamList, 'Login'>;

export function LoginScreen({ navigation }: Props) {
  const queryClient = useQueryClient();
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '' },
  });
  const mutation = useMutation({
    mutationFn: (values: FormValues) =>
      heapyApi.login(values.email.trim().toLowerCase(), values.password),
    onSuccess: async data => {
      await tokenStorage.save(data);
      queryClient.clear();
      onboardingDraft.clear();
      navigation.reset(
        createSessionNavigationState(
          routeForNextStep(data.nextStep, data.onboardingStep),
        ),
      );
    },
  });
  return (
    <ScreenBackground>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <KeyboardAwareScrollView contentContainerStyle={styles.container}>
          <View style={styles.brand}>
            <View style={styles.logo}>
              <Text style={styles.logoText}>♥</Text>
            </View>
            <Text style={styles.brandText}>HEAPY</Text>
          </View>
          <Image
            source={require('../../assets/images/login-hero.png')}
            resizeMode="contain"
            style={styles.hero}
          />
          <Text style={styles.headline}>
            로그인하고{`\n`}건강 관리를 시작해요
          </Text>
          <Text style={styles.description}>
            내 건강 데이터를 안전하게 연결하고 관리해 보세요
          </Text>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>이메일 로그인</Text>
            <Controller
              control={control}
              name="email"
              render={({ field: { value, onChange, onBlur } }) => (
                <FormField
                  label="이메일"
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="email"
                  keyboardType="email-address"
                  error={errors.email?.message}
                />
              )}
            />
            <Controller
              control={control}
              name="password"
              render={({ field: { value, onChange, onBlur } }) => (
                <FormField
                  label="비밀번호"
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  secureTextEntry
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="current-password"
                  error={errors.password?.message}
                />
              )}
            />
            {mutation.error ? (
              <Text style={styles.error}>
                {mutation.error instanceof ApiError
                  ? mutation.error.message
                  : '로그인에 실패했습니다.'}
              </Text>
            ) : null}
            <PrimaryButton
              label="로그인"
              onPress={handleSubmit(values => mutation.mutate(values))}
              loading={mutation.isPending}
            />
          </View>
          <Pressable
            accessibilityRole="button"
            onPress={() => navigation.navigate('Signup')}
            style={styles.signup}
          >
            <Text style={styles.signupText}>처음이신가요? 회원가입</Text>
          </Pressable>
        </KeyboardAwareScrollView>
      </KeyboardAvoidingView>
    </ScreenBackground>
  );
}
const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { flexGrow: 1, paddingHorizontal: 24, paddingBottom: 32 },
  signup: { alignItems: 'center', padding: 20, minHeight: 48 },
  signupText: { color: colors.primaryDark, fontSize: 14, fontWeight: '700' },
  brand: { height: 48, flexDirection: 'row', alignItems: 'center', gap: 8 },
  logo: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#28B8C4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: { color: '#fff', fontSize: 17 },
  brandText: { fontSize: 12, fontWeight: '800', color: '#54746E' },
  hero: { alignSelf: 'center', width: 250, height: 205, marginTop: -6 },
  headline: {
    fontSize: 28,
    lineHeight: 36,
    fontWeight: '800',
    color: colors.text,
  },
  description: { fontSize: 13, color: colors.textMuted, marginTop: 8 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 28,
    padding: 20,
    gap: 14,
    marginTop: 16,
  },
  cardTitle: { fontSize: 15, fontWeight: '800', color: colors.text },
  error: { color: colors.danger, fontSize: 12 },
});
