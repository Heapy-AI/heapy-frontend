// 작성자: 고수연 — 삼성 헬스 개발자 모드 설정 안내.
//
// 지금은 연결이 막히면 "삼성 헬스의 데이터 읽기 개발자 모드 또는 앱 등록 정보를 확인해
// 주세요."라는 한 줄만 나온다. 개발자 모드가 무엇인지, 어디서 켜는지 모르는 사람에게는
// 막다른 길이다. 얼리액세스라 해도 여기서 대부분이 이탈한다.
//
// 그래서 방법을 그림과 함께 보여 주고, 삼성 헬스까지 데려다준다. 돌아오면 권한 요청이
// 저절로 다시 뜬다(DataConnectionScreen).
// 삼성 파트너십이 통과되면 해당 기능을 다시 없애는 논의가 필요하다.
import React, { useState } from 'react';
import {
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { colors } from '../../shared/theme/tokens';
import { openSamsungHealth } from './samsungHealth';

// 작성자: 김진우 — 정보 화면으로 직접 이동한 뒤 진행할 설정 순서다.
const STEPS = [
  '아래 “설정하러 가기”를 눌러 “삼성 헬스 정보” 화면을 엽니다.',
  '“버전” 항목을 10번 연속 누릅니다.',
  '“개발자 모드”로 전환되었는지 확인합니다.',
];

export function SamsungSetupGuide({
  visible,
  onClose,
  onLeave,
}: {
  visible: boolean;
  onClose: () => void;
  // 삼성 헬스로 나갔음을 알린다. 부모가 돌아오는 순간을 지켜보다 권한 요청을 다시 띄운다.
  onLeave?: () => void;
}) {
  const [error, setError] = useState('');
  const open = async () => {
    setError('');
    try {
      await openSamsungHealth();
      onLeave?.();
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : '삼성 헬스를 열지 못했어요.',
      );
    }
  };
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <ScrollView
            contentContainerStyle={styles.body}
            showsVerticalScrollIndicator={false}
          >
            <Text style={styles.title}>삼성 헬스 연동 방법</Text>
            {STEPS.map((step, index) => (
              <View key={step} style={styles.step}>
                <View style={styles.badge}>
                  <Text style={styles.badgeLabel}>{index + 1}</Text>
                </View>
                <Text style={styles.stepLabel}>{step}</Text>
              </View>
            ))}
            <Text style={styles.caption}>
              홈 화면이 열리면 오른쪽 위 ⋮ → 설정 → 삼성 헬스 정보로 들어가
              주세요.
            </Text>
            <Image
              accessibilityLabel="삼성 헬스 정보 화면에서 버전 항목을 10번 누르는 위치"
              source={require('../../assets/images/samsung-health-developer-mode.jpg')}
              style={styles.shot}
              resizeMode="contain"
            />
            <Text style={styles.caption}>
              “Samsung Health 정보” 화면의 버전 글자를 10번 누르면 개발자 모드가
              나타나요.
            </Text>
            {!!error && (
              <Text accessibilityRole="alert" style={styles.error}>
                {error}
              </Text>
            )}
          </ScrollView>
          <View style={styles.actions}>
            <Pressable
              accessibilityRole="button"
              onPress={onClose}
              style={[styles.button, styles.ghost]}
            >
              <Text style={styles.ghostLabel}>닫기</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={open}
              style={[styles.button, styles.primary]}
            >
              <Text style={styles.primaryLabel}>설정하러 가기</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(12,32,27,0.55)',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 22,
    paddingBottom: 16,
    maxHeight: '86%',
    gap: 12,
  },
  body: { gap: 12, paddingBottom: 4 },
  title: { fontSize: 19, fontWeight: '800', color: colors.text },
  step: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  badge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#E8F2ED',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  badgeLabel: { fontSize: 11, fontWeight: '800', color: colors.primaryDark },
  stepLabel: { flex: 1, fontSize: 14, lineHeight: 21, color: colors.text },
  shot: {
    width: '100%',
    aspectRatio: 0.52,
    maxHeight: 320,
    alignSelf: 'center',
    borderRadius: 16,
    backgroundColor: '#F4F7F6',
  },
  caption: { fontSize: 12, lineHeight: 18, color: colors.textMuted },
  error: { fontSize: 13, lineHeight: 20, color: colors.danger },
  actions: { flexDirection: 'row', gap: 10 },
  button: {
    flex: 1,
    minHeight: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ghost: { backgroundColor: '#EDF4F1' },
  ghostLabel: { fontSize: 15, fontWeight: '700', color: colors.primaryDark },
  primary: { backgroundColor: colors.primary },
  primaryLabel: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },
});
