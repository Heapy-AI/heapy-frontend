import React, { useEffect, useRef, useState } from 'react';
import {
  Keyboard,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { RootStackParamList } from '../../navigation/routes';
import { ScreenBackground } from '../../shared/components/ScreenBackground';
import { KeyboardAwareScrollView } from '../../shared/components/KeyboardAwareScrollView';
import { FormField } from '../../shared/components/FormField';
import { PrimaryButton } from '../../shared/components/PrimaryButton';
import { heapyApi } from '../../shared/api/heapyApi';
import { SignupResponse } from '../../shared/types/api';
import { createIdempotencyKey } from '../../shared/utils/idempotency';
import { colors } from '../../shared/theme/tokens';

const schema = z
  .object({
    email: z.string().trim().email('이메일 형식을 확인해 주세요.').max(320),
    password: z
      .string()
      .min(8, '비밀번호는 8자 이상이어야 합니다.')
      .max(256, '비밀번호는 256자 이하여야 합니다.'),
    confirmPassword: z.string().min(1, '비밀번호를 한 번 더 입력해 주세요.'),
  })
  .refine(values => values.password === values.confirmPassword, {
    path: ['confirmPassword'],
    message: '비밀번호가 일치하지 않습니다.',
  });
type Values = z.infer<typeof schema>;
type Props = NativeStackScreenProps<RootStackParamList, 'Signup'>;

export function SignupScreen({ navigation }: Props) {
  const {
    control,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '', confirmPassword: '' },
  });
  const email = watch('email');
  const password = watch('password');
  const key = useRef(createIdempotencyKey());
  useEffect(() => {
    key.current = createIdempotencyKey();
  }, [email, password]);
  const [confirmation, setConfirmation] = useState<SignupResponse>();
  const [retryAt, setRetryAt] = useState(0);
  const [remaining, setRemaining] = useState(0);
  useEffect(() => {
    const update = () =>
      setRemaining(Math.max(0, Math.ceil((retryAt - Date.now()) / 1000)));
    update();
    if (!retryAt) return;
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, [retryAt]);
  const signup = useMutation({
    mutationFn: (values: Values) =>
      heapyApi.signup(
        values.email.trim().toLowerCase(),
        values.password,
        key.current,
      ),
    onSuccess: data => {
      Keyboard.dismiss();
      if (!data.emailVerificationRequired) {
        reset();
        navigation.replace('Login');
        Alert.alert('회원가입 완료', '가입한 이메일과 비밀번호로 로그인해 주세요.');
        return;
      }
      setConfirmation(data);
      setRetryAt(Date.now() + 60_000);
      reset();
    },
  });
  const resend = useMutation({
    mutationFn: () => heapyApi.resendVerificationEmail(confirmation!.email),
    onSuccess: data =>
      setRetryAt(Date.now() + Math.max(1, data.retryAfterSeconds) * 1000),
    onError: () => setRetryAt(Date.now() + 60_000),
  });
  return (
    <ScreenBackground>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <KeyboardAwareScrollView contentContainerStyle={styles.container}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="로그인으로 돌아가기"
            onPress={() => navigation.navigate('Login')}
            style={styles.back}
          >
            <Text style={styles.link}>‹ 로그인으로 돌아가기</Text>
          </Pressable>
          <Text style={styles.title}>
            {confirmation
              ? '이메일을 확인해 주세요'
              : 'HEAPY와 함께\n건강 관리를 시작해요'}
          </Text>
          <Text style={styles.description}>
            {confirmation
              ? '메일에 담긴 인증 링크를 누른 뒤 로그인해 주세요.'
              : '이메일로 가입하고 나에게 맞는 건강 관리를 시작하세요.'}
          </Text>
          {confirmation ? (
            <View style={styles.card}>
              <Text style={styles.email}>{confirmation.email}</Text>
              <Text style={styles.description}>
                {confirmation.verificationEmailSent || resend.isSuccess
                  ? '인증 메일을 요청했습니다. 받은편지함과 스팸함을 확인해 주세요.'
                  : '인증 메일을 보내지 못했습니다. 잠시 후 다시 요청해 주세요.'}
              </Text>
              <PrimaryButton
                label="인증 후 로그인하기"
                onPress={() => navigation.navigate('Login')}
              />
              <PrimaryButton
                label={
                  remaining > 0
                    ? `인증 메일 재발송 (${remaining}초)`
                    : '인증 메일 다시 보내기'
                }
                disabled={remaining > 0}
                loading={resend.isPending}
                onPress={() => resend.mutate()}
              />
              {resend.error ? (
                <Text style={styles.error}>{resend.error.message}</Text>
              ) : null}
            </View>
          ) : (
            <View style={styles.card}>
              <Controller
                control={control}
                name="email"
                render={({ field: { value, onChange, onBlur } }) => (
                  <FormField
                    label="이메일"
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    autoComplete="email"
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
                    placeholder="8자 이상 입력"
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    secureTextEntry
                    autoCapitalize="none"
                    autoCorrect={false}
                    autoComplete="new-password"
                    error={errors.password?.message}
                  />
                )}
              />
              <Controller
                control={control}
                name="confirmPassword"
                render={({ field: { value, onChange, onBlur } }) => (
                  <FormField
                    label="비밀번호 확인"
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    secureTextEntry
                    autoCapitalize="none"
                    autoCorrect={false}
                    autoComplete="new-password"
                    error={errors.confirmPassword?.message}
                  />
                )}
              />
              {signup.error ? (
                <Text style={styles.error}>{signup.error.message}</Text>
              ) : null}
              <PrimaryButton
                label="회원가입"
                loading={signup.isPending}
                onPress={handleSubmit(values => signup.mutate(values))}
              />
              <Text style={styles.description}>
                가입 후 로그인하면 약관 동의와 프로필 설정을 진행합니다.
              </Text>
            </View>
          )}
        </KeyboardAwareScrollView>
      </KeyboardAvoidingView>
    </ScreenBackground>
  );
}
const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { flexGrow: 1, padding: 24, paddingBottom: 40 },
  back: { minHeight: 44, justifyContent: 'center', marginBottom: 20 },
  link: { color: colors.primaryDark, fontSize: 14, fontWeight: '700' },
  title: {
    fontSize: 28,
    lineHeight: 38,
    fontWeight: '800',
    color: colors.text,
  },
  description: {
    fontSize: 13,
    lineHeight: 21,
    color: colors.textMuted,
    marginTop: 8,
  },
  card: {
    backgroundColor: '#fff',
    padding: 22,
    borderRadius: 28,
    gap: 18,
    marginTop: 28,
  },
  email: { color: colors.text, fontSize: 17, fontWeight: '700' },
  error: { color: colors.danger, fontSize: 12 },
});
