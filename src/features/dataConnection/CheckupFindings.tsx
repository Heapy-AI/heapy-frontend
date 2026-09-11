import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { CheckupFinding, CheckupResult } from './types';
import {
  CheckupOpinionSections,
  OpinionCardView,
} from './CheckupOpinionSections';

export function findingCards(
  items: CheckupFinding[],
  original?: CheckupFinding[],
): OpinionCardView[] {
  return items.map(item => ({
    id: item.findingId,
    title: item.examName,
    context: [item.bodySite, item.method, item.performedAt]
      .filter(Boolean)
      .join(' · '),
    text: item.text,
    summary: item.summary?.text,
    summarySource: item.summary?.source,
    summaryCurrent:
      !original ||
      original.find(entry => entry.findingId === item.findingId)?.text ===
        item.text,
    editable: true,
    excludable: false,
  }));
}

const reasonLabels: Record<string, string> = {
  uncertain_classification: '검사 결과와 소견의 분류가 확인되지 않았어요.',
  unmatched_item: '저장할 표준 검사 항목과 연결되지 않았어요.',
  invalid_extraction: '추출 내용을 검증하지 못했어요.',
};

export function CheckupFindings({
  result,
  original,
  excluded,
  busy,
  onChange,
}: {
  result: CheckupResult;
  original: CheckupResult;
  excluded: Set<string>;
  busy: boolean;
  onChange: (
    name: 'findings' | 'overallOpinions',
    id: string,
    text: string,
  ) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  if (result.schemaVersion !== 2) return null;
  return (
    <>
      <CheckupOpinionSections
        examinations={findingCards(result.findings ?? [], original.findings)}
        overall={findingCards(
          result.overallOpinions ?? [],
          original.overallOpinions,
        )}
        excluded={excluded}
        busy={busy}
        onChange={(id, text) =>
          onChange(
            result.findings?.some(item => item.findingId === id)
              ? 'findings'
              : 'overallOpinions',
            id,
            text,
          )
        }
      />
      {!!result.reviewRequired?.length && (
        <View style={noticeStyles.card}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`이번 저장에 포함되지 않는 항목 ${result.reviewRequired.length}개`}
            accessibilityState={{ expanded }}
            aria-expanded={expanded}
            onPress={() => setExpanded(value => !value)}
            style={noticeStyles.toggle}
          >
            <View style={noticeStyles.icon}>
              <Text style={noticeStyles.iconText}>i</Text>
            </View>
            <View style={noticeStyles.copy}>
              <Text style={noticeStyles.eyebrow}>저장 제외 안내</Text>
              <Text style={noticeStyles.title}>
                이번 저장에 포함되지 않는 항목
              </Text>
            </View>
            <View style={noticeStyles.count}>
              <Text style={noticeStyles.countText}>
                {result.reviewRequired.length}
              </Text>
            </View>
            <Text style={noticeStyles.chevron}>{expanded ? '−' : '+'}</Text>
          </Pressable>
          <Text style={noticeStyles.description}>
            분류나 검사 항목 연결이 확인되지 않아 이번 저장에서 자동으로
            제외해요. 다른 검사 결과와 소견은 그대로 저장할 수 있어요.
          </Text>
          {expanded &&
            result.reviewRequired.map(item => (
              <View key={item.fieldKey} style={noticeStyles.item}>
                <View style={noticeStyles.itemHeader}>
                  <Text style={noticeStyles.itemBadge}>저장 제외</Text>
                </View>
                <Text style={noticeStyles.itemText}>{item.text}</Text>
                <Text style={noticeStyles.reason}>
                  {reasonLabels[item.reason] ??
                    '저장 형식을 확인하지 못했어요.'}
                </Text>
              </View>
            ))}
        </View>
      )}
    </>
  );
}

// 작성자: 김진우 — 펼침 버튼의 터치 영역과 항목 사이 간격.
const noticeStyles = StyleSheet.create({
  card: {
    backgroundColor: '#F8F5EF',
    borderColor: '#E7DDCD',
    borderWidth: 1,
    borderRadius: 24,
    padding: 20,
    gap: 16,
  },
  toggle: {
    minHeight: 52,
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  icon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#EDE5D7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconText: { fontSize: 21, fontWeight: '700', color: '#87683B' },
  copy: { flex: 1, gap: 5 },
  eyebrow: {
    color: '#927B57',
    fontSize: 10,
    letterSpacing: 0.8,
    fontWeight: '700',
  },
  title: { color: '#594C39', fontSize: 15, lineHeight: 23, fontWeight: '700' },
  count: {
    minWidth: 27,
    height: 27,
    borderRadius: 9,
    paddingHorizontal: 6,
    backgroundColor: '#EDE5D7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  countText: { color: '#79603B', fontSize: 12, fontWeight: '800' },
  chevron: { color: '#8D7958', fontSize: 22 },
  description: { fontSize: 13, color: '#847359', lineHeight: 22 },
  item: {
    gap: 9,
    padding: 16,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderColor: '#EBE4D9',
    borderWidth: 1,
  },
  itemHeader: { flexDirection: 'row' },
  itemBadge: {
    fontSize: 10,
    fontWeight: '700',
    color: '#94703F',
    backgroundColor: '#F6EFE3',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  itemText: { color: '#514B42', fontSize: 14, lineHeight: 23 },
  reason: { color: '#8A7D69', fontSize: 12, lineHeight: 20 },
});
