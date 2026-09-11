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
import { HomeScreen } from '../features/home/HomeScreen';
import { tokenStorage } from '../shared/storage/tokenStorage';
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
const Stack = createNativeStackNavigator<RootStackParamList>();
export function RootNavigator() {
  const reducedMotion = useReducedMotion();
  const navigation = useNavigationContainerRef<RootStackParamList>();
  const queryClient = useQueryClient();
  const [route, setRoute] = React.useState<RootRoute>();
  const [activeRoute, setActiveRoute] = React.useState<RootRoute>();
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
        const tokens = await tokenStorage.get();
        if (!tokens) {
          if (active) setRoute('Login');
          return;
        }
        if (!active) return;
        if (
          !tokens.nextStep ||
          !tokens.expiresAt ||
          Date.parse(tokens.expiresAt) <= Date.now()
        ) {
          await tokenStorage.clear();
          if (active) setRoute('Login');
          return;
        }
        setRoute(routeForNextStep(tokens.nextStep, 1));
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
  if (loadError)
    return (
      <View style={styles.loading}>
        <Text>로그인 정보를 읽지 못했습니다. 다시 로그인해 주세요.</Text>
        <PrimaryButton
          label="다시 시도"
          onPress={() => setAttempt(value => value + 1)}
        />
        <PrimaryButton
          label="로그인 화면으로"
          onPress={() => {
            setLoadError(false);
            setRoute('Login');
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
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
});
