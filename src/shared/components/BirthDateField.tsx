import React, { useState } from 'react';
import {
  Keyboard,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { colors } from '../theme/tokens';
import { formatBirthDate } from '../utils/birthDate';

export function BirthDateField({
  value,
  onChange,
  error,
}: {
  value: string;
  onChange: (value: string) => void;
  error?: string;
}) {
  const today = new Date();
  const [visible, setVisible] = useState(false);
  const [year, setYear] = useState(today.getFullYear() - 25);
  const [month, setMonth] = useState(0);
  const [mode, setMode] = useState<'days' | 'years' | 'months'>('days');
  const open = () => {
    Keyboard.dismiss();
    const parts = value.split('-').map(Number);
    setYear(parts[0] || today.getFullYear() - 25);
    setMonth(parts[1] ? parts[1] - 1 : 0);
    setMode('days');
    setVisible(true);
  };
  const firstDay = new Date(year, month, 1).getDay();
  const days = new Date(year, month + 1, 0).getDate();
  const changeMonth = (delta: number) => {
    const next = new Date(year, month + delta, 1);
    setYear(next.getFullYear());
    setMonth(next.getMonth());
  };
  return (
    <View style={styles.field}>
      <Text style={styles.label}>생년월일</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="생년월일 선택"
        onPress={open}
        style={[styles.input, error && styles.invalid]}
      >
        <Text style={value ? styles.value : styles.placeholder}>
          {value
            ? value.replace('-', '년 ').replace('-', '월 ') + '일'
            : '달력에서 생년월일 선택'}
        </Text>
        <Text style={styles.icon}>▦</Text>
      </Pressable>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Modal
        visible={visible}
        transparent
        animationType="fade"
        onRequestClose={() => setVisible(false)}
      >
        <View style={styles.overlay}>
          <View style={styles.dialog} accessibilityViewIsModal>
            <View style={styles.header}>
              <Text style={styles.title}>생년월일 선택</Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="달력 닫기"
                onPress={() => setVisible(false)}
                style={styles.close}
              >
                <Text style={styles.value}>닫기</Text>
              </Pressable>
            </View>
            <View style={styles.header}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="이전 달"
                disabled={year === 1900 && month === 0}
                onPress={() => changeMonth(-1)}
                style={styles.arrow}
              >
                <Text style={styles.title}>‹</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="연도 선택"
                onPress={() => setMode('years')}
                style={styles.selector}
              >
                <Text style={styles.value}>{year}년 ▾</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="월 선택"
                onPress={() => setMode('months')}
                style={styles.selector}
              >
                <Text style={styles.value}>{month + 1}월 ▾</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="다음 달"
                disabled={
                  year === today.getFullYear() && month >= today.getMonth()
                }
                onPress={() => changeMonth(1)}
                style={styles.arrow}
              >
                <Text style={styles.title}>›</Text>
              </Pressable>
            </View>
            {mode === 'years' ? (
              <ScrollView
                style={styles.optionsScroll}
                contentContainerStyle={styles.options}
                showsVerticalScrollIndicator={false}
              >
                {Array.from(
                  { length: today.getFullYear() - 1899 },
                  (_, i) => today.getFullYear() - i,
                ).map(item => (
                  <Pressable
                    key={item}
                    accessibilityRole="button"
                    onPress={() => {
                      setYear(item);
                      setMonth(current =>
                        item === today.getFullYear()
                          ? Math.min(current, today.getMonth())
                          : current,
                      );
                      setMode('months');
                    }}
                    style={styles.option}
                  >
                    <Text style={styles.value}>{item}년</Text>
                  </Pressable>
                ))}
              </ScrollView>
            ) : mode === 'months' ? (
              <View style={styles.options}>
                {Array.from({ length: 12 }, (_, i) => i).map(item => (
                  <Pressable
                    key={item}
                    accessibilityRole="button"
                    disabled={
                      year === today.getFullYear() && item > today.getMonth()
                    }
                    onPress={() => {
                      setMonth(item);
                      setMode('days');
                    }}
                    style={styles.option}
                  >
                    <Text style={styles.value}>{item + 1}월</Text>
                  </Pressable>
                ))}
              </View>
            ) : (
              <View>
                <View style={styles.week}>
                  {['일', '월', '화', '수', '목', '금', '토'].map(day => (
                    <Text key={day} style={styles.weekday}>
                      {day}
                    </Text>
                  ))}
                </View>
                <View style={styles.grid}>
                  {Array.from(
                    { length: Math.ceil((firstDay + days) / 7) * 7 },
                    (_, i) => {
                      const day = i - firstDay + 1;
                      if (day < 1 || day > days)
                        return <View key={i} style={styles.day} />;
                      const date = formatBirthDate(year, month, day);
                      const future =
                        date >
                        formatBirthDate(
                          today.getFullYear(),
                          today.getMonth(),
                          today.getDate(),
                        );
                      return (
                        <Pressable
                          key={i}
                          accessibilityRole="button"
                          accessibilityLabel={`${year}년 ${
                            month + 1
                          }월 ${day}일`}
                          accessibilityState={{
                            selected: value === date,
                            disabled: future,
                          }}
                          disabled={future}
                          onPress={() => {
                            onChange(date);
                            setVisible(false);
                          }}
                          style={[
                            styles.day,
                            value === date && styles.selected,
                          ]}
                        >
                          <Text style={[styles.value, future && styles.dim]}>
                            {day}
                          </Text>
                        </Pressable>
                      );
                    },
                  )}
                </View>
              </View>
            )}
            <Text style={styles.help}>
              연도와 월을 선택한 뒤 날짜를 눌러 주세요.
            </Text>
          </View>
        </View>
      </Modal>
    </View>
  );
}
const styles = StyleSheet.create({
  field: { gap: 8 },
  label: { fontSize: 13, fontWeight: '700', color: colors.text },
  input: {
    minHeight: 58,
    borderRadius: 18,
    backgroundColor: colors.surfaceMuted,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  value: { fontSize: 14, fontWeight: '600', color: colors.text },
  placeholder: { fontSize: 14, color: colors.textMuted },
  icon: { fontSize: 24, color: colors.primary },
  invalid: { borderColor: colors.danger },
  error: { color: colors.danger, fontSize: 12 },
  overlay: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
    backgroundColor: '#10282088',
  },
  dialog: {
    width: '100%',
    maxWidth: 420,
    maxHeight: '90%',
    alignSelf: 'center',
    padding: 16,
    gap: 10,
    borderRadius: 24,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: { fontSize: 19, fontWeight: '800', color: colors.text },
  close: { minHeight: 44, paddingHorizontal: 8, justifyContent: 'center' },
  selector: { padding: 8, minHeight: 44, justifyContent: 'center' },
  arrow: {
    width: 36,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionsScroll: { maxHeight: 300 },
  options: { flexDirection: 'row', flexWrap: 'wrap' },
  option: {
    width: '33.333%',
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  week: { flexDirection: 'row' },
  weekday: {
    width: '14.2857%',
    textAlign: 'center',
    color: colors.textMuted,
    fontSize: 12,
    paddingVertical: 8,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  day: {
    width: '14.2857%',
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
  },
  selected: { backgroundColor: '#BCEBD9' },
  dim: { opacity: 0.3 },
  help: {
    fontSize: 11,
    color: colors.textMuted,
    textAlign: 'center',
    paddingVertical: 8,
  },
});
