import { checkupV2Sample } from '../preview/checkupV2Sample';
import {
  buildReviewConfirmation,
  validateReviewContract,
} from '../src/features/dataConnection/checkupReviewContract';

test('혈압 수정·정성 검사·소견·종합소견을 하나의 버전 2 요청으로 보존한다', () => {
  const original = checkupV2Sample();
  const edited = checkupV2Sample();
  edited.items.reverse();
  edited.items.find(item => item.fieldKey === 'sample-pressure')!.value = '121';
  edited.findings![0]!.text = '사용자가 확인한 합성 수정 소견';
  const payload = buildReviewConfirmation(original, edited, new Set());
  expect(payload.reviewVersion).toBe(2);
  expect(
    payload.results.find(item => item.fieldKey === 'sample-pressure'),
  ).toMatchObject({ value: '121', numericValue: 121 });
  expect(
    payload.results.find(item => item.fieldKey === 'sample-hearing'),
  ).toMatchObject({ value: '정상', numericValue: null, unit: null });
  expect(payload.findings![0]).toMatchObject({
    findingId: original.findings![0]!.findingId,
    text: '사용자가 확인한 합성 수정 소견',
    summary: null,
  });
  expect(payload.overallOpinions).toEqual(original.overallOpinions);
  expect(payload.corrections).toEqual([]);
});

test('소견만 또는 종합소견만 있는 회차를 허용하되 전체 제외는 거부한다', () => {
  const original = checkupV2Sample();
  original.items = [];
  expect(
    buildReviewConfirmation(original, original, new Set()).results,
  ).toEqual([]);
  original.findings = [];
  expect(
    buildReviewConfirmation(original, original, new Set()).overallOpinions,
  ).toHaveLength(1);
  expect(() =>
    buildReviewConfirmation(
      original,
      original,
      new Set([original.overallOpinions![0]!.findingId]),
    ),
  ).toThrow('하나 이상');
});

test('저장 제외 후보는 체크 없이 제외 목록에 자동 포함하고 중복 전송하지 않는다', () => {
  const original = checkupV2Sample();
  original.reviewRequired = [
    {
      fieldKey: 'review-one',
      classification: 'needs_review',
      text: '합성 불명확 문장',
      reason: 'uncertain_classification',
    },
  ];
  expect(
    buildReviewConfirmation(original, original, new Set()).excludedFieldKeys,
  ).toEqual(['review-one']);
  expect(
    buildReviewConfirmation(original, original, new Set(['review-one']))
      .excludedFieldKeys,
  ).toEqual(['review-one']);
});

test('본문 수정 시 이전 기관 요약도 제거하고 새 요약 주입은 전달하지 않는다', () => {
  const original = checkupV2Sample();
  original.findings![0]!.summary = {
    text: '합성 요약',
    source: 'institution',
    basisHash: 'a'.repeat(64),
  };
  const edited = JSON.parse(JSON.stringify(original));
  edited.findings[0].summary.text = '주입된 요약';
  expect(
    buildReviewConfirmation(original, edited, new Set()).findings![0]!.summary,
  ).toEqual(original.findings![0]!.summary);
  edited.findings[0].text = '수정한 합성 소견';
  expect(
    buildReviewConfirmation(original, edited, new Set()).findings![0]!.summary,
  ).toBeNull();
});

test.each(['version', 'classification', 'examType', 'reason', 'duplicate'])(
  '알 수 없는 구조를 임의 변환하지 않는다: %s',
  mode => {
    const result = checkupV2Sample();
    if (mode === 'version') result.schemaVersion = 3;
    if (mode === 'classification')
      result.findings![0]!.classification = 'unknown';
    if (mode === 'examType') result.findings![0]!.examType = 'unknown';
    if (mode === 'reason')
      result.reviewRequired = [
        {
          fieldKey: 'review-one',
          classification: 'needs_review',
          text: '합성',
          reason: 'unknown',
        },
      ];
    if (mode === 'duplicate')
      result.overallOpinions![0]!.findingId = result.findings![0]!.findingId;
    expect(() => validateReviewContract(result)).toThrow();
  },
);

test('소견 식별 맥락 변경·빈 내용·길이 초과·전체 바이트 초과를 거부한다', () => {
  const original = checkupV2Sample();
  const edited = checkupV2Sample();
  edited.findings![0]!.bodySite = '다른 부위';
  expect(() => buildReviewConfirmation(original, edited, new Set())).toThrow(
    '식별 정보',
  );
  edited.findings![0]!.bodySite = '위';
  edited.findings![0]!.text = '';
  expect(() => buildReviewConfirmation(original, edited, new Set())).toThrow(
    '12,000자',
  );
  edited.findings![0]!.text = '가'.repeat(12001);
  expect(() => buildReviewConfirmation(original, edited, new Set())).toThrow(
    '12,000자',
  );
  const large = checkupV2Sample();
  large.findings = Array.from({ length: 10 }, (_, index) => ({
    ...large.findings![0]!,
    findingId: `11111111-1111-4111-8111-${String(index).padStart(12, '0')}`,
    text: '가'.repeat(12000),
  }));
  expect(() => buildReviewConfirmation(large, large, new Set())).toThrow(
    '크기 한도',
  );
});

test('마스터 유형을 모르는 숫자 형태 정성값을 임의 수치로 바꾸지 않는다', () => {
  const original = checkupV2Sample();
  original.items[1]!.value = '1';
  expect(() => buildReviewConfirmation(original, original, new Set())).toThrow(
    '결과 형식',
  );
});
