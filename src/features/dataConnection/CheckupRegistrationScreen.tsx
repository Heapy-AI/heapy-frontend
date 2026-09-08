import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
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
import { buildConfirmation } from './checkupValidation';
import { CheckupFileSelection } from './CheckupFileSelection';

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
    'select' | 'processing' | 'review' | 'saved'
  >('select');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  const uploadKey = useRef(createIdempotencyKey());
  const confirmation = useRef<{ body: string; key: string } | undefined>(
    undefined,
  );
  const controller = useRef<AbortController | null>(null);
  const pendingJob = useRef<string | null>(null);
  useEffect(
    () => () => {
      controller.current?.abort();
      if (pendingJob.current)
        dataConnectionApi.cancelJob(pendingJob.current).catch(() => {});
    },
    [],
  );
  const fromMy = route?.params?.from === 'my';
  const back = () =>
    fromMy ? navigation.goBack() : navigation.replace('DataConnection');
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
        if (abort.signal.aborted) return;
        if (current.status === 'failed')
          throw new Error(
            current.errorCode === 'OCR-001'
              ? '파일은 20MB 이하, PDF는 20페이지 이하로 등록해 주세요.'
              : current.errorCode === 'OCR-002'
              ? '비밀번호가 없는 PDF 또는 JPG, PNG 파일을 등록해 주세요.'
              : '결과를 인식하지 못했어요. 더 선명한 결과지로 다시 등록해 주세요.',
          );
        if (current.status === 'completed') {
          if (!current.result?.items.length)
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
        if (!abort.signal.aborted)
          setError(
            reason instanceof Error
              ? reason.message
              : '처리 상태를 확인하지 못했습니다.',
          );
      }
    };
    poll();
    return () => {
      abort.abort();
      clearTimeout(timer);
    };
  }, [job, phase, retry]);
  const save = async () => {
    if (!job || !original || !edited) return;
    setError('');
    try {
      const payload = buildConfirmation(original, edited, excluded);
      const body = JSON.stringify(payload);
      if (confirmation.current?.body !== body)
        confirmation.current = { body, key: createIdempotencyKey() };
      setBusy(true);
      await dataConnectionApi.confirm(
        job.jobId,
        payload,
        confirmation.current.key,
      );
      client.setQueryData(['checkup-registered'], true);
      client.invalidateQueries({ queryKey: ['home'] });
      pendingJob.current = null;
      setOriginal(undefined);
      setEdited(undefined);
      setJob(undefined);
      setPhase('saved');
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : '저장하지 못했습니다.',
      );
    } finally {
      setBusy(false);
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
          <Text style={s.headline}>인식한 결과를{'\n'}확인해 주세요</Text>
          <Text style={s.description}>
            결과지와 비교해 잘못 읽힌 값을 수정해 주세요. 기관의 판정은 그대로
            표시해요.
          </Text>
          <View style={s.card}>
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
          {edited.items.map((item, index) => (
            <View key={item.fieldKey} style={s.card}>
              <Text style={s.cardTitle}>{item.itemName}</Text>
              {!item.itemCode && (
                <Text style={s.error}>
                  표준 항목을 찾지 못했어요. 이번 저장에서 제외해 주세요.
                </Text>
              )}
              {item.confidence != null && item.confidence < 0.8 && (
                <Text style={s.badge}>원본과 한 번 더 확인해 주세요</Text>
              )}
              <FormField
                label={`${item.itemName} 결과값`}
                value={item.value}
                editable={!busy && !excluded.has(item.fieldKey)}
                onChangeText={value =>
                  setEdited({
                    ...edited,
                    items: edited.items.map((entry, i) =>
                      i === index ? { ...entry, value } : entry,
                    ),
                  })
                }
              />
              <FormField
                label={`${item.itemName} 단위`}
                value={item.unit ?? ''}
                editable={!busy && !excluded.has(item.fieldKey)}
                onChangeText={unit =>
                  setEdited({
                    ...edited,
                    items: edited.items.map((entry, i) =>
                      i === index ? { ...entry, unit } : entry,
                    ),
                  })
                }
              />
              <Text style={s.description}>
                기관 판정: {item.status ?? '기재 없음'}
              </Text>
              <Pressable
                accessibilityRole="checkbox"
                accessibilityState={{
                  checked: excluded.has(item.fieldKey),
                  disabled: busy,
                }}
                disabled={busy}
                onPress={() =>
                  setExcluded(current => {
                    const next = new Set(current);
                    next.has(item.fieldKey)
                      ? next.delete(item.fieldKey)
                      : next.add(item.fieldKey);
                    return next;
                  })
                }
                style={s.textButton}
              >
                <Text style={s.textButtonLabel}>
                  {excluded.has(item.fieldKey) ? '☑' : '□'} 이번 저장에서 제외
                </Text>
              </Pressable>
            </View>
          ))}
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
