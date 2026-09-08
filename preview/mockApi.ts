import type { heapyApi as liveApi } from '../src/shared/api/heapyApi';
import type { TermsItem, UserProfile } from '../src/shared/types/api';
import { ApiError } from './mockClient';

export type PreviewScenario = 'success' | 'slow' | 'error';
let scenario: PreviewScenario = 'success';
export function setPreviewScenario(value: PreviewScenario) {
  scenario = value;
}

const initialProfile = (): UserProfile => ({
  userId: 'preview-user',
  chronicConditions: [],
  allergies: [],
  onboardingStep: 1,
  onboardingCompleted: false,
  requiredConsentCompleted: false,
});
let profile = initialProfile();
export function resetPreviewData() {
  profile = initialProfile();
  terms.forEach(term => {
    term.consentStatus = 'not_agreed';
  });
}

export async function respond<T>(getResult: () => T): Promise<T> {
  const selectedScenario = scenario;
  await new Promise(resolve =>
    setTimeout(resolve, selectedScenario === 'slow' ? 3000 : 250),
  );
  if (selectedScenario === 'error')
    throw new ApiError(
      'PREVIEW-001',
      '미리보기 오류입니다. 다시 시도해 주세요.',
      503,
    );
  return getResult();
}

const terms: TermsItem[] = [
  {
    termsId: 1,
    termsCode: 'service',
    version: 'preview',
    title: '서비스 이용약관',
    contentUrl: '/?terms=service',
    required: true,
  },
  {
    termsId: 2,
    termsCode: 'privacy',
    version: 'preview',
    title: '개인정보 수집 및 이용 동의',
    contentUrl: '/?terms=privacy',
    required: true,
  },
  {
    termsId: 3,
    termsCode: 'health',
    version: 'preview',
    title: '민감정보 수집 및 이용 동의',
    contentUrl: '/?terms=health',
    required: true,
  },
  {
    termsId: 4,
    termsCode: 'marketing',
    version: 'preview',
    title: '마케팅 정보 수신 동의',
    contentUrl: '/?terms=marketing',
    required: false,
  },
];

export const heapyApi: typeof liveApi = {
  signup: async email =>
    respond(() => ({
      userId: 'preview-user',
      email,
      emailVerificationRequired: true,
      verificationEmailSent: true,
      nextStep: 'emailVerification',
    })),
  resendVerificationEmail: async () =>
    respond(() => ({ verificationEmailSent: true, retryAfterSeconds: 60 })),
  login: async email =>
    respond(() => ({
      accessToken: 'preview-only',
      refreshToken: 'preview-only',
      tokenType: 'Bearer',
      expiresAt: '2099-01-01T00:00:00Z',
      expiresIn: 3600,
      nextStep: 'terms',
      onboardingStep: 1,
      user: { userId: 'preview-user', email, emailVerified: true },
    })),
  logout: async () => respond(() => undefined),
  getMe: async () => respond(() => ({ ...profile })),
  getTerms: async () => respond(() => terms),
  saveConsents: async consents =>
    respond(() => {
      terms.forEach(term => {
        term.consentStatus =
          consents.find(consent => consent.termsId === term.termsId)?.action ??
          'not_agreed';
      });
      profile.requiredConsentCompleted = terms
        .filter(term => term.required)
        .every(term =>
          consents.some(
            consent =>
              consent.termsId === term.termsId && consent.action === 'agreed',
          ),
        );
      return {
        requiredConsentCompleted: profile.requiredConsentCompleted,
        nextStep: 'profile',
      };
    }),
  updateProfile: async payload =>
    respond(() => {
      if (payload.onboardingStep < profile.onboardingStep)
        throw new ApiError(
          'ONBOARDING-001',
          '완료한 온보딩 단계는 되돌릴 수 없습니다.',
          409,
        );
      profile = { ...profile, ...payload };
      return { ...profile };
    }),
  completeOnboarding: async (_key, payload) =>
    respond(() => {
      profile = { ...profile, ...payload, onboardingCompleted: true };
      return { nextStep: 'home' };
    }),
  getHome: async () =>
    respond(() => ({
      date: '2026-09-07',
      alerts: [],
      modules: [
        {
          moduleCode: 'daily_briefing',
          visible: true,
          displayOrder: 1,
          state: 'ready',
          content: '나에게 맞는 건강 관리를 시작해 보세요.',
        },
        {
          moduleCode: 'key_metrics',
          visible: true,
          displayOrder: 2,
          state: 'empty',
          content: null,
          emptyStateAction: 'connect_samsung_health',
        },
        {
          moduleCode: 'medication',
          visible: true,
          displayOrder: 3,
          state: 'empty',
          content: null,
          emptyStateAction: 'register_medication',
        },
        {
          moduleCode: 'missions',
          visible: true,
          displayOrder: 4,
          state: 'empty',
          content: null,
          emptyStateAction: 'explore_missions',
        },
      ],
    })),
};
