import { CheckupFinding, CheckupResult, ConfirmCheckup } from './types';
import { buildConfirmation } from './checkupValidation';
import { isValidBirthDate } from '../../shared/utils/birthDate';

const examTypes = new Set([
  'upper_gi_endoscopy',
  'colonoscopy',
  'biopsy',
  'ultrasound',
  'ct',
  'mri',
  'other_procedure',
]);
const reasons = new Set([
  'uncertain_classification',
  'unmatched_item',
  'invalid_extraction',
]);
const unsupported = () =>
  new Error(
    '확인 필요: 지원하지 않는 검수 형식이나 분류가 있어요. 앱 업데이트 또는 서버 분류 확인이 필요해요.',
  );

export function validateFindings(
  findings: CheckupFinding[],
  classification: string,
) {
  for (const finding of findings) {
    if (
      finding.schemaVersion !== 1 ||
      finding.classification !== classification ||
      (classification === 'procedure_finding'
        ? !examTypes.has(finding.examType ?? '')
        : finding.examType != null) ||
      typeof finding.text !== 'string' ||
      typeof finding.examName !== 'string' ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(
        finding.findingId,
      ) ||
      (finding.summary &&
        !['institution', 'ai'].includes(finding.summary.source))
    )
      throw unsupported();
  }
}

// 작성자: 김진우 — 알 수 없는 버전·분류는 저장 전에 차단하며 이름으로 분류하지 않는다.
export function validateReviewContract(result: CheckupResult) {
  if (!Array.isArray(result.items)) throw unsupported();
  if (result.schemaVersion == null) {
    if (
      result.findings != null ||
      result.overallOpinions != null ||
      result.reviewRequired != null ||
      result.items.some(item => item.classification != null)
    )
      throw unsupported();
    return;
  }
  if (
    result.schemaVersion !== 2 ||
    !Array.isArray(result.findings) ||
    !Array.isArray(result.overallOpinions) ||
    !Array.isArray(result.reviewRequired)
  )
    throw unsupported();
  if (
    result.items.some(item => item.classification !== 'general_test') ||
    result.reviewRequired.some(
      item =>
        item.classification !== 'needs_review' || !reasons.has(item.reason),
    )
  )
    throw unsupported();
  validateFindings(result.findings, 'procedure_finding');
  validateFindings(result.overallOpinions, 'overall_opinion');
  const ids = [
    ...result.items.map(item => item.fieldKey),
    ...result.findings.map(item => item.findingId),
    ...result.overallOpinions.map(item => item.findingId),
    ...result.reviewRequired.map(item => item.fieldKey),
  ];
  if (ids.some(id => !id) || new Set(ids).size !== ids.length)
    throw new Error(
      '검사 식별자가 중복되거나 없어요. 결과지를 다시 등록해 주세요.',
    );
}

export function hasReviewContent(result: CheckupResult) {
  return (
    result.items.length +
      (result.findings?.length ?? 0) +
      (result.overallOpinions?.length ?? 0) +
      (result.reviewRequired?.length ?? 0) >
    0
  );
}

const byteLength = (value: unknown) => {
  // 작성자: 김진우 — 네이티브 TextEncoder 없이 UTF-8 JSON 바이트 길이를 계산한다.
  const json = JSON.stringify(value);
  let bytes = 0;
  for (const character of json) {
    const code = character.codePointAt(0)!;
    bytes += code <= 0x7f ? 1 : code <= 0x7ff ? 2 : code <= 0xffff ? 3 : 4;
  }
  return bytes;
};

export function buildReviewConfirmation(
  original: CheckupResult,
  edited: CheckupResult,
  excluded: Set<string>,
): ConfirmCheckup {
  validateReviewContract(original);
  validateReviewContract(edited);
  if (original.schemaVersion !== edited.schemaVersion) throw unsupported();
  if (original.schemaVersion == null)
    return buildConfirmation(original, edited, excluded);
  if (!isValidBirthDate(edited.measuredAt ?? ''))
    throw new Error('검진일을 YYYY-MM-DD 형식으로 확인해 주세요.');
  if ((edited.providerName?.trim().length ?? 0) > 200)
    throw new Error('검진 기관은 200자 이하로 입력해 주세요.');
  const ids = new Set([
    ...original.items.map(item => item.fieldKey),
    ...original.findings!.map(item => item.findingId),
    ...original.overallOpinions!.map(item => item.findingId),
    ...original.reviewRequired!.map(item => item.fieldKey),
  ]);
  if ([...excluded].some(id => !ids.has(id)))
    throw new Error('제외할 항목의 식별자를 확인해 주세요.');
  // 작성자: 김진우 — 제외 후보는 안내 후 자동 제외하되 서버에 모든 식별자를 전송한다.
  const excludedKeys = new Set([
    ...excluded,
    ...original.reviewRequired!.map(item => item.fieldKey),
  ]);
  const findings = (name: 'findings' | 'overallOpinions') => {
    const before = new Map(original[name]!.map(item => [item.findingId, item]));
    if (edited[name]!.length !== before.size) throw unsupported();
    return edited[name]!.flatMap(item => {
      const previous = before.get(item.findingId);
      if (!previous) throw unsupported();
      for (const field of [
        'schemaVersion',
        'classification',
        'examType',
        'examName',
        'bodySite',
        'method',
        'performedAt',
      ] as const)
        if (item[field] !== previous[field])
          throw new Error(
            '소견의 검사 종류·부위 등 기관 식별 정보는 수정할 수 없어요.',
          );
      if (excluded.has(item.findingId)) return [];
      if (!item.text.trim() || item.text.length > 12000)
        throw new Error(
          '유지할 소견은 비어 있지 않은 12,000자 이하 내용이어야 해요.',
        );
      // 작성자: 김진우 — 요약은 신뢰된 원본만 사용하고 본문 수정 시 반드시 제거한다.
      const saved = {
        ...previous,
        text: item.text,
        summary: item.text === previous.text ? previous.summary : null,
      };
      if (byteLength(saved) > 65536)
        throw new Error('소견 한 건의 크기가 저장 한도를 넘었어요.');
      return [saved];
    });
  };
  const included = edited.items.filter(item => !excluded.has(item.fieldKey));
  let results: ConfirmCheckup['results'] = [];
  if (included.length) {
    const general = buildConfirmation(original, edited, excluded);
    const includedByCode = new Map(included.map(item => [item.itemCode, item]));
    results = general.results.map(item => {
      const source = includedByCode.get(item.itemCode)!;
      const before = original.items.find(
        entry => entry.fieldKey === source.fieldKey,
      )!;
      if (item.numericValue != null && before.numericValue == null)
        throw new Error(
          '이 검사의 결과 형식을 확인할 수 없어 저장할 수 없어요. 입력을 유지했어요. 항목 정보 확인이 필요해요.',
        );
      if (item.value.length > 2000 || (item.unit?.length ?? 0) > 100)
        throw new Error('결과값은 2,000자, 단위는 100자 이하로 입력해 주세요.');
      return {
        ...item,
        unit: item.unit?.trim() || null,
        fieldKey: source.fieldKey,
      };
    });
  } else if (
    edited.items.length !== original.items.length ||
    original.items.some(item => !excluded.has(item.fieldKey))
  )
    throw unsupported();
  const payload: ConfirmCheckup = {
    reviewVersion: 2,
    measuredAt: edited.measuredAt,
    providerName: edited.providerName?.trim() || null,
    results,
    findings: findings('findings'),
    overallOpinions: findings('overallOpinions'),
    excludedFieldKeys: [...excludedKeys],
    corrections: [],
  };
  if (
    !results.length &&
    !payload.findings!.length &&
    !payload.overallOpinions!.length
  )
    throw new Error(
      '서버에서 확인된 검사나 소견을 하나 이상 유지해야 저장할 수 있어요.',
    );
  if (byteLength(payload) > 262144)
    throw new Error('확정할 전체 내용이 저장 크기 한도를 넘었어요.');
  return payload;
}
