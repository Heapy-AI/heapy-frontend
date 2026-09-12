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
import { HeapyLogo } from '../../shared/components/HeapyLogo';
import LinearGradient from 'react-native-linear-gradient';

const schema = z.object({
  email: z.string().trim().email('이메일 형식을 확인해 주세요.'),
  password: z.string().min(8, '비밀번호는 8자 이상이어야 합니다.').max(256),
});
type FormValues = z.infer<typeof schema>;
type Props = NativeStackScreenProps<RootStackParamList, 'Login'>;

export function LoginScreen({ navigation }: Props) {
  const [availableHeight, setAvailableHeight] = React.useState(800);
  const compact = availableHeight < 780;
  const short = availableHeight < 620;
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
        onLayout={event => setAvailableHeight(event.nativeEvent.layout.height)}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <KeyboardAwareScrollView
          bounces={false}
          contentContainerStyle={[
            styles.container,
            compact && styles.compactContainer,
          ]}
        >
          <View style={styles.brand}>
            <View style={styles.brandMark}>
              <HeapyLogo size={38} />
              <Text style={styles.brandText}>HEAPY</Text>
            </View>
            <Text style={styles.brandNote}>나를 위한 건강 루틴</Text>
          </View>
          <View style={[styles.intro, compact && styles.compactIntro]}>
            <Text style={[styles.headline, compact && styles.compactHeadline]}>
              로그인하고{`\n`}
              <Text style={styles.headlineAccent}>건강 관리를 시작해요</Text>
            </Text>
            {!short && (
              <Text style={styles.description}>
                내 건강 데이터를 안전하게 연결하고 관리해 보세요
              </Text>
            )}
          </View>
          {!short && (
            <View
              style={[styles.heroStage, compact && styles.compactHeroStage]}
            >
              <LinearGradient
                pointerEvents="none"
                colors={['#EBFBF400', '#D9F7EE', '#EDF7FF00']}
                start={{ x: 0, y: 0.5 }}
                end={{ x: 1, y: 0.5 }}
                style={styles.heroBase}
              />
              <Image
                source={require('../../assets/images/login-hero.png')}
                resizeMode="contain"
                style={[styles.hero, compact && styles.compactHero]}
                accessibilityLabel="HEAPY 건강 파트너 캐릭터"
              />
            </View>
          )}
          <View style={[styles.card, compact && styles.compactCard]}>
            <View style={styles.cardHeading}>
              <Text style={styles.cardTitle}>이메일 로그인</Text>
              <View style={styles.cardAccent} />
            </View>
            <Controller
              control={control}
              name="email"
              render={({ field: { value, onChange, onBlur } }) => (
                <FormField
                  label="이메일"
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  underlineColorAndroid="transparent"
                  placeholder="이메일 주소를 입력해 주세요"
                  style={[styles.input, !!errors.email && styles.inputError]}
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
                  underlineColorAndroid="transparent"
                  placeholder="비밀번호를 입력해 주세요"
                  style={[styles.input, !!errors.password && styles.inputError]}
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
            <View style={styles.submit}>
              <PrimaryButton
                label="로그인"
                onPress={handleSubmit(values => mutation.mutate(values))}
                loading={mutation.isPending}
              />
            </View>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="처음이신가요? 회원가입"
            onPress={() => navigation.navigate('Signup')}
            style={styles.signup}
          >
            <Text style={styles.signupPrompt}>처음이신가요?</Text>
            <Text style={styles.signupText}>회원가입</Text>
          </Pressable>
        </KeyboardAwareScrollView>
      </KeyboardAvoidingView>
    </ScreenBackground>
  );
}
// 작성자: 김진우 — 실제 표시 높이에 맞춰 장식과 여백을 줄이고 입력과 회원가입 접근을 우선한다.
const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: {
    flexGrow: 1,
    paddingHorizontal: 22,
    paddingTop: 12,
    paddingBottom: 12,
  },
  signup: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    alignItems: 'center',
    padding: 14,
    minHeight: 48,
  },
  signupPrompt: { color: '#71868D', fontSize: 13 },
  signupText: { color: '#128B8D', fontSize: 13, fontWeight: '700' },
  brand: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  brandMark: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  brandText: {
    fontSize: 18,
    letterSpacing: 1.4,
    fontWeight: '800',
    color: '#235363',
  },
  brandNote: { fontSize: 10, color: '#6D8F95', flexShrink: 1 },
  intro: { marginTop: 24, gap: 10 },
  headlineAccent: { color: '#139D9B' },
  heroStage: {
    height: 146,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
  },
  heroBase: {
    position: 'absolute',
    bottom: 5,
    height: 36,
    width: '90%',
    borderRadius: 30,
  },
  hero: { width: 206, height: 154 },
  headline: {
    fontSize: 26,
    lineHeight: 35,
    fontWeight: '800',
    color: '#294B5A',
    letterSpacing: -0.8,
  },
  description: { fontSize: 12, lineHeight: 19, color: '#6B848D' },
  card: {
    backgroundColor: '#fff',
    borderRadius: 27,
    padding: 22,
    gap: 20,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#E1F1F0',
    boxShadow:
      '0px 10px 28px rgba(39, 116, 131, 0.10), 0px 2px 4px rgba(39, 116, 131, 0.03)',
  },
  cardHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardAccent: {
    width: 26,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#38C6B3',
  },
  cardTitle: { fontSize: 16, fontWeight: '800', color: '#294B5A' },
  input: {
    outlineWidth: 0,
    height: 54,
    borderRadius: 15,
    backgroundColor: '#F5F9FA',
    borderColor: '#E3ECEF',
    fontSize: 14,
    fontWeight: '500',
    paddingHorizontal: 15,
  },
  compactContainer: { paddingTop: 6, paddingBottom: 6 },
  compactIntro: { marginTop: 10, gap: 6 },
  compactHeadline: { fontSize: 23, lineHeight: 30 },
  compactHeroStage: { height: 84, marginTop: 2 },
  compactHero: { width: 126, height: 90 },
  compactCard: { padding: 17, gap: 13, marginTop: 10 },
  inputError: { borderColor: colors.danger },
  submit: {
    borderRadius: 18,
    marginTop: 2,
    boxShadow: '0px 5px 12px rgba(30, 165, 169, 0.18)',
  },
  error: { color: colors.danger, fontSize: 12 },
});
