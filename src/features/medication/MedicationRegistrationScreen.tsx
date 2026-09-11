import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  AppState,
  Image,
  Pressable,
  Text,
  View,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { RootStackParamList } from '../../navigation/routes';
import { PrimaryButton } from '../../shared/components/PrimaryButton';
import { FormField } from '../../shared/components/FormField';
import { ConfirmModal } from '../../shared/components/ConfirmModal';
import { createIdempotencyKey } from '../../shared/utils/idempotency';
import { ConnectionLayout } from '../dataConnection/ConnectionLayout';
import { pickCheckupFile } from '../dataConnection/pickCheckupFile';
import { InputType } from '../dataConnection/types';
import { medicationApi, MedicationJob } from './medicationApi';
import {
  MedicationDraft,
  emptyMedication,
  medicationPayload,
} from './medicationForm';
import { medicationStyles as s } from './MedicationScreen';

export function MedicationRegistrationScreen({
  navigation,
  route,
}: NativeStackScreenProps<RootStackParamList, 'MedicationRegistration'>) {
  const id = route.params?.medicationId;
  const client = useQueryClient();
  const [phase, setPhase] = useState<'select' | 'processing' | 'form'>(
    id ? 'form' : 'select',
  );
  const [drafts, setDrafts] = useState<MedicationDraft[]>([]);
  const [job, setJob] = useState<MedicationJob>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [archive, setArchive] = useState(false);
  const mounted = useRef(true);
  const working = useRef(false);
  const jobId = useRef<string | undefined>(undefined);
  const request = useRef<AbortController | undefined>(undefined);
  const receipt = useRef<{ payload: string; key: string } | undefined>(
    undefined,
  );
  const detail = useQuery({
    queryKey: ['medications', id],
    queryFn: ({ signal }) => medicationApi.detail(id!, signal),
    enabled: !!id,
    retry: false,
  });
  useEffect(() => {
    if (detail.data)
      setDrafts([
        {
          displayName: detail.data.displayName,
          dosageText: detail.data.dosageText,
          instructions: detail.data.instructions ?? '',
          startDate: detail.data.startDate,
          endDate: detail.data.endDate ?? '',
          times: detail.data.schedules
            .map(time => time.scheduledTime.slice(0, 5))
            .join(', '),
        },
      ]);
  }, [detail.data]);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      request.current?.abort();
      if (jobId.current && !working.current)
        medicationApi.cancel(jobId.current).catch(() => {});
    };
  }, []);
  useEffect(
    () =>
      navigation.addListener('beforeRemove', event => {
        if (working.current) event.preventDefault();
      }),
    [navigation],
  );

  useEffect(() => {
    if (!job) return;
    const expire = () => {
      if (Date.now() < Date.parse(job.expiresAt) || working.current) return;
      request.current?.abort();
      const expired = jobId.current;
      jobId.current = undefined;
      setJob(undefined);
      setDrafts([]);
      setPhase('select');
      setError('검수 시간이 만료됐어요. 파일을 다시 등록해 주세요.');
      if (expired) medicationApi.cancel(expired).catch(() => {});
    };
    const interval = setInterval(expire, 1000);
    const sub = AppState.addEventListener('change', state => {
      if (state === 'active') expire();
    });
    return () => {
      clearInterval(interval);
      sub.remove();
    };
  }, [job]);

  useEffect(() => {
    if (phase !== 'processing' || !job) return;
    let stopped = false;
    let timer: ReturnType<typeof setTimeout>;
    const abort = new AbortController();
    request.current = abort;
    const poll = async () => {
      try {
        const latest = await medicationApi.job(job.jobId, abort.signal);
        if (stopped) return;
        if (latest.status === 'completed') {
          const items = latest.result?.items;
          if (!items?.length) {
            setError(
              '약 정보를 읽지 못했어요. 다시 촬영하거나 직접 입력해 주세요.',
            );
            setPhase('select');
            return;
          }
          setDrafts(
            items.map(item => ({
              ...emptyMedication(),
              itemOrder: item.itemOrder,
              displayName: item.normalizedName ?? item.rawName ?? '',
              dosageText: item.normalizedDosage ?? item.rawDosage ?? '',
            })),
          );
          setError('');
          setPhase('form');
          return;
        }
        if (['failed', 'expired', 'cancelled'].includes(latest.status)) {
          setError(
            '인식을 완료하지 못했어요. 다시 촬영하거나 직접 입력해 주세요.',
          );
          setPhase('select');
          return;
        }
        timer = setTimeout(poll, Math.max(2000, latest.pollAfterMs || 2500));
      } catch (exception) {
        if (!stopped) {
          setError(
            exception instanceof Error
              ? exception.message
              : '인식 상태를 확인하지 못했어요.',
          );
          timer = setTimeout(poll, 5000);
        }
      }
    };
    timer = setTimeout(poll, 2000);
    return () => {
      stopped = true;
      clearTimeout(timer);
      abort.abort();
    };
  }, [phase, job]);

  const clearJob = () => {
    const previous = jobId.current;
    jobId.current = undefined;
    setJob(undefined);
    request.current?.abort();
    if (previous) medicationApi.cancel(previous).catch(() => {});
  };
  const choose = async (type: InputType) => {
    if (working.current) return;
    working.current = true;
    setBusy(true);
    setError('');
    try {
      const file = await pickCheckupFile(type);
      if (!file || !mounted.current) return;
      clearJob();
      const abort = new AbortController();
      request.current = abort;
      const created = await medicationApi.upload(
        file,
        createIdempotencyKey(),
        abort.signal,
      );
      if (!mounted.current) {
        medicationApi.cancel(created.jobId).catch(() => {});
        return;
      }
      jobId.current = created.jobId;
      setJob(created);
      setPhase('processing');
    } catch (exception) {
      if (mounted.current)
        setError(
          exception instanceof Error
            ? exception.message
            : '파일을 등록하지 못했어요.',
        );
    } finally {
      working.current = false;
      if (mounted.current) setBusy(false);
    }
  };
  const finish = async () => {
    await Promise.all([
      client.invalidateQueries({ queryKey: ['medications'] }),
      client.invalidateQueries({ queryKey: ['medication-intakes'] }),
      client.invalidateQueries({ queryKey: ['home'] }),
    ]);
  };
  const save = async () => {
    if (working.current) return;
    working.current = true;
    setBusy(true);
    setError('');
    let saved = false;
    try {
      if (!drafts.length)
        throw new Error('저장할 약을 한 개 이상 입력해 주세요.');
      const payload = drafts.map(draft => ({
        ...medicationPayload(draft),
        doseAmount: null,
        doseUnit: null,
      }));
      const serialized = JSON.stringify({
        payload,
        orders: drafts.map(draft => draft.itemOrder),
        job: jobId.current,
      });
      if (receipt.current?.payload !== serialized)
        receipt.current = { payload: serialized, key: createIdempotencyKey() };
      if (jobId.current)
        await medicationApi.confirm(
          jobId.current,
          payload.map((item, index) => ({
            ...item,
            itemOrder: drafts[index]!.itemOrder!,
          })),
          receipt.current.key,
        );
      else if (id) await medicationApi.update(id, payload[0]!);
      else await medicationApi.create(payload[0]!, receipt.current.key);
      jobId.current = undefined;
      setJob(undefined);
      setDrafts([]);
      await finish();
      saved = true;
    } catch (exception) {
      if (mounted.current)
        setError(
          exception instanceof Error ? exception.message : '저장하지 못했어요.',
        );
    } finally {
      working.current = false;
      if (mounted.current) setBusy(false);
    }
    if (saved && mounted.current) navigation.goBack();
  };
  const endMedication = async () => {
    if (!id || working.current) return;
    working.current = true;
    setBusy(true);
    setError('');
    let ended = false;
    try {
      await medicationApi.archive(id);
      await finish();
      ended = true;
    } catch (exception) {
      setError(
        exception instanceof Error ? exception.message : '종료하지 못했어요.',
      );
    } finally {
      working.current = false;
      setBusy(false);
    }
    if (ended) navigation.goBack();
  };
  const readOnly = detail.data?.status === 'archived';
  return (
    <ConnectionLayout
      title={id ? '복약 정보' : '약 등록하기'}
      onBack={() => {
        if (!working.current) navigation.goBack();
      }}
      footer={
        phase === 'form' && drafts.length > 0 && !readOnly ? (
          <PrimaryButton
            label={id ? '변경 사항 저장' : '확인한 약과 일정 저장'}
            loading={busy}
            onPress={save}
          />
        ) : undefined
      }
    >
      {phase === 'select' && (
        <>
          <View style={s.hero}>
            <View style={s.iconTile}>
              <Image
                source={require('../../assets/my/medication.png')}
                style={s.icon}
              />
            </View>
            <View style={s.flex}>
              <Text style={s.title}>약봉투 한 장이면</Text>
              <Text style={s.muted}>인식한 약 정보를 확인하고 등록해요.</Text>
            </View>
          </View>
          {(
            [
              {
                type: 'camera',
                label: '약봉투·처방전 촬영',
                description: '글자가 선명하게 보이도록 촬영해 주세요.',
              },
              {
                type: 'image',
                label: '사진에서 가져오기',
                description: '저장해 둔 약봉투나 처방전',
              },
              {
                type: 'pdf',
                label: 'PDF 파일 선택',
                description: '20MB 이하의 PDF',
              },
            ] as const
          ).map(item => (
            <Pressable
              key={item.type}
              accessibilityRole="button"
              disabled={busy}
              onPress={() => choose(item.type)}
              style={s.card}
            >
              <Text style={s.section}>{item.label} ›</Text>
              <Text style={s.muted}>{item.description}</Text>
            </Pressable>
          ))}
          <Pressable
            accessibilityRole="button"
            disabled={busy}
            onPress={() => {
              clearJob();
              setError('');
              setDrafts([emptyMedication()]);
              setPhase('form');
            }}
            style={s.smallButton}
          >
            <Text style={s.link}>직접 입력하기</Text>
          </Pressable>
          {busy && <ActivityIndicator />}
        </>
      )}
      {phase === 'processing' && (
        <View style={s.empty}>
          <ActivityIndicator />
          <Text style={s.section}>약 정보를 읽고 있어요</Text>
          <Text style={s.muted}>완료되면 내용을 확인해 주세요.</Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              clearJob();
              setPhase('select');
            }}
            style={s.smallButton}
          >
            <Text style={s.link}>취소</Text>
          </Pressable>
        </View>
      )}
      {id && detail.isPending && <ActivityIndicator />}
      {detail.error && (
        <Pressable accessibilityRole="button" onPress={() => detail.refetch()}>
          <Text style={s.error}>{detail.error.message} · 다시 시도</Text>
        </Pressable>
      )}
      {phase === 'form' && (
        <>
          {job && (
            <Text style={s.muted}>
              원본과 약 이름·복용량을 비교하고, 복용 날짜와 시각을 확인해
              주세요.
            </Text>
          )}
          {drafts.map((draft, index) => {
            const change = (field: keyof MedicationDraft, value: string) =>
              setDrafts(current =>
                current.map((item, i) =>
                  i === index ? { ...item, [field]: value } : item,
                ),
              );
            return (
              <View key={draft.itemOrder ?? 'manual'} style={s.card}>
                <View style={s.row}>
                  <Text style={s.section}>
                    {job ? `인식한 약 ${index + 1}` : '약 정보'}
                  </Text>
                  {job && (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`${
                        draft.displayName || index + 1
                      } 제외`}
                      disabled={busy}
                      onPress={() =>
                        setDrafts(current =>
                          current.filter((_, i) => i !== index),
                        )
                      }
                      style={s.smallButton}
                    >
                      <Text style={s.muted}>제외</Text>
                    </Pressable>
                  )}
                </View>
                <FormField
                  label="약 이름"
                  value={draft.displayName}
                  maxLength={200}
                  editable={!busy && !readOnly}
                  onChangeText={value => change('displayName', value)}
                  placeholder="약봉투에 적힌 이름"
                />
                <FormField
                  label="1회 복용량·복용법"
                  value={draft.dosageText}
                  maxLength={1000}
                  editable={!busy && !readOnly}
                  onChangeText={value => change('dosageText', value)}
                  placeholder="예: 1회 1정, 식후"
                />
                <FormField
                  label="메모 (선택)"
                  value={draft.instructions}
                  maxLength={1000}
                  editable={!busy && !readOnly}
                  onChangeText={value => change('instructions', value)}
                  placeholder="기억할 내용을 적어 주세요"
                />
                <Text style={s.section}>복용 일정</Text>
                <FormField
                  label="복용 시작일"
                  value={draft.startDate}
                  maxLength={10}
                  editable={!busy && !readOnly}
                  onChangeText={value => change('startDate', value)}
                  placeholder="YYYY-MM-DD"
                  keyboardType="numbers-and-punctuation"
                />
                <FormField
                  label="복용 종료일 (선택)"
                  value={draft.endDate}
                  maxLength={10}
                  editable={!busy && !readOnly}
                  onChangeText={value => change('endDate', value)}
                  placeholder="종료일이 없으면 비워 두세요"
                  keyboardType="numbers-and-punctuation"
                />
                {!readOnly && (
                  <FormField
                    label="매일 복용 시각"
                    value={draft.times}
                    maxLength={100}
                    editable={!busy}
                    onChangeText={value => change('times', value)}
                    placeholder="예: 08:00, 20:00"
                    keyboardType="numbers-and-punctuation"
                  />
                )}
              </View>
            );
          })}
          {id && !readOnly && (
            <Pressable
              accessibilityRole="button"
              disabled={busy}
              onPress={() => {
                setError('');
                setArchive(true);
              }}
              style={s.smallButton}
            >
              <Text style={s.error}>복용 종료하기</Text>
            </Pressable>
          )}
        </>
      )}
      {!!error && (
        <Text accessibilityRole="alert" style={s.error}>
          {error}
        </Text>
      )}
      <ConfirmModal
        visible={archive}
        title="이 약의 복용을 종료할까요?"
        description="앞으로의 일정을 취소하고 지난 복용 이력은 보관해요."
        confirmLabel="복용 종료"
        pending={busy}
        error={error || undefined}
        onCancel={() => {
          if (!busy) setArchive(false);
        }}
        onConfirm={endMedication}
      />
    </ConnectionLayout>
  );
}
