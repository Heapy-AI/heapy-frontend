import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import {
  NavigationContainer,
  useNavigationContainerRef,
} from '@react-navigation/native';
import { useQueryClient } from '@tanstack/react-query';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { RootRoute, RootStackParamList } from './routes';
import {
  createSessionNavigationState,
  routeForNextStep,
} from './onboardingFlow';
import { LoginScreen } from '../features/auth/LoginScreen';
import { SignupScreen } from '../features/auth/SignupScreen';
import { TermsScreen } from '../features/terms/TermsScreen';
import { BasicProfileScreen } from '../features/onboarding/BasicProfileScreen';
import { BodyProfileScreen } from '../features/onboarding/BodyProfileScreen';
import { LifestyleScreen } from '../features/onboarding/LifestyleScreen';
import { HealthBackgroundScreen } from '../features/onboarding/HealthBackgroundScreen';
import { AccountWithdrawalScreen } from '../features/my/AccountWithdrawalScreen';
import { ProfileEditScreen } from '../features/my/ProfileEditScreen';
import { HomeScreen } from '../features/home/HomeScreen';
import { tokenStorage } from '../shared/storage/tokenStorage';
import { getValidSession } from '../shared/api/authSession';
import { WelcomeScreen } from '../features/auth/WelcomeScreen';
import { ApiError, setUnauthorizedHandler } from '../shared/api/client';
import { PrimaryButton } from '../shared/components/PrimaryButton';
import { onboardingDraft } from '../features/onboarding/onboardingDraft';
import { colors } from '../shared/theme/tokens';
import { OnboardingShell } from '../shared/components/OnboardingShell';
import { ProfileCompleteScreen } from '../features/dataConnection/ProfileCompleteScreen';
import { DataConnectionScreen } from '../features/dataConnection/DataConnectionScreen';
import { CheckupRegistrationScreen } from '../features/dataConnection/CheckupRegistrationScreen';
import { CheckupDetailScreen } from '../features/dataConnection/CheckupDetailScreen';
import { CheckupHistoryScreen } from '../features/dataConnection/CheckupHistoryScreen';
import { useReducedMotion } from '../shared/hooks/useReducedMotion';
import { MedicationScreen } from '../features/medication/MedicationScreen';
import { MedicationRegistrationScreen } from '../features/medication/MedicationRegistrationScreen';
import { useMedicationPush } from '../features/medication/useMedicationPush';
import { NotificationScreen } from '../features/notifications/NotificationScreen';
const Stack = createNativeStackNavigator<RootStackParamList>();
export function RootNavigator() {
  const [welcomeDone, setWelcomeDone] = React.useState(false);
  const finishWelcome = React.useCallback(() => setWelcomeDone(true), []);
  const reducedMotion = useReducedMotion();
  const navigation = useNavigationContainerRef<RootStackParamList>();
  const queryClient = useQueryClient();
  const [route, setRoute] = React.useState<RootRoute>();
  const [activeRoute, setActiveRoute] = React.useState<RootRoute>();
  useMedicationPush(navigation, activeRoute ?? route);
  const [loadError, setLoadError] = React.useState(false);
  const [attempt, setAttempt] = React.useState(0);
  React.useEffect(() => {
    onboardingDraft.clear();
  }, []);
  React.useEffect(() => {
    let active = true;
    setLoadError(false);
    setUnauthorizedHandler(() => {
      if (!active) return;
      queryClient.clear();
      onboardingDraft.clear();
      if (navigation.isReady())
        navigation.resetRoot(createSessionNavigationState('Login'));
      else setRoute('Login');
    });
    (async () => {
      try {
        const tokens = await getValidSession();
        if (!tokens) {
          if (active) setRoute('Login');
          return;
        }
        if (!active) return;
        setRoute(
          routeForNextStep(
            tokens.nextStep || 'profile',
            tokens.onboardingStep || 1,
          ),
        );
      } catch (error) {
        if (!active) return;
        if (error instanceof ApiError && error.status === 401)
          setRoute('Login');
        else setLoadError(true);
      }
    })();
    return () => {
      active = false;
    };
  }, [attempt, navigation, queryClient]);
  if (!welcomeDone) return <WelcomeScreen onComplete={finishWelcome} />;
  if (loadError)
    return (
      <View style={styles.loading}>
        <Text style={styles.errorCopy}>
          로그인 상태를 확인하지 못했어요.{`\n`}연결 상태를 확인한 뒤 다시
          시도해 주세요.
        </Text>
        <PrimaryButton
          label="다시 시도"
          onPress={() => setAttempt(value => value + 1)}
        />
        <PrimaryButton
          label="로그인 화면으로"
          onPress={() => {
            tokenStorage
              .clear()
              .then(() => {
                setLoadError(false);
                setRoute('Login');
              })
              .catch(() => setLoadError(true));
          }}
        />
      </View>
    );
  if (!route)
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  return (
    <NavigationContainer
      ref={navigation}
      key={route}
      initialState={createSessionNavigationState(route)}
      onStateChange={() =>
        setActiveRoute(navigation.getCurrentRoute()?.name as RootRoute)
      }
    >
      <OnboardingShell
        route={activeRoute ?? route}
        onBack={() => navigation.goBack()}
      >
        <Stack.Navigator
          key={route}
          initialRouteName={route}
          screenOptions={{
            headerShown: false,
            animation: reducedMotion ? 'none' : 'slide_from_right',
            animationDuration: 280,
            contentStyle: { backgroundColor: 'transparent' },
          }}
        >
          <Stack.Screen name="Notifications" component={NotificationScreen} />
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Signup" component={SignupScreen} />
          <Stack.Screen name="Terms" component={TermsScreen} />
          <Stack.Screen name="BasicProfile" component={BasicProfileScreen} />
          <Stack.Screen name="BodyProfile" component={BodyProfileScreen} />
          <Stack.Screen name="Lifestyle" component={LifestyleScreen} />
          <Stack.Screen
            name="HealthBackground"
            component={HealthBackgroundScreen}
          />
          <Stack.Screen
            name="MedicationManagement"
            component={MedicationScreen}
          />
          <Stack.Screen
            name="MedicationRegistration"
            component={MedicationRegistrationScreen}
          />
          <Stack.Screen
            name="ProfileEdit"
            component={ProfileEditScreen}
            options={{ gestureEnabled: false }}
          />
          <Stack.Screen
            name="AccountWithdrawal"
            component={AccountWithdrawalScreen}
            options={{ gestureEnabled: false }}
          />
          <Stack.Screen name="Home" component={HomeScreen} />
          <Stack.Screen name="CheckupDetail" component={CheckupDetailScreen} />
          <Stack.Screen
            name="CheckupHistory"
            component={CheckupHistoryScreen}
          />
          <Stack.Screen
            name="ProfileComplete"
            component={ProfileCompleteScreen}
          />
          <Stack.Screen
            name="DataConnection"
            component={DataConnectionScreen}
          />
          <Stack.Screen
            name="CheckupRegistration"
            component={CheckupRegistrationScreen}
          />
        </Stack.Navigator>
      </OnboardingShell>
    </NavigationContainer>
  );
}
const styles = StyleSheet.create({
  errorCopy: {
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 20,
  },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
});
