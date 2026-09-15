// 작성자: 김진우 — 홈·내 건강 카드에서 실제 미션 상태와 상세 이동을 공유한다.
import React from 'react';
import { formatDurationText } from '../../shared/utils/duration';
import { Pressable, Text, View } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useMissions, statusText, unitText } from './missionApi';
import { ms } from './missionStyles';
import { MissionRecommendationCard } from './MissionRecommendationCard';
import { HomeCardHeading } from '../home/HomeCardDesign';

export function MissionSummaryCard({
  active = true,
  category,
  onOpen,
}: {
  active?: boolean;
  category?: string;
  onOpen?: (id?: string) => void;
}) {
  const query = useMissions(active);
  const filter =
    category === 'nutrition'
      ? 'HYDRATION'
      : category === 'activity'
      ? 'ACTIVITY'
      : category === 'sleep'
      ? 'SLEEP'
      : category === 'bio'
      ? 'BIO'
      : undefined;
  const items = (query.data?.missions ?? []).filter(
    m => !filter || m.category === filter || m.scope === filter,
  );
  return (
    <>
      <LinearGradient colors={['#EAFFF0', '#FFFFFF']} style={ms.card}>
        <View style={ms.between}>
          <HomeCardHeading
            icon="mission"
            title="오늘의 미션"
            color="#28AB78"
            tint="#D8FAE6"
          />
          {!query.isError && query.data && (
            <Text style={ms.green}>
              {items.filter(m => m.status === 'COMPLETED').length} /{' '}
              {items.length} 완료
            </Text>
          )}
        </View>
        {query.isError ? (
          <Pressable accessibilityRole="button" onPress={() => query.refetch()}>
            <Text style={ms.error}>미션을 불러오지 못했어요. 다시 시도</Text>
          </Pressable>
        ) : query.isPending ? (
          <Text style={ms.muted}>미션을 불러오고 있어요.</Text>
        ) : !items.length ? (
          <Text style={ms.muted}>
            {filter
              ? '이 영역의 오늘 미션이 없어요.'
              : '오늘 등록된 미션이 없어요.'}
          </Text>
        ) : (
          items.slice(0, 3).map(m => (
            <Pressable
              key={m.missionId}
              accessibilityRole="button"
              onPress={() => onOpen?.(m.missionId)}
              style={ms.summaryItem}
            >
              <View style={ms.between}>
                <Text style={[ms.text, ms.flex]}>
                  {formatDurationText(m.title)}
                </Text>
                <Text style={ms.green}>{statusText[m.status]}</Text>
              </View>
              <Text style={ms.muted}>
                {unitText(m, m.currentValue)} / {unitText(m, m.targetValue)}
              </Text>
              <View style={ms.track}>
                <View style={[ms.fill, { width: `${m.progressPercent}%` }]} />
              </View>
            </Pressable>
          ))
        )}
        <Pressable
          accessibilityRole="button"
          onPress={() => onOpen?.()}
          style={ms.smallButton}
        >
          <Text style={ms.green}>전체 미션 보기 ›</Text>
        </Pressable>
      </LinearGradient>
      {!!category && (
        <MissionRecommendationCard
          key={category}
          scope={category.toUpperCase()}
          active={active}
          onOpen={onOpen}
        />
      )}
    </>
  );
}
