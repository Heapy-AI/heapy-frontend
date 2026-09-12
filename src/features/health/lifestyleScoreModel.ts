// 작성자: 김진우 — 결측 점수와 실제 0점을 구분한다.
import type { HealthPage, Series } from './types';
export type ScoreComponent = {
  score: number | null;
  recordedDays: number;
  requiredDays: number;
};
export type ScoreDay = {
  date: string;
  score: number | null;
  sleep: ScoreComponent;
  activity: ScoreComponent;
  bmiScore: number | null;
  bmiDate: string | null;
  reasons: string[];
};
export type LifestyleScoreReport = {
  policyVersion: string;
  timezone: string;
  period: HealthPage['period'];
  latest: ScoreDay;
  points: ScoreDay[];
};
export const scoreSeries = (report: LifestyleScoreReport): Series => ({
  key: 'lifestyle_score',
  label: '생활습관 관리 점수',
  unit: '점',
  dailyAggregation: 'score',
  points: report.points
    .filter(p => p.score !== null)
    .map(p => ({
      date: p.date,
      value: p.score!,
      recordedDays: 1,
      spanDays: 1,
      coveredDays: 1,
    })),
});
export const scoreReasons: Record<string, string> = {
  sleep_insufficient: '최근 7일 중 수면 기록이 5일 이상 필요해요.',
  activity_insufficient:
    '최근 14일 중 걸음 또는 운동 기록이 7일 이상 필요해요.',
  bmi_missing: '키와 체중을 함께 입력한 체성분 기록이 필요해요.',
  bmi_stale: '최근 90일 이내의 BMI 기록이 필요해요.',
  age_unavailable: '프로필에 생년월일을 등록해 주세요.',
  age_not_supported: '생활습관 관리 점수는 만 20세 이상에게 제공해요.',
  data_limit_exceeded: '기록이 많아 점수를 계산하지 못했어요.',
};
