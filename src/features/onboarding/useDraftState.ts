import { useState, Dispatch, SetStateAction } from 'react';
import { onboardingDraft } from './onboardingDraft';

export function useDraftState<T>(name: string, fallback: T): [T, Dispatch<SetStateAction<T>>] {
  const [value, setValue] = useState(() => onboardingDraft.readField(name, fallback));
  const update: Dispatch<SetStateAction<T>> = next => {
    const resolved = typeof next === 'function'
      ? (next as (previous: T) => T)(onboardingDraft.readField(name, fallback))
      : next;
    onboardingDraft.writeField(name, resolved);
    setValue(resolved);
  };
  return [value, update];
}
