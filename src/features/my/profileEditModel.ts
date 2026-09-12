// 작성자: 김진우 — 프로필 수정은 온보딩 상태나 원천 건강 기록을 변경하지 않는다.
import type {
  ProfileOption,
  UpdateProfileRequest,
  UserProfile,
} from '../../shared/types/api';
import { isValidBirthDate } from '../../shared/utils/birthDate';
export const conditionOptions = [
  ['hypertension', '고혈압'],
  ['diabetes', '당뇨'],
  ['dyslipidemia', '고지혈증'],
  ['other', '기타'],
] as const;
export const smokingOptions = [
  ['never', '비흡연'],
  ['former', '과거 흡연'],
  ['current', '현재 흡연'],
] as const;
export const alcoholOptions = [
  ['none', '안 마심'],
  ['monthly_1_2', '월 1~2회'],
  ['weekly_1_2', '주 1~2회'],
  ['weekly_3_plus', '주 3회+'],
] as const;
export function profileDraft(profile: UserProfile) {
  return {
    name: profile.name ?? '',
    birthDate: profile.birthDate ?? '',
    sex: profile.sex ?? '',
    heightCm: profile.heightCm == null ? '' : String(profile.heightCm),
    weightKg: profile.weightKg == null ? '' : String(profile.weightKg),
    smokingStatus: profile.smokingStatus ?? '',
    alcoholFrequency: profile.alcoholFrequency ?? '',
    chronicConditions: [...profile.chronicConditions],
    allergies: profile.allergies.map(a => a.displayName).join(', '),
    healthCautions: profile.healthCautions ?? '',
  };
}
export type ProfileDraft = ReturnType<typeof profileDraft>;
export function profileErrors(draft: ProfileDraft): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!draft.name.trim() || draft.name.trim().length > 50)
    errors.name = '이름을 1~50자로 입력해 주세요.';
  if (!isValidBirthDate(draft.birthDate))
    errors.birthDate = '올바른 생년월일을 선택해 주세요.';
  if (!['Male', 'Female'].includes(draft.sex))
    errors.sex = '성별을 선택해 주세요.';
  for (const [key, min, max, unit] of [
    ['heightCm', 30, 250, 'cm'],
    ['weightKg', 2, 500, 'kg'],
  ] as const) {
    const value = draft[key].trim();
    if (
      !/^\d+(\.\d{1,2})?$/.test(value) ||
      Number(value) < min ||
      Number(value) > max
    )
      errors[key] = `${min}~${max}${unit}, 소수 둘째 자리까지 입력해 주세요.`;
  }
  if (!smokingOptions.some(o => o[0] === draft.smokingStatus))
    errors.smokingStatus = '흡연 상태를 선택해 주세요.';
  if (!alcoholOptions.some(o => o[0] === draft.alcoholFrequency))
    errors.alcoholFrequency = '음주 빈도를 선택해 주세요.';
  if (draft.allergies.split(',').some(a => a.trim().length > 100))
    errors.allergies = '알레르기 항목은 각각 100자 이내로 입력해 주세요.';
  if (draft.healthCautions.length > 1000)
    errors.healthCautions = '주의사항은 1000자 이내로 입력해 주세요.';
  return errors;
}
export function profilePatch(
  original: UserProfile,
  draft: ProfileDraft,
): UpdateProfileRequest {
  const initial = profileDraft(original);
  const result: UpdateProfileRequest = {};
  for (const field of [
    'name',
    'birthDate',
    'sex',
    'smokingStatus',
    'alcoholFrequency',
    'healthCautions',
  ] as const) {
    const value = draft[field].trim();
    if (value !== initial[field]) Object.assign(result, { [field]: value });
  }
  for (const field of ['heightCm', 'weightKg'] as const)
    if (Number(draft[field]) !== original[field])
      result[field] = Number(draft[field]);
  if (
    JSON.stringify(draft.chronicConditions) !==
    JSON.stringify(initial.chronicConditions)
  )
    result.chronicConditions = draft.chronicConditions;
  if (draft.allergies !== initial.allergies)
    result.allergies = [
      ...new Set(
        draft.allergies
          .split(',')
          .map(v => v.trim())
          .filter(Boolean),
      ),
    ].map(
      name =>
        original.allergies.find(a => a.displayName === name) ?? {
          displayName: name,
          source: 'user' as const,
        },
    );
  return result;
}
export function toggleCondition(
  current: ProfileOption[],
  key: string,
  label: string,
): ProfileOption[] {
  return current.some(c => c.canonicalKey === key)
    ? current.filter(c => c.canonicalKey !== key)
    : [...current, { canonicalKey: key, displayName: label, source: 'user' }];
}
