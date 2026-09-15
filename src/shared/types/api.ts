export type NextStep = 'terms' | 'profile' | 'home';
export type Sex = 'Male' | 'Female';
export type SmokingStatus = 'never' | 'former' | 'current';
export type AlcoholFrequency =
  | 'none'
  | 'monthly_1_2'
  | 'weekly_1_2'
  | 'weekly_3_plus';

export interface ApiEnvelope<T> {
  success: boolean;
  data: T;
  message?: string;
  meta?: unknown;
}
export interface ApiErrorBody {
  success: false;
  status: number;
  code: string;
  message: string;
  errors?: Array<{ field: string; reason: string }>;
  traceId?: string;
}
export interface Tokens {
  nextStep?: NextStep;
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresAt: string;
}
export interface LoginResponse extends Tokens {
  expiresIn: number;
  nextStep: NextStep;
  onboardingStep: number;
  user: { userId: string; email: string; emailVerified: boolean };
}
export interface SignupResponse {
  userId: string;
  email: string;
  emailVerificationRequired: boolean;
  verificationEmailSent: boolean;
  nextStep: 'emailVerification' | 'login';
}
export interface VerificationEmailResponse {
  verificationEmailSent: boolean;
  retryAfterSeconds: number;
}
export interface ProfileOption {
  canonicalKey?: string;
  displayName: string;
  source: 'user' | 'normalized';
}
export interface UserProfile {
  userId: string;
  name?: string;
  birthDate?: string;
  sex?: Sex;
  heightCm?: number;
  weightKg?: number;
  smokingStatus?: SmokingStatus;
  alcoholFrequency?: AlcoholFrequency;
  chronicConditions: ProfileOption[];
  allergies: ProfileOption[];
  healthCautions?: string;
  onboardingStep: number;
  onboardingCompleted: boolean;
  onboardingCompletedAt?: string;
  requiredConsentCompleted: boolean;
}
export interface UpdateProfileRequest {
  name?: string;
  birthDate?: string;
  sex?: Sex;
  heightCm?: number;
  weightKg?: number;
  smokingStatus?: SmokingStatus;
  alcoholFrequency?: AlcoholFrequency;
  chronicConditions?: ProfileOption[];
  allergies?: ProfileOption[];
  healthCautions?: string;
  onboardingStep?: number;
}
export interface TermsItem {
  termsId: number;
  termsCode: string;
  version: string;
  title: string;
  contentUrl: string;
  required: boolean;
  consentStatus?: string;
}
export interface HomeModule {
  moduleCode:
    | 'daily_briefing'
    | 'key_metrics'
    | 'medication'
    | 'missions'
    | string;
  visible: boolean;
  displayOrder: number;
  state: string;
  content: unknown;
  emptyStateAction?: string;
}
export interface HomeResponse {
  date: string;
  alerts: unknown[];
  modules: HomeModule[];
}
