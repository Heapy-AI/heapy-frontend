// 작성자: 김진우 — 추천 조회와 명시적인 수락을 기존 미션 조회 캐시와 연결한다.
import React, { useEffect, useRef, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../shared/api/client';
import { createIdempotencyKey } from '../../shared/utils/idempotency';
import { useMedicationToday } from '../medication/useMedicationToday';
import { Mission, missionKeys } from './missionApi';
import { ms } from './missionStyles';

type Suggestion = {
  code: string;
  scope: string;
  title: string;
  description: string;
};
type Suggestions = { state: string; suggestions: Suggestion[] };

export function MissionRecommendationCard({
  scope,
  active = true,
  onOpen,
}: {
  scope: string;
  active?: boolean;
  onOpen?: (id?: string) => void;
}) {
  const client = useQueryClient(),
    today = useMedicationToday();
  const [index, setIndex] = useState(0),
    [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const keys = useRef<Record<string, string>>({});
  const query = useQuery({
    queryKey: [...missionKeys, 'suggestions', scope, today],
    queryFn: async ({ signal }) =>
      (
        await apiClient.get<Suggestions>('/api/missions/suggestions', {
          params: { scope },
          signal,
        })
      ).data,
    enabled: active,
    staleTime: 15000,
    retry: false,
  });
  const items = query.data?.suggestions ?? [];
  const suggestion = items[index % Math.max(1, items.length)];
  const exposed = useRef(new Set<string>());
  useEffect(() => {
    if (!suggestion || !active) return;
    const id = `${today}/${scope}/${suggestion.code}`;
    if (exposed.current.has(id)) return;
    exposed.current.add(id);
    apiClient
      .post('/api/missions/exposures', {
        scope,
        code: suggestion.code,
        event: 'viewed',
        idempotencyKey: createIdempotencyKey(),
      })
      .catch(() => exposed.current.delete(id));
  }, [suggestion, scope, today, active]);
  const reject = async () => {
    if (!suggestion || busy) return;
    setBusy(true);
    setError('');
    try {
      await apiClient.post('/api/missions/exposures', {
        scope,
        code: suggestion.code,
        event: 'rejected',
        idempotencyKey: createIdempotencyKey(),
      });
      await client.invalidateQueries({ queryKey: missionKeys });
    } catch {
      setError('추천 거절을 저장하지 못했어요. 다시 시도해 주세요.');
    } finally {
      setBusy(false);
    }
  };
  const accept = async () => {
    if (!suggestion || busy) return;
    setBusy(true);
    setError('');
    const key = `${today}/${scope}/${suggestion.code}`;
    keys.current[key] ??= createIdempotencyKey();
    try {
      const mission = (
        await apiClient.post<Mission>('/api/missions/accept', {
          scope,
          code: suggestion.code,
          idempotencyKey: keys.current[key],
        })
      ).data;
      await Promise.all([
        client.invalidateQueries({ queryKey: missionKeys }),
        client.invalidateQueries({ queryKey: ['home'] }),
      ]);
      onOpen?.(mission.missionId);
    } catch {
      setError('추가하지 못했어요. 추천을 새로 확인한 뒤 다시 시도해 주세요.');
      await query.refetch();
    } finally {
      setBusy(false);
    }
  };
  return (
    <View style={ms.card}>
      <Text style={ms.text}>나에게 맞는 미션</Text>
      {query.isError ? (
        <Pressable accessibilityRole="button" onPress={() => query.refetch()}>
          <Text style={ms.error}>추천을 불러오지 못했어요. 다시 시도</Text>
        </Pressable>
      ) : query.isPending ? (
        <Text style={ms.muted}>건강 기록을 확인하고 있어요.</Text>
      ) : suggestion ? (
        <>
          <Text style={ms.text}>{suggestion.title}</Text>
          <Text style={ms.muted}>{suggestion.description}</Text>
          <Pressable
            accessibilityRole="button"
            disabled={busy}
            style={ms.smallButton}
            onPress={accept}
          >
            <Text style={ms.green}>{busy ? '추가 중…' : '미션 추가하기'}</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            disabled={busy}
            onPress={reject}
          >
            <Text style={ms.muted}>이 미션은 원하지 않아요</Text>
          </Pressable>
          {items.length > 1 && (
            <Pressable
              accessibilityRole="button"
              disabled={busy}
              onPress={() => setIndex(i => i + 1)}
            >
              <Text style={ms.muted}>다른 미션 보기</Text>
            </Pressable>
          )}
        </>
      ) : (
        <Text style={ms.muted}>
          {query.data?.state === 'SAFETY_NOTICE'
            ? '건강 정보에 맞는 안전한 미션을 검토하고 있어요.'
            : '현재 추천할 미션이 없어요. 기록이 쌓이면 다시 확인해 주세요.'}
        </Text>
      )}
      {!!error && <Text style={ms.error}>{error}</Text>}
    </View>
  );
}
