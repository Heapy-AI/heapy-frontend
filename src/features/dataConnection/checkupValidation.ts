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

  const included = edited.items.filter(item => !excluded.has(item.fieldKey));
  if (!included.length)
    throw new Error('저장할 검진 항목을 하나 이상 선택해 주세요.');
  if (included.some(item => !item.itemCode || !item.value.trim()))
    throw new Error(
      '항목 코드가 없는 결과는 제외하고, 비어 있는 결과값을 확인해 주세요.',
    );
  const corrections: ConfirmCheckup['corrections'] = [];
  for (const item of edited.items) {
    const before = original.items.find(
      value => value.fieldKey === item.fieldKey,
    )!;
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
