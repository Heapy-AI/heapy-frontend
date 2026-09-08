import {
  buildConfirmation,
  validateCheckupFile,
} from '../src/features/dataConnection/checkupValidation';
import { CheckupResult } from '../src/features/dataConnection/types';
const original: CheckupResult = {
  measuredAt: '2026-01-01',
  providerName: '검진기관',
  items: [
    {
      fieldKey: 'a',
      itemCode: 'glucose',
      itemName: '혈당',
      value: '102',
      unit: 'mg/dL',
      status: '경계',
    },
  ],
};
test('실제 수정값만 교정 로그에 기록하고 기관 판정은 보존한다', () => {
  expect(buildConfirmation(original, original, new Set()).corrections).toEqual(
    [],
  );
  const result = buildConfirmation(
    original,
    { ...original, items: [{ ...original.items[0]!, value: '<100' }] },
    new Set(),
  );
  expect(result.results[0]!.numericValue).toBeNull();
  expect(result.results[0]!.status).toBe('경계');
  expect(result.corrections).toEqual([
    {
      fieldKey: 'a.value',
      itemCode: 'glucose',
      originalValue: '102',
      correctedValue: '<100',
      correctionType: 'value',
    },
  ]);
});
test('빈 결과와 미매칭 항목의 묵시적 저장을 거부한다', () => {
  expect(() => buildConfirmation(original, original, new Set(['a']))).toThrow();
  expect(() =>
    buildConfirmation(
      original,
      { ...original, items: [{ ...original.items[0]!, itemCode: null }] },
      new Set(),
    ),
  ).toThrow();
});
test('빈 파일과 20MB 초과 파일을 업로드 전에 거부한다', () => {
  const file = {
    uri: 'file://test',
    name: '검진.pdf',
    type: 'application/pdf',
    inputType: 'pdf' as const,
    size: 0,
  };
  expect(() => validateCheckupFile(file)).toThrow();
  expect(() =>
    validateCheckupFile({ ...file, size: 20 * 1024 * 1024 + 1 }),
  ).toThrow();
});
