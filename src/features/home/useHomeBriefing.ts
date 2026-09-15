// 작성자: 김진우 — 성공 결과는 재사용하고 수동 새로고침만 실패 재시도를 요청한다.
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../shared/api/client';

type Briefing = {
  date: string;
  status:
    | 'pending'
    | 'generated'
    | 'failed'
    | 'data_insufficient'
    | 'unavailable';
  headline?: string | null;
  chip?: string | null;
  body?: string | null;
  sections?: Array<{
    key: string;
    label: string;
    metric: string;
    text: string;
    tone: string;
  }> | null;
};
const messages = {
  pending: '오늘의 브리핑을 준비하고 있어요.',
  failed: '브리핑을 완료하지 못했어요. 아래로 당겨 다시 시도해 주세요.',
  data_insufficient: '브리핑을 위한 건강 기록이 더 필요해요.',
  unavailable: '브리핑 서비스를 연결하고 있어요.',
};
export function useHomeBriefing(day: string, active: boolean) {
  const client = useQueryClient();
  const key = ['home-briefing', day];
  const query = useQuery({
    queryKey: key,
    queryFn: async ({ signal }) =>
      (
        await apiClient.get<Briefing>('/api/health/briefings/latest', {
          signal,
        })
      ).data,
    enabled: active,
    retry: false,
    staleTime: 30000,
    refetchInterval: state =>
      active && state.state.data?.status === 'pending' ? 5000 : false,
  });
  const data = query.data?.date === day ? query.data : undefined;
  const ready = data?.status === 'generated';
  const message = query.isError
    ? '브리핑을 불러오지 못했어요. 아래로 당겨 다시 시도해 주세요.'
    : data && data.status !== 'generated'
    ? messages[data.status]
    : '오늘의 브리핑을 준비하고 있어요.';
  return {
    headline: ready ? data.headline || '오늘의 건강 브리핑' : message,
    chip: ready ? data.chip : null,
    body: ready ? data.body || data.headline || '' : message,
    sections: ready && Array.isArray(data.sections) ? data.sections : [],
    retryFailed: async () => {
      // 서버가 최신 상태를 확인하므로 캐시가 오래됐어도 성공 결과를 다시 생성하지 않는다.
      const response = await apiClient.post<Briefing>(
        '/api/health/briefings/retry',
      );
      await client.cancelQueries({ queryKey: key });
      client.setQueryData(key, response.data);
    },
  };
}
