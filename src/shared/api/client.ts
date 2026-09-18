import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import Config from 'react-native-config';
import { tokenStorage } from '../storage/tokenStorage';
import { ApiEnvelope, ApiErrorBody } from '../types/api';
import { unwrapApiEnvelope } from './envelope';
import { ApiError } from './ApiError';
import {
  expireSession,
  getValidSession,
  setSessionExpiredHandler,
} from './authSession';

export { ApiError } from './ApiError';
export const setUnauthorizedHandler = setSessionExpiredHandler;
type SessionRequest = InternalAxiosRequestConfig & { heapyRetried?: boolean };
const publicRequest = (url?: string) =>
  ['/api/auth/signup', '/api/auth/login', '/api/auth/refresh'].includes(
    url || '',
  );

export const apiClient = axios.create({
  baseURL: Config.API_BASE_URL || 'http://10.0.2.2:8080',
  timeout: 12000,
});

apiClient.interceptors.request.use(async config => {
  if (publicRequest(config.url)) return config;
  const tokens = await getValidSession();
  const expected = config.headers.Authorization;
  const actual = tokens
    ? `${tokens.tokenType || 'Bearer'} ${tokens.accessToken}`
    : undefined;
  if (expected && expected !== actual)
    throw new ApiError(
      'SESSION-CHANGED',
      '로그인 계정이 변경되어 요청을 중단했어요.',
      409,
    );
  if (actual) config.headers.Authorization = actual;
  return config;
});

apiClient.interceptors.response.use(
  response => ({
    ...response,
    heapyMeta: (response.data as ApiEnvelope<unknown>)?.meta,
    data: unwrapApiEnvelope(response.data as ApiEnvelope<unknown>),
  }),
  async (error: AxiosError<ApiErrorBody> | ApiError) => {
    if (error instanceof ApiError) throw error;
    const body = error.response?.data;
    const status = error.response?.status ?? 0;
    const config = error.config as SessionRequest | undefined;
    // 작성자: 김진우 — 로그인 실패는 화면의 입력 오류다. 전역 로그아웃으로 폼을 초기화하지 않는다.
    if (status === 401 && config && !publicRequest(config.url)) {
      const current = await tokenStorage.get();
      const authorization = current
        ? `${current.tokenType || 'Bearer'} ${current.accessToken}`
        : undefined;
      if (current && config.headers.Authorization === authorization) {
        if (!config.heapyRetried) {
          const refreshed = await getValidSession(true);
          if (refreshed) {
            config.heapyRetried = true;
            config.headers.Authorization = `${
              refreshed.tokenType || 'Bearer'
            } ${refreshed.accessToken}`;
            return apiClient.request(config);
          }
        } else {
          await expireSession(current.accessToken);
        }
      }
    }
    throw new ApiError(
      body?.code ?? (status === 401 ? 'AUTH-001' : 'NETWORK-001'),
      body?.message ??
        (status === 401
          ? '이메일 또는 비밀번호를 확인해 주세요.'
          : '서버에 연결할 수 없습니다.'),
      status,
      body?.traceId,
    );
  },
);
