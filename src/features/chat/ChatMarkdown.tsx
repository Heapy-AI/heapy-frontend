// 작성자: 김진우 — 상담 답변의 마크다운 서식과 텍스트 선택을 제공한다.
import React from 'react';
import {
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Markdown, {
  MarkdownIt,
  RenderRules,
} from 'react-native-markdown-display';

const markdown = MarkdownIt({ html: false, linkify: true, breaks: true });
const rules: RenderRules = {
  textgroup: (node, children, _parents, styles) => (
    <Text selectable key={node.key} style={styles.textgroup}>
      {children}
    </Text>
  ),
  fence: (node, _children, _parents, styles) => (
    <ScrollView key={node.key} horizontal>
      <Text selectable style={styles.fence}>
        {node.content.replace(/\n$/, '')}
      </Text>
    </ScrollView>
  ),
  code_block: (node, _children, _parents, styles) => (
    <ScrollView key={node.key} horizontal>
      <Text selectable style={styles.code_block}>
        {node.content.replace(/\n$/, '')}
      </Text>
    </ScrollView>
  ),
  table: (node, children, _parents, styles) => (
    <ScrollView key={node.key} horizontal>
      <View style={styles._VIEW_SAFE_table}>{children}</View>
    </ScrollView>
  ),
  image: (node, _children, _parents, styles) => (
    <Text selectable key={node.key} style={styles.text}>
      {node.attributes.alt || '이미지'}
    </Text>
  ),
};

type Props = { content: string; onLinkError: () => void };

export function ChatMarkdown({ content, onLinkError }: Props) {
  return (
    <Markdown
      markdownit={markdown}
      rules={rules}
      style={s}
      onLinkPress={url => {
        if (/^https?:\/\//i.test(url)) {
          Linking.openURL(url).catch(onLinkError);
        }
        return false;
      }}
    >
      {content}
    </Markdown>
  );
}

const code = {
  fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  fontSize: 12,
  lineHeight: 20,
  color: '#17342D',
  backgroundColor: '#F7F3FF',
  borderColor: '#E5DCFF',
  borderRadius: 6,
  padding: 10,
};
const s = StyleSheet.create({
  body: { fontSize: 13, lineHeight: 22, color: '#17342D', flexShrink: 1 },
  paragraph: { marginTop: 0, marginBottom: 8 },
  heading1: {
    fontSize: 20,
    lineHeight: 28,
    fontWeight: '700',
    marginVertical: 8,
  },
  heading2: {
    fontSize: 18,
    lineHeight: 26,
    fontWeight: '700',
    marginVertical: 8,
  },
  heading3: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '700',
    marginVertical: 6,
  },
  heading4: {
    fontSize: 14,
    lineHeight: 22,
    fontWeight: '700',
    marginVertical: 6,
  },
  heading5: {
    fontSize: 13,
    lineHeight: 22,
    fontWeight: '700',
    marginVertical: 4,
  },
  heading6: {
    fontSize: 13,
    lineHeight: 22,
    fontWeight: '700',
    marginVertical: 4,
  },
  link: { color: '#7542EA', textDecorationLine: 'underline' },
  blockquote: {
    backgroundColor: '#F7F3FF',
    borderColor: '#B69AEE',
    padding: 10,
  },
  bullet_list: { marginBottom: 8 },
  ordered_list: { marginBottom: 8 },
  list_item: { marginBottom: 4 },
  code_inline: { ...code, padding: 2 },
  code_block: code,
  fence: code,
  hr: { backgroundColor: '#E5DCFF', marginVertical: 10 },
  table: { borderColor: '#E5DCFF', marginVertical: 8 },
  thead: { backgroundColor: '#F7F3FF' },
  th: { minWidth: 100, padding: 8, fontWeight: '700' },
  td: { minWidth: 100, padding: 8 },
  tr: { borderColor: '#E5DCFF' },
});
