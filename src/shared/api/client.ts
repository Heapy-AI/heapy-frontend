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
      data: unwrapApiEnvelope(response.data as ApiEnvelope<unknown>),
    };
  },
  async (error: AxiosError<ApiErrorBody>) => {
    const body = error.response?.data;
    const status = error.response?.status ?? 0;
    if (isUnauthorizedStatus(status)) {
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
