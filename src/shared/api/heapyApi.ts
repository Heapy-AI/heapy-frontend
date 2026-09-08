import { apiClient } from './client';
import {
  HomeResponse,
  LoginResponse,
  SignupResponse,
  VerificationEmailResponse,
  TermsItem,
  UpdateProfileRequest,
  UserProfile,
} from '../types/api';

export const heapyApi = {
  async signup(email: string, password: string, key: string) {
    return (
      await apiClient.post<SignupResponse>(
        '/api/auth/signup',
        { email, password },
        { headers: { 'Idempotency-Key': key } },
      )
    ).data;
  },
  async resendVerificationEmail(email: string) {
    return (
      await apiClient.post<VerificationEmailResponse>(
        '/api/auth/email/verification/resend',
        { email },
      )
    ).data;
  },
  async login(email: string, password: string) {
    return (
      await apiClient.post<LoginResponse>('/api/auth/login', {
        email,
        password,
      })
    ).data;
  },
  async getMe(signal?: AbortSignal) {
    return (await apiClient.get<UserProfile>('/api/users/me', { signal })).data;
  },
  async logout(key: string) {
    await apiClient.post<void>('/api/auth/logout', undefined, {
      headers: { 'Idempotency-Key': key },
    });
  },
  async getTerms() {
    return (
      await apiClient.get<TermsItem[]>('/api/terms', {
        params: { includeOptional: true },
      })
    ).data;
  },
  async saveConsents(
    consents: Array<{ termsId: number; action: 'agreed' | 'revoked' }>,
    key: string,
  ) {
    return (
      await apiClient.post<{
        requiredConsentCompleted: boolean;
        nextStep: string;
      }>(
        '/api/users/me/consents',
        { consents, consentSource: 'app' },
        { headers: { 'Idempotency-Key': key } },
      )
    ).data;
  },
  async updateProfile(payload: UpdateProfileRequest) {
    return (
      await apiClient.patch<UserProfile>('/api/users/me/profile', payload)
    ).data;
  },
  async completeOnboarding(key: string, profile: UpdateProfileRequest) {
    return (
      await apiClient.post<{ nextStep: string }>(
        '/api/users/me/onboarding/complete',
        profile,
        { headers: { 'Idempotency-Key': key } },
      )
    ).data;
  },
  async getHome() {
    return (await apiClient.get<HomeResponse>('/api/home')).data;
  },
};
