/**
 * @format
 */

import { createIdempotencyKey } from '../src/shared/utils/idempotency';
import {
  routeForNextStep,
  routeForOnboardingStep,
} from '../src/navigation/onboardingFlow';
import { areRequiredTermsSelected } from '../src/features/terms/termsValidation';
import {
  isUnauthorizedStatus,
  unwrapApiEnvelope,
} from '../src/shared/api/envelope';

test('미완료 온보딩은 저장된 단계와 무관하게 처음부터 시작한다', () => {
  expect(routeForOnboardingStep(1)).toBe('BasicProfile');
  expect(routeForOnboardingStep(2)).toBe('BasicProfile');
  expect(routeForOnboardingStep(3)).toBe('BasicProfile');
  expect(routeForOnboardingStep(4)).toBe('BasicProfile');
});

test('멱등성 키를 UUID v4 형식으로 생성한다', () => {
  expect(createIdempotencyKey()).toMatch(
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
  );
});

test('로그인 nextStep을 실제 진입 화면으로 변환한다', () => {
  expect(routeForNextStep('terms', 1)).toBe('BasicProfile');
  expect(routeForNextStep('profile', 3)).toBe('BasicProfile');
  expect(routeForNextStep('home', 6)).toBe('Home');
});

test('성공 응답 봉투에서 data를 해제한다', () => {
  expect(unwrapApiEnvelope({ success: true, data: { value: 7 } })).toEqual({
    value: 7,
  });
});

test('401 상태를 인증 만료로 판별한다', () => {
  expect(isUnauthorizedStatus(401)).toBe(true);
  expect(isUnauthorizedStatus(403)).toBe(false);
});

test('필수 약관이 모두 선택된 경우에만 완료된다', () => {
  const terms = [
    {
      termsId: 1,
      termsCode: 'service',
      version: '1',
      title: '서비스',
      contentUrl: '',
      required: true,
    },
    {
      termsId: 2,
      termsCode: 'marketing',
      version: '1',
      title: '마케팅',
      contentUrl: '',
      required: false,
    },
  ];
  expect(areRequiredTermsSelected(terms, new Set([1]))).toBe(true);
  expect(areRequiredTermsSelected(terms, new Set([2]))).toBe(false);
});
