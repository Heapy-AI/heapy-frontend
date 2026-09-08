import React, { PropsWithChildren } from 'react';
import {
  KeyboardAvoidingView,
  Animated,
  Easing,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { ScreenBackground } from './ScreenBackground';
import { colors } from '../theme/tokens';
import { KeyboardAwareScrollView } from './KeyboardAwareScrollView';
import { OnboardingShellContext } from './OnboardingShell';

export function OnboardingLayout({
  title,
  step,
  headline,
  description,
  onBack,
  children,
  footer,
}: PropsWithChildren<{
  title: string;
  step: number;
  headline: string;
  description?: string;
  onBack?: () => void;
  footer: React.ReactNode;
}>) {
  const shell = React.useContext(OnboardingShellContext);
  const transition = React.useRef(new Animated.Value(1)).current;
  React.useEffect(() => {
    if (!shell.step || shell.step !== step - 1) return;
    transition.setValue(shell.reducedMotion ? 1 : 0);
    const animation = Animated.timing(transition, {
      toValue: 1,
      duration: shell.reducedMotion ? 0 : 220,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: Platform.OS !== 'web',
    });
    animation.start();
    return () => animation.stop();
  }, [shell.step, shell.reducedMotion, step, transition]);
  return (
    <ScreenBackground enabled={!shell.step}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
      >
        {!shell.step && (
          <>
            <View style={styles.top}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="이전 단계"
                onPress={onBack}
                disabled={!onBack}
                style={styles.back}
              >
                <Text style={styles.backText}>{onBack ? '‹' : ''}</Text>
              </Pressable>
              <Text style={styles.title}>{title}</Text>
              <View style={styles.back} />
            </View>
            <View style={styles.progressRow}>
              <Text style={styles.progressText}>프로필 설정 {step}/6</Text>
            </View>
            <View style={styles.track}>
              <View style={[styles.fill, { width: `${(step / 6) * 100}%` }]} />
            </View>
          </>
        )}
        <Animated.View
          style={[
            styles.flex,
            {
              opacity: transition,
              transform: [
                {
                  translateX: transition.interpolate({
                    inputRange: [0, 1],
                    outputRange: [shell.direction * 12, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <KeyboardAwareScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.scroll}
          >
            <Text style={styles.headline}>{headline}</Text>
            {description ? (
              <Text style={styles.description}>{description}</Text>
            ) : null}
            <View style={styles.card}>{children}</View>
          </KeyboardAwareScrollView>
          <View style={styles.footer}>{footer}</View>
        </Animated.View>
      </KeyboardAvoidingView>
    </ScreenBackground>
  );
}
const styles = StyleSheet.create({
  flex: { flex: 1 },
  top: {
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
  },
  back: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backText: { fontSize: 36, lineHeight: 38, color: colors.text },
  title: { fontSize: 17, fontWeight: '700', color: colors.text },
  progressRow: { paddingHorizontal: 24 },
  progressText: { fontSize: 12, fontWeight: '700', color: colors.textMuted },
  track: {
    height: 6,
    marginHorizontal: 24,
    marginTop: 8,
    borderRadius: 3,
    backgroundColor: '#DCE8E4',
    overflow: 'hidden',
  },
  fill: { height: 6, backgroundColor: colors.primary, borderRadius: 3 },
  scroll: { padding: 24, paddingBottom: 32 },
  headline: {
    fontSize: 29,
    lineHeight: 38,
    fontWeight: '800',
    color: colors.text,
    marginTop: 4,
  },
  description: {
    fontSize: 13,
    color: colors.textMuted,
    fontWeight: '600',
    marginTop: 8,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 28,
    padding: 22,
    gap: 20,
    marginTop: 28,
  },
  footer: { paddingHorizontal: 24, paddingBottom: 16, paddingTop: 8 },
});
