// 작성자: 김진우 — 홈 카드 표시 설정과 지표 이름을 정의한다.
export const moduleLabels = {
  briefing: 'AI 건강 브리핑',
  metrics: '핵심 데이터',
  medication: '오늘의 복약',
  mission: '추천 미션',
  weekly: '주간 변화',
  checkup: '최근 건강검진',
} as const;
export type ModuleId = keyof typeof moduleLabels;
export const metrics = {
  sleep: ['수면', '기록 없음', ''],
  steps: ['걸음 수', '기록 없음', ''],
  exercise: ['운동시간', '기록 없음', ''],
  count: ['운동 횟수', '기록 없음', ''],
  heart: ['심박수', '기록 없음', ''],
  pressure: ['혈압', '기록 없음', ''],
} as const;
export type MetricId = keyof typeof metrics;
export type HomeSettings = {
  modules: ModuleId[];
  metrics: MetricId[];
  medicationMode: 'next' | 'all';
  medicationName: boolean;
  medicationButton: boolean;
  medicationProgress: boolean;
  weekly: 'steps' | 'sleep' | 'exercise';
};
export function defaultHomeSettings(): HomeSettings {
  return {
    modules: ['briefing', 'metrics', 'medication', 'mission'],
    metrics: ['sleep', 'steps'],
    medicationMode: 'next',
    medicationName: true,
    medicationButton: true,
    medicationProgress: true,
    weekly: 'steps',
  };
}
export function moveItem<T>(items: T[], from: number, to: number): T[] {
  if (from < 0 || from >= items.length) return [...items];
  const result = [...items];
  const [item] = result.splice(from, 1);
  result.splice(Math.max(0, Math.min(to, result.length)), 0, item!);
  return result;
}
