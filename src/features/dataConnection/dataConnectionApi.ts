import { apiClient } from '../../shared/api/client';
import {
  CheckupFile,
  ConfirmCheckup,
  HealthConnection,
  OcrJob,
  SamsungPermission,
} from './types';

export const dataConnectionApi = {
  async getConnections() {
    return (await apiClient.get<HealthConnection[]>('/api/health-connections'))
      .data;
  },
  async connectSamsung(payload: SamsungPermission, key: string) {
    return (
      await apiClient.post<HealthConnection>(
        '/api/health-connections/samsung',
        payload,
        { headers: { 'Idempotency-Key': key }, timeout: 45000 },
      )
    ).data;
  },
  async uploadCheckup(file: CheckupFile, key: string, signal: AbortSignal) {
    const body = new FormData();
    // 작성자: 김진우 — 네이티브 FormData의 파일 URI 형식을 사용한다. 웹 미리보기는 별도 어댑터로 대체한다.
    body.append('file', {
      uri: file.uri,
      name: file.name,
      type: file.type,
    } as unknown as Blob);
    body.append('inputType', file.inputType);
    return (
      await apiClient.post<OcrJob>('/api/checkups/ocr-jobs', body, {
        headers: {
          'Idempotency-Key': key,
          'Content-Type': 'multipart/form-data',
        },
        timeout: 60000,
        signal,
      })
    ).data;
  },
  async getJob(jobId: string, signal: AbortSignal) {
    return (
      await apiClient.get<OcrJob>(
        `/api/checkups/ocr-jobs/${encodeURIComponent(jobId)}`,
        { signal, timeout: 25000 },
      )
    ).data;
  },
  async cancelJob(jobId: string) {
    await apiClient.delete(
      '/api/checkups/ocr-jobs/' + encodeURIComponent(jobId),
    );
  },
  async confirm(jobId: string, payload: ConfirmCheckup, key: string) {
    return (
      await apiClient.post<{ recordId: string }>(
        `/api/checkups/ocr-jobs/${encodeURIComponent(jobId)}/confirm`,
        payload,
        { headers: { 'Idempotency-Key': key }, timeout: 45000 },
      )
    ).data;
  },
};
