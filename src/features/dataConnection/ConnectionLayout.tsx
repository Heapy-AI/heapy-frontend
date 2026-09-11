import React, { PropsWithChildren } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { ScreenBackground } from '../../shared/components/ScreenBackground';
import { KeyboardAwareScrollView } from '../../shared/components/KeyboardAwareScrollView';
import { colors } from '../../shared/theme/tokens';
import { useResponsiveLayout } from '../../shared/hooks/useResponsiveLayout';

export function ConnectionLayout({
  title,
  onBack,
  children,
  footer,
}: PropsWithChildren<{
  title: string;
  onBack?: () => void;
  footer?: React.ReactNode;
}>) {
  const { padding } = useResponsiveLayout();
  return (
    <ScreenBackground>
      <View style={connectionStyles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="이전 화면"
          onPress={onBack}
          disabled={!onBack}
          style={connectionStyles.back}
        >
          <Text style={connectionStyles.backText}>{onBack ? '‹' : ''}</Text>
        </Pressable>
        <Text style={connectionStyles.headerTitle}>{title}</Text>
        <View style={connectionStyles.back} />
      </View>
      <KeyboardAvoidingView
        style={connectionStyles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <KeyboardAwareScrollView
          contentContainerStyle={[
            connectionStyles.content,
            { paddingHorizontal: padding },
          ]}
        >
          {children}
        </KeyboardAwareScrollView>
        {footer && (
          <View
            style={[connectionStyles.footer, { paddingHorizontal: padding }]}
          >
            {footer}
          </View>
        )}
      </KeyboardAvoidingView>
    </ScreenBackground>
  );
}
export const connectionStyles = StyleSheet.create({
  flex: { flex: 1 },
  section: { gap: 16 },
  header: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  back: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backText: { fontSize: 34, color: colors.text },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
  },
  content: { padding: 24, gap: 20, paddingBottom: 32 },
  eyebrow: {
    color: colors.primaryDark,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
  },
  headline: {
    color: colors.text,
    fontSize: 28,
    lineHeight: 38,
    fontWeight: '800',
  },
  description: { color: colors.textMuted, fontSize: 14, lineHeight: 22 },
  card: {
    borderRadius: 24,
    backgroundColor: colors.surface,
    padding: 20,
    gap: 14,
  },
  cardTitle: { color: colors.text, fontWeight: '700', fontSize: 18 },
  footer: { paddingHorizontal: 24, paddingBottom: 16, paddingTop: 8, gap: 4 },
  textButton: { paddingVertical: 14, minHeight: 48, alignItems: 'center' },
  textButtonLabel: { color: colors.textMuted, fontSize: 14, fontWeight: '600' },
  error: { color: colors.danger, fontSize: 13, lineHeight: 20 },
  badge: { color: colors.primaryDark, fontSize: 12, fontWeight: '700' },
});
