import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { koreaDate } from './medicationForm';

// 작성자: 김진우 — 자정과 앱 복귀 때 오늘의 복약 조회 키를 갱신한다.
export function useMedicationToday() {
  const [date, setDate] = useState(koreaDate);
  useEffect(() => {
    const refresh = () => setDate(koreaDate());
    const timer = setInterval(refresh, 30000);
    const subscription = AppState.addEventListener('change', state => {
      if (state === 'active') refresh();
    });
    return () => {
      clearInterval(timer);
      subscription.remove();
    };
  }, []);
  return date;
}
