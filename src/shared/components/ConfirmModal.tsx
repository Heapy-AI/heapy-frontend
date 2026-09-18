// 작성자: 김진우 — 취소·확인·처리 중·실패 상태를 제공하는 공통 확인 모달.
import React from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { colors } from '../theme/tokens';
import { useReducedMotion } from '../hooks/useReducedMotion';

type Props = {
  visible: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  pending?: boolean;
  allowCancel?: boolean;
  pendingLabel?: string;
  tone?: 'primary' | 'danger';
  error?: string;
  onCancel: () => void;
  onConfirm: () => void;
};
export function ConfirmModal({
  visible,
  title,
  description,
  confirmLabel,
  pending,
  allowCancel = true,
  pendingLabel,
  tone = 'primary',
  error,
  onCancel,
  onConfirm,
}: Props) {
  const reduced = useReducedMotion();
  return (
    <Modal
      transparent
      visible={visible}
      animationType={reduced ? 'none' : 'fade'}
      onRequestClose={() => {
        if (!pending && allowCancel) onCancel();
      }}
    >
      <View style={[s.overlay, tone === 'danger' && s.dangerOverlay]}>
        <View
          testID="confirmation-card"
          accessibilityViewIsModal
          style={s.card}
        >
          <ScrollView contentContainerStyle={s.content} bounces={false}>
            <Text accessibilityRole="header" style={s.title}>
              {title}
            </Text>
            <Text style={s.description}>{description}</Text>
            {!!error && (
              <Text accessibilityRole="alert" style={s.error}>
                {error}
              </Text>
            )}
            <View style={s.actions}>
              {allowCancel && (
                <Pressable
                  accessibilityRole="button"
                  disabled={pending}
                  onPress={onCancel}
                  style={({ pressed }) => [
                    s.button,
                    s.cancel,
                    pressed && s.pressed,
                    pending && s.disabled,
                  ]}
                >
                  <Text style={s.cancelText}>취소</Text>
                </Pressable>
              )}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={
                  pending && pendingLabel ? pendingLabel : confirmLabel
                }
                accessibilityState={{ disabled: !!pending, busy: !!pending }}
                disabled={pending}
                onPress={onConfirm}
                style={({ pressed }) => [
                  s.button,
                  s.confirm,
                  tone === 'danger' && s.dangerButton,
                  pressed && s.pressed,
                  pending && s.disabled,
                ]}
              >
                {pending ? (
                  <View style={s.pendingContent}>
                    <ActivityIndicator color="white" />
                    {!!pendingLabel && (
                      <Text
                        accessibilityLiveRegion="polite"
                        style={s.confirmText}
                      >
                        {pendingLabel}
                      </Text>
                    )}
                  </View>
                ) : (
                  <Text style={s.confirmText}>{confirmLabel}</Text>
                )}
              </Pressable>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
const s = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#12352B66',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 400,
    maxHeight: '90%',
    backgroundColor: colors.surface,
    borderRadius: 28,
    overflow: 'hidden',
  },
  content: { padding: 24, gap: 16 },
  title: {
    color: colors.text,
    fontSize: 21,
    lineHeight: 30,
    fontWeight: '700',
  },
  description: { color: colors.textMuted, fontSize: 14, lineHeight: 22 },
  error: { color: colors.danger, fontSize: 13, lineHeight: 20 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 8 },
  button: {
    flexGrow: 1,
    flexBasis: 110,
    minHeight: 50,
    padding: 12,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancel: { backgroundColor: colors.surfaceMuted },
  confirm: { backgroundColor: colors.primaryDark },
  dangerButton: { backgroundColor: '#C93636' },
  dangerOverlay: { backgroundColor: '#1B123D80' },
  pendingContent: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cancelText: { color: colors.text, fontSize: 15, fontWeight: '600' },
  confirmText: { color: 'white', fontSize: 15, fontWeight: '700' },
  pressed: { opacity: 0.8 },
  disabled: { opacity: 0.6 },
});
