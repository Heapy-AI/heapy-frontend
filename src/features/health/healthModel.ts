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
// 작성자: 고수연 — 분을 '7시간 30분'으로 읽는다. 480분보다 한눈에 들어온다.
// 한 시간이 안 되면 시간 자리를 쓰지 않는다. '0시간 33분'은 읽기 불편하다.
export const formatMinutes = (value: unknown): string => {
  if (typeof value !== 'number' || !Number.isFinite(value)) return '—';
  const total = Math.round(value);
  // 축의 밑동은 '0분'보다 '0'이 깔끔하다.
  if (!total) return '0';
  const hours = Math.floor(total / 60);
  const minutes = total % 60;
  if (!hours) return `${minutes}분`;
  return minutes ? `${hours}시간 ${minutes}분` : `${hours}시간`;
};
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
// 작성자: 고수연 — 수면 구성. 단계가 없는 기록도 수면시간으로 함께 보여준다.
//
// 워치가 잰 밤에는 단계가 있고, 삼성헬스에 직접 입력한 밤에는 없다. 예전에는 그날 기록이
// 하나라도 단계가 없으면 그날 전체를 뺐는데, 그러면 워치 기록과 직접 입력이 섞인 날은
// 멀쩡한 단계까지 버려져 그래프에 며칠씩 구멍이 났다.
//
// 단계 합과 총 수면시간은 늘 조금 어긋나지만(깨어 있던 시간 처리 차이) 그 차이를 메우는
// 층을 따로 쌓지는 않는다. 막대는 어디까지나 구성을 대략 보여주는 것이다.
export function sleepStages(page?: HealthPage): Series[] {
  if (!page || page.dataTruncated) return [];
  // 색은 개발자 모니터링 UI의 sleep-stages 팔레트를 그대로 쓴다. 두 화면이 같은 값을
  // 다른 색으로 보여주면 견주기 어렵다. 깊을수록 진하고 뒤척임만 색을 갈라 둔다.
  const fields = [
    ['deep_sleep_minutes', '깊은 수면', '#3816BA'],
    ['light_sleep_minutes', '얕은 수면', '#7653F4'],
    ['rem_sleep_minutes', '렘 수면', '#B19FF7'],
    ['awake_minutes', '깨어 있음', '#FF5E8E'],
  ] as const;
  const staged = (record: HealthRecord) =>
    fields.every(([key]) => numeric(record, key) !== null);
  const days = [...new Set(page.records.map(r => r.date))];
  // 단계가 없는 기록의 수면시간. 라벨을 비워 범례에는 올리지 않고 색으로만 구분한다.
  const columns: Array<
    readonly [string, string, string, (r: HealthRecord) => number]
  > = [
    ...fields.map(
      ([key, label, color]) =>
        [
          key,
          label,
          color,
          (r: HealthRecord) => (staged(r) ? numeric(r, key) ?? 0 : 0),
        ] as const,
    ),
    // 직접 입력한 밤. 얕은 수면과 같은 계열이되 훨씬 옅게 해서 단계 기록과 구분한다.
    // 범례에는 올리지 않고 말풍선에서만 이름을 밝힌다.
    [
      'manual_sleep_minutes',
      '직접 입력',
      '#DDD5FA',
      (r: HealthRecord) => (staged(r) ? 0 : numeric(r, 'total_sleep_minutes') ?? 0),
    ] as const,
  ];
  return columns.map(([key, label, color, pick]) => {
    const groups = new Map<string, number[]>();
    for (const date of days) {
      const value = page.records
        .filter(r => r.date === date)
        .reduce((n, r) => n + pick(r), 0);
      const b = bucket(date, page.period.aggregation);
      groups.set(b, [...(groups.get(b) ?? []), value]);
    }
    return {
      key,
      label,
      color,
      legendHidden: key === 'manual_sleep_minutes',
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
