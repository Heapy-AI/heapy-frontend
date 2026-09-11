// 작성자: 김진우 — 홈 카드 수치는 서버 집계값만 표시하며 결측을 0으로 대체하지 않는다.
import { MetricId } from './homeModel';

export type HomeValue = {
  date: string;
  value: number;
  secondary: number | null;
};
export type HomePoint = { date: string; value: number };
export type HomeData = {
  date: string;
  name?: string;
  cards?: {
    date: string;
    metrics: Partial<Record<MetricId, HomeValue>>;
    trends: Partial<Record<MetricId, HomePoint[]>>;
    dataTruncated: boolean;
  };
  latestCheckup?: {
    recordId: string;
    measuredAt: string;
    providerName: string | null;
    resultCount: number;
    findingCount: number;
  } | null;
  missions?: Array<{
    userMissionId: string;
    title: string;
    description: string | null;
    status: string;
  }>;
  alerts: Array<{ alertId: string; title: string; message: string }>;
};

export function formatValue(
  id: MetricId,
  value?: number | null,
  secondary?: number | null,
): string {
  if (value == null || !Number.isFinite(value)) return '기록 없음';
  if (id === 'sleep' || id === 'exercise') {
    const minutes = Math.round(id === 'exercise' ? value / 60 : value);
    return minutes >= 60
      ? `${Math.floor(minutes / 60)}시간 ${minutes % 60}분`
      : `${minutes}분`;
  }
  if (id === 'pressure')
    return secondary == null
      ? '기록 없음'
      : `${Math.round(value)}/${Math.round(secondary)} mmHg`;
  return `${Math.round(value).toLocaleString('ko-KR')}${
    { steps: '보', count: '회', heart: ' bpm' }[id]
  }`;
}

export function shiftDate(date: string, days: number) {
  const value = new Date(`${date}T00:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

export function weeklyData(points: HomePoint[], today: string) {
  const end = shiftDate(today, -1);
  const start = shiftDate(today, -7);
  const previousStart = shiftDate(today, -14);
  const recent = points.filter(p => p.date >= start && p.date <= end);
  const previous = points.filter(
    p => p.date >= previousStart && p.date < start,
  );
  const mean = (values: HomePoint[]) =>
    values.length
      ? values.reduce((sum, p) => sum + p.value, 0) / values.length
      : null;
  const average = mean(recent);
  const previousAverage = mean(previous);
  const change =
    average !== null && previousAverage !== null && previousAverage > 0
      ? ((average - previousAverage) / previousAverage) * 100
      : null;
  return {
    average,
    change,
    recordedDays: recent.length,
    previousDays: previous.length,
    days: Array.from({ length: 7 }, (_, i) => {
      const date = shiftDate(start, i);
      return { date, value: recent.find(p => p.date === date)?.value ?? null };
    }),
  };
}
