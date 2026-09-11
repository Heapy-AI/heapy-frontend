// 작성자: 김진우 — 새로고침은 공통 실제 동기화를 호출한다.
import { refreshSamsungConnection } from '../src/features/health/healthRefresh';
import { syncSamsungHealth } from '../src/features/dataConnection/samsungSync';
jest.mock('../src/features/dataConnection/samsungSync', () => ({
  syncSamsungHealth: jest.fn(),
}));
test('동기화 완료와 오류를 호출 화면에 그대로 전달한다', async () => {
  const callback = jest.fn();
  const result = { connected: true, message: '동기화 완료', receivedCount: 2 };
  jest.mocked(syncSamsungHealth).mockResolvedValueOnce(result);
  expect(await refreshSamsungConnection(callback)).toEqual(result);
  expect(syncSamsungHealth).toHaveBeenCalledWith({ onProgress: callback });
  jest.mocked(syncSamsungHealth).mockRejectedValueOnce(new Error('전송 실패'));
  await expect(refreshSamsungConnection()).rejects.toThrow('전송 실패');
});
