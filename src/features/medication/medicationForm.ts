import { MedicationInput } from './medicationApi';

export type MedicationDraft = {
  itemOrder?: number;
  displayName: string;
  dosageText: string;
  instructions: string;
  startDate: string;
  endDate: string;
  times: string;
};
export const koreaDate = (now = new Date()) =>
  new Date(now.getTime() + 9 * 3600000).toISOString().slice(0, 10);
export const shiftDate = (date: string, days: number) =>
  new Date(Date.parse(`${date}T12:00:00Z`) + days * 86400000)
    .toISOString()
    .slice(0, 10);
export const koreaTime = (value: string) =>
  new Date(Date.parse(value) + 9 * 3600000).toISOString().slice(11, 16);
export function emptyMedication(): MedicationDraft {
  return {
    displayName: '',
    dosageText: '',
    instructions: '',
    startDate: koreaDate(),
    endDate: '',
    times: '',
  };
}
export function medicationPayload(draft: MedicationDraft): MedicationInput {
  const dateValid = (date: string) =>
    /^\d{4}-\d{2}-\d{2}$/.test(date) &&
    !Number.isNaN(Date.parse(date)) &&
    new Date(date).toISOString().slice(0, 10) === date;
  if (!draft.displayName.trim() || !draft.dosageText.trim())
    throw new Error('약 이름과 1회 복용량을 입력해 주세요.');
  if (
    draft.displayName.length > 200 ||
    draft.dosageText.length > 1000 ||
    draft.instructions.length > 1000
  )
    throw new Error('입력한 내용이 너무 길어요.');
  if (
    !dateValid(draft.startDate) ||
    (draft.endDate &&
      (!dateValid(draft.endDate) || draft.endDate < draft.startDate))
  )
    throw new Error('시작일과 종료일을 확인해 주세요. 예: 2026-09-11');
  const times = draft.times.split(',').map(time => time.trim());
  if (
    times.length > 12 ||
    times.some(time => !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) ||
    new Set(times).size !== times.length
  )
    throw new Error('복용 시각을 08:00, 20:00처럼 중복 없이 입력해 주세요.');
  return {
    displayName: draft.displayName.trim(),
    dosageText: draft.dosageText.trim(),
    instructions: draft.instructions.trim() || null,
    startDate: draft.startDate,
    endDate: draft.endDate || null,
    scheduledTimes: times.sort().map(time => `${time}:00`),
  };
}
