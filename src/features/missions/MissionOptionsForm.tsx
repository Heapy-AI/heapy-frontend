// 작성자: 김진우 — 추정할 수 없는 개인 목표와 기록 자격을 사용자에게 확인한다.
import React, { useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../shared/api/client';
import { missionKeys } from './missionApi';
import { ms } from './missionStyles';

type Options = {
  waterGoalMl: number | null;
  bloodPressureTracking: boolean;
  sevenDayBloodPressurePlan: boolean;
  wakeMinute: number | null;
  bedMinute: number | null;
  weightTracking: boolean;
  weightWeekday: number | null;
  weightMinute: number | null;
  noSyncableSleep: boolean;
  hasCurrentCheckupResult: boolean;
  checkupYear: number | null;
  hasOlderCheckupResult: boolean;
};
export function MissionOptionsButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Pressable
        accessibilityRole="button"
        onPress={() => setOpen(true)}
        style={ms.smallButton}
      >
        <Text style={ms.green}>미션 목표·기록 설정</Text>
      </Pressable>
      <Modal
        visible={open}
        animationType="slide"
        onRequestClose={() => setOpen(false)}
      >
        {open && <OptionsLoader onClose={() => setOpen(false)} />}
      </Modal>
    </>
  );
}
function OptionsLoader({ onClose }: { onClose: () => void }) {
  const query = useQuery({
    queryKey: [...missionKeys, 'options'],
    queryFn: async () =>
      (await apiClient.get<Options>('/api/missions/options')).data,
    retry: false,
  });
  return query.data ? (
    <OptionsEditor initial={query.data} onClose={onClose} />
  ) : (
    <View style={ms.card}>
      <Text style={ms.text}>미션 설정</Text>
      <Pressable accessibilityRole="button" onPress={() => query.refetch()}>
        <Text style={ms.muted}>
          {query.isError
            ? '설정을 불러오지 못했어요. 다시 시도'
            : '설정을 불러오고 있어요.'}
        </Text>
      </Pressable>
      <Pressable accessibilityRole="button" onPress={onClose}>
        <Text style={ms.green}>닫기</Text>
      </Pressable>
    </View>
  );
}
const formatTime = (n: number | null) =>
  n == null
    ? ''
    : `${String(Math.floor(n / 60)).padStart(2, '0')}:${String(n % 60).padStart(
        2,
        '0',
      )}`;
function OptionsEditor({
  initial,
  onClose,
}: {
  initial: Options;
  onClose: () => void;
}) {
  const client = useQueryClient();
  const [options, setOptions] = useState(initial),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  const [fields, setFields] = useState({
    waterGoalMl: String(initial.waterGoalMl ?? ''),
    wakeMinute: formatTime(initial.wakeMinute),
    bedMinute: formatTime(initial.bedMinute),
    weightMinute: formatTime(initial.weightMinute),
    weightWeekday: String(initial.weightWeekday ?? ''),
    checkupYear: String(initial.checkupYear ?? ''),
  });
  const toggle = (key: keyof Options, label: string) => (
    <View style={ms.between}>
      <Text style={[ms.text, ms.flex]}>{label}</Text>
      <Switch
        accessibilityLabel={label}
        value={!!options[key]}
        onValueChange={v => setOptions(o => ({ ...o, [key]: v }))}
      />
    </View>
  );
  const field = (
    key: keyof typeof fields,
    label: string,
    placeholder: string,
  ) => (
    <View>
      <Text style={ms.muted}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        placeholder={placeholder}
        value={fields[key]}
        onChangeText={v => setFields(f => ({ ...f, [key]: v }))}
        style={ms.card}
        autoCapitalize="none"
      />
    </View>
  );
  const save = async () => {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      const body = { ...options };
      for (const key of Object.keys(fields) as (keyof typeof fields)[]) {
        const raw = fields[key].trim();
        let value: number | null = null;
        if (raw) {
          if (key.endsWith('Minute')) {
            if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(raw))
              throw new Error('시각은 07:00처럼 입력해 주세요.');
            value = Number(raw.slice(0, 2)) * 60 + Number(raw.slice(3));
          } else {
            if (!/^\d+$/.test(raw))
              throw new Error('목표와 연도는 숫자로 입력해 주세요.');
            value = Number(raw);
          }
        }
        body[key] = value;
      }
      if (!body.bloodPressureTracking) body.sevenDayBloodPressurePlan = false;
      await apiClient.put('/api/missions/options', body);
      await client.invalidateQueries({ queryKey: missionKeys });
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : '설정을 저장하지 못했어요.');
    } finally {
      setBusy(false);
    }
  };
  return (
    <ScrollView
      contentContainerStyle={ms.card}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={ms.text}>미션 목표·기록 설정</Text>
      <Text style={ms.muted}>
        알고 있는 정보만 설정해 주세요. 설정하지 않은 값은 추정하지 않아요.
      </Text>
      {field('waterGoalMl', '내가 정한 하루 물 목표 (mL)', '선택 입력')}
      {toggle('bloodPressureTracking', '혈압을 관리하며 기록하고 있어요')}
      {options.bloodPressureTracking && (
        <>
          {field('wakeMinute', '기상 예정 시각', '07:00')}
          {field('bedMinute', '취침 예정 시각', '23:00')}
          {toggle(
            'sevenDayBloodPressurePlan',
            '7일 아침·저녁 혈압 기록계획이 있어요',
          )}
        </>
      )}
      {toggle('weightTracking', '정기적으로 체중을 기록할게요')}
      {options.weightTracking && (
        <>
          {field(
            'weightWeekday',
            '체중 기록 요일 (월요일 1 ~ 일요일 7)',
            '1~7',
          )}
          {field('weightMinute', '체중 기록 시각', '08:00')}
        </>
      )}
      {toggle('noSyncableSleep', '삼성헬스에 가져올 수면 기록이 없어요')}
      {toggle(
        'hasCurrentCheckupResult',
        '아직 등록하지 않은 검진 결과가 있어요',
      )}
      {options.hasCurrentCheckupResult &&
        field('checkupYear', '보유한 검진 결과 연도', '2026')}
      {toggle(
        'hasOlderCheckupResult',
        '이전 연도의 검진 결과도 보유하고 있어요',
      )}
      {!!error && <Text style={ms.error}>{error}</Text>}
      <Pressable
        accessibilityRole="button"
        disabled={busy}
        onPress={save}
        style={ms.smallButton}
      >
        <Text style={ms.green}>{busy ? '저장 중…' : '설정 저장'}</Text>
      </Pressable>
      <Pressable accessibilityRole="button" disabled={busy} onPress={onClose}>
        <Text style={ms.muted}>닫기</Text>
      </Pressable>
    </ScrollView>
  );
}
