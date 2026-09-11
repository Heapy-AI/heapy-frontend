import { buildConfirmation } from '../src/features/dataConnection/checkupValidation';
import { CheckupResult } from '../src/features/dataConnection/types';

// 작성자: 김진우 — 실제 문서를 사용하지 않는 합성 계약 회귀 검사다.
const sample = (): CheckupResult => ({
  measuredAt: '2026-01-02',
  providerName: null,
  items: [
    {
      fieldKey: 'pressure',
      itemCode: 'SAMPLE_BP',
      itemName: '혈압',
      value: '123',
      unit: 'mmHg',
      status: '합성 판정',
    },
    {
      fieldKey: 'hearing',
      itemCode: 'SAMPLE_HEARING',
      itemName: '청력',
      value: '정상',
      unit: null,
      status: null,
    },
  ],
});

test('재정렬된 검사의 수정 이력도 식별자로 연결하고 정성 결과·판정·null을 보존한다', () => {
  const original = sample();
  const edited = sample();
  edited.items.reverse();
  edited.items[1]!.value = '121';
  const result = buildConfirmation(original, edited, new Set());
  expect(result.providerName).toBeNull();
  expect(result.results[0]).toMatchObject({
    value: '정상',
    numericValue: null,
    unit: null,
  });
  expect(result.results[1]).toMatchObject({
    value: '121',
    numericValue: 121,
    status: '합성 판정',
  });
  expect(result.corrections).toEqual([
    {
      fieldKey: 'pressure.value',
      itemCode: 'SAMPLE_BP',
      originalValue: '123',
      correctedValue: '121',
      correctionType: 'value',
    },
  ]);
});

test('동일 코드의 다른 결과는 하나를 명시적으로 제외하기 전까지 저장하지 않는다', () => {
  const original = sample();
  original.items.push({
    ...original.items[0]!,
    fieldKey: 'other-pressure',
    value: '124',
  });
  expect(() => buildConfirmation(original, original, new Set())).toThrow(
    '같은 검사 코드',
  );
  const result = buildConfirmation(
    original,
    original,
    new Set(['other-pressure']),
  );
  expect(result.results).toHaveLength(2);
  expect(result.corrections[0]).toMatchObject({
    fieldKey: 'other-pressure',
    correctionType: 'excluded',
  });
});

test('내시경이라는 이름의 미매칭 일반 검사를 소견으로 재분류하지 않는다', () => {
  const original = sample();
  original.items[0] = {
    ...original.items[0]!,
    itemName: '내시경',
    itemCode: null,
  };
  expect(() => buildConfirmation(original, original, new Set())).toThrow(
    '검사 결과',
  );
  expect(
    Object.keys(buildConfirmation(original, original, new Set(['pressure']))),
  ).toEqual(['measuredAt', 'providerName', 'results', 'corrections']);
});

test.each(['missing', 'duplicate', 'status', 'code'])(
  '식별자·기관 판정·코드 변조를 거부한다: %s',
  mode => {
    const original = sample();
    const edited = sample();
    if (mode === 'missing') edited.items[0]!.fieldKey = 'unknown';
    if (mode === 'duplicate') edited.items[0]!.fieldKey = 'hearing';
    if (mode === 'status') edited.items[0]!.status = '임의 판정';
    if (mode === 'code') edited.items[0]!.itemCode = 'OTHER';
    expect(() => buildConfirmation(original, edited, new Set())).toThrow();
  },
);

test('검진일 누락·빈 값·전체 제외에 각각 원인을 안내한다', () => {
  const original = sample();
  expect(() =>
    buildConfirmation(original, { ...original, measuredAt: null }, new Set()),
  ).toThrow('검진일');
  const empty = sample();
  empty.items[0]!.value = ' ';
  expect(() => buildConfirmation(original, empty, new Set())).toThrow(
    '비어 있는 결과값',
  );
  expect(() =>
    buildConfirmation(original, original, new Set(['pressure', 'hearing'])),
  ).toThrow('하나 이상');
});
