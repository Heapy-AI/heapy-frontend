import { NativeModules, Platform } from 'react-native';
import { SamsungPermission, SamsungSteps } from './types';

export async function requestSamsungPermissions(): Promise<SamsungPermission> {
  if (Platform.OS !== 'android')
    throw new Error('삼성헬스 연결은 Android 휴대폰에서 사용할 수 있어요.');
  const bridge = NativeModules.HeapySamsungHealth;
  if (!bridge?.requestReadPermissions)
    throw new Error(
      '이 앱 버전에서는 삼성헬스 연결을 준비 중이에요. 나중에 연결할 수 있어요.',
    );
  const result: SamsungPermission = await bridge.requestReadPermissions();
  if (!result.grantedDataTypes.length)
    throw new Error(
      '허용한 데이터가 없어요. 연결하려면 읽기 권한을 선택해 주세요.',
    );
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
