import {
  formatBirthDate,
  isValidBirthDate,
} from '../src/shared/utils/birthDate';

test('생년월일의 윤년과 실제 날짜 및 미래 날짜를 검증한다', () => {
  expect(isValidBirthDate('2000-02-29')).toBe(true);
  expect(isValidBirthDate('2001-02-29')).toBe(false);
  expect(isValidBirthDate('2001-04-31')).toBe(false);
  expect(isValidBirthDate('2001-13-01')).toBe(false);
  expect(isValidBirthDate('2001-5-1')).toBe(false);
  expect(isValidBirthDate('2999-01-01')).toBe(false);
  expect(formatBirthDate(2001, 4, 8)).toBe('2001-05-08');
});
