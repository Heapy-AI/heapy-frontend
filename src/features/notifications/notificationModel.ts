import { NotificationItem } from './notificationApi';
export const unread = (item: NotificationItem) =>
  item.status === 'sent' && !item.openedAt;
export const dayInKorea = (date: string | number) =>
  new Date(new Date(date).getTime() + 9 * 3600000).toISOString().slice(0, 10);
export const notificationTime = (item: NotificationItem) =>
  item.sentAt || item.scheduledAt;
export function relativeTime(date: string, now = Date.now()) {
  const elapsed = Math.max(0, now - Date.parse(date));
  if (dayInKorea(date) === dayInKorea(now)) {
    if (elapsed < 60000) return '방금 전';
    if (elapsed < 3600000) return `${Math.floor(elapsed / 60000)}분 전`;
    return `${Math.floor(elapsed / 3600000)}시간 전`;
  }
  if (dayInKorea(date) === dayInKorea(now - 86400000)) return '어제';
  const day = dayInKorea(date).split('-');
  return `${day[0]}.${day[1]}.${day[2]}`;
}
export function notificationIcon(type: string): 'care' | 'checkup' | 'sync' {
  if (/checkup|medication/.test(type)) return 'checkup';
  if (/sync|water/.test(type)) return 'sync';
  return 'care';
}
