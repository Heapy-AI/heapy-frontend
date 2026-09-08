import { UpdateProfileRequest } from '../../shared/types/api';

// 작성자: 김진우. 입력은 JS 실행 중에만 유지하며 디스크에는 저장하지 않는다.
const empty = (): UpdateProfileRequest => ({ onboardingStep: 1 });
let profile = empty();
let fields: Record<string, unknown> = {};
const listeners = new Set<() => void>();

export const onboardingDraft = {
  get: () => profile,
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => { listeners.delete(listener); };
  },
  update(payload: Partial<UpdateProfileRequest>) {
    profile = { ...profile, ...payload };
    listeners.forEach(listener => listener());
    return profile;
  },
  readField<T>(name: string, fallback: T): T {
    return (fields[name] as T | undefined) ?? fallback;
  },
  writeField<T>(name: string, value: T) { fields[name] = value; },
  clear() {
    profile = empty();
    fields = {};
    listeners.forEach(listener => listener());
  },
};
