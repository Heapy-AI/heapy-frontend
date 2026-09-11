import { HealthPage, HealthRecord, PeriodCode, Series } from './types';
export const periods: { code: PeriodCode; label: string }[] = [
  { code: '7d', label: '7일' },
  { code: '30d', label: '30일' },
  { code: '90d', label: '90일' },
  { code: '180d', label: '180일' },
  { code: '1y', label: '1년' },
];
export const koreanDay = (now = new Date()) =>
  new Date(now.getTime() + 9 * 3600000).toISOString().slice(0, 10);
export const koreanTime = (value: string) =>
  new Date(new Date(value).getTime() + 9 * 3600000).toISOString().slice(11, 16);
export const format = (value: unknown, digits = 1): string =>
  typeof value === 'number' && Number.isFinite(value)
    ? value.toLocaleString('ko-KR', { maximumFractionDigits: digits })
    : '—';
export const numeric = (row: HealthRecord, key: string): number | null =>
  typeof row.values[key] === 'number' ? (row.values[key] as number) : null;
export const latest = (page: HealthPage | undefined, key: string) =>
  page?.records.find(row => numeric(row, key) !== null);
export const sumToday = (page: HealthPage | undefined, key: string) => {
  const rows =
    page?.records.filter(
      row => row.date === koreanDay() && numeric(row, key) !== null,
    ) ?? [];
  return rows.length
    ? rows.reduce((sum, row) => sum + (numeric(row, key) ?? 0), 0)
    : null;
};
export function series(
  page: HealthPage | undefined,
  keys: string[],
  factor = 1,
  unit?: string,
): Series[] {
  return (
    page?.series
      .filter(s => keys.includes(s.key))
      .map(s => ({
        ...s,
        unit: unit ?? s.unit,
        points: s.points.map(p => ({ ...p, value: p.value * factor })),
      })) ?? []
  );
}
export function bucket(
  day: string,
  aggregation: HealthPage['period']['aggregation'],
) {
  if (aggregation === 'month') return day.slice(0, 7) + '-01';
  if (aggregation !== 'week') return day;
  const d = new Date(day + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
  return d.toISOString().slice(0, 10);
}
// 작성자: 김진우 — 영양 구성은 세 영양소가 모두 있는 날짜만 평가한다. 열량과 영양소 열량을 구분한다.
export function macroSeries(page?: HealthPage): Series[] {
  if (!page || page.dataTruncated) return [];
  const fields = [
    ['carbohydrate', '탄수화물', 4],
    ['protein', '단백질', 4],
    ['total_fat', '지방', 9],
  ] as const;
  const days = new Map<string, number[] | null>();
  for (const row of page.records) {
    if (fields.some(([key]) => numeric(row, key) === null)) {
      days.set(row.date, null);
      continue;
    }
    if (days.has(row.date) && days.get(row.date) === null) continue;
    const prior = days.get(row.date) ?? [0, 0, 0];
    days.set(
      row.date,
      fields.map(
        ([key, , factor], i) =>
          (prior[i] ?? 0) + (numeric(row, key) ?? 0) * factor,
      ),
    );
  }
  return fields.map(([key, label], index) => {
    const buckets = new Map<string, number[]>();
    days.forEach((values, date) => {
      if (values) {
        const b = bucket(date, page.period.aggregation);
        buckets.set(b, [...(buckets.get(b) ?? []), values[index] ?? 0]);
      }
    });
    return {
      key,
      label,
      unit: 'kcal',
      dailyAggregation: 'sum',
      points: [...buckets].sort().map(([date, values]) => ({
        date,
        value: values.reduce((a, b) => a + b, 0) / values.length,
        recordedDays: values.length,
        ...coverage(date, page.period),
      })),
    };
  });
}
export function exerciseKinds(page?: HealthPage): Series[] {
  if (!page || page.dataTruncated) return [];
  const kinds = [
    ...new Set(page.records.map(r => String(r.values.exercise_type ?? '기타'))),
  ];
  const dates = [...new Set(page.records.map(r => r.date))];
  return kinds.map(kind => {
    const buckets = new Map<string, number[]>();
    dates.forEach(date => {
      const rows = page.records.filter(r => r.date === date);
      if (rows.some(r => numeric(r, 'duration_seconds') === null)) return;
      const value = rows
        .filter(r => String(r.values.exercise_type ?? '기타') === kind)
        .reduce(
          (sum, r) => sum + (numeric(r, 'duration_seconds') ?? 0) / 60,
          0,
        );
      const b = bucket(date, page.period.aggregation);
      buckets.set(b, [...(buckets.get(b) ?? []), value]);
    });
    return {
      key: kind,
      label: kind,
      unit: '분',
      dailyAggregation: 'sum',
      points: [...buckets].sort().map(([date, values]) => ({
        date,
        value: values.reduce((a, b) => a + b, 0) / values.length,
        recordedDays: values.length,
        ...coverage(date, page.period),
      })),
    };
  });
}

// 작성자: 김진우 — 구간의 전체 길이와 조회 범위에 포함된 날짜 수를 구분한다.
export function coverage(date: string, period: HealthPage['period']) {
  const start = new Date(date + 'T00:00:00Z');
  const end = new Date(start);
  if (period.aggregation === 'month') end.setUTCMonth(end.getUTCMonth() + 1);
  else
    end.setUTCDate(end.getUTCDate() + (period.aggregation === 'week' ? 7 : 1));
  const day = 86400000;
  return {
    spanDays: (end.getTime() - start.getTime()) / day,
    coveredDays: Math.max(
      0,
      (Math.min(end.getTime(), Date.parse(period.to) + day) -
        Math.max(start.getTime(), Date.parse(period.from))) /
        day,
    ),
  };
}
// 작성자: 김진우 — 일별 운동·기타 열량을 먼저 분리한 뒤 동일한 기록일 분모로 평균한다.
export function activityCalories(
  activity?: HealthPage,
  exercise?: HealthPage,
): Series[] {
  if (
    !activity ||
    !exercise ||
    activity.dataTruncated ||
    exercise.dataTruncated
  )
    return [];
  const daily = new Map<string, number[]>();
  for (const date of new Set(activity.records.map(r => r.date))) {
    if (date < exercise.period.from || date > exercise.period.to) continue;
    const a = activity.records.filter(r => r.date === date);
    const e = exercise.records.filter(r => r.date === date);
    if (
      a.some(r => numeric(r, 'active_calories_kcal') === null) ||
      e.some(r => numeric(r, 'calories_kcal') === null)
    )
      continue;
    const total = a.reduce(
      (n, r) => n + (numeric(r, 'active_calories_kcal') ?? 0),
      0,
    );
    const workout = e.reduce(
      (n, r) => n + (numeric(r, 'calories_kcal') ?? 0),
      0,
    );
    daily.set(date, [workout, Math.max(total - workout, 0)]);
  }
  return ['운동', '기타 활동'].map((label, i) => {
    const groups = new Map<string, number[]>();
    daily.forEach((v, date) => {
      const b = bucket(date, activity.period.aggregation);
      groups.set(b, [...(groups.get(b) ?? []), v[i] ?? 0]);
    });
    return {
      key: 'activity_' + i,
      label,
      unit: 'kcal',
      dailyAggregation: 'sum',
      points: [...groups].sort().map(([date, values]) => ({
        date,
        value: values.reduce((a, b) => a + b, 0) / values.length,
        recordedDays: values.length,
        ...coverage(date, activity.period),
      })),
    };
  });
}

// 작성자: 김진우 — 빈 날짜를 축에 남기되 값 0을 생성하지 않는다.
export function chartDates(
  series: Series[],
  period?: HealthPage['period'],
): string[] {
  const recorded = [
    ...new Set(series.flatMap(s => s.points.map(p => p.date))),
  ].sort();
  if (!recorded.length || !period || period.aggregation === 'raw')
    return recorded;
  const dates = new Set<string>();
  for (
    let day = Date.parse(period.from);
    day <= Date.parse(period.to);
    day += 86400000
  ) {
    dates.add(
      bucket(new Date(day).toISOString().slice(0, 10), period.aggregation),
    );
  }
  return [...dates].sort();
}
// 작성자: 김진우 — 단계별 누락이 있는 날은 수면 구성에서 제외하고 같은 날짜 집합으로 평균한다.
export function sleepStages(page?: HealthPage): Series[] {
  if (!page || page.dataTruncated) return [];
  const fields = [
    ['deep_sleep_minutes', '깊은 수면'],
    ['rem_sleep_minutes', '렘 수면'],
    ['light_sleep_minutes', '얕은 수면'],
    ['awake_minutes', '깨어 있음'],
  ] as const;
  const days = [...new Set(page.records.map(r => r.date))].filter(date =>
    page.records
      .filter(r => r.date === date)
      .every(r => fields.every(([key]) => numeric(r, key) !== null)),
  );
  return fields.map(([key, label]) => {
    const groups = new Map<string, number[]>();
    for (const date of days) {
      const value = page.records
        .filter(r => r.date === date)
        .reduce((n, r) => n + (numeric(r, key) ?? 0), 0);
      const b = bucket(date, page.period.aggregation);
      groups.set(b, [...(groups.get(b) ?? []), value]);
    }
    return {
      key,
      label,
      unit: '분',
      dailyAggregation: 'sum',
      points: [...groups].sort().map(([date, values]) => ({
        date,
        value: values.reduce((a, b) => a + b, 0) / values.length,
        recordedDays: values.length,
        ...coverage(date, page.period),
      })),
    };
  });
}
