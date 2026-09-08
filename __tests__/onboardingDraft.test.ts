import { onboardingDraft } from '../src/features/onboarding/onboardingDraft';

beforeEach(() => onboardingDraft.clear());

test('단계를 이동해도 입력이 병합되어 마지막 요청에 포함된다', () => {
  onboardingDraft.update({ name: '테스트', onboardingStep: 2 });
  onboardingDraft.update({ heightCm: 170, onboardingStep: 3 });
  expect(onboardingDraft.get()).toMatchObject({ name: '테스트', heightCm: 170 });
});

test('뒤로가기 전의 미완성 입력도 원문 그대로 보존한다', () => {
  onboardingDraft.writeField('body', { heightCm: '17.', weightKg: '' });
  expect(onboardingDraft.readField('body', {})).toEqual({ heightCm: '17.', weightKg: '' });
});

test('세션을 초기화하면 입력과 완료 전 데이터가 모두 사라진다', () => {
  onboardingDraft.update({ name: '테스트' });
  onboardingDraft.writeField('allergies', '땅콩');
  onboardingDraft.clear();
  expect(onboardingDraft.get()).toEqual({ onboardingStep: 1 });
  expect(onboardingDraft.readField('allergies', '')).toBe('');
});
