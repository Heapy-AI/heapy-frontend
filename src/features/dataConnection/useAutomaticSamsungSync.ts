import { useEffect } from 'react';
import { AppState, Platform } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { syncSamsungHealth } from './samsungSync';

/** 작성자: 김진우 — 로그인 후 모든 탭에서 조용히 동기화하고 실제 조회만 갱신한다. */
export function useAutomaticSamsungSync() {
  const client = useQueryClient();
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    let disposed = false;
    let running = false;
    const sync = async () => {
      if (disposed || running || AppState.currentState !== 'active') return;
      running = true;
      try {
        const result = await syncSamsungHealth({ automatic: true });
        if (!disposed && result.connected) {
          await Promise.all([
            client.invalidateQueries({ queryKey: ['health'] }),
            client.invalidateQueries({ queryKey: ['health-connections'] }),
            client.invalidateQueries({ queryKey: ['home'] }),
          ]);
        }
      } catch {
        // 자동 실패는 다음 주기에 재시도한다. 사용자 요청 동기화는 기존 오류 화면을 사용한다.
      } finally {
        running = false;
      }
    };
    void sync();
    const timer = setInterval(() => {
      void sync();
    }, 15 * 60000);
    const subscription = AppState.addEventListener('change', state => {
      if (state === 'active') void sync();
    });
    return () => {
      disposed = true;
      clearInterval(timer);
      subscription.remove();
    };
  }, [client]);
}
