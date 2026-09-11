import {
  emptyMedication,
  medicationPayload,
  koreaDate,
} from '../src/features/medication/medicationForm';

test('복용 시각을 추측하지 않고 중복·잘못된 날짜를 거절한다', () => {
  const draft = {
    ...emptyMedication(),
    displayName: '합성 약',
    dosageText: '1정',
  };
  expect(() => medicationPayload(draft)).toThrow('복용 시각');
  expect(() => medicationPayload({ ...draft, times: '08:00, 08:00' })).toThrow(
    '복용 시각',
  );
  expect(() => medicationPayload({ ...draft, times: '25:00' })).toThrow(
    '복용 시각',
  );
  expect(() =>
    medicationPayload({ ...draft, times: '08:00', startDate: '2026-02-30' }),
  ).toThrow('시작일');
  expect(
    medicationPayload({ ...draft, times: '20:00, 08:00' }).scheduledTimes,
  ).toEqual(['08:00:00', '20:00:00']);
  expect(koreaDate(new Date('2026-09-10T16:00:00Z'))).toBe('2026-09-11');
});
