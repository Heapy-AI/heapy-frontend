import { RootRoute } from './routes';

export const ONBOARDING_TERMS_ENABLED =
  typeof __DEV__ === 'undefined' || !__DEV__;

const onboardingRoutes: RootRoute[] = [
  'BasicProfile',
  'BodyProfile',
  'Lifestyle',
  'HealthBackground',
];

export function createSessionNavigationState(route: RootRoute) {
  if (route === 'Terms' && !ONBOARDING_TERMS_ENABLED) route = 'BasicProfile';
  const stepIndex = onboardingRoutes.indexOf(route);
  const routes = (
    stepIndex < 0 ? [route] : onboardingRoutes.slice(0, stepIndex + 1)
  ).map(name => ({ name }));
  return { index: routes.length - 1, routes };
}

export function previousOnboardingRoute(
  route: RootRoute,
): RootRoute | undefined {
  const index = onboardingRoutes.indexOf(route);
  return index > 0 ? onboardingRoutes[index - 1] : undefined;
}

export const ONBOARDING_STEPS = {
  terms: 1,
  basicProfile: 2,
  bodyProfile: 3,
  lifestyle: 4,
  healthBackground: 5,
  complete: 6,
} as const;

export const routeForOnboardingStep = (_step: number): RootRoute => 'BasicProfile';

export const routeForNextStep = (
  nextStep: 'terms' | 'profile' | 'home',
  onboardingStep: number,
): RootRoute =>
  nextStep === 'terms' && ONBOARDING_TERMS_ENABLED
    ? 'Terms'
    : nextStep === 'home'
    ? 'Home'
    : routeForOnboardingStep(onboardingStep);
