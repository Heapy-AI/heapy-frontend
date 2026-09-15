import {
  AppState,
  NativeModules,
  PermissionsAndroid,
  Platform,
} from 'react-native';
import { ApiError, apiClient } from '../../shared/api/client';
import { heapyApi } from '../../shared/api/heapyApi';
import { tokenStorage } from '../../shared/storage/tokenStorage';
import { createIdempotencyKey } from '../../shared/utils/idempotency';

type Registration = {
  deviceIdentifier: string;
  platform: 'android';
  pushToken: string;
};
type PushBridge = {
  session(userId: string, expiresAt: string): Promise<void>;
  registration(): Promise<Registration>;
  pending(): Promise<string | null>;
  acknowledge(id: string): Promise<void>;
};
const bridge = () => NativeModules.HeapyPush as PushBridge | undefined;
let pendingSync: Promise<void> | undefined;

// 작성자: 김진우 — 토큰 원문은 로그·일반 저장소에 보관하지 않는다.
export async function connectMedicationPush(
  requestPermission = false,
): Promise<void> {
  if (Platform.OS !== 'android' || !bridge())
    throw new Error('앱을 다시 빌드한 뒤 알림을 연결해 주세요.');
  if (requestPermission && Number(Platform.Version) >= 33) {
    const result = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
    );
    if (result !== PermissionsAndroid.RESULTS.GRANTED)
      throw new Error('휴대폰 설정에서 HEAPY 알림을 허용해 주세요.');
  }
  if (pendingSync) return pendingSync;
  const task = (async () => {
    const tokens = await tokenStorage.get();
    if (!tokens) return;
    const headers = {
      Authorization: `${tokens.tokenType || 'Bearer'} ${tokens.accessToken}`,
      'Idempotency-Key': createIdempotencyKey(),
    };
    const me = await heapyApi.getMe();
    if ((await tokenStorage.get())?.accessToken !== tokens.accessToken) return;
    await bridge()!.session(me.userId, tokens.expiresAt);
    const registration = await bridge()!.registration();
    await apiClient.post('/api/devices/push-tokens', registration, { headers });
  })();
  pendingSync = task;
  try {
    await task;
  } finally {
    if (pendingSync === task) pendingSync = undefined;
  }
}

export async function readMedicationNotification() {
  if (
    Platform.OS !== 'android' ||
    !bridge() ||
    AppState.currentState !== 'active'
  )
    return;
  const id = await bridge()!.pending();
  if (!id) return;
  try {
    const result = (
      await apiClient.post<{
        notificationId: string;
        intakeId: string;
        scheduledAt: string;
      }>(`/api/notifications/${encodeURIComponent(id)}/open`, undefined, {
        headers: { 'Idempotency-Key': createIdempotencyKey() },
      })
    ).data;
    await bridge()!.acknowledge(id);
    return result;
  } catch (error) {
    if (
      error instanceof ApiError &&
      [400, 403, 404, 410].includes(error.status)
    )
      await bridge()!.acknowledge(id);
    throw error;
  }
}
