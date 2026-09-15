// 작성자: 김진우 — 추천 조회와 명시적인 수락을 기존 미션 조회 캐시와 연결한다.
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Svg, { Path } from 'react-native-svg';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../shared/api/client';
import { createIdempotencyKey } from '../../shared/utils/idempotency';
import { useMedicationToday } from '../medication/useMedicationToday';
import { Mission, missionKeys } from './missionApi';
import {
  recommendationStyles as s,
  recommendationThemes,
} from './missionRecommendationStyles';

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
  const theme = recommendationThemes[scope] ?? recommendationThemes.BIO!;
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
      delete keys.current[key];
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
    <LinearGradient
      colors={['#FFFFFF', '#FFFFFF', theme.tint]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={s.card}
    >
      <View style={s.header}>
        <View style={[s.badge, { backgroundColor: theme.tint }]}>
          <View style={[s.dot, { backgroundColor: theme.color }]} />
          <Text style={[s.badgeText, { color: theme.color }]}>
            {theme.label}
          </Text>
        </View>
        <Text style={s.eyebrow}>나에게 맞는 미션</Text>
      </View>
      {query.isError ? (
        <View style={s.empty}>
          <MissionSymbol color={theme.color} tint={theme.tint} quiet />
          <Text style={s.emptyTitle}>추천을 불러오지 못했어요</Text>
          <Text style={s.emptyDescription}>잠시 후 다시 시도해 주세요.</Text>
          <Pressable
            accessibilityRole="button"
            disabled={query.isFetching}
            accessibilityState={{
              disabled: query.isFetching,
              busy: query.isFetching,
            }}
            style={({ pressed }) => [s.secondaryButton, pressed && s.pressed]}
            onPress={() => query.refetch()}
          >
            <Text style={[s.buttonText, { color: theme.color }]}>
              {query.isFetching ? '다시 확인 중…' : '다시 불러오기'}
            </Text>
          </Pressable>
        </View>
      ) : query.isPending ? (
        <View style={s.empty} accessibilityLiveRegion="polite">
          <ActivityIndicator size="large" color={theme.color} />
          <Text style={s.emptyTitle}>나에게 맞는 미션을 찾고 있어요</Text>
          <Text style={s.emptyDescription}>
            건강 기록을 확인하고 있어요. 잠시만 기다려 주세요.
          </Text>
        </View>
      ) : suggestion ? (
        <>
          <View style={s.hero}>
            <View style={s.heroCopy}>
              <Text style={[s.kicker, { color: theme.color }]}>
                작은 실천으로 시작해요
              </Text>
              <Text style={s.title}>{suggestion.title}</Text>
            </View>
            <MissionSymbol color={theme.color} tint={theme.tint} />
          </View>
          <Text style={s.description}>{suggestion.description}</Text>
          <View style={s.actionRow}>
            <View style={s.actionCopy}>
              <Text style={s.actionTitle}>오늘의 작은 실천</Text>
              <Text style={s.actionHint}>내 속도에 맞게 시작해요</Text>
            </View>
            <Pressable
              accessibilityRole="button"
              disabled={busy}
              accessibilityState={{ disabled: busy, busy }}
              style={({ pressed }) => [
                s.primaryButton,
                {
                  backgroundColor: theme.color,
                  boxShadow: `0px 4px 10px ${theme.color}26`,
                },
                busy && s.disabled,
                pressed && s.pressed,
              ]}
              onPress={accept}
            >
              {busy && <ActivityIndicator color="#FFFFFF" size="small" />}
              <Text style={s.primaryText}>
                {busy ? '추가 중…' : '내 미션에 추가'}
              </Text>
              {!busy && (
                <View style={s.buttonIcon}>
                  <Svg
                    width={16}
                    height={16}
                    viewBox="0 0 24 24"
                    accessible={false}
                  >
                    <Path
                      d="M5 12h14m-6-6 6 6-6 6"
                      fill="none"
                      stroke="white"
                      strokeWidth={2}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </Svg>
                </View>
              )}
            </Pressable>
          </View>
          {items.length > 1 && (
            <View style={s.footer}>
              <Text style={s.pageCount}>
                추천 {(index % items.length) + 1} / {items.length}
              </Text>
              <Pressable
                accessibilityRole="button"
                disabled={busy}
                accessibilityState={{ disabled: busy }}
                style={({ pressed }) => [s.textButton, pressed && s.pressed]}
                onPress={() => {
                  setError('');
                  setIndex(i => i + 1);
                }}
              >
                <Text style={[s.buttonText, { color: theme.color }]}>
                  다른 미션 보기
                </Text>
                <Svg
                  width={16}
                  height={16}
                  viewBox="0 0 24 24"
                  accessible={false}
                >
                  <Path
                    d="M19 8a8 8 0 1 0 1 7M19 3v5h-5"
                    fill="none"
                    stroke={theme.color}
                    strokeWidth={1.8}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </Svg>
              </Pressable>
            </View>
          )}
        </>
      ) : (
        <View style={s.empty}>
          <MissionSymbol color={theme.color} tint={theme.tint} quiet />
          <Text style={s.emptyTitle}>
            {query.data?.state === 'SAFETY_NOTICE'
              ? '안전한 실천을 먼저 생각해요'
              : '지금은 추천 미션이 없어요'}
          </Text>
          <Text style={s.emptyDescription}>
            {query.data?.state === 'SAFETY_NOTICE'
              ? '건강 정보에 맞는 안전한 미션을 검토하고 있어요.'
              : '건강 기록을 차곡차곡 남겨 주세요.\n기록이 쌓이면 추천 미션을 다시 확인해 보세요.'}
          </Text>
          {onOpen && (
            <Pressable
              accessibilityRole="button"
              onPress={() => onOpen()}
              style={({ pressed }) => [s.secondaryButton, pressed && s.pressed]}
            >
              <Text style={[s.buttonText, { color: theme.color }]}>
                내 미션 둘러보기 ›
              </Text>
            </Pressable>
          )}
        </View>
      )}
      {!!error && (
        <Text
          accessibilityRole="alert"
          accessibilityLiveRegion="polite"
          style={s.error}
        >
          {error}
        </Text>
      )}
    </LinearGradient>
  );
}

// 작성자: 김진우 — 이미지 로딩 없이 추천과 빈 상태의 상징을 벡터로 표시한다.
function MissionSymbol({
  color,
  tint,
  quiet = false,
}: {
  color: string;
  tint: string;
  quiet?: boolean;
}) {
  return (
    <View style={[s.symbol, { backgroundColor: tint }]}>
      <Svg width={32} height={32} viewBox="0 0 32 32" accessible={false}>
        <Path
          d={
            quiet
              ? 'M16 27V17M16 21C6 22 4 15 5 9c7-1 12 3 11 12ZM16 17c-1-8 4-12 11-12 1 7-3 13-11 12Z'
              : 'M8 28V6m0 1c6-5 10 5 17 0v13c-7 5-11-5-17 0m5-7 3 3 5-5'
          }
          fill="none"
          stroke={color}
          strokeWidth={1.8}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
    </View>
  );
}
