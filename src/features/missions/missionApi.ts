// 작성자: 김진우 — 모든 미션 화면이 같은 서버 계약과 조회 캐시를 사용한다.
import { useQuery } from '@tanstack/react-query';
import { formatDuration } from '../../shared/utils/duration';
import { apiClient } from '../../shared/api/client';
import { useMedicationToday } from '../medication/useMedicationToday';

export type Mission = {
  missionId: string;
  code: string;
  title: string;
  description: string;
  category: string;
  scope?: string;
  unit: string;
  targetValue: number;
  currentValue: number;
  progressPercent: number;
  status: 'READY' | 'IN_PROGRESS' | 'COMPLETABLE' | 'COMPLETED' | 'EXPIRED';
  missionDate?: string;
  completedAt?: string;
  feedback?: Difficulty | null;
  manualAllowed?: boolean;
  endsAt?: string;
  parameters?: { recordAction?: string };
};
export type Difficulty = 'EASY' | 'JUST_RIGHT' | 'HARD';
export type MissionDay = {
  date: string;
  completedCount: number;
  totalCount: number;
  completionRate: number;
  missions: Mission[];
};
export type CalendarDay = Omit<MissionDay, 'missions' | 'completionRate'> & {
  completionRate: number | null;
};
export type MissionCalendar = {
  year: number;
  month: number;
  completedCount: number;
  totalCount: number;
  completionRate: number;
  days: CalendarDay[];
};
export const missionKeys = ['health', 'missions'] as const;
export const missionApi = {
  day: async (date: string, signal?: AbortSignal) =>
    (
      await apiClient.get<MissionDay>('/api/missions/by-date', {
        params: { date },
        signal,
      })
    ).data,
  detail: async (id: string, signal?: AbortSignal) =>
    (
      await apiClient.get<Mission>(`/api/missions/${encodeURIComponent(id)}`, {
        signal,
      })
    ).data,
  calendar: async (month: string, signal?: AbortSignal) =>
    (
      await apiClient.get<MissionCalendar>('/api/missions/calendar', {
        params: {
          year: Number(month.slice(0, 4)),
          month: Number(month.slice(5, 7)),
        },
        signal,
      })
    ).data,
  complete: async (id: string, manual = false) =>
    (
      await apiClient.post<Mission>(
        `/api/missions/${encodeURIComponent(id)}/${
          manual ? 'confirm' : 'complete'
        }`,
      )
    ).data,
  feedback: async (id: string, difficulty: Difficulty) =>
    (
      await apiClient.post<Mission>(
        `/api/missions/${encodeURIComponent(id)}/feedback`,
        { difficulty },
      )
    ).data,
};
export function useMissions(active = true, selectedDate?: string) {
  const today = useMedicationToday();
  const date = selectedDate ?? today;
  return useQuery({
    queryKey: [...missionKeys, 'day', date],
    queryFn: ({ signal }) => missionApi.day(date, signal),
    enabled: active,
    staleTime: 15000,
    refetchInterval: active ? 60000 : false,
    retry: false,
  });
}
export const statusText: Record<Mission['status'], string> = {
  READY: '진행 전',
  IN_PROGRESS: '수행 중',
  COMPLETABLE: '완료 가능',
  COMPLETED: '완료',
  EXPIRED: '기간 종료',
};
export const unitText = (m: Pick<Mission, 'unit'>, n: number) =>
  ['MINUTE', 'SECOND', 'HOUR'].includes(m.unit)
    ? formatDuration(n, m.unit)
    : `${n}${
        (
          {
            CUP: '잔',
            COUNT: '회',
            STEP: '보',
            FLOOR: '층',
            ML: 'mL',
            METER: 'm',
          } as Record<string, string>
        )[m.unit] ?? ''
      }`;
export function addDays(date: string, days: number) {
  const d = new Date(date + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
export function weekDays(date: string) {
  const weekday = new Date(date + 'T00:00:00Z').getUTCDay();
  const monday = addDays(date, -(weekday + 6) % 7);
  return Array.from({ length: 7 }, (_, i) => addDays(monday, i));
}
export function shiftMonth(month: string, delta: number) {
  const d = new Date(month + '-01T00:00:00Z');
  d.setUTCMonth(d.getUTCMonth() + delta);
  return d.toISOString().slice(0, 7);
}
