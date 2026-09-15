import { useQueryClient } from '@tanstack/react-query';
import { notificationKeys } from '../notifications/notificationApi';
import { useEffect } from 'react';
import { AppState, Platform } from 'react-native';
import { NavigationContainerRefWithCurrent } from '@react-navigation/native';
import { RootRoute, RootStackParamList } from '../../navigation/routes';
import {
  connectMedicationPush,
  readMedicationNotification,
} from './medicationPush';

// 작성자: 김진우 — 알림 열기는 로그인 완료 후 소유권을 확인한 복약 화면으로만 연결한다.
export function useMedicationPush(
  navigation: NavigationContainerRefWithCurrent<RootStackParamList>,
  route?: RootRoute,
) {
  const client = useQueryClient();
  useEffect(() => {
    if (
      Platform.OS !== 'android' ||
      !route ||
      [
        'Login',
        'Signup',
        'Terms',
        'BasicProfile',
        'BodyProfile',
        'Lifestyle',
        'HealthBackground',
        'ProfileComplete',
      ].includes(route)
    )
      return;
    let stopped = false;
    let reading = false;
    const open = async () => {
      if (stopped || reading || !navigation.isReady()) return;
      reading = true;
      try {
        const notification = await readMedicationNotification();
        if (notification)
          void client.invalidateQueries({ queryKey: notificationKeys.all });
        if (notification && !stopped)
          navigation.navigate('MedicationManagement', {
            tab: 'schedule',
            notificationId: notification.notificationId,
            intakeId: notification.intakeId,
            scheduledAt: notification.scheduledAt,
          });
      } catch {
        /* 만료·다른 계정의 알림은 서버 검증 후 열지 않는다. */
      } finally {
        reading = false;
      }
    };
    const connect = () => {
      void connectMedicationPush().catch(() => {});
      void open();
    };
    connect();
    const listener = AppState.addEventListener('change', state => {
      if (state === 'active') connect();
    });
    // 이미 열린 앱으로 들어온 Android Intent도 수신한다. 백그라운드 발송에는 사용하지 않는다.
    const timer = setInterval(() => {
      if (AppState.currentState === 'active') void open();
    }, 2000);
    return () => {
      stopped = true;
      listener.remove();
      clearInterval(timer);
    };
  }, [navigation, route, client]);
}
