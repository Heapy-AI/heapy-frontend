// 작성자: 김진우 — 홈의 모든 수치와 행동은 예시이며 실제 건강기록을 조회·변경하지 않는다.
import React, { useState } from 'react';
import {
  Animated,
  BackHandler,
  Modal,
  PanResponder,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import LinearGradient from 'react-native-linear-gradient';
import { CompanionAvatar } from '../chat/CompanionAvatar';
import { ScreenTransition } from '../../shared/components/ScreenTransition';
import { AmbientEffect } from '../../shared/components/AmbientEffect';
import { usePressFeedback } from '../../shared/hooks/usePressFeedback';
import {
  defaultHomeSettings,
  HomeSettings,
  MetricId,
  metrics,
  ModuleId,
  moduleLabels,
  moveItem,
} from './homeModel';

type Props = {
  active?: boolean;
  resetVersion?: number;
  onEditingChange?: (editing: boolean) => void;
  onConnect: () => void;
  onCheckup: () => void;
  onDetail: (id: string) => void;
  onChat: () => void;
};
const descriptions: Record<ModuleId, string> = {
  briefing: '오늘의 종합 분석 · 자동 구성',
  metrics: '수면 · 걸음 수',
  medication: '다음 복약 · 오늘 완료 현황',
  mission: '분석 기반 행동 추천',
  weekly: '걸음 수 · 이전 7일 비교',
  checkup: '최근 결과와 주의 항목',
};
function Action({ title, onPress }: { title: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress}>
      <LinearGradient
        colors={['#1AB88C', '#388CF5']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={s.action}
      >
        <Text style={s.whiteBold}>{title}</Text>
      </LinearGradient>
    </Pressable>
  );
}
const metricIcons = {
  sleep: {
    id: 'Vector',
    d: 'M14.45 10.0583C13.4117 10.3267 12.3213 10.3194 11.2867 10.0372C10.252 9.755 9.30895 9.2077 8.55062 8.44938C7.7923 7.69105 7.245 6.74796 6.96282 5.71333C6.68064 4.67869 6.67335 3.58832 6.94167 2.55C5.86294 2.80702 4.87231 3.34716 4.07195 4.11472C3.27159 4.88227 2.69048 5.84944 2.38856 6.91647C2.08663 7.9835 2.07483 9.11176 2.35436 10.1849C2.6339 11.258 3.19465 12.2371 3.97877 13.0212C4.7629 13.8054 5.74202 14.3661 6.81513 14.6456C7.88824 14.9252 9.0165 14.9134 10.0835 14.6114C11.1506 14.3095 12.1177 13.7284 12.8853 12.9281C13.6528 12.1277 14.193 11.1371 14.45 10.0583Z',
    stroke: '#7656B7',
    'stroke-width': '1.5',
    'stroke-linecap': 'round',
    'stroke-linejoin': 'round',
  },
  steps: {
    id: 'Vector',
    d: 'M5.95 9.27917C7.50833 10.0583 8.2875 11.475 7.65 12.6792C7.08333 13.8125 5.525 13.9542 4.0375 13.175C2.47917 12.3958 1.62917 10.9792 2.26667 9.775C2.83333 8.64167 4.39167 8.5 5.95 9.27917ZM11.05 3.11667C12.2542 2.62083 13.6 3.6125 14.1667 5.17083C14.7333 6.8 14.2375 8.2875 13.0333 8.7125C11.8292 9.20833 10.4833 8.21667 9.91667 6.65833C9.35 5.02917 9.84583 3.54167 11.05 3.11667Z',
    stroke: '#3978C8',
    'stroke-width': '1.35',
    'stroke-linecap': 'round',
    'stroke-linejoin': 'round',
  },
} as const;
function MetricCards({ ids }: { ids: MetricId[] }) {
  return (
    <View style={s.grid}>
      {ids.map((id, index) => (
        <View
          key={id}
          style={[
            s.metric,
            {
              backgroundColor: index % 2 ? '#EEF5FF' : '#F5F0FF',
              borderColor: index % 2 ? '#BBD6FF' : '#D9C7FF',
            },
          ]}
        >
          <View style={s.row}>
            <Text style={s.small}>{metrics[id][0]}</Text>
            {(id === 'sleep' || id === 'steps') && (
              <View
                style={{
                  backgroundColor: 'white',
                  padding: 6,
                  borderRadius: 16,
                }}
              >
                <Svg width={17} height={17} viewBox="0 0 17 17">
                  <Path
                    d={metricIcons[id].d}
                    stroke={metricIcons[id].stroke}
                    strokeWidth={Number(metricIcons[id]['stroke-width'])}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    fill="none"
                  />
                </Svg>
              </View>
            )}
          </View>
          <Text style={s.value}>{metrics[id][1]}</Text>
          <Text style={s.purple}>{metrics[id][2]}</Text>
        </View>
      ))}
    </View>
  );
}
function DragRow({
  id,
  index,
  onMove,
  onRemove,
  onSettings,
}: {
  id: ModuleId;
  index: number;
  onMove: (from: number, to: number) => void;
  onRemove: () => void;
  onSettings: () => void;
}) {
  const [dy, setDy] = useState(0);
  const responder = React.useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderMove: (_, g) => setDy(g.dy),
        onPanResponderRelease: (_, g) => {
          onMove(index, index + Math.round(g.dy / 66));
          setDy(0);
        },
        onPanResponderTerminate: () => setDy(0),
        onPanResponderTerminationRequest: () => false,
      }),
    [index, onMove],
  );
  const configurable = ['metrics', 'medication', 'weekly'].includes(id);
  return (
    <View
      style={[
        s.selectedRow,
        { transform: [{ translateY: dy }], zIndex: dy ? 5 : 0 },
      ]}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${moduleLabels[id]} ${
          configurable ? '설정' : '선택됨'
        }`}
        disabled={!configurable}
        onPress={configurable ? onSettings : undefined}
        style={[s.circle, !configurable && { backgroundColor: '#24B88A' }]}
      >
        {configurable && (
          <Svg width={16} height={16} viewBox="0 0 16 16">
            <Path
              d="M6.4 2.33333H9.6L9.96667 3.78667C10.2898 3.93026 10.5961 4.10912 10.88 4.32L12.2933 3.9L13.8933 6.66667L12.84 7.7C12.8667 7.9 12.8867 8.10667 12.8867 8.33333C12.8867 8.56 12.8667 8.76667 12.84 8.96667L13.8933 10L12.2933 12.7667L10.88 12.3467C10.5961 12.5575 10.2898 12.7364 9.96667 12.88L9.6 14.3333H6.4L6.03333 12.88C5.71017 12.7364 5.40387 12.5575 5.12 12.3467L3.70667 12.7667L2.10667 10L3.16 8.96667C3.10072 8.54652 3.10072 8.12014 3.16 7.7L2.10667 6.66667L3.70667 3.9L5.12 4.32C5.40387 4.10912 5.71017 3.93026 6.03333 3.78667L6.4 2.33333Z"
              stroke="#434343"
              strokeWidth={1.13333}
              fill="none"
            />
            <Path
              d="M8 10.3333C9.10457 10.3333 10 9.4379 10 8.33333C10 7.22876 9.10457 6.33333 8 6.33333C6.89543 6.33333 6 7.22876 6 8.33333C6 9.4379 6.89543 10.3333 8 10.3333Z"
              stroke="#434343"
              strokeWidth={1.13333}
              fill="none"
            />
          </Svg>
        )}
      </Pressable>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={s.rowTitle} numberOfLines={1}>
          {moduleLabels[id]}
        </Text>
        <Text style={s.caption} numberOfLines={1}>
          {descriptions[id]}
        </Text>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${moduleLabels[id]} 숨기기`}
        accessibilityHint="홈에서 숨기고 추가할 수 있는 항목으로 이동합니다"
        onPress={onRemove}
        style={s.removeButton}
      >
        <Text style={s.removeLabel}>−</Text>
      </Pressable>
      <View
        {...responder.panHandlers}
        accessible
        accessibilityRole="adjustable"
        accessibilityLabel={`${moduleLabels[id]} 순서 변경`}
        accessibilityActions={[
          { name: 'increment', label: '아래로' },
          { name: 'decrement', label: '위로' },
        ]}
        onAccessibilityAction={e =>
          onMove(
            index,
            index + (e.nativeEvent.actionName === 'increment' ? 1 : -1),
          )
        }
        style={s.drag}
      >
        <Text style={s.small}>≡</Text>
      </View>
    </View>
  );
}
export function HomeDashboard(_props: Props) {
  const briefingPress = usePressFeedback();
  const { onEditingChange } = _props;
  const [saved, setSaved] = useState(defaultHomeSettings);
  const [draft, setDraft] = useState(defaultHomeSettings);
  const [screen, setScreen] = useState<
    'home' | 'edit' | 'preview' | 'metrics' | 'medication' | 'weekly'
  >('home');
  const [detail, setDetail] = useState<string>();
  const [missionAdded, setMissionAdded] = useState(false);
  const [taken, setTaken] = useState(false);
  const [signal, setSignal] = useState(true);
  const [settingDraft, setSettingDraft] = useState(defaultHomeSettings);
  const pageScroll = React.useRef<ScrollView>(null);
  // 작성자: 김진우 — 탭 복귀 시 탐색 상태만 비우고 저장한 홈 구성은 유지한다.
  React.useEffect(() => {
    setScreen('home');
    setDetail(undefined);
    pageScroll.current?.scrollTo({ y: 0, animated: false });
  }, [_props.resetVersion]);
  const configuring = ['metrics', 'medication', 'weekly'].includes(screen);
  const back = () => {
    if (detail) setDetail(undefined);
    else setScreen(screen === 'preview' || configuring ? 'edit' : 'home');
  };
  React.useEffect(() => {
    onEditingChange?.(screen !== 'home');
  }, [screen, onEditingChange]);
  React.useEffect(() => {
    if (Platform.OS !== 'android') return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (_props.active === false || (screen === 'home' && !detail))
        return false;
      back();
      return true;
    });
    return () => sub.remove();
  });
  const change = (patch: Partial<HomeSettings>) =>
    setSettingDraft(value => ({ ...value, ...patch }));
  const renderModule = (id: ModuleId, config: HomeSettings) => {
    if (id === 'briefing')
      return (
        <Pressable
          accessibilityRole="button"
          key={id}
          onPress={() => setDetail('브리핑')}
          onPressIn={briefingPress.onPressIn}
          onPressOut={briefingPress.onPressOut}
        >
          <Animated.View
            testID="briefing-press-feedback"
            style={briefingPress.style}
          >
            <LinearGradient
              colors={['#09916E', '#14A3A3', '#3D6EE5']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0.6 }}
              style={s.briefing}
            >
              <AmbientEffect
                active={
                  _props.active !== false &&
                  (screen === 'home' || screen === 'preview') &&
                  !detail
                }
                testID="home-wave"
              />
              <View style={{ flex: 1, gap: 6 }}>
                <Text style={s.whiteSmall}>오늘의 AI 건강 브리핑</Text>
                <Text style={s.briefingTitle}>
                  오늘의 건강,{'\n'}한눈에 확인해보세요
                </Text>
                <Text style={s.briefChip}>어제보다 수면 +42분</Text>
              </View>
              <CompanionAvatar />
            </LinearGradient>
          </Animated.View>
        </Pressable>
      );
    if (id === 'metrics')
      return (
        <View key={id} style={screen === 'home' ? { gap: 12 } : s.card}>
          <View style={s.row}>
            <Text style={s.heading}>오늘의 핵심 데이터</Text>
            <Text style={s.link}>{config.metrics.length}개 선택</Text>
          </View>
          <MetricCards ids={config.metrics} />
        </View>
      );
    if (id === 'medication')
      return (
        <View key={id} style={s.card}>
          <View style={s.row}>
            <Text style={s.heading}>오늘의 복약</Text>
            {config.medicationProgress && (
              <Text style={s.purple}>{taken ? '2' : '1'} / 3 완료</Text>
            )}
          </View>
          {(config.medicationMode === 'all'
            ? ['아침 · 오전 8:00', '다음 복약 · 오후 1:00', '저녁 · 오후 7:00']
            : ['다음 복약 · 오후 1:00']
          ).map(time => (
            <View key={time} style={s.medication}>
              <View style={{ flex: 1, gap: 5 }}>
                <Text style={s.purple}>{time}</Text>
                {config.medicationName && (
                  <Text style={s.rowTitle}>메트포르민 500mg · 1정</Text>
                )}
                <Text style={s.small}>식후 복용 · 예시</Text>
              </View>
              {config.medicationButton && (
                <Pressable
                  accessibilityRole="button"
                  onPress={() => setTaken(!taken)}
                  style={s.miniButton}
                >
                  <Text style={s.whiteSmall}>
                    {taken ? '완료 취소' : '복용 완료'}
                  </Text>
                </Pressable>
              )}
            </View>
          ))}
        </View>
      );
    if (id === 'mission')
      return (
        <LinearGradient
          key={id}
          colors={['#E8FCF5', '#DEF2FF']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[s.card, { borderColor: '#AFE5D7' }]}
        >
          <View style={s.row}>
            <Text style={s.link}>HEAPY 추천 미션</Text>
            <Text style={s.purple}>활동 분석</Text>
          </View>
          <Text style={s.heading}>저녁에 20분 걷기</Text>
          <Text style={s.small}>
            최근 7일 운동시간이 평소보다 18% 줄었어요.
          </Text>
          <Pressable
            accessibilityRole="button"
            style={s.miniButton}
            onPress={() => setMissionAdded(!missionAdded)}
          >
            <Text style={s.whiteSmall}>
              {missionAdded ? '예시 미션 추가됨 · 취소' : '미션 추가하기'}
            </Text>
          </Pressable>
        </LinearGradient>
      );
    if (id === 'weekly')
      return (
        <View key={id} style={s.card}>
          <Text style={s.heading}>주간 활동 변화</Text>
          <Text style={s.value}>
            {config.weekly === 'steps'
              ? '평균 6,420보'
              : config.weekly === 'sleep'
              ? '평균 7시간 12분'
              : '평균 42분'}
          </Text>
          <View style={s.bars}>
            {[34, 46, 40, 55, 30, 44, 20].map((height, i) => (
              <View
                key={i}
                style={{
                  height,
                  flex: 1,
                  backgroundColor: i === 6 ? '#388CF5' : '#A0DDCC',
                  borderRadius: 8,
                }}
              />
            ))}
          </View>
          <Text style={s.small}>최근 7일 ↔ 이전 7일 · 예시 데이터</Text>
        </View>
      );
    return (
      <Pressable
        accessibilityRole="button"
        key={id}
        style={s.card}
        onPress={() => setDetail('검진')}
      >
        <Text style={s.heading}>최근 건강검진</Text>
        <Text style={s.value}>2025.08.09</Text>
        <Text style={s.small}>검진 결과와 주의 항목 확인하기 →</Text>
      </Pressable>
    );
  };
  const title =
    screen === 'edit'
      ? '홈 편집'
      : screen === 'preview'
      ? '홈 미리보기'
      : screen === 'metrics'
      ? '핵심 데이터 설정'
      : screen === 'medication'
      ? '복약 항목 설정'
      : '주간 변화 설정';
  return (
    <ScreenTransition
      transitionKey={screen}
      style={[s.root, screen !== 'home' && { backgroundColor: '#F6FBF9' }]}
    >
      {screen !== 'home' && (
        <View style={s.header}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="뒤로"
            onPress={back}
            style={s.touch}
          >
            <Text style={s.back}>‹</Text>
          </Pressable>
          <Text style={s.heading}>{title}</Text>
          <Pressable
            accessibilityRole="button"
            style={s.touch}
            onPress={() => screen === 'edit' && setDraft(defaultHomeSettings())}
          >
            <Text style={s.link}>{screen === 'edit' ? '초기화' : ''}</Text>
          </Pressable>
        </View>
      )}
      <ScrollView ref={pageScroll} contentContainerStyle={s.page}>
        {(screen === 'home' || screen === 'preview') && (
          <>
            <View style={s.row}>
              <Text style={s.rowTitle}>♥ 오늘의 건강</Text>
              {screen === 'home' && (
                <Pressable
                  accessibilityRole="button"
                  style={s.editButton}
                  onPress={() => {
                    setDraft({
                      ...saved,
                      modules: [...saved.modules],
                      metrics: [...saved.metrics],
                    });
                    setScreen('edit');
                  }}
                >
                  <Text style={s.link}>홈 편집</Text>
                </Pressable>
              )}
            </View>
            <Text style={s.title}>왕밤빵님, 오늘도{'\n'}함께 관리해요</Text>
            <Text style={s.caption}>
              예시 화면 · 실제 건강 데이터가 아닙니다
            </Text>
            {(screen === 'home' ? saved : draft).modules.map(id => (
              <React.Fragment key={id}>
                {id === 'mission' && signal && screen === 'home' && (
                  <View style={[s.card, s.row]}>
                    <View style={{ flex: 1, gap: 6 }}>
                      <Text style={s.rowTitle}>확인할 건강 신호 1개</Text>
                      <Text style={s.caption}>
                        혈압 기록이 3일 비었어요 · 예시
                      </Text>
                    </View>
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => setSignal(false)}
                      style={s.editButton}
                    >
                      <Text style={s.link}>확인</Text>
                    </Pressable>
                  </View>
                )}
                {id === 'mission' && screen === 'home' && (
                  <View style={s.row}>
                    <Text style={s.heading}>오늘의 행동</Text>
                    <Text style={s.link}>미션 1 / 3</Text>
                  </View>
                )}
                {renderModule(id, screen === 'home' ? saved : draft)}
              </React.Fragment>
            ))}

            {!(screen === 'home' ? saved : draft).modules.length && (
              <Text style={s.small}>
                홈 편집에서 표시할 항목을 추가해 주세요.
              </Text>
            )}
          </>
        )}
        {screen === 'edit' && (
          <>
            <View style={s.info}>
              <Text style={s.rowTitle}>
                항목을 고르고 순서와 내용을 편집해요
              </Text>
              <Text style={s.caption}>
                톱니바퀴로 설정하고, −로 빼고, 손잡이로 순서를 바꿔요.
              </Text>
            </View>
            <View style={s.row}>
              <Text style={s.rowTitle}>선택된 항목 {draft.modules.length}</Text>
              <Text style={s.caption}>≡ 순서 변경</Text>
            </View>
            <View style={{ gap: 8 }}>
              {draft.modules.map((id, index) => (
                <DragRow
                  key={id}
                  id={id}
                  index={index}
                  onMove={(from, to) =>
                    setDraft(v => ({
                      ...v,
                      modules: moveItem(v.modules, from, to),
                    }))
                  }
                  onRemove={() =>
                    setDraft(v => ({
                      ...v,
                      modules: v.modules.filter(value => value !== id),
                    }))
                  }
                  onSettings={() => {
                    setSettingDraft({ ...draft, metrics: [...draft.metrics] });
                    setScreen(id as 'metrics' | 'medication' | 'weekly');
                  }}
                />
              ))}
            </View>
            <Text style={[s.rowTitle, { marginTop: 16 }]}>
              추가할 수 있는 항목
            </Text>
            {(Object.keys(moduleLabels) as ModuleId[])
              .filter(id => !draft.modules.includes(id))
              .map(id => (
                <Pressable
                  accessibilityRole="button"
                  key={id}
                  accessibilityLabel={`${moduleLabels[id]} 추가`}
                  style={s.unselectedRow}
                  onPress={() =>
                    setDraft(v => ({ ...v, modules: [...v.modules, id] }))
                  }
                >
                  <Text style={s.back}>＋</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={s.rowTitle}>{moduleLabels[id]}</Text>
                    <Text style={s.caption}>{descriptions[id]}</Text>
                  </View>
                  <Text style={s.small}>추가</Text>
                </Pressable>
              ))}
          </>
        )}
        {screen === 'metrics' && (
          <>
            {renderModule('metrics', settingDraft)}
            <Text style={s.rowTitle}>
              표시할 항목 · {settingDraft.metrics.length} / 2 선택
            </Text>
            <Text style={s.caption}>
              현재는 모든 항목을 예시 값으로 미리 볼 수 있어요.
            </Text>
            <View style={s.grid}>
              {(Object.keys(metrics) as MetricId[]).map(id => (
                <Pressable
                  accessibilityRole="button"
                  key={id}
                  onPress={() =>
                    change({
                      metrics: settingDraft.metrics.includes(id)
                        ? settingDraft.metrics.filter(x => x !== id)
                        : settingDraft.metrics.length < 2
                        ? [...settingDraft.metrics, id]
                        : settingDraft.metrics,
                    })
                  }
                  style={[
                    s.option,
                    settingDraft.metrics.includes(id) && s.selected,
                  ]}
                >
                  <Text style={s.rowTitle}>
                    {metrics[id][0]}{' '}
                    {settingDraft.metrics.includes(id) ? '✓' : ''}
                  </Text>
                  <Text style={s.caption}>{metrics[id][1]}</Text>
                </Pressable>
              ))}
            </View>
            <Text style={s.rowTitle}>카드 순서</Text>
            <Pressable
              accessibilityRole="button"
              style={s.info}
              onPress={() =>
                change({ metrics: [...settingDraft.metrics].reverse() })
              }
            >
              <Text style={s.small}>
                {settingDraft.metrics.map(id => metrics[id][0]).join('  ≡  ')} ·
                눌러 순서 바꾸기
              </Text>
            </Pressable>
          </>
        )}
        {screen === 'medication' && (
          <>
            {renderModule('medication', settingDraft)}
            <Text style={s.rowTitle}>첫 화면에 무엇을 먼저 보여줄까요?</Text>
            <View style={s.grid}>
              {(['next', 'all'] as const).map(mode => (
                <Pressable
                  accessibilityRole="button"
                  key={mode}
                  style={[
                    s.option,
                    settingDraft.medicationMode === mode && s.selected,
                  ]}
                  onPress={() => change({ medicationMode: mode })}
                >
                  <Text style={s.rowTitle}>
                    {mode === 'next' ? '다음 복약 우선' : '오늘 전체 일정'}
                  </Text>
                  <Text style={s.caption}>
                    {mode === 'next' ? '가장 가까운 일정' : '완료 현황 중심'}
                  </Text>
                </Pressable>
              ))}
            </View>
            <Text style={s.rowTitle}>표시 항목</Text>
            {(
              [
                'medicationName',
                'medicationButton',
                'medicationProgress',
              ] as const
            ).map((key, i) => (
              <View key={key} style={[s.card, s.row]}>
                <Text style={s.rowTitle}>
                  {
                    ['약 이름과 복용량', '복용 완료 버튼', '오늘의 완료 현황'][
                      i
                    ]
                  }
                </Text>
                <Switch
                  accessibilityLabel={
                    ['약 이름과 복용량', '복용 완료 버튼', '오늘의 완료 현황'][
                      i
                    ]
                  }
                  value={settingDraft[key]}
                  onValueChange={v => change({ [key]: v })}
                  trackColor={{ true: '#747BFF', false: '#DDE5E1' }}
                />
              </View>
            ))}
            <View style={s.info}>
              <Text style={s.caption}>
                예시 복약입니다. 실제 복약 일정과 완료 기록은 변경되지 않아요.
              </Text>
            </View>
          </>
        )}
        {screen === 'weekly' && (
          <>
            {renderModule('weekly', settingDraft)}
            <Text style={s.rowTitle}>대표 지표를 선택해 주세요</Text>
            {(['steps', 'sleep', 'exercise'] as const).map(id => (
              <Pressable
                accessibilityRole="button"
                key={id}
                style={[s.option, settingDraft.weekly === id && s.selected]}
                onPress={() => change({ weekly: id })}
              >
                <Text style={s.rowTitle}>
                  {metrics[id][0]} {settingDraft.weekly === id ? '✓' : ''}
                </Text>
                <Text style={s.caption}>최근 7일 평균과 이전 7일 비교</Text>
              </Pressable>
            ))}
            <View style={s.info}>
              <Text style={s.small}>비교 기준 · 최근 7일 ↔ 이전 7일</Text>
            </View>
          </>
        )}
      </ScrollView>
      {screen !== 'home' && (
        <View style={s.footer}>
          {screen === 'preview' ? (
            <View style={s.row}>
              <Pressable
                accessibilityRole="button"
                onPress={() => setScreen('edit')}
                style={s.editButton}
              >
                <Text style={s.small}>다시 수정</Text>
              </Pressable>
              <View style={{ flex: 1 }}>
                <Action
                  title="이대로 저장"
                  onPress={() => {
                    setSaved(draft);
                    setScreen('home');
                  }}
                />
              </View>
            </View>
          ) : (
            <Action
              title={screen === 'edit' ? '미리보기' : '저장하고 홈 편집으로'}
              onPress={() => {
                if (screen === 'edit') setScreen('preview');
                else if (
                  screen !== 'metrics' ||
                  settingDraft.metrics.length === 2
                ) {
                  setDraft(settingDraft);
                  setScreen('edit');
                } else setDetail('핵심 데이터는 2개를 선택해 주세요.');
              }}
            />
          )}
        </View>
      )}
      <Modal
        visible={!!detail}
        transparent
        animationType="fade"
        onRequestClose={() => setDetail(undefined)}
      >
        <View style={s.overlay}>
          <View style={s.card}>
            <Text style={s.heading}>
              {detail === '브리핑'
                ? '오늘의 AI 건강 브리핑'
                : detail === '검진'
                ? '최근 건강검진'
                : detail}
            </Text>
            <Text style={s.small}>
              {detail === '브리핑'
                ? '수면은 회복 중이고 활동량은 감소했어요.\n수면 7시간 12분 · 걸음 5,920보'
                : '홈 UI 미리보기용 예시 화면입니다.'}
            </Text>
            <Action title="확인" onPress={() => setDetail(undefined)} />
          </View>
        </View>
      </Modal>
    </ScreenTransition>
  );
}
const s = StyleSheet.create({
  root: { flex: 1 },
  page: { padding: 20, gap: 14, paddingBottom: 28 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    minHeight: 60,
  },
  touch: { minWidth: 48, minHeight: 44, justifyContent: 'center' },
  back: { fontSize: 27, color: '#143B30' },
  title: { fontSize: 26, lineHeight: 32, fontWeight: '800', color: '#17342D' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  heading: { fontSize: 16, fontWeight: '800', color: '#17342D' },
  rowTitle: { fontSize: 13, fontWeight: '700', color: '#143B30' },
  small: { fontSize: 12, lineHeight: 18, color: '#617A70' },
  caption: { fontSize: 10, lineHeight: 16, color: '#617A70' },
  link: { fontSize: 11, fontWeight: '600', color: '#1AAD80' },
  purple: { fontSize: 11, color: '#7370ED' },
  whiteSmall: { fontSize: 11, color: 'white', lineHeight: 16 },
  whiteBold: { fontSize: 14, fontWeight: '700', color: 'white' },
  card: {
    padding: 16,
    gap: 12,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#DBEBE5',
    backgroundColor: '#FFFFFF',
    boxShadow: '0px 5px 16px rgba(9,41,32,0.07)',
  },
  briefing: {
    padding: 16,
    borderRadius: 24,
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 124,
    gap: 8,
    boxShadow: '0px 8px 22px rgba(9,41,32,0.12)',
  },
  briefingTitle: {
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 23,
    color: 'white',
  },
  briefChip: {
    color: 'white',
    fontSize: 10,
    backgroundColor: '#FFFFFF30',
    padding: 4,
    borderRadius: 10,
    alignSelf: 'flex-start',
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  metric: {
    flex: 1,
    padding: 12,
    borderWidth: 1,
    borderRadius: 16,
    gap: 7,
    minWidth: 120,
  },
  value: { fontSize: 22, fontWeight: '800', color: '#173A31' },
  medication: {
    backgroundColor: '#EEF5FF',
    padding: 12,
    borderRadius: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  miniButton: {
    backgroundColor: '#24B889',
    borderRadius: 15,
    minHeight: 44,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bars: { height: 62, flexDirection: 'row', gap: 12, alignItems: 'flex-end' },
  editButton: {
    padding: 12,
    borderRadius: 20,
    backgroundColor: '#FFFFFFCC',
    borderWidth: 1,
    borderColor: '#DBEBE5',
    minHeight: 44,
  },
  info: { padding: 14, borderRadius: 18, backgroundColor: '#E8FAF2', gap: 8 },
  selectedRow: {
    height: 58,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#24B88A',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    paddingLeft: 32,
    gap: 10,
  },
  circle: {
    height: 28,
    width: 28,
    borderRadius: 14,
    backgroundColor: '#E8EDEB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeButton: {
    position: 'absolute',
    left: 2,
    top: 2,
    width: 28,
    height: 28,
    zIndex: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeLabel: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#E15B5B',
    color: '#FFFFFF',
    fontSize: 21,
    lineHeight: 22,
    fontWeight: '600',
    textAlign: 'center',
    includeFontPadding: false,
  },
  drag: {
    width: 48,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unselectedRow: {
    minHeight: 58,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#D4DED9',
    backgroundColor: '#EBF0ED',
  },
  option: {
    flexGrow: 1,
    flexBasis: '45%',
    borderRadius: 18,
    padding: 14,
    minHeight: 64,
    gap: 5,
    borderWidth: 1,
    borderColor: '#DBEBE5',
    backgroundColor: 'white',
  },
  selected: { backgroundColor: '#E6FAF3', borderColor: '#24B88A' },
  footer: { padding: 20, backgroundColor: '#F6FBF9' },
  action: {
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
  },
  overlay: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#122D2570',
  },
});
