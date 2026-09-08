import { ApiEnvelope } from '../types/api';

export const unwrapApiEnvelope = <T>(payload: ApiEnvelope<T> | T): T => {
  if (typeof payload === 'object' && payload !== null && 'success' in payload) {
    return (payload as ApiEnvelope<T>).data;
  }
  return payload as T;
};

export const isUnauthorizedStatus = (status: number): boolean => status === 401;
