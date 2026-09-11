import { apiClient } from '../src/shared/api/client';
import { dataConnectionApi } from '../src/features/dataConnection/dataConnectionApi';
import { ConfirmCheckup } from '../src/features/dataConnection/types';

jest.mock('../src/shared/api/client', () => ({
  apiClient: { post: jest.fn(), get: jest.fn(), delete: jest.fn() },
}));

beforeEach(() => jest.clearAllMocks());

test('확정 상세는 임시 작업과 다른 서버 기록 경로로 조회한다', async () => {
  const detail = {
    recordId: 'record',
    measuredAt: null,
    providerName: null,
    results: [],
    findings: [],
    overallOpinions: [],
  };
  (apiClient.get as jest.Mock).mockResolvedValue({ data: detail });
  const signal = new AbortController().signal;
  await expect(dataConnectionApi.getCheckup('a/b', signal)).resolves.toEqual(
    detail,
  );
  expect(apiClient.get).toHaveBeenCalledWith('/api/checkups/a%2Fb', { signal });
});

test('앱 재진입 시 최근 확정 목록을 서버에서 가져온다', async () => {
  (apiClient.get as jest.Mock).mockResolvedValue({ data: [] });
  const signal = new AbortController().signal;
  await expect(dataConnectionApi.getCheckups(signal)).resolves.toEqual([]);
  expect(apiClient.get).toHaveBeenCalledWith('/api/checkups', {
    signal,
    params: { limit: 100 },
  });
});

test('202 업로드 응답과 취소 신호·멱등성 헤더를 유지한다', async () => {
  const job = {
    jobId: 'synthetic-job',
    status: 'pending',
    expiresAt: '2026-01-02T00:10:00Z',
  };
  (apiClient.post as jest.Mock).mockResolvedValue({ status: 202, data: job });
  const signal = new AbortController().signal;
  await expect(
    dataConnectionApi.uploadCheckup(
      {
        uri: 'file://synthetic.pdf',
        name: '합성.pdf',
        type: 'application/pdf',
        size: 10,
        inputType: 'pdf',
      },
      'synthetic-key',
      signal,
    ),
  ).resolves.toEqual(job);
  expect(apiClient.post).toHaveBeenCalledWith(
    '/api/checkups/ocr-jobs',
    expect.any(FormData),
    expect.objectContaining({
      signal,
      headers: {
        'Idempotency-Key': 'synthetic-key',
        'Content-Type': 'multipart/form-data',
      },
    }),
  );
});

test('구버전 결과를 그대로 반환하고 임시 소견 필드를 추가하지 않는다', async () => {
  const job = {
    status: 'completed',
    result: { measuredAt: null, providerName: null, items: [] },
  };
  (apiClient.get as jest.Mock).mockResolvedValue({ data: job });
  const signal = new AbortController().signal;
  await expect(dataConnectionApi.getJob('a/b', signal)).resolves.toEqual(job);
  expect(apiClient.get).toHaveBeenCalledWith(
    '/api/checkups/ocr-jobs/a%2Fb',
    expect.objectContaining({ signal }),
  );
});

test('실패한 확정의 재시도에서도 호출자가 지정한 키와 기존 공개 본문을 유지한다', async () => {
  const payload: ConfirmCheckup = {
    measuredAt: '2026-01-02',
    providerName: null,
    results: [],
    corrections: [],
  };
  (apiClient.post as jest.Mock)
    .mockRejectedValueOnce(new Error('합성 통신 실패'))
    .mockResolvedValueOnce({ data: { recordId: 'synthetic-record' } });
  await expect(
    dataConnectionApi.confirm('job', payload, 'same-key'),
  ).rejects.toThrow('합성 통신 실패');
  await expect(
    dataConnectionApi.confirm('job', payload, 'same-key'),
  ).resolves.toEqual({ recordId: 'synthetic-record' });
  expect((apiClient.post as jest.Mock).mock.calls[0]).toEqual(
    (apiClient.post as jest.Mock).mock.calls[1],
  );
});

test('이탈 정리는 기존 Spring Boot 삭제 API를 사용한다', async () => {
  (apiClient.delete as jest.Mock).mockResolvedValue({ status: 204 });
  await dataConnectionApi.cancelJob('a/b');
  expect(apiClient.delete).toHaveBeenCalledWith('/api/checkups/ocr-jobs/a%2Fb');
});
