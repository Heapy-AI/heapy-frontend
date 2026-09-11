import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  AppState,
  Pressable,
  Text,
  View,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useQueryClient } from '@tanstack/react-query';
import { RootStackParamList } from '../../navigation/routes';
import { PrimaryButton } from '../../shared/components/PrimaryButton';
import { FormField } from '../../shared/components/FormField';
import { createIdempotencyKey } from '../../shared/utils/idempotency';
import { ConnectionLayout, connectionStyles as s } from './ConnectionLayout';
import { CheckupFile, CheckupResult, InputType, OcrJob } from './types';
import { dataConnectionApi } from './dataConnectionApi';
import { pickCheckupFile } from './pickCheckupFile';
import {
  buildReviewConfirmation,
  hasReviewContent,
  validateReviewContract,
} from './checkupReviewContract';
import { CheckupFindings } from './CheckupFindings';
import { CheckupFileSelection } from './CheckupFileSelection';
import {
  CheckupGeneralResults,
  canExcludeCheckupItem,
} from './CheckupGeneralResults';
import { reviewStyles as review } from './checkupReviewStyles';

export function CheckupRegistrationScreen({
  navigation,
  route,
}: NativeStackScreenProps<RootStackParamList, 'CheckupRegistration'>) {
  const client = useQueryClient();
  const [file, setFile] = useState<CheckupFile | null>(null);
  const [job, setJob] = useState<OcrJob>();
  const [original, setOriginal] = useState<CheckupResult>();
  const [edited, setEdited] = useState<CheckupResult>();
  const [excluded, setExcluded] = useState(new Set<string>());
  const [phase, setPhase] = useState<
    'select' | 'processing' | 'review' | 'saved' | 'expired'
  >('select');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  const [savedRecordId, setSavedRecordId] = useState<string>();
  const uploadKey = useRef(createIdempotencyKey());
  const confirmation = useRef<{ body: string; key: string } | undefined>(
    undefined,
  );
  const controller = useRef<AbortController | null>(null);
  const pendingJob = useRef<string | null>(null);
  const saving = useRef(false);
  const mounted = useRef(true);
  const clearTemporary = () => {
    setFile(null);
    setOriginal(undefined);
    setEdited(undefined);
    setExcluded(new Set());
    setJob(undefined);
    confirmation.current = undefined;
  };
  const expire = () => {
    const jobId = pendingJob.current;
    pendingJob.current = null;
    controller.current?.abort();
    clearTemporary();
    setPhase('expired');
    setError('검수 시간이 만료됐어요. 파일을 다시 등록해 주세요.');
    if (jobId) dataConnectionApi.cancelJob(jobId).catch(() => {});
  };
  useEffect(() => {
    if (!job || !['processing', 'review'].includes(phase)) return;
    const checkExpiry = () => {
      if (Date.parse(job.expiresAt) <= Date.now()) expire();
    };
    const timer = setInterval(checkExpiry, 1000);
    const subscription = AppState.addEventListener('change', state => {
      if (state === 'active') checkExpiry();
    });
    checkExpiry();
    return () => {
      clearInterval(timer);
      subscription.remove();
    };
    // 작성자: 김진우 — 생성 시 받은 만료 시각을 검수 중·앱 복귀 시에도 적용한다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [job, phase]);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      controller.current?.abort();
      if (pendingJob.current)
        dataConnectionApi.cancelJob(pendingJob.current).catch(() => {});
      pendingJob.current = null;
      confirmation.current = undefined;
    };
  }, []);
  const fromMy = route?.params?.from === 'my';
  const back = () => {
    if (saving.current) return;
    controller.current?.abort();
    const jobId = pendingJob.current;
    pendingJob.current = null;
    clearTemporary();
    if (jobId) dataConnectionApi.cancelJob(jobId).catch(() => {});
    fromMy ? navigation.goBack() : navigation.replace('DataConnection');
  };
  const choose = async (type: InputType) => {
    setBusy(true);
    setError('');
    try {
      const selected = await pickCheckupFile(type);
      if (selected) {
        setFile(selected);
        uploadKey.current = createIdempotencyKey();
      }
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : '파일을 선택하지 못했습니다.',
      );
    } finally {
      setBusy(false);
    }
  };
  const upload = async () => {
    if (!file) return;
    setError('');
    setBusy(true);
    controller.current = new AbortController();
    try {
      const created = await dataConnectionApi.uploadCheckup(
        file,
        uploadKey.current,
        controller.current.signal,
      );
      if (controller.current.signal.aborted) {
        await dataConnectionApi.cancelJob(created.jobId);
        return;
      }
      pendingJob.current = created.jobId;
      setJob(created);
      setPhase('processing');
      setFile(null);
    } catch (reason) {
      if (!controller.current.signal.aborted)
        setError(
          reason instanceof Error ? reason.message : '업로드하지 못했습니다.',
        );
    } finally {
      setBusy(false);
    }
  };
  useEffect(() => {
    if (phase !== 'processing' || !job) return;
    const abort = new AbortController();
    let timer: ReturnType<typeof setTimeout>;

    const poll = async () => {
      try {
        if (Date.parse(job.expiresAt) <= Date.now())
          throw new Error(
            '처리 시간이 만료됐어요. 돌아가서 파일을 다시 등록해 주세요.',
          );
        const current = await dataConnectionApi.getJob(job.jobId, abort.signal);
        if (abort.signal.aborted || pendingJob.current !== job.jobId) return;
        if (current.status === 'failed')
          throw new Error(
            current.errorCode === 'OCR-001'
              ? '파일은 20MB 이하, PDF는 20페이지 이하로 등록해 주세요.'
              : current.errorCode === 'OCR-002'
              ? '비밀번호가 없는 PDF 또는 JPG, PNG 파일을 등록해 주세요.'
              : '결과를 인식하지 못했어요. 더 선명한 결과지로 다시 등록해 주세요.',
          );
        if (current.status === 'completed') {
          if (!current.result)
            throw new Error(
              '인식한 검진 항목이 없어요. 결과지를 다시 확인해 주세요.',
            );
          validateReviewContract(current.result);
          if (!hasReviewContent(current.result))
            throw new Error(
              '인식한 검진 항목이 없어요. 결과지를 다시 확인해 주세요.',
            );
          setOriginal(current.result);
          setEdited(current.result);
          setPhase('review');
          return;
        }
        timer = setTimeout(
          poll,
          Math.max(
            1000,
            Math.min(current.pollAfterMs ?? job.pollAfterMs ?? 1500, 10000),
          ),
        );
      } catch (reason) {
        if (!abort.signal.aborted) {
          if ((reason as { status?: number })?.status === 410) {
            expire();
            return;
          }
          setError(
            reason instanceof Error
              ? reason.message
              : '처리 상태를 확인하지 못했습니다.',
          );
        }
      }
    };
    poll();
    return () => {
      abort.abort();
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [job, phase, retry]);
  const save = async () => {
    if (saving.current || !job || !original || !edited) return;
    if (Date.parse(job.expiresAt) <= Date.now()) {
      expire();
      return;
    }
    setError('');
    try {
      const payload = buildReviewConfirmation(original, edited, excluded);
      const body = JSON.stringify(payload);
      if (confirmation.current?.body !== body)
        confirmation.current = { body, key: createIdempotencyKey() };
      saving.current = true;
      setBusy(true);
      const saved = await dataConnectionApi.confirm(
        job.jobId,
        payload,
        confirmation.current.key,
      );
      if (!saved?.recordId)
        throw new Error(
          '저장 결과를 확인할 수 없어요. 입력을 유지했으니 다시 시도해 주세요.',
        );
      if (!mounted.current || pendingJob.current !== job.jobId) return;
      if (
        payload.reviewVersion === 2 &&
        (saved.resultCount !== payload.results.length ||
          saved.findingCount !== payload.findings!.length ||
          saved.overallOpinionCount !== payload.overallOpinions!.length)
      )
        throw new Error(
          '전체 저장 여부를 확인할 수 없어요. 검수 입력을 유지했어요. 같은 요청으로 다시 확인해 주세요.',
        );
      client.setQueryData(['checkup-registered'], true);
      client.invalidateQueries({ queryKey: ['home'] });
      pendingJob.current = null;
      clearTemporary();
      setSavedRecordId(saved.recordId);
      setPhase('saved');
    } catch (reason) {
      if (!mounted.current || pendingJob.current !== job.jobId) return;
      if ((reason as { status?: number })?.status === 410) {
        expire();
        return;
      }
      setError(
        (reason as { code?: string })?.code === 'OCR-006'
          ? '서버 결과와 앱의 검수 버전이 달라요. 앱 업데이트가 필요해요.'
          : reason instanceof Error
          ? reason.message
          : '저장하지 못했습니다.',
      );
    } finally {
      saving.current = false;
      if (mounted.current) setBusy(false);
    }
  };
  return (
    <ConnectionLayout
      title="건강검진 등록"
      onBack={busy ? undefined : back}
      footer={
        <>
          {phase === 'select' && (
            <PrimaryButton
              label={busy ? '준비하고 있어요' : '인식 시작하기'}
              disabled={!file || busy}
              loading={busy}
              onPress={upload}
            />
          )}
          {phase === 'review' && (
            <PrimaryButton
              label="확인한 결과 저장하기"
              loading={busy}
              onPress={save}
            />
          )}
          {phase === 'expired' && (
            <PrimaryButton
              label="파일 다시 등록하기"
              loading={busy}
              onPress={() => {
                uploadKey.current = createIdempotencyKey();
                setError('');
                setPhase('select');
              }}
            />
          )}
          {phase === 'saved' && (
            <PrimaryButton
              label="저장한 결과 상세 보기"
              onPress={() => {
                if (savedRecordId)
                  navigation.navigate('CheckupDetail', {
                    recordId: savedRecordId,
                  });
              }}
            />
          )}
          {phase === 'saved' && (
            <PrimaryButton
              label={fromMy ? '마이로 돌아가기' : '데이터 연결로 돌아가기'}
              onPress={back}
            />
          )}
          {phase !== 'saved' && (
            <Pressable
              accessibilityRole="button"
              disabled={busy}
              onPress={back}
              style={s.textButton}
            >
              <Text style={s.textButtonLabel}>나중에 등록하기</Text>
            </Pressable>
          )}
        </>
      }
    >
      {phase === 'select' && (
        <Pressable
          accessibilityRole="button"
          style={s.textButton}
          onPress={() => navigation.navigate('CheckupHistory')}
        >
          <Text style={s.textButtonLabel}>이전 검진 기록 보기</Text>
        </Pressable>
      )}
      {phase === 'select' && (
        <CheckupFileSelection file={file} busy={busy} onChoose={choose} />
      )}
      {phase === 'processing' && (
        <View style={s.card}>
          {!error && <ActivityIndicator size="large" />}
          <Text style={s.headline}>검진 결과를{'\n'}읽고 있어요</Text>
          <Text style={s.description}>
            항목과 수치를 정리하고 있어요. 완료되면 직접 확인하고 수정할 수
            있어요.
          </Text>
          {!!error && (
            <PrimaryButton
              label="처리 상태 다시 확인"
              onPress={() => {
                setError('');
                setRetry(value => value + 1);
              }}
            />
          )}
        </View>
      )}
      {phase === 'review' && edited && (
        <>
          <View style={review.intro}>
            <Text style={review.eyebrow}>건강 기록 · 최종 확인</Text>
            <Text style={review.introTitle}>
              내 검진 결과,{'\n'}차근차근 확인해요
            </Text>
            <Text style={review.introDescription}>
              원본과 비교하며 결과값을 수정해 주세요.{'\n'}단위와 기관 판정은
              원문 그대로 보관해요.
            </Text>
          </View>
          <View style={review.card}>
            <Text style={review.title}>검진 정보</Text>
            <FormField
              label="검진일"
              placeholder="YYYY-MM-DD"
              value={edited.measuredAt ?? ''}
              onChangeText={value =>
                setEdited({ ...edited, measuredAt: value })
              }
              editable={!busy}
            />
            <FormField
              label="검진 기관"
              value={edited.providerName ?? ''}
              onChangeText={value =>
                setEdited({ ...edited, providerName: value })
              }
              editable={!busy}
            />
          </View>
          <CheckupGeneralResults
            items={edited.items}
            originalItems={original?.items}
            excluded={excluded}
            busy={busy}
            onChange={(fieldKey, field, value) =>
              setEdited(current =>
                current
                  ? {
                      ...current,
                      items: current.items.map(item =>
                        item.fieldKey === fieldKey
                          ? { ...item, [field]: value }
                          : item,
                      ),
                    }
                  : current,
              )
            }
            onExclude={fieldKey =>
              setExcluded(current => {
                const item = original?.items.find(
                  entry => entry.fieldKey === fieldKey,
                );
                if (!item || !canExcludeCheckupItem(item, original!.items))
                  return current;
                const next = new Set(current);
                next.has(fieldKey) ? next.delete(fieldKey) : next.add(fieldKey);
                return next;
              })
            }
          />
          {original && (
            <CheckupFindings
              result={edited}
              original={original}
              excluded={excluded}
              busy={busy}
              onChange={(name, id, text) =>
                setEdited(current =>
                  current
                    ? {
                        ...current,
                        [name]: current[name]?.map(item =>
                          item.findingId === id ? { ...item, text } : item,
                        ),
                      }
                    : current,
                )
              }
            />
          )}
        </>
      )}
      {phase === 'saved' && (
        <View style={s.card}>
          <Text style={s.headline}>검진 결과를{'\n'}저장했어요</Text>
          <Text style={s.description}>
            확인한 건강 기록으로 더 나에게 맞는 관리를 시작할 수 있어요.
          </Text>
        </View>
      )}
      {!!error && (
        <Text accessibilityRole="alert" style={s.error}>
          {error}
        </Text>
      )}
    </ConnectionLayout>
  );
}
