import { apiClient } from '../../shared/api/client';
import {
  Analysis,
  Category,
  HealthPage,
  HealthRecord,
  Metric,
  PeriodCode,
  ScoreReport,
} from './types';

// 작성자: 김진우 — 기존 공통 인증·응답 처리를 재사용한다. 조회로 AI 생성을 요청하지 않는다.
export const healthApi = {
  async page(
    metric: Metric,
    period: PeriodCode,
    signal?: AbortSignal,
    params: Record<string, string | number> = {},
  ) {
    return (
      await apiClient.get<HealthPage>(`/api/health/${metric}`, {
        signal,
        params: { period, ...params },
      })
    ).data;
  },
  // 작성자: 고수연 — 오늘의 건강 종합 점수. 서버가 하루 한 번 확정해 저장한 값을 읽기만 한다.
  async score(period: string, signal?: AbortSignal) {
    return (
      await apiClient.get<ScoreReport>('/api/health/score', {
        signal,
        params: { period },
      })
    ).data;
  },
  async analysis(category: Category, signal?: AbortSignal) {
    return (
      await apiClient.get<Analysis>('/api/health/analyses/today', {
        signal,
        params: { category },
      })
    ).data;
  },
  async create(metric: Metric, body: Record<string, unknown>, key: string) {
    return (
      await apiClient.post(`/api/health/${metric}/records`, body, {
        headers: { 'Idempotency-Key': key },
      })
    ).data;
  },
  async editWater(
    record: HealthRecord,
    body: Record<string, unknown>,
    key: string,
  ) {
    return (
      await apiClient.patch(
        `/api/health/water/records/${encodeURIComponent(record.recordId)}`,
        { ...body, recordVersion: record.recordVersion },
        { headers: { 'Idempotency-Key': key } },
      )
    ).data;
  },
  async deleteWater(records: HealthRecord[], key: string) {
    return (
      await apiClient.post(
        '/api/health/water/records/batch-delete',
        {
          records: records.map(({ recordId, recordVersion }) => ({
            recordId,
            recordVersion,
          })),
        },
        { headers: { 'Idempotency-Key': key } },
      )
    ).data;
  },
};
