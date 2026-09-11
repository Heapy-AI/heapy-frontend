// 작성자: 김진우 — 조각으로 도착하는 SSE를 중복 없이 해석한다.
export type ChatEvent = { name: string; data: Record<string, unknown> };
export function createChatStreamParser(onEvent: (event: ChatEvent) => void) {
  let consumed = 0;
  let pending = '';
  return (fullText: string) => {
    if (fullText.length > 1048576 || fullText.length < consumed)
      throw new Error('상담 응답 형식을 확인할 수 없습니다.');
    pending += fullText.slice(consumed);
    consumed = fullText.length;
    pending = pending.replace(/\r\n/g, '\n');
    let end: number;
    while ((end = pending.indexOf('\n\n')) >= 0) {
      const frame = pending.slice(0, end);
      pending = pending.slice(end + 2);
      const lines = frame.split('\n');
      const name = lines
        .find(line => line.startsWith('event:'))
        ?.slice(6)
        .trim();
      const data = lines
        .filter(line => line.startsWith('data:'))
        .map(line => line.slice(5).trimStart())
        .join('\n');
      if (name && data) {
        const parsed: unknown = JSON.parse(data);
        if (
          typeof parsed !== 'object' ||
          parsed === null ||
          Array.isArray(parsed)
        )
          throw new Error('상담 응답 형식이 올바르지 않습니다.');
        onEvent({ name, data: parsed as Record<string, unknown> });
      }
    }
  };
}
