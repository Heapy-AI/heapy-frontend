// 작성자: 김진우 — 복용 날짜와 반복 시각을 키보드 없이 선택한다.
import React, { useRef, useState } from 'react';
import {
  Keyboard,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { colors } from '../../shared/theme/tokens';
import { MedicationDraft, koreaDate } from './medicationForm';

type Schedule = Pick<MedicationDraft, 'startDate' | 'endDate' | 'times'>;
const pad = (value: number) => String(value).padStart(2, '0');
const displayTime = (value: string) => {
  const [hour, minute] = value.split(':');
  return `${Number(hour) < 12 ? '오전' : '오후'} ${
    Number(hour) % 12 || 12
  }:${minute}`;
};

export function MedicationScheduleFields({
  value,
  disabled,
  onChange,
}: {
  value: Schedule;
  disabled: boolean;
  onChange: (patch: Partial<Schedule>) => void;
}) {
  const [dateField, setDateField] = useState<'startDate' | 'endDate'>();
  const [month, setMonth] = useState(new Date());
  const [editing, setEditing] = useState<number>();
  const [hour, setHour] = useState(8);
  const [minute, setMinute] = useState(0);
  const hoursList = useRef<ScrollView>(null);
  const minutesList = useRef<ScrollView>(null);
  const times = value.times
    .split(',')
    .map(time => time.trim())
    .filter(Boolean);
  const selectedTime = `${pad(hour)}:${pad(minute)}`;
  const duplicate =
    editing !== undefined &&
    times.some((time, index) => index !== editing && time === selectedTime);
  const openDate = (field: 'startDate' | 'endDate') => {
    Keyboard.dismiss();
    const initial = value[field] || value.startDate || koreaDate();
    const [year, monthNumber] = initial.split('-').map(Number);
    setMonth(new Date(year!, monthNumber! - 1, 1));
    setDateField(field);
  };
  const openTime = (index: number) => {
    Keyboard.dismiss();
    const [h, m] = (times[index] || '08:00').split(':').map(Number);
    setHour(h!);
    setMinute(m!);
    setEditing(index);
  };
  const year = month.getFullYear();
  const monthIndex = month.getMonth();
  const firstDay = new Date(year, monthIndex, 1).getDay();
  const dayCount = new Date(year, monthIndex + 1, 0).getDate();
  return (
    <View style={styles.fields}>
      {(['startDate', 'endDate'] as const).map(field => (
        <View key={field} style={styles.fields}>
          <Text style={styles.label}>
            {field === 'startDate' ? '복용 시작일' : '복용 종료일 (선택)'}
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={
              field === 'startDate' ? '복용 시작일 선택' : '복용 종료일 선택'
            }
            disabled={disabled}
            onPress={() => openDate(field)}
            style={[styles.input, disabled && styles.dim]}
          >
            <Text style={styles.text}>
              {value[field] ? value[field].replace(/-/g, '. ') : '종료일 없음'}
            </Text>
            <Text style={styles.link}>달력</Text>
          </Pressable>
        </View>
      ))}
      <Text style={styles.label}>매일 복용 시간</Text>
      <Text style={styles.hint}>한국 시간 기준 · 하루 최대 12개</Text>
      {times.map((time, index) => (
        <View key={`${index}-${time}`} style={styles.row}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${displayTime(time)} 복용 시간 수정`}
            disabled={disabled}
            onPress={() => openTime(index)}
            style={[styles.input, styles.flex, disabled && styles.dim]}
          >
            <Text style={styles.text}>{displayTime(time)}</Text>
            {!disabled && <Text style={styles.link}>변경</Text>}
          </Pressable>
          {!disabled && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`${displayTime(time)} 복용 시간 삭제`}
              onPress={() =>
                onChange({
                  times: times.filter((_, i) => i !== index).join(', '),
                })
              }
              style={styles.action}
            >
              <Text style={styles.hint}>삭제</Text>
            </Pressable>
          )}
        </View>
      ))}
      {!disabled && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="복용 시간 추가"
          disabled={times.length >= 12}
          onPress={() => openTime(times.length)}
          style={[styles.add, times.length >= 12 && styles.dim]}
        >
          <Text style={styles.link}>＋ 복용 시간 추가</Text>
        </Pressable>
      )}
      {!times.length && (
        <Text style={styles.hint}>복용 시간을 하나 이상 추가해 주세요.</Text>
      )}
      <Modal
        visible={dateField !== undefined && !disabled}
        transparent
        animationType="fade"
        onRequestClose={() => setDateField(undefined)}
      >
        <View style={styles.overlay}>
          <View style={styles.dialog} accessibilityViewIsModal>
            <ScrollView contentContainerStyle={styles.fields}>
              <View style={styles.row}>
                <Text style={[styles.title, styles.flex]}>
                  {dateField === 'startDate' ? '복용 시작일' : '복용 종료일'}
                </Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="달력 닫기"
                  onPress={() => setDateField(undefined)}
                  style={styles.action}
                >
                  <Text style={styles.link}>닫기</Text>
                </Pressable>
              </View>
              <View style={styles.row}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="이전 달"
                  onPress={() => setMonth(new Date(year, monthIndex - 1, 1))}
                  style={styles.action}
                >
                  <Text style={styles.title}>‹</Text>
                </Pressable>
                <Text style={[styles.month, styles.flex]}>
                  {year}년 {monthIndex + 1}월
                </Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="다음 달"
                  onPress={() => setMonth(new Date(year, monthIndex + 1, 1))}
                  style={styles.action}
                >
                  <Text style={styles.title}>›</Text>
                </Pressable>
              </View>
              <View style={styles.grid}>
                {['일', '월', '화', '수', '목', '금', '토'].map(day => (
                  <Text key={day} style={styles.weekday}>
                    {day}
                  </Text>
                ))}
              </View>
              <View style={styles.grid}>
                {Array.from(
                  { length: Math.ceil((firstDay + dayCount) / 7) * 7 },
                  (_, index) => {
                    const day = index - firstDay + 1;
                    if (day < 1 || day > dayCount)
                      return <View key={index} style={styles.day} />;
                    const date = `${year}-${pad(monthIndex + 1)}-${pad(day)}`;
                    const unavailable =
                      dateField === 'endDate' && date < value.startDate;
                    const selected = !!dateField && value[dateField] === date;
                    return (
                      <Pressable
                        key={index}
                        accessibilityRole="button"
                        accessibilityLabel={`${year}년 ${
                          monthIndex + 1
                        }월 ${day}일`}
                        accessibilityState={{ selected, disabled: unavailable }}
                        disabled={unavailable}
                        style={[
                          styles.day,
                          selected && styles.selected,
                          unavailable && styles.dim,
                        ]}
                        onPress={() => {
                          if (!dateField) return;
                          // 작성자: 김진우 — 시작일 변경으로 종료일이 역전되면 종료일을 다시 선택하도록 비운다.
                          onChange(
                            dateField === 'startDate'
                              ? {
                                  startDate: date,
                                  ...(value.endDate && value.endDate < date
                                    ? { endDate: '' }
                                    : {}),
                                }
                              : { endDate: date },
                          );
                          setDateField(undefined);
                        }}
                      >
                        <Text style={styles.text}>{day}</Text>
                      </Pressable>
                    );
                  },
                )}
              </View>
              <Text style={styles.hint}>
                {dateField === 'endDate'
                  ? '시작일 이후의 날짜를 선택해 주세요. 시작일과 같은 날도 가능해요.'
                  : '시작일을 종료일 이후로 바꾸면 종료일은 해제돼요.'}
              </Text>
              {dateField === 'endDate' && (
                <Pressable
                  accessibilityRole="button"
                  onPress={() => {
                    onChange({ endDate: '' });
                    setDateField(undefined);
                  }}
                  style={styles.add}
                >
                  <Text style={styles.link}>종료일 없이 복용</Text>
                </Pressable>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
      <Modal
        visible={editing !== undefined && !disabled}
        onShow={() => {
          hoursList.current?.scrollTo({
            y: ((hour % 12 || 12) - 1) * 48,
            animated: false,
          });
          minutesList.current?.scrollTo({ y: minute * 48, animated: false });
        }}
        transparent
        animationType="fade"
        onRequestClose={() => setEditing(undefined)}
      >
        <View style={styles.overlay}>
          <View style={styles.dialog} accessibilityViewIsModal>
            <View style={styles.row}>
              <Text style={[styles.title, styles.flex]}>복용 시간 선택</Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="시간 선택 취소"
                onPress={() => setEditing(undefined)}
                style={styles.action}
              >
                <Text style={styles.link}>취소</Text>
              </Pressable>
            </View>
            <Text style={styles.month}>{displayTime(selectedTime)}</Text>
            <View style={styles.row}>
              <View style={styles.flex}>
                {['오전', '오후'].map((label, index) => (
                  <Pressable
                    key={label}
                    accessibilityRole="button"
                    accessibilityLabel={label}
                    accessibilityState={{
                      selected: Math.floor(hour / 12) === index,
                    }}
                    onPress={() => setHour((hour % 12) + index * 12)}
                    style={[
                      styles.timeOption,
                      Math.floor(hour / 12) === index && styles.selected,
                    ]}
                  >
                    <Text style={styles.text}>{label}</Text>
                  </Pressable>
                ))}
              </View>
              <ScrollView
                key={`hours-${editing}`}
                ref={hoursList}
                style={styles.timeColumn}
                contentOffset={{ x: 0, y: ((hour % 12 || 12) - 1) * 48 }}
              >
                {Array.from({ length: 12 }, (_, index) => index + 1).map(h => (
                  <Pressable
                    key={h}
                    accessibilityRole="button"
                    accessibilityLabel={`${h}시`}
                    accessibilityState={{ selected: (hour % 12 || 12) === h }}
                    onPress={() =>
                      setHour((h % 12) + Math.floor(hour / 12) * 12)
                    }
                    style={[
                      styles.timeOption,
                      (hour % 12 || 12) === h && styles.selected,
                    ]}
                  >
                    <Text style={styles.text}>{h}시</Text>
                  </Pressable>
                ))}
              </ScrollView>
              <ScrollView
                key={`minutes-${editing}`}
                ref={minutesList}
                style={styles.timeColumn}
                contentOffset={{ x: 0, y: minute * 48 }}
              >
                {Array.from({ length: 60 }, (_, m) => (
                  <Pressable
                    key={m}
                    accessibilityRole="button"
                    accessibilityLabel={`${pad(m)}분`}
                    accessibilityState={{ selected: minute === m }}
                    onPress={() => setMinute(m)}
                    style={[styles.timeOption, minute === m && styles.selected]}
                  >
                    <Text style={styles.text}>{pad(m)}분</Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
            {duplicate && (
              <Text accessibilityRole="alert" style={styles.error}>
                이미 추가한 시간이에요. 다른 시간을 선택해 주세요.
              </Text>
            )}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="선택한 복용 시간 저장"
              disabled={duplicate}
              style={[styles.add, duplicate && styles.dim]}
              onPress={() => {
                if (editing === undefined || duplicate) return;
                const next = [...times];
                next[editing] = selectedTime;
                onChange({ times: next.sort().join(', ') });
                setEditing(undefined);
              }}
            >
              <Text style={styles.link}>
                {editing === times.length ? '이 시간 추가' : '변경 완료'}
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  fields: { gap: 10 },
  label: { fontSize: 13, fontWeight: '700', color: colors.text },
  text: { fontSize: 15, fontWeight: '600', color: colors.text },
  link: { fontSize: 14, fontWeight: '700', color: colors.primaryDark },
  hint: { fontSize: 12, color: colors.textMuted, lineHeight: 18 },
  title: { fontSize: 19, fontWeight: '800', color: colors.text },
  month: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
  },
  input: {
    minHeight: 56,
    borderRadius: 16,
    backgroundColor: colors.surfaceMuted,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  flex: { flex: 1 },
  action: {
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  add: {
    minHeight: 48,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  overlay: {
    flex: 1,
    justifyContent: 'center',
    padding: 16,
    backgroundColor: '#10282088',
  },
  dialog: {
    width: '100%',
    maxWidth: 420,
    maxHeight: '90%',
    alignSelf: 'center',
    padding: 16,
    gap: 12,
    borderRadius: 24,
    backgroundColor: colors.surface,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  weekday: { width: '14.2857%', textAlign: 'center', color: colors.textMuted },
  day: {
    width: '14.2857%',
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
  },
  selected: { backgroundColor: '#BCEBD9' },
  dim: { opacity: 0.35 },
  timeColumn: { flex: 1, height: 192 },
  timeOption: {
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
  },
  error: { fontSize: 12, color: colors.danger },
});
