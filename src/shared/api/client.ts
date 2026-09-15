import axios, { AxiosError } from 'axios';
import Config from 'react-native-config';
import { tokenStorage } from '../storage/tokenStorage';
import { ApiEnvelope, ApiErrorBody } from '../types/api';
import { isUnauthorizedStatus, unwrapApiEnvelope } from './envelope';

export class ApiError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status: number,
    public readonly traceId?: string,
  ) {
    super(message);
  }
}

let unauthorizedHandler: (() => void) | undefined;
export const setUnauthorizedHandler = (handler: () => void) => {
  unauthorizedHandler = handler;
};

export const apiClient = axios.create({
  baseURL: Config.API_BASE_URL || 'http://10.0.2.2:8080',
  timeout: 12000,
});

apiClient.interceptors.request.use(async config => {
  if (config.url === '/api/auth/signup' || config.url === '/api/auth/login') {
    return config;
  }
  const tokens = await tokenStorage.get();
  const expected = config.headers.Authorization;
  const actual = tokens
    ? `${tokens.tokenType || 'Bearer'} ${tokens.accessToken}`
    : undefined;
  if (expected && expected !== actual)
    throw new Error('로그인 계정이 변경되어 요청을 중단했어요.');
  if (tokens)
    config.headers.Authorization = `${tokens.tokenType || 'Bearer'} ${
      tokens.accessToken
    }`;
  return config;
});

apiClient.interceptors.response.use(
  response => {
    return {
      ...response,
      heapyMeta: (response.data as ApiEnvelope<unknown>)?.meta,
      data: unwrapApiEnvelope(response.data as ApiEnvelope<unknown>),
    };
  },
  async (error: AxiosError<ApiErrorBody>) => {
    const body = error.response?.data;
    const status = error.response?.status ?? 0;
    const currentTokens = await tokenStorage.get();
    const currentAuthorization = currentTokens
      ? `${currentTokens.tokenType || 'Bearer'} ${currentTokens.accessToken}`
      : undefined;
    if (
      isUnauthorizedStatus(status) &&
      error.config?.headers.Authorization === currentAuthorization
    ) {
      await tokenStorage.clear();
      unauthorizedHandler?.();
    }
    throw new ApiError(
      body?.code ?? 'NETWORK-001',
      body?.message ?? '서버에 연결할 수 없습니다.',
      status,
      body?.traceId,
    );
  },
);
