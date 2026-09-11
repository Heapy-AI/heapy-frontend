// 작성자: 김진우 — 서버에 저장된 대화와 생성 중 상태를 분리한다.
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  BackHandler,
  Keyboard,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  useInfiniteQuery,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { apiClient } from '../../shared/api/client';
import { createIdempotencyKey } from '../../shared/utils/idempotency';
import LinearGradient from 'react-native-linear-gradient';
import { CompanionAvatar, CompanionCode } from './CompanionAvatar';
import { createChatStreamParser } from './chatStream';
import { ChatMarkdown } from './ChatMarkdown';
import { HistorySwipeView } from './HistorySwipeView';
import { useResponsiveLayout } from '../../shared/hooks/useResponsiveLayout';
import { chatColors } from '../../shared/theme/tokens';
import { ConfirmModal } from '../../shared/components/ConfirmModal';
import Svg, { Circle, Path } from 'react-native-svg';

type Session = {
  sessionId: string;
  title: string;
  createdAt: string;
  companionCode: CompanionCode;
};
const partners = {
  heapy_cat: {
    name: '히피냥',
    tag: '솔직한 생활 코치',
    description: '친절하지만\n할 말은 콕 집어.',
    features: '• 현실적인 습관 코칭\n• 다정한 잔소리',
  },
  heapy_dog: {
    name: '히피멍',
    tag: '소심한 건강 박사',
    description: '조금 엉뚱해도\n건강지식은 빠삭.',
    features: '• 수치·근거에 강함\n• 차근차근 설명',
  },
};
type Message = {
  messageId: string;
  companionCodeSnapshot?: CompanionCode;
  role: 'user' | 'assistant';
  content: string;
  responseStatus: string;
  citations: { sourceTitle: string; sourceUrl: string | null }[];
};
type Page<T> = { items: T[]; nextCursor: string | null };
type Pending = { sessionId: string; key: string; message: string };

export function ChatScreen() {
  const { padding, stackCards } = useResponsiveLayout();
  const client = useQueryClient();
  const [view, setView] = useState<'partners' | 'history' | 'conversation'>(
    'partners',
  );
  const [companion, setCompanion] = useState<CompanionCode>('heapy_cat');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<CompanionCode | 'all'>('all');
  const [changing, setChanging] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Session>();
  const [deleteError, setDeleteError] = useState('');
  const messageScroll = useRef<ScrollView>(null);
  const [sessionId, setSessionId] = useState<string>();
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [pending, setPending] = useState<Pending>();
  const [openSources, setOpenSources] = useState<string>();
  const controller = useRef<AbortController | null>(null);
  const mounted = useRef(true);
  const createKey = useRef(createIdempotencyKey());
  const previousView = useRef<'partners' | 'conversation'>('partners');
  if (view !== 'history') previousView.current = view;
  const contentView = view === 'history' ? previousView.current : view;
  const openHistory = () => {
    Keyboard.dismiss();
    setView('history');
  };
  const closeHistory = () => {
    Keyboard.dismiss();
    setView(previousView.current);
  };
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      controller.current?.abort();
    };
  }, []);
  const sessions = useInfiniteQuery({
    queryKey: ['chat-sessions'],
    initialPageParam: undefined as string | undefined,
    queryFn: async ({ pageParam }) =>
      (
        await apiClient.get<Page<Session>>('/api/chat/sessions', {
          params: { cursor: pageParam, limit: 30 },
        })
      ).data,
    getNextPageParam: page => page.nextCursor ?? undefined,
    retry: false,
  });
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (view === 'history' || (view === 'partners' && sessionId)) {
        setView(
          view === 'history'
            ? previousView.current
            : sessionId
            ? 'conversation'
            : 'partners',
        );
        return true;
      }
      return false;
    });
    return () => sub.remove();
  }, [view, sessionId]);
  const sessionRows = sessions.data?.pages.flatMap(page => page.items) ?? [];
  const sessionDetail = useQuery({
    queryKey: ['chat-session', sessionId],
    enabled: !!sessionId,
    queryFn: async () =>
      (await apiClient.get<Session>(`/api/chat/sessions/${sessionId}`)).data,
    retry: false,
  });
  useEffect(() => {
    if (sessionDetail.data)
      setCompanion(sessionDetail.data.companionCode ?? 'heapy_cat');
  }, [sessionDetail.data]);
  const messages = useInfiniteQuery({
    queryKey: ['chat-messages', sessionId],
    enabled: !!sessionId,
    initialPageParam: undefined as string | undefined,
    queryFn: async ({ pageParam }) =>
      (
        await apiClient.get<Page<Message>>(
          `/api/chat/sessions/${sessionId}/messages`,
          { params: { limit: 30, cursor: pageParam } },
        )
      ).data,
    getNextPageParam: page => page.nextCursor ?? undefined,
    retry: false,
  });
  const rows =
    messages.data?.pages
      .slice()
      .reverse()
      .flatMap(page => page.items) ?? [];

  const send = async (retry?: Pending) => {
    const question = (retry?.message ?? input).trim();
    if (busy || changing || !question || question.length > 2000) return;
    setBusy(true);
    setError('');
    const abort = new AbortController();
    controller.current = abort;
    try {
      let id = retry?.sessionId ?? sessionId;
      if (!id) {
        const created = (
          await apiClient.post<Session>(
            '/api/chat/sessions',
            { companionCode: companion },
            {
              headers: { 'Idempotency-Key': createKey.current },
              signal: abort.signal,
            },
          )
        ).data;
        id = created.sessionId;
        if (mounted.current) setSessionId(id);
        client.invalidateQueries({ queryKey: ['chat-sessions'] });
      }
      const request = retry ?? {
        sessionId: id,
        key: createIdempotencyKey(),
        message: question,
      };
      if (mounted.current) setPending(request);
      let completed = false;
      let streamError = '';
      const parse = createChatStreamParser(event => {
        if (event.name === 'done') completed = true;
        if (event.name === 'error')
          streamError =
            typeof event.data.message === 'string'
              ? event.data.message
              : '답변을 완료하지 못했어요.';
      });
      const response = await apiClient.post<string>(
        `/api/chat/sessions/${id}/stream`,
        { message: question },
        {
          headers: {
            'Idempotency-Key': request.key,
            Accept: 'text/event-stream',
          },
          responseType: 'text',
          timeout: 110000,
          signal: abort.signal,
        },
      );
      parse(response.data);
      if (streamError || !completed)
        throw new Error(
          streamError || '답변 저장을 확인하지 못했어요. 다시 확인해 주세요.',
        );
      await client.invalidateQueries({ queryKey: ['chat-messages', id] });
      await client.invalidateQueries({ queryKey: ['chat-sessions'] });
      if (mounted.current) {
        setPending(undefined);
        setInput('');
        requestAnimationFrame(() =>
          messageScroll.current?.scrollToEnd({ animated: true }),
        );
      }
    } catch (caught) {
      if (mounted.current && !abort.signal.aborted)
        setError(
          caught instanceof Error
            ? caught.message
            : '상담을 연결하지 못했어요.',
        );
    } finally {
      if (mounted.current) setBusy(false);
      controller.current = null;
    }
  };

  const choose = async (code: CompanionCode) => {
    if (busy || changing) return;
    setChanging(true);
    setError('');
    try {
      if (sessionId) {
        await apiClient.patch(`/api/chat/sessions/${sessionId}`, {
          companionCode: code,
        });
        await client.invalidateQueries({
          queryKey: ['chat-session', sessionId],
        });
        await client.invalidateQueries({ queryKey: ['chat-sessions'] });
      } else if (code !== companion) createKey.current = createIdempotencyKey();
      setCompanion(code);
      setView('conversation');
    } catch {
      setError('파트너를 변경하지 못했어요. 잠시 후 다시 시도해 주세요.');
    } finally {
      setChanging(false);
    }
  };
  const newChat = () => {
    if (busy) return;
    setSessionId(undefined);
    setPending(undefined);
    setError('');
    setInput('');
    createKey.current = createIdempotencyKey();
    setView('partners');
  };
  const remove = async () => {
    if (!deleteTarget || busy || changing) return;
    setDeleteError('');
    setChanging(true);
    try {
      await apiClient.delete(`/api/chat/sessions/${deleteTarget.sessionId}`);
      client.removeQueries({
        queryKey: ['chat-messages', deleteTarget.sessionId],
      });
      client.removeQueries({
        queryKey: ['chat-session', deleteTarget.sessionId],
      });
      if (sessionId === deleteTarget.sessionId) setSessionId(undefined);
      await client.invalidateQueries({ queryKey: ['chat-sessions'] });
      setDeleteTarget(undefined);
    } catch {
      setDeleteError('상담 기록을 삭제하지 못했어요. 다시 시도해 주세요.');
    } finally {
      setChanging(false);
    }
  };
  const partner = partners[companion];
  return (
    <LinearGradient
      colors={[
        chatColors.surface,
        chatColors.surface,
        chatColors.backgroundEnd,
      ]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0.7 }}
      style={s.page}
    >
      <View style={s.page}>
        <View testID="chat-header" style={s.header}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={
              view === 'history' ? '상담으로 돌아가기' : '상담 기록 열기'
            }
            disabled={busy || changing}
            style={s.round}
            accessibilityHint={
              view !== 'history'
                ? '왼쪽 가장자리에서 오른쪽으로 밀어도 열 수 있어요.'
                : undefined
            }
            onPress={view === 'history' ? closeHistory : openHistory}
          >
            <Text style={s.heading}>{view === 'history' ? '‹' : '≡'}</Text>
          </Pressable>
          {view === 'conversation' && (
            <CompanionAvatar code={companion} size={36} />
          )}
          <View style={{ flex: 1 }}>
            <Text style={s.heading}>
              {view === 'history'
                ? '상담 기록'
                : view === 'partners'
                ? '히피 상담'
                : partner.name}
            </Text>
            {view !== 'partners' && (
              <Text style={s.caption}>
                {view === 'history'
                  ? '히피냥·히피멍과 나눈 이야기'
                  : '● ' + partner.tag}
              </Text>
            )}
          </View>
          {view !== 'partners' && (
            <Pressable
              accessibilityRole="button"
              disabled={busy || changing}
              style={[s.pill, s.headerAction]}
              onPress={view === 'history' ? newChat : () => setView('partners')}
            >
              <Text style={s.accent}>
                {view === 'history' ? '새 상담' : '바꾸기  ›'}
              </Text>
            </Pressable>
          )}
        </View>
        <HistorySwipeView
          open={view === 'history'}
          disabled={busy || changing || !!deleteTarget}
          contentKey={contentView}
          onOpen={openHistory}
          onClose={closeHistory}
          history={
            <ScrollView
              contentContainerStyle={s.history}
              keyboardShouldPersistTaps="handled"
            >
              <View style={s.search}>
                <Svg
                  testID="chat-search-icon"
                  width={20}
                  height={20}
                  viewBox="0 0 24 24"
                  accessible={false}
                >
                  <Circle
                    cx={10}
                    cy={10}
                    r={6.5}
                    stroke="#7542EA"
                    strokeWidth={1.7}
                    fill="none"
                  />
                  <Path
                    d="m15 15 5 5"
                    stroke="#7542EA"
                    strokeWidth={1.7}
                    strokeLinecap="round"
                  />
                </Svg>
                <TextInput
                  accessibilityLabel="상담 제목 검색"
                  value={search}
                  onChangeText={setSearch}
                  placeholder="대화 제목 검색"
                  placeholderTextColor="#71847D"
                  returnKeyType="search"
                  onSubmitEditing={Keyboard.dismiss}
                  style={s.searchInput}
                />
                {!!search && (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="검색어 지우기"
                    onPress={() => setSearch('')}
                    style={s.clearSearch}
                  >
                    <Text style={s.accent}>×</Text>
                  </Pressable>
                )}
              </View>
              <View style={s.filters}>
                {(['all', 'heapy_cat', 'heapy_dog'] as const).map(code => (
                  <Pressable
                    accessibilityRole="button"
                    key={code}
                    style={[s.filter, filter === code && s.activeFilter]}
                    onPress={() => setFilter(code)}
                  >
                    <Text style={[s.caption, filter === code && s.white]}>
                      {code === 'all' ? '전체' : partners[code].name}
                    </Text>
                  </Pressable>
                ))}
              </View>
              {sessions.isPending && <ActivityIndicator />}
              {sessions.isError && (
                <Pressable
                  accessibilityRole="button"
                  onPress={() => sessions.refetch()}
                >
                  <Text style={s.notice}>
                    기록을 불러오지 못했어요. 다시 불러오기
                  </Text>
                </Pressable>
              )}
              {sessionRows
                .filter(
                  item =>
                    (filter === 'all' || item.companionCode === filter) &&
                    item.title
                      .toLocaleLowerCase()
                      .includes(search.toLocaleLowerCase()),
                )
                .map(item => (
                  <View key={item.sessionId} style={s.historyCard}>
                    <Pressable
                      accessibilityRole="button"
                      disabled={busy}
                      style={s.historyContent}
                      onPress={() => {
                        setSessionId(item.sessionId);
                        setCompanion(item.companionCode ?? 'heapy_cat');
                        setPending(undefined);
                        setError('');
                        setInput('');
                        setView('conversation');
                      }}
                    >
                      <CompanionAvatar
                        code={item.companionCode ?? 'heapy_cat'}
                        size={40}
                      />
                      <View style={{ flex: 1, gap: 8 }}>
                        <Text style={s.accent}>
                          {partners[item.companionCode ?? 'heapy_cat'].name}
                        </Text>
                        <Text
                          style={s.rowTitle}
                          numberOfLines={1}
                          ellipsizeMode="tail"
                        >
                          {item.title}
                        </Text>
                        <Text style={s.caption}>
                          {new Date(item.createdAt).toLocaleDateString('ko-KR')}
                        </Text>
                      </View>
                    </Pressable>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`${item.title} 삭제`}
                      disabled={busy || changing}
                      onPress={() => {
                        setDeleteError('');
                        setDeleteTarget(item);
                      }}
                      style={s.delete}
                    >
                      <Svg
                        width={20}
                        height={20}
                        viewBox="0 0 24 24"
                        accessible={false}
                      >
                        <Path
                          d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 10v7M14 10v7"
                          fill="none"
                          stroke="#9A603C"
                          strokeWidth={1.7}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </Svg>
                    </Pressable>
                  </View>
                ))}
              {!sessions.isPending &&
                !sessions.isError &&
                !sessionRows.length && (
                  <Text style={s.small}>
                    아직 상담 기록이 없어요. 새 상담을 시작해 보세요.
                  </Text>
                )}
              {sessions.hasNextPage && (
                <Pressable
                  accessibilityRole="button"
                  disabled={sessions.isFetchingNextPage}
                  onPress={() => sessions.fetchNextPage()}
                  style={s.pill}
                >
                  <Text style={s.accent}>이전 상담 더 보기</Text>
                </Pressable>
              )}
              {!!search && (
                <Text style={s.caption}>
                  현재 불러온 상담 제목에서 검색합니다.
                </Text>
              )}
            </ScrollView>
          }
        >
          {!!error && (
            <View style={s.errorBox}>
              <Text style={s.notice}>{error}</Text>
              {pending && (
                <Pressable
                  accessibilityRole="button"
                  disabled={busy}
                  onPress={() => send(pending)}
                >
                  <Text style={s.accent}>같은 질문 다시 확인하기</Text>
                </Pressable>
              )}
            </View>
          )}
          {contentView === 'partners' && (
            <ScrollView
              contentContainerStyle={[
                s.partnerPage,
                { paddingHorizontal: padding },
              ]}
            >
              <Text style={s.eyebrow}>MY HEALTH PARTNER</Text>
              <Text style={s.title}>오늘 누구와{'\n'}함께할까요?</Text>
              <Text style={s.small}>
                성격은 달라도, 건강 정보는 같은 기준으로 꼼꼼하게.
              </Text>
              <View
                style={[
                  s.partnerRow,
                  stackCards && { flexDirection: 'column' },
                ]}
              >
                {(Object.keys(partners) as CompanionCode[]).map(code => {
                  const cat = code === 'heapy_cat';
                  const p = partners[code];
                  return (
                    <View key={code} style={[s.partnerCard, cat && s.catCard]}>
                      <View style={s.halo}>
                        <CompanionAvatar code={code} size={85} />
                      </View>
                      <Text style={[s.tag, cat && s.catTag]}>{p.tag}</Text>
                      <Text style={[s.partnerName, cat && s.white]}>
                        {p.name}
                      </Text>
                      <Text style={[s.small, cat && s.white]}>
                        {p.description}
                      </Text>
                      <Text style={[s.features, cat && s.white]}>
                        {p.features}
                      </Text>
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={`${p.name} 선택`}
                        disabled={changing || busy}
                        onPress={() => choose(code)}
                        style={[
                          s.selectButton,
                          !cat && { backgroundColor: '#7749E2' },
                        ]}
                      >
                        <Text style={[s.accent, !cat && s.white]}>
                          {changing ? '연결 중…' : '이 파트너 선택'}
                        </Text>
                      </Pressable>
                    </View>
                  );
                })}
              </View>
              <View style={s.partnerNotice}>
                <Text style={s.caption}>
                  ● 상담 중에도 언제든 파트너를 바꿀 수 있어요
                </Text>
              </View>
            </ScrollView>
          )}
          {contentView === 'conversation' && (
            <>
              <ScrollView
                ref={messageScroll}
                keyboardDismissMode={
                  Platform.OS === 'ios' ? 'interactive' : 'on-drag'
                }
                onLayout={() => {
                  if (Keyboard.isVisible()) {
                    requestAnimationFrame(() =>
                      messageScroll.current?.scrollToEnd({ animated: true }),
                    );
                  }
                }}
                contentContainerStyle={s.messages}
                keyboardShouldPersistTaps="handled"
              >
                {messages.hasNextPage && (
                  <Pressable
                    accessibilityRole="button"
                    disabled={messages.isFetchingNextPage}
                    onPress={() => messages.fetchNextPage()}
                  >
                    <Text style={s.accent}>이전 대화 더 보기</Text>
                  </Pressable>
                )}
                {!rows.length && !messages.isFetching && (
                  <View style={s.assistantRow}>
                    <CompanionAvatar code={companion} size={32} />
                    <View style={s.assistantBubble}>
                      <Text style={s.accent}>{partner.name}</Text>
                      <Text style={s.body}>
                        {companion === 'heapy_cat'
                          ? '안녕하세요. 필요한 내용을 함께 살펴볼게요.\n건강에 대해 무엇이든 물어보세요.'
                          : '안녕하세요. 건강 기록과 근거를 차근차근 살펴보겠습니다. 어떤 점이 궁금하신가요?'}
                      </Text>
                    </View>
                  </View>
                )}
                {messages.isFetching && (
                  <ActivityIndicator accessibilityLabel="대화 불러오는 중" />
                )}
                {messages.isError && (
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => messages.refetch()}
                  >
                    <Text style={s.notice}>
                      대화를 불러오지 못했어요. 다시 불러오기
                    </Text>
                  </Pressable>
                )}
                {rows.map(item => (
                  <View
                    key={item.messageId}
                    style={item.role === 'user' ? s.userRow : s.assistantRow}
                  >
                    {item.role === 'assistant' && (
                      <CompanionAvatar
                        code={item.companionCodeSnapshot ?? companion}
                        size={32}
                      />
                    )}
                    <View
                      style={
                        item.role === 'user' ? s.userBubble : s.assistantBubble
                      }
                    >
                      <Text
                        style={item.role === 'user' ? s.whiteCaption : s.accent}
                      >
                        {item.role === 'user'
                          ? '나의 질문'
                          : partners[item.companionCodeSnapshot ?? companion]
                              .name}
                      </Text>
                      {item.role === 'assistant' ? (
                        <ChatMarkdown
                          content={item.content}
                          onLinkError={() =>
                            setError('답변의 링크를 열지 못했어요.')
                          }
                        />
                      ) : (
                        <Text selectable style={[s.body, s.white]}>
                          {item.content}
                        </Text>
                      )}
                      {item.responseStatus === 'partial' && (
                        <Text style={s.notice}>
                          답변이 중간에 멈췄어요. 이어서 다시 질문해 주세요.
                        </Text>
                      )}
                      {!!item.citations.length && (
                        <Pressable
                          accessibilityRole="button"
                          accessibilityState={{
                            expanded: openSources === item.messageId,
                          }}
                          onPress={() =>
                            setOpenSources(
                              openSources === item.messageId
                                ? undefined
                                : item.messageId,
                            )
                          }
                        >
                          <Text style={s.accent}>
                            참고한 근거 {item.citations.length}개{' '}
                            {openSources === item.messageId ? '접기' : '보기'}
                          </Text>
                        </Pressable>
                      )}
                      {openSources === item.messageId &&
                        item.citations.map((citation, index) => (
                          <Pressable
                            accessibilityRole="button"
                            key={index}
                            disabled={
                              !citation.sourceUrl ||
                              !/^https?:\/\//i.test(citation.sourceUrl)
                            }
                            onPress={() =>
                              citation.sourceUrl &&
                              Linking.openURL(citation.sourceUrl).catch(() =>
                                setError('출처 링크를 열지 못했어요.'),
                              )
                            }
                          >
                            <Text selectable style={s.source}>
                              {citation.sourceTitle}
                              {citation.sourceUrl
                                ? '\n' + citation.sourceUrl
                                : ''}
                            </Text>
                          </Pressable>
                        ))}
                    </View>
                  </View>
                ))}
                {busy && (
                  <>
                    <View style={s.userRow}>
                      <View style={s.userBubble}>
                        <Text style={[s.body, s.white]}>
                          {pending?.message ?? input}
                        </Text>
                      </View>
                    </View>
                    <View style={s.assistantRow}>
                      <CompanionAvatar code={companion} size={32} />
                      <View style={s.assistantBubble}>
                        <Text style={s.accent}>꼼꼼히 보는 중</Text>
                        <ActivityIndicator color="#7749E2" />
                        <Text style={s.small}>
                          기록과 근거를 확인하며 답변을 준비하고 있어요.
                        </Text>
                      </View>
                    </View>
                  </>
                )}
                {!rows.length && !busy && (
                  <View style={s.filters}>
                    {['오늘 검진 요약 보기', '내 생활 데이터 같이 보기'].map(
                      text => (
                        <Pressable
                          accessibilityRole="button"
                          key={text}
                          style={s.pill}
                          onPress={() => setInput(text)}
                        >
                          <Text style={s.caption}>{text}</Text>
                        </Pressable>
                      ),
                    )}
                  </View>
                )}
              </ScrollView>
              <Text style={s.safety}>
                ● 의학적 진단을 대신하지 않으며, 필요 시 진료를 권해요
              </Text>
              <View style={s.composer}>
                <TextInput
                  accessibilityLabel="건강 질문"
                  placeholder="건강에 대해 무엇이든 물어보세요"
                  placeholderTextColor="#809592"
                  value={input}
                  onChangeText={value => {
                    setInput(value);
                    if (!busy) setPending(undefined);
                  }}
                  editable={!busy && !changing}
                  multiline
                  maxLength={2000}
                  style={s.input}
                />
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="질문 보내기"
                  disabled={busy || !input.trim() || changing}
                  onPress={() => send()}
                  style={[s.send, (busy || !input.trim()) && { opacity: 0.4 }]}
                >
                  <Text style={s.white}>↑</Text>
                </Pressable>
              </View>
            </>
          )}
        </HistorySwipeView>
        <ConfirmModal
          visible={!!deleteTarget}
          title="이 상담을 삭제할까요?"
          description="대화와 요약, 출처가 함께 삭제됩니다."
          confirmLabel="삭제하기"
          pendingLabel="삭제 중…"
          pending={changing}
          tone="danger"
          error={deleteError}
          onCancel={() => {
            setDeleteTarget(undefined);
            setDeleteError('');
          }}
          onConfirm={remove}
        />
      </View>
    </LinearGradient>
  );
}
const s = StyleSheet.create({
  page: { flex: 1 },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    minHeight: 56,
    backgroundColor: chatColors.surface,
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderColor: '#E8DFFF',
  },
  heading: { fontSize: 18, fontWeight: '700', color: '#17342D' },
  caption: { fontSize: 10, lineHeight: 16, color: '#71847D' },
  small: { fontSize: 12, lineHeight: 18, color: '#71847D' },
  rowTitle: {
    fontSize: 13,
    lineHeight: 20,
    fontWeight: '700',
    color: '#17342D',
  },
  round: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    backgroundColor: '#FFFFFFBB',
  },
  headerAction: { minHeight: 44, paddingHorizontal: 14 },
  pill: {
    borderWidth: 1,
    borderColor: '#E5DCFF',
    borderRadius: 22,
    minHeight: 36,
    paddingHorizontal: 18,
    justifyContent: 'center',
    backgroundColor: '#FFFFFFAA',
  },
  accent: { color: '#7542EA', fontSize: 11, fontWeight: '600', lineHeight: 17 },
  eyebrow: { fontSize: 10, color: '#7542EA', fontWeight: '700' },
  title: { fontSize: 27, fontWeight: '800', lineHeight: 32, color: '#122D25' },
  partnerPage: { padding: 24, gap: 10, paddingTop: 24 },
  partnerRow: { flexDirection: 'row', gap: 16, marginTop: 18 },
  partnerCard: {
    flex: 1,
    minHeight: 366,
    padding: 13,
    paddingTop: 18,
    borderWidth: 1,
    borderColor: '#C9CCF5',
    backgroundColor: '#FBFCFF',
    borderRadius: 26,
    gap: 12,
    boxShadow: '0px 14px 28px rgba(41,31,89,.09)',
  },
  catCard: { backgroundColor: '#7749E2', borderColor: '#9E7AF2' },
  halo: {
    padding: 7,
    backgroundColor: '#DDE2FF',
    borderRadius: 52,
    alignSelf: 'center',
    marginBottom: 2,
  },
  tag: {
    borderRadius: 12,
    backgroundColor: '#E8E5FF',
    color: '#6C3CE0',
    textAlign: 'center',
    fontSize: 10,
    paddingVertical: 6,
  },
  catTag: { backgroundColor: '#A887F5', color: 'white' },
  partnerName: { fontSize: 22, fontWeight: '800', color: '#122D25' },
  features: { fontSize: 11, lineHeight: 24, color: '#165A46', marginTop: 6 },
  selectButton: {
    minHeight: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'white',
    marginTop: 'auto',
  },
  white: { color: 'white' },
  whiteCaption: { color: '#E5D7FF', fontSize: 10 },
  partnerNotice: {
    alignSelf: 'center',
    padding: 12,
    borderWidth: 1,
    borderColor: '#E5DCFF',
    borderRadius: 24,
    backgroundColor: '#FFFFFFAA',
    marginTop: 14,
  },
  history: { padding: 24, gap: 14 },
  search: {
    paddingHorizontal: 14,
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: '#E5DCFF',
    borderRadius: 24,
    backgroundColor: '#FFFFFFCC',
  },
  searchInput: {
    flex: 1,
    minWidth: 0,
    minHeight: 48,
    paddingVertical: 12,
    color: '#17342D',
    fontSize: 13,
  },
  clearSearch: {
    minWidth: 32,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filters: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  filter: {
    borderWidth: 1,
    borderColor: '#E5DCFF',
    backgroundColor: '#FFFFFFBB',
    borderRadius: 20,
    paddingVertical: 10,
    paddingHorizontal: 24,
  },
  activeFilter: { backgroundColor: '#7749E2' },
  historyCard: {
    borderWidth: 1,
    borderColor: '#E5DCFF',
    borderRadius: 24,
    backgroundColor: '#FFFFFFDD',
    padding: 16,
    gap: 8,
    boxShadow: '0px 8px 20px rgba(41,31,89,.04)',
  },
  historyContent: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  delete: {
    alignSelf: 'flex-end',
    minHeight: 44,
    minWidth: 44,
    alignItems: 'center',
    paddingHorizontal: 10,
    justifyContent: 'center',
  },
  messages: { padding: 20, gap: 20, flexGrow: 1 },
  assistantRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  userRow: { alignItems: 'flex-end' },
  assistantBubble: {
    flexShrink: 1,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5DCFF',
    borderRadius: 22,
    backgroundColor: '#FFFFFFEE',
    gap: 10,
  },
  userBubble: {
    maxWidth: '85%',
    padding: 16,
    borderRadius: 22,
    backgroundColor: '#8451E9',
    gap: 10,
  },
  body: { fontSize: 13, lineHeight: 22, color: '#17342D' },
  notice: { color: '#9A603C', fontSize: 12, lineHeight: 18 },
  errorBox: { padding: 16, backgroundColor: '#FFF4E9', gap: 8 },
  source: { color: '#637A73', fontSize: 11, lineHeight: 18 },
  safety: {
    paddingHorizontal: 24,
    fontSize: 9,
    lineHeight: 15,
    color: '#71847D',
    marginBottom: 8,
  },
  composer: {
    marginHorizontal: 16,
    marginBottom: 14,
    padding: 7,
    flexDirection: 'row',
    alignItems: 'flex-end',
    borderRadius: 30,
    borderWidth: 1,
    borderColor: '#E5DCFF',
    backgroundColor: '#FFFFFFDD',
    boxShadow: '0px 6px 18px rgba(41,31,89,.07)',
  },
  input: {
    flex: 1,
    minHeight: 36,
    maxHeight: 100,
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: '#17342D',
    fontSize: 12,
  },
  send: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
    backgroundColor: '#7749E2',
  },
});
