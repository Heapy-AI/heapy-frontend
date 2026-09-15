// 작성자: 김진우 — 팀원 건강점수 표시를 공통 API와 화면 활성 상태에 연결한다.
import React from 'react';
import { Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { healthApi } from './healthApi';
import { koreanDay } from './healthModel';
import { hs } from './healthStyles';

// 작성자: 고수연 — 점수를 내지 못한 이유. 서버가 내려주는 코드를 사람 말로 옮긴다.
const scoreReasons: Record<string, string> = {
  sleep_insufficient: '수면 기록이 더 필요해요.',
  activity_insufficient: '활동 기록이 더 필요해요.',
  bmi_missing: '체중이나 체성분 기록이 필요해요.',
  bmi_stale: '체중 기록이 오래되어 최근 값이 필요해요.',
  age_unavailable: '생년월일을 입력하면 점수를 낼 수 있어요.',
  age_not_supported: '아직 만 20세 이상만 점수를 제공해요.',
  data_limit_exceeded: '기록이 너무 많아 오늘 점수를 확정하지 못했어요.',
  no_record: '아직 기록이 없어요.',
};

export function ScoreCard({ active = true }: { active?: boolean }) {
  const query = useQuery({
    queryKey: ['health', 'score', koreanDay()],
    queryFn: ({ signal }) => healthApi.score('7d', signal),
    enabled: active,
    retry: false,
    staleTime: 60000,
  });
  const latest = query.data?.latest;
  const total = latest?.score ?? null;
  // 점수가 없을 때는 첫 번째 사유만 보여준다. 여러 개를 늘어놓으면 읽지 않는다.
  const message = query.isPending
    ? '점수를 불러오고 있어요.'
    : query.isError
    ? '점수를 불러오지 못했어요.'
    : scoreReasons[latest?.reasons?.[0] ?? ''] ??
      '기록이 더 쌓이면 점수를 보여드릴게요.';

  return (
    <View style={[hs.card, { minHeight: 200 }]}>
      <Text style={hs.section}>전체 건강 흐름</Text>
      <Text style={hs.muted}>오늘의 건강 종합 점수</Text>
      <View style={{ flex: 1, justifyContent: 'center', minHeight: 110 }}>
        {total === null ? (
          <>
            <Text style={[hs.text, { textAlign: 'center' }]}>{message}</Text>
            <Text style={[hs.muted, { textAlign: 'center' }]}>
              영역별 기록에서 실제 수치와 변화를 확인할 수 있어요.
            </Text>
          </>
        ) : (
          <>
            <Text
              accessibilityLabel={`오늘의 건강 종합 점수 ${total}점`}
              style={[
                hs.value,
                { textAlign: 'center', fontSize: 48, lineHeight: 56 },
              ]}
            >
              {total}
              <Text style={[hs.muted, { fontSize: 18 }]}>점</Text>
            </Text>
            <View style={[hs.row, { justifyContent: 'center', gap: 18 }]}>
              <ScorePart label="수면" value={latest?.sleep?.score} />
              <ScorePart label="활동" value={latest?.activity?.score} />
              <ScorePart label="BMI" value={latest?.bmiScore} />
            </View>
          </>
        )}
      </View>
    </View>
  );
}

function ScorePart({ label, value }: { label: string; value?: number | null }) {
  return (
    <View style={{ alignItems: 'center' }}>
      <Text style={hs.muted}>{label}</Text>
      <Text style={hs.text}>
        {value === null || value === undefined ? '—' : Math.round(value)}
      </Text>
    </View>
  );
}
