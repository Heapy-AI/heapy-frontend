import axios, { AxiosError } from 'axios';
import Config from 'react-native-config';
import { tokenStorage } from '../storage/tokenStorage';
import { ApiErrorBody, LoginResponse, Tokens } from '../types/api';
import { unwrapApiEnvelope } from './envelope';
import { ApiError } from './ApiError';

const refreshClient = axios.create({
  baseURL: Config.API_BASE_URL || 'http://10.0.2.2:8080',
  timeout: 12000,
});
let expiredHandler: (() => void) | undefined;
let flight: { token: string; promise: Promise<Tokens | null> } | undefined;

export function setSessionExpiredHandler(handler: () => void) {
  expiredHandler = handler;
}

export async function expireSession(accessToken: string) {
  if (await tokenStorage.clear(accessToken)) expiredHandler?.();
}

/** 갱신은 한 번만 실행하고, 연결 장애에서는 저장된 세션을 유지한다. 작성자: 김진우 */
export async function getValidSession(
  forceRefresh = false,
): Promise<Tokens | null> {
  const current = await tokenStorage.get();
  if (!current) return null;
  if (
    !forceRefresh &&
    current.nextStep &&
    Date.parse(current.expiresAt) > Date.now() + 60000
  )
    return current;
  if (!current.refreshToken) {
    await expireSession(current.accessToken);
    return null;
  }
  if (flight?.token === current.refreshToken) return flight.promise;
  const promise = refresh(current);
  flight = { token: current.refreshToken, promise };
  try {
    return await promise;
  } finally {
    if (flight?.promise === promise) flight = undefined;
  }
}

async function refresh(current: Tokens): Promise<Tokens | null> {
  let updated: LoginResponse;
  try {
    const response = await refreshClient.post('/api/auth/refresh', {
      refreshToken: current.refreshToken,
    });
    updated = unwrapApiEnvelope<LoginResponse>(response.data);
  } catch (error) {
    const response = (error as AxiosError<ApiErrorBody>).response;
    if (response?.status === 401 || response?.status === 403) {
      await expireSession(current.accessToken);
      throw new ApiError(
        'AUTH-003',
        '로그인 세션이 종료됐어요. 다시 로그인해 주세요.',
        401,
      );
    }
    throw new ApiError(
      response?.data?.code || 'NETWORK-001',
      '로그인 상태를 확인하지 못했어요. 연결 상태를 확인하고 다시 시도해 주세요.',
      response?.status || 0,
    );
  }
  if (
    !updated?.accessToken ||
    !updated.refreshToken ||
    !updated.nextStep ||
    !(Date.parse(updated.expiresAt) > Date.now())
  ) {
    throw new ApiError(
      'SESSION-INVALID',
      '로그인 갱신 응답을 확인하지 못했어요. 다시 시도해 주세요.',
      502,
    );
  }
  if (!(await tokenStorage.replaceIfCurrent(current.accessToken, updated))) {
    throw new ApiError(
      'SESSION-CHANGED',
      '로그인 계정이 변경되어 요청을 중단했어요.',
      409,
    );
  }
  return updated;
}
