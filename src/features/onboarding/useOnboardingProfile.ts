import { useSyncExternalStore } from 'react';
import { onboardingDraft } from './onboardingDraft';
import { UpdateProfileRequest } from '../../shared/types/api';

export const onboardingProfileKey = ['onboarding-profile'] as const;

export function useOnboardingProfile() {
  const data = useSyncExternalStore(onboardingDraft.subscribe, onboardingDraft.get);
  const saveDraft = async (payload: UpdateProfileRequest) => {
    return onboardingDraft.update(payload);
  };
  return { data, saveDraft };
}
