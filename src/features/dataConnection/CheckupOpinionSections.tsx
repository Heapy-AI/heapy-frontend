import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { FormField } from '../../shared/components/FormField';
import { connectionStyles as s } from './ConnectionLayout';
import { reviewStyles as review } from './checkupReviewStyles';

// 작성자: 김진우 — 공개 DTO와 분리한 화면 표시 모델이며 서버의 분류·식별자를 어댑터에서 전달한다.
export type OpinionCardView = {
  id: string;
  title: string;
  context?: string;
  text: string;
  institutionStatus?: string | null;
  summary?: string;
  summaryCurrent?: boolean;
  summarySource?: string;
  editable?: boolean;
  excludable?: boolean;
};

type Props = {
  examinations?: OpinionCardView[];
  overall?: OpinionCardView[];
  excluded?: Set<string>;
  busy?: boolean;
  onChange?: (id: string, text: string) => void;
  onExclude?: (id: string) => void;
};

export function CheckupOpinionSections({
  examinations = [],
  overall = [],
  excluded = new Set(),
  busy = false,
  onChange,
  onExclude,
}: Props) {
  const section = (title: string, cards: OpinionCardView[]) =>
    cards.length ? (
      <View style={s.section}>
        <Text accessibilityRole="header" style={s.cardTitle}>
          {title}
        </Text>
        {cards.map(card => (
          <View key={card.id} style={review.card}>
            <Text accessibilityRole="header" style={review.title}>
              {card.title}
            </Text>
            {!!card.context && <Text style={s.badge}>{card.context}</Text>}
            <Text style={s.description}>기관 소견 · 사용자 확인 내용</Text>
            {onChange && card.editable ? (
              <FormField
                label={`${card.title}${
                  card.context ? ` ${card.context}` : ''
                } 소견`}
                multiline
                value={card.text}
                editable={!busy && !excluded.has(card.id)}
                onChangeText={text => onChange(card.id, text)}
              />
            ) : (
              <Text style={s.description}>{card.text}</Text>
            )}
            {card.institutionStatus != null && (
              <Text style={s.description}>
                기관 판정: {card.institutionStatus}
              </Text>
            )}
            {!!card.summary && card.summaryCurrent === true && (
              <View>
                <Text style={s.badge}>
                  {card.summarySource === 'institution'
                    ? '기관 요약'
                    : 'AI 요약'}{' '}
                  · 기관 소견과 구분해서 확인해 주세요
                </Text>
                <Text style={s.description}>{card.summary}</Text>
              </View>
            )}
            {!!card.summary && card.summaryCurrent !== true && (
              <Text style={s.description}>
                소견과 일치하는 최신 요약이 없어 이전 요약은 표시하지 않아요.
              </Text>
            )}
            {onExclude && card.excludable && (
              <Pressable
                accessibilityRole="checkbox"
                accessibilityLabel={`${card.title}${
                  card.context ? ` ${card.context}` : ''
                } 소견 제외`}
                accessibilityState={{
                  checked: excluded.has(card.id),
                  disabled: busy,
                }}
                disabled={busy}
                onPress={() => onExclude(card.id)}
                style={s.textButton}
              >
                <Text style={s.textButtonLabel}>
                  {excluded.has(card.id) ? '☑' : '□'} 이번 저장에서 제외
                </Text>
              </Pressable>
            )}
          </View>
        ))}
      </View>
    ) : null;
  return (
    <>
      {section('검사별 소견', examinations)}
      {section('종합소견', overall)}
    </>
  );
}
