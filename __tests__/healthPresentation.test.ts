// 작성자: 김진우 — 선택 기본값과 결측 표현에 쓰는 실제 선분·축 계산 검증.
import {
  axisMaximum,
  lineSegments,
} from '../src/features/health/chartGeometry';
test('연속 날짜는 실선, 중간 기록이 없는 날짜는 점선이며 값을 추가하지 않는다', () => {
  const points = ['2026-09-01', '2026-09-02', '2026-09-04'].map((date, i) => ({
    date,
    value: i + 10,
    recordedDays: 1,
    spanDays: 1,
    coveredDays: 1,
  }));
  const segments = lineSegments(points, [
    '2026-09-01',
    '2026-09-02',
    '2026-09-03',
    '2026-09-04',
  ]);
  expect(segments.map(s => s.gap)).toEqual([false, true]);
  expect(segments.map(s => s.to.value)).toEqual([11, 12]);
  expect(lineSegments([points[0]!], ['2026-09-01'])).toEqual([]);
});
test('축 최댓값은 실제 값을 자르지 않고 읽기 쉬운 눈금으로 올린다', () => {
  for (const value of [0, 0.2, 4, 68, 125, 1200, 13250])
    expect(axisMaximum(value)).toBeGreaterThan(value);
});
