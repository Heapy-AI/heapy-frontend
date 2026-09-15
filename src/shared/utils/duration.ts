// 작성자: 김진우 — 저장 단위는 유지하고 화면의 기간 수치만 시간으로 통일한다.
export function durationHours(
  value: number | null | undefined,
  unit = '분',
): number | null {
  if (value == null || !Number.isFinite(value)) return null;
  if (unit === '분' || unit === 'MINUTE') return value / 60;
  if (unit === '초' || unit === 'SECOND') return value / 3600;
  return value;
}

export function formatHours(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return '—';
  if (value !== 0 && Math.abs(value) < 0.1) return value < 0 ? '−<0.1' : '<0.1';
  return value.toLocaleString('ko-KR', { maximumFractionDigits: 1 });
}

export function formatDuration(
  value: number | null | undefined,
  unit = '분',
): string {
  const hours = durationHours(value, unit);
  if (hours === null) return '—';
  if (hours !== 0 && Math.abs(hours) < 0.1)
    return `${hours < 0 ? '-' : ''}0.1시간 미만`;
  return `${formatHours(hours)}시간`;
}

// 작성자: 김진우 — 미션 문구의 명시적인 기간을 변환하고 기간 뒤의 표현을 자연스럽게 연결한다.
export function formatDurationText(text: string): string {
  return text
    .replace(
      /(\d+(?:\.\d+)?)\s*([~～–-])\s*(\d+(?:\.\d+)?)\s*(분|초)/g,
      (_, from: string, separator: string, to: string, unit: string) =>
        `${formatHours(
          durationHours(Number(from), unit),
        )}${separator}${formatDuration(Number(to), unit)}`,
    )
    .replace(
      /(?:(\d+(?:\.\d+)?)\s*시간\s*)?(\d+(?:\.\d+)?)\s*(분|초)/g,
      (_, hours: string | undefined, value: string, unit: string) =>
        formatDuration(
          Number(hours ?? 0) + (durationHours(Number(value), unit) ?? 0),
          '시간',
        ),
    )
    .replace(/(\d+\.\d+)\s*시간/g, (_, hours: string) =>
      formatDuration(Number(hours), '시간'),
    )
    .replace(/시간간/g, '시간 동안');
}
