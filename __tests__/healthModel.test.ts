import { chartDates, sleepStages } from '../src/features/health/healthModel';
// 작성자: 김진우 — 결측, 구간 평균, 열량 중복 계산을 검증한다.
import {
  activityCalories,
  coverage,
  macroSeries,
  exerciseKinds,
} from '../src/features/health/healthModel';
import { HealthPage, HealthRecord } from '../src/features/health/types';
const record = (
  date: string,
  values: HealthRecord['values'],
): HealthRecord => ({
  recordId: date + JSON.stringify(values),
  date,
  measuredAt: date + 'T00:00:00Z',
  source: 'samsung_health',
  editable: false,
  deletable: false,
  recordVersion: '1',
  values,
});
const page = (records: HealthRecord[]): HealthPage => ({
  metric: 'nutrition',
  period: {
    code: '90d',
    from: '2026-09-02',
    to: '2026-09-06',
    aggregation: 'week',
  },
  timezone: 'Asia/Seoul',
  records,
  series: [],
  nextCursor: null,
  dataTruncated: false,
});
test('주간 분모는 기록일이며 부분 조회 구간 길이를 별도로 유지한다', () => {
  expect(coverage('2026-08-31', page([]).period)).toEqual({
    spanDays: 7,
    coveredDays: 5,
  });
  const result = macroSeries(
    page([
      record('2026-09-02', { carbohydrate: 10, protein: 10, total_fat: 10 }),
      record('2026-09-04', { carbohydrate: 30, protein: 10, total_fat: 10 }),
    ]),
  );
  expect(result[0]?.points[0]).toEqual({
    date: '2026-08-31',
    value: 80,
    recordedDays: 2,
    spanDays: 7,
    coveredDays: 5,
  });
});
test('하루 중 영양소 누락이 있으면 해당 날짜 전체를 구성 비교에서 제외한다', () => {
  const r = macroSeries(
    page([
      record('2026-09-02', { carbohydrate: 10, protein: 10, total_fat: 10 }),
      record('2026-09-02', { carbohydrate: 10, protein: 10, total_fat: null }),
    ]),
  );
  expect(r.every(s => s.points.length === 0)).toBe(true);
});
test('운동과 기타 활동은 일별로 분리하고 음수를 0으로 보정한다', () => {
  const a = page([
    record('2026-09-02', { active_calories_kcal: 500 }),
    record('2026-09-03', { active_calories_kcal: 100 }),
  ]);
  const e = page([
    record('2026-09-02', { calories_kcal: 200 }),
    record('2026-09-03', { calories_kcal: 150 }),
  ]);
  const r = activityCalories(a, e);
  expect(r[0]?.points[0]?.value).toBe(175);
  expect(r[1]?.points[0]?.value).toBe(150);
  expect(activityCalories({ ...a, dataTruncated: true }, e)).toEqual([]);
});
test('운동 기간 밖의 날짜를 운동 없음으로 추정하지 않는다', () => {
  const a = page([record('2026-09-01', { active_calories_kcal: 500 })]);
  expect(activityCalories(a, page([])).every(s => s.points.length === 0)).toBe(
    true,
  );
});
test('운동 종류는 기록된 날의 미실시 종류만 0으로 포함한다', () => {
  const r = exerciseKinds(
    page([
      record('2026-09-02', { exercise_type: '걷기', duration_seconds: 600 }),
      record('2026-09-04', { exercise_type: '달리기', duration_seconds: 1200 }),
    ]),
  );
  expect(r.map(s => s.points[0]?.value)).toEqual([5, 10]);
  expect(r[0]?.points[0]?.recordedDays).toBe(2);
});

test('기록이 없는 날짜도 일별 축에는 남고 값은 생성하지 않는다', () => {
  const p = page([
    record('2026-09-02', { carbohydrate: 10, protein: 10, total_fat: 10 }),
  ]);
  p.period.aggregation = 'day';
  const s = macroSeries(p);
  expect(chartDates(s, p.period)).toHaveLength(5);
  expect(s[0]?.points).toHaveLength(1);
});
test('수면 단계 하나가 누락된 날짜는 모든 단계 구성에서 제외한다', () => {
  const r = sleepStages(
    page([
      record('2026-09-02', {
        deep_sleep_minutes: 60,
        rem_sleep_minutes: 60,
        light_sleep_minutes: 120,
        awake_minutes: 0,
      }),
      record('2026-09-03', {
        deep_sleep_minutes: 80,
        rem_sleep_minutes: null,
        light_sleep_minutes: 150,
        awake_minutes: 0,
      }),
    ]),
  );
  expect(r.map(s => s.points[0]?.value)).toEqual([60, 60, 120, 0]);
  expect(r.every(s => s.points[0]?.recordedDays === 1)).toBe(true);
});
