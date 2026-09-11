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
