// 작성자: 김진우 — 합성 SSE의 분할·중복·잘못된 본문을 검사한다.
import { createChatStreamParser } from '../src/features/chat/chatStream';
test('분할된 CRLF와 중복 전달을 한 번만 처리한다', () => {
  const callback = jest.fn();
  const parse = createChatStreamParser(callback);
  const source = 'event: delta\r\ndata: {"content":"안녕"}\r\n\r\n';
  for (let i = 1; i <= source.length; i++) parse(source.slice(0, i));
  parse(source);
  expect(callback).toHaveBeenCalledTimes(1);
  expect(callback).toHaveBeenCalledWith({
    name: 'delta',
    data: { content: '안녕' },
  });
});
test('배열 본문과 크기 초과를 거절한다', () => {
  expect(() =>
    createChatStreamParser(jest.fn())('event: done\ndata: []\n\n'),
  ).toThrow();
  expect(() =>
    createChatStreamParser(jest.fn())('x'.repeat(1048577)),
  ).toThrow();
});
