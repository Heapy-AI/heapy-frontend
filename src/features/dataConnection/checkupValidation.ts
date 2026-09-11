import { CheckupFile, CheckupResult, ConfirmCheckup } from './types';
import { isValidBirthDate } from '../../shared/utils/birthDate';

export function validateCheckupFile(file: CheckupFile) {
  if (!['application/pdf', 'image/jpeg', 'image/png'].includes(file.type))
    throw new Error('PDF, JPG, PNG 파일을 선택해 주세요.');
  if (!file.size || file.size > 20_000_000)
    throw new Error('비어 있지 않은 20MB 이하 파일을 선택해 주세요.');
}

export function buildConfirmation(
  original: CheckupResult,
  edited: CheckupResult,
  excluded: Set<string>,
): ConfirmCheckup {
  if (!isValidBirthDate(edited.measuredAt ?? ''))
    throw new Error('검진일을 YYYY-MM-DD 형식으로 확인해 주세요.');

  // 작성자: 김진우 — 재정렬 이후에도 식별자와 기관 판정 원문을 보존하고 항목 주입을 차단한다.
  const originals = new Map(original.items.map(item => [item.fieldKey, item]));
  if (
    originals.size !== original.items.length ||
    new Set(edited.items.map(item => item.fieldKey)).size !==
      edited.items.length ||
    edited.items.length !== original.items.length ||
    edited.items.some(item => !item.fieldKey || !originals.has(item.fieldKey))
  )
    throw new Error(
      '검사 식별자를 확인할 수 없어요. 결과지를 다시 등록해 주세요.',
    );

  const included = edited.items.filter(item => !excluded.has(item.fieldKey));
  if (!included.length)
    throw new Error('저장할 검진 항목을 하나 이상 선택해 주세요.');
  if (included.some(item => !item.itemCode))
    throw new Error(
      '표준 항목 연결이 불확실한 검사 결과는 현재 저장할 수 없어요. 원본의 검사명을 확인한 뒤 제외해 주세요.',
    );
  if (included.some(item => !item.value.trim()))
    throw new Error('저장할 검사의 비어 있는 결과값을 확인해 주세요.');
  if (new Set(included.map(item => item.itemCode)).size !== included.length)
    throw new Error(
      '같은 검사 코드의 결과가 여러 개예요. 원본의 부위·시점을 확인하고 저장할 결과 하나를 선택해 주세요.',
    );
  const corrections: ConfirmCheckup['corrections'] = [];
  for (const item of edited.items) {
    const before = originals.get(item.fieldKey)!;
    if (item.itemCode !== before.itemCode || item.status !== before.status)
      throw new Error('검사 코드와 기관 판정은 수정할 수 없어요.');
    if (excluded.has(item.fieldKey)) {
      corrections.push({
        fieldKey: item.fieldKey,
        itemCode: item.itemCode,
        originalValue: before.value,
        correctedValue: '',
        correctionType: 'excluded',
      });
      continue;
    }
    for (const field of ['value', 'unit'] as const) {
      if ((before[field] ?? '') !== (item[field] ?? ''))
        corrections.push({
          fieldKey: `${item.fieldKey}.${field}`,
          itemCode: item.itemCode,
          originalValue: before[field] ?? '',
          correctedValue: item[field] ?? '',
          correctionType: field,
        });
    }
  }
  return {
    measuredAt: edited.measuredAt,
    providerName: edited.providerName?.trim() || null,
    results: included.map(item => ({
      itemCode: item.itemCode,
      value: item.value,
      numericValue: /^[+-]?\d+(\.\d+)?$/.test(item.value.trim())
        ? Number(item.value)
        : null,
      unit: item.unit,
      status: item.status,
    })),
    corrections,
  };
}
