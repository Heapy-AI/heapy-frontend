// 작성자: 김진우 — 기본 접힘·펼침·자동 제외 안내의 화면 동작 검증.
import React from 'react';
import { act, create, ReactTestRenderer } from 'react-test-renderer';
import { CheckupFindings } from '../src/features/dataConnection/CheckupFindings';
import { checkupV2Sample } from '../preview/checkupV2Sample';

jest.mock('../src/features/dataConnection/CheckupOpinionSections', () => ({
  CheckupOpinionSections: () => null,
}));

test('제외 후보는 접힌 안내로 시작하고 펼치면 체크박스 없이 사유를 보여준다', () => {
  const result = checkupV2Sample();
  result.reviewRequired = [
    {
      fieldKey: 'review-one',
      classification: 'needs_review',
      text: '합성 검수 후보',
      reason: 'unmatched_item',
    },
  ];
  let tree!: ReactTestRenderer;
  act(() => {
    tree = create(
      <CheckupFindings
        result={result}
        original={result}
        excluded={new Set()}
        busy={false}
        onChange={jest.fn()}
      />,
    );
  });
  const toggle = () =>
    tree.root.findAllByProps({
      accessibilityLabel: '이번 저장에 포함되지 않는 항목 1개',
    })[0]!;
  expect(toggle().props.accessibilityState.expanded).toBe(false);
  expect(JSON.stringify(tree.toJSON())).not.toContain('합성 검수 후보');
  act(() => toggle().props.onPress());
  expect(toggle().props.accessibilityState.expanded).toBe(true);
  expect(JSON.stringify(tree.toJSON())).toContain('합성 검수 후보');
  expect(JSON.stringify(tree.toJSON())).toContain('저장 제외');
  expect(
    tree.root.findAllByProps({ accessibilityRole: 'checkbox' }),
  ).toHaveLength(0);
  act(() => toggle().props.onPress());
  expect(JSON.stringify(tree.toJSON())).not.toContain('합성 검수 후보');
  act(() => tree.unmount());
});
