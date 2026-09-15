import React, { useState } from 'react';
import {
  Linking,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { connectMedicationPush } from './medicationPush';
import { colors } from '../../shared/theme/tokens';

// 작성자: 김진우 — 권한 거부 후에도 복약 기능은 유지하며 사용자가 연결을 재시도한다.
export function MedicationPushCard() {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('복약 시간에 알림을 받아보세요.');
  if (Platform.OS !== 'android') return null;
  return (
    <View style={s.card}>
      <View style={s.row}>
        <Text style={s.title}>복약 알림</Text>
        <Pressable
          accessibilityRole="button"
          disabled={busy}
          onPress={async () => {
            setBusy(true);
            try {
              await connectMedicationPush(true);
              setMessage('알림이 연결됐어요. 복약 시간에 알려드릴게요.');
            } catch (error) {
              setMessage(
                error instanceof Error
                  ? error.message
                  : '알림 연결에 실패했어요. 다시 시도해 주세요.',
              );
            } finally {
              setBusy(false);
            }
          }}
        >
          <Text style={s.link}>{busy ? '연결 중…' : '알림 연결'}</Text>
        </Pressable>
      </View>
      <Text style={s.message}>{message}</Text>
      <Pressable
        accessibilityRole="button"
        onPress={() => {
          void Linking.openSettings();
        }}
      >
        <Text style={s.settings}>휴대폰 알림 설정</Text>
      </Pressable>
    </View>
  );
}
const s = StyleSheet.create({
  card: {
    backgroundColor: '#F0FAF6',
    padding: 16,
    borderRadius: 18,
    marginBottom: 16,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: { fontWeight: '700', color: colors.text },
  link: { color: colors.primary, fontWeight: '700', padding: 8 },
  message: { fontSize: 13, color: colors.text, lineHeight: 20 },
  settings: { fontSize: 12, color: colors.primary, paddingTop: 10 },
});
