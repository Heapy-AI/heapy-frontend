// 작성자: 김진우 — 홈 브리핑과 내 건강 분석이 같은 상세 모달 디자인을 공유한다.
import React from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';

type Section = { label?: string; metric?: string; text?: string };

export function AnalysisDetailModal({
  visible,
  title,
  body,
  sections = [],
  onClose,
}: {
  visible: boolean;
  title: string;
  body?: string;
  sections?: Section[];
  onClose: () => void;
}) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={s.overlay}>
        <ScrollView style={s.scroll} contentContainerStyle={s.card}>
          <Text accessibilityRole="header" style={s.heading}>
            {title}
          </Text>
          {!!body && <Text style={s.small}>{body}</Text>}
          {sections.map((section, index) => (
            <View key={index} style={s.section}>
              {typeof section.label === 'string' && (
                <Text style={s.rowTitle}>{section.label}</Text>
              )}
              {typeof section.metric === 'string' && (
                <Text style={s.small}>{section.metric}</Text>
              )}
              {typeof section.text === 'string' && (
                <Text style={s.small}>{section.text}</Text>
              )}
            </View>
          ))}
          <Pressable accessibilityRole="button" onPress={onClose}>
            <LinearGradient
              colors={['#14B995', '#25ABCF']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={s.action}
            >
              <Text style={s.whiteBold}>확인</Text>
            </LinearGradient>
          </Pressable>
        </ScrollView>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#122D2570',
  },
  scroll: { maxHeight: '80%' },
  card: {
    padding: 20,
    gap: 17,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: '#E0E9E3',
    backgroundColor: '#FFFFFF',
    boxShadow: '0px 7px 18px rgba(44, 135, 162, 0.10)',
  },
  heading: { fontSize: 16, fontWeight: '800', color: '#17342D' },
  rowTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#365148',
    flexShrink: 1,
  },
  small: { fontSize: 12, lineHeight: 18, color: '#617A70' },
  section: { gap: 6 },
  whiteBold: { fontSize: 14, fontWeight: '700', color: 'white' },
  action: {
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#FFFFFF66',
    boxShadow: '0px 6px 14px rgba(15, 171, 171, 0.22)',
  },
});
