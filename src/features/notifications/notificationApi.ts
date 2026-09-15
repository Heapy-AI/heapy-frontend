import { apiClient } from '../../shared/api/client';
import { createIdempotencyKey } from '../../shared/utils/idempotency';
export type NotificationItem = {
  notificationId: string;
  notificationType: string;
  title: string;
  body: string;
  status: string;
  targetType: string;
  targetId: string | null;
  scheduledAt: string;
  sentAt: string | null;
  openedAt: string | null;
};
export type NotificationPage = {
  items: NotificationItem[];
  nextCursor: string | null;
  hasNext: boolean;
  unreadCount: number;
};
export type OpenedNotification = {
  notificationId: string;
  status: string;
  openedAt: string;
  intakeId: string | null;
  scheduledAt: string;
  targetType: string;
  targetId: string | null;
};
// 작성자: 김진우 — 목록과 메타 정보를 함께 보존해 읽지 않은 개수와 다음 페이지를 표시한다.
export const notificationApi = {
  async list(
    cursor?: string,
    signal?: AbortSignal,
    limit = 20,
  ): Promise<NotificationPage> {
    const result = await apiClient.get<{ items: NotificationItem[] }>(
      '/api/notifications',
      { params: { cursor, limit }, signal },
    );
    const meta = (
      result as typeof result & { heapyMeta?: Omit<NotificationPage, 'items'> }
    ).heapyMeta;
    if (!meta)
      throw new Error('알림 응답을 확인할 수 없어요. 다시 시도해 주세요.');
    return { ...result.data, ...meta };
  },
  async open(id: string, key: string): Promise<OpenedNotification> {
    return (
      await apiClient.post<OpenedNotification>(
        `/api/notifications/${encodeURIComponent(id)}/open`,
        undefined,
        { headers: { 'Idempotency-Key': key } },
      )
    ).data;
  },
  async readAll(key: string) {
    await apiClient.post('/api/notifications/read-all', undefined, {
      headers: { 'Idempotency-Key': key },
    });
  },
};
export const notificationKeys = {
  all: ['notifications'] as const,
  badge: ['notifications', 'badge'] as const,
  list: ['notifications', 'list'] as const,
};
export { createIdempotencyKey };
