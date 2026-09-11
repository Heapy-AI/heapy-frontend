// 작성자: 김진우 — 실제 렌더러의 서식 표시와 링크 처리를 검증한다.
import React from 'react';
import { Linking, StyleSheet, Text } from 'react-native';
import { act, create, ReactTestRenderer } from 'react-test-renderer';
import { ChatMarkdown } from '../src/features/chat/ChatMarkdown';

test('마크다운 기호를 서식으로 표시하고 일반 텍스트와 미완성 답변도 유지한다', () => {
  let tree!: ReactTestRenderer;
  act(() => {
    tree = create(
      <ChatMarkdown
        content={
          '## 요약\n\n**강조**와 *기울임*\n\n- 첫 항목\n- 둘째 항목\n\n> 인용\n\n```text\n코드 **그대로**\n```\n\n| 항목 | 값 |\n| --- | --- |\n| 예시 | 10 |'
        }
        onLinkError={jest.fn()}
      />,
    );
  });
  const texts = tree.root.findAllByType(Text);
  expect(texts.some(node => node.props.children === '강조')).toBe(true);
  expect(
    texts.some(
      node => StyleSheet.flatten(node.props.style)?.fontWeight === 'bold',
    ),
  ).toBe(true);
  const output = JSON.stringify(tree.toJSON());
  expect(output).not.toContain('## 요약');
  expect(output).not.toContain('**강조**');
  expect(output).toContain('첫 항목');
  expect(output).toContain('예시');
  expect(output).toContain('코드 **그대로**');
  expect(texts.some(node => node.props.selectable)).toBe(true);
  act(() =>
    tree.update(
      <ChatMarkdown
        content="일반 답변\n**아직 생성 중"
        onLinkError={jest.fn()}
      />,
    ),
  );
  expect(JSON.stringify(tree.toJSON())).toContain('아직 생성 중');
  act(() => tree.unmount());
});

test('웹 링크만 열고 링크 열기 실패를 안내한다', async () => {
  const open = jest
    .spyOn(Linking, 'openURL')
    .mockRejectedValue(new Error('실패'));
  const onLinkError = jest.fn();
  let tree!: ReactTestRenderer;
  act(() => {
    tree = create(
      <ChatMarkdown
        content={'[출처](https://example.com) [메일](mailto:test@example.com)'}
        onLinkError={onLinkError}
      />,
    );
  });
  const links = tree.root
    .findAllByType(Text)
    .filter(node => node.props.onPress);
  await act(async () => {
    links.forEach(node => node.props.onPress());
  });
  expect(open).toHaveBeenCalledTimes(1);
  expect(open).toHaveBeenCalledWith('https://example.com');
  expect(onLinkError).toHaveBeenCalledTimes(1);
  act(() => tree.unmount());
  open.mockRestore();
});
