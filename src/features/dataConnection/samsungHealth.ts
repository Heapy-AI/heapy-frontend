import { NativeModules, Platform } from 'react-native';
import type { SyncRecord } from './healthSyncApi';
import { SamsungPermission, SamsungSteps } from './types';

// 작성자: 김진우 — 권한과 데이터 유무는 별개이며 설계의 11개 읽기 동의가 연결 조건이다.
export const REQUIRED_SAMSUNG_TYPES = [
  'sleep',
  'heart_rate',
  'blood_glucose',
  'blood_pressure',
  'body_composition',
  'exercise',
  'floors',
  'steps',
  'activity',
  'water',
  'nutrition',
] as const;
export const hasRequiredSamsungPermissions = (types: readonly string[]) =>
  REQUIRED_SAMSUNG_TYPES.every(type => types.includes(type));

export async function requestSamsungPermissions(): Promise<SamsungPermission> {
  if (Platform.OS !== 'android')
    throw new Error('삼성헬스 연결은 Android 휴대폰에서 사용할 수 있어요.');
  const bridge = NativeModules.HeapySamsungHealth;
  if (!bridge?.requestReadPermissions)
    throw new Error(
      '이 앱 버전에서는 삼성헬스 연결을 준비 중이에요. 나중에 연결할 수 있어요.',
    );
  const result: SamsungPermission = await bridge.requestReadPermissions();
  return result;
}

// 작성자: 고수연 — 같은 오류가 화면에 따라 다른 뜻이 된다. 내건강에서 새로고침한 사람에게
// 필요한 다음 행동은 '연동 상태를 확인하라'이고, 연동 화면에 서 있는 사람에게는 '개발자 모드를
// 켜라'다. 네이티브의 한 줄로는 둘을 다 담을 수 없어 화면 쪽에서 가른다.
export const SAMSUNG_NOT_CONNECTED =
  '삼성 헬스가 연동되어 있지 않습니다. 마이페이지에서 연동 여부를 확인해 주세요.';
export const SAMSUNG_BETA_DEVELOPER_MODE =
  '베타 버전에서는 개발자 모드 직접 설정이 필요합니다. 설정 방법 보기를 따라주세요.';

// 개발자 모드가 꺼져 있을 때 나는 오류다. 이때는 안내가 필요하다는 뜻이라 시트를 띄운다.
//
// 네이티브가 이 갈래에만 SAMSUNG_DEVELOPER_MODE 라는 이름을 붙인다. 문구까지 함께 보는 것은
// 그 이름이 없는 옛 빌드에서도 알아보기 위해서다. 문구는 우리가 쓴 것이라 바뀌면 여기도 바꾼다.
export const needsDeveloperMode = (error: unknown) => {
  const failure = error as { code?: unknown; message?: unknown };
  if (failure?.code === 'SAMSUNG_DEVELOPER_MODE') return true;
  return (
    typeof failure?.message === 'string' && failure.message.includes('개발자 모드')
  );
};
// 작성자: 고수연 — 삼성 헬스 앱을 연다. 홈까지만 간다.
//
// 설정·정보 화면으로 바로 보내려고 내부 액티비티와 인텐트 필터의 액션까지 시도해 봤지만
// 기기에서 열리지 않았다. 남은 단계는 안내 시트가 글과 그림으로 말한다.
export async function openSamsungHealth(): Promise<void> {
  if (Platform.OS !== 'android')
    throw new Error('삼성헬스 연결은 Android 휴대폰에서 사용할 수 있어요.');
  const bridge = NativeModules.HeapySamsungHealth;
  if (!bridge?.openSamsungHealth)
    throw new Error(
      '이 앱 버전에서는 바로 열 수 없어요. 삼성 헬스를 직접 실행해 주세요.',
    );
  await bridge.openSamsungHealth();
}

export async function readSamsungTodaySteps(): Promise<SamsungSteps> {
  if (
    Platform.OS !== 'android' ||
    !NativeModules.HeapySamsungHealth?.readTodaySteps
  )
    throw new Error(
      '삼성헬스 걸음 수 읽기는 최신 Android 앱에서 사용할 수 있어요.',
    );
  return NativeModules.HeapySamsungHealth.readTodaySteps();
}

export type HealthPageOptions = {
  dataType: string;
  from: string;
  to: string;
  changes: boolean;
  pageToken?: string;
  cutoff?: string;
};
export async function getSamsungPermissions(): Promise<SamsungPermission> {
  if (
    Platform.OS !== 'android' ||
    !NativeModules.HeapySamsungHealth?.getReadPermissions
  )
    throw new Error(
      '건강 기록 동기화가 포함된 최신 Android 앱으로 업데이트해 주세요.',
    );
  return NativeModules.HeapySamsungHealth.getReadPermissions();
}
export async function readSamsungHealthPage(
  options: HealthPageOptions,
): Promise<{ records: SyncRecord[]; nextPageToken?: string | null }> {
  if (
    Platform.OS !== 'android' ||
    !NativeModules.HeapySamsungHealth?.readHealthPage
  )
    throw new Error(
      '건강 기록 동기화가 포함된 최신 Android 앱으로 업데이트해 주세요.',
    );
  return NativeModules.HeapySamsungHealth.readHealthPage(options);
}
