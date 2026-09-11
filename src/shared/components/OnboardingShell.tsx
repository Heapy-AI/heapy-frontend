import React, {
  createContext,
  PropsWithChildren,
  useEffect,
  useRef,
  useState,
} from 'react';
import {
  AccessibilityInfo,
  Animated,
  Easing,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { RootRoute } from '../../navigation/routes';
import { ScreenBackground } from './ScreenBackground';
import { colors } from '../theme/tokens';
import { ScreenTransition } from './ScreenTransition';

const stages = ['BasicProfile', 'BodyProfile', 'Lifestyle', 'HealthBackground'];
const titles = ['기본 정보', '신체 정보', '생활 정보', '건강 배경'];
export const OnboardingShellContext = createContext({
  step: 0,
  direction: 1,
  reducedMotion: false,
});

export function OnboardingShell({
  route,
  onBack,
  children,
}: PropsWithChildren<{
  route: RootRoute;
  onBack: () => void;
}>) {
  const step = stages.indexOf(route) + 1;
  const previous = useRef(step);
  const direction = useRef(1);
  if (previous.current !== step) {
    direction.current = step > previous.current ? 1 : -1;
    previous.current = step;
  }
  const progress = useRef(new Animated.Value(step / 4)).current;
  const [reducedMotion, setReducedMotion] = useState(false);
  useEffect(() => {
    let active = true;
    AccessibilityInfo.isReduceMotionEnabled().then(value => {
      if (active) setReducedMotion(value);
    });
    const subscription = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      setReducedMotion,
    );
    return () => {
      active = false;
      subscription.remove();
    };
  }, []);
  useEffect(() => {
    const animation = Animated.timing(progress, {
      toValue: step / 4,
      duration: reducedMotion ? 0 : 300,
      easing: Easing.inOut(Easing.cubic),
      useNativeDriver: false,
    });
    animation.start();
    return () => animation.stop();
  }, [progress, reducedMotion, step]);
  return (
    <OnboardingShellContext.Provider
      value={{ step, direction: direction.current, reducedMotion }}
    >
      <ScreenBackground enabled={step > 0}>
        {step > 0 && (
          <View testID="onboarding-header">
            <View style={styles.top}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="이전 단계"
                disabled={step === 1}
                onPress={onBack}
                style={styles.back}
              >
                <Text style={styles.backText}>{step > 1 ? '‹' : ''}</Text>
              </Pressable>
              <Text style={styles.title}>{titles[step - 1]}</Text>
              <View style={styles.back} />
            </View>
            <Text style={styles.progressText}>프로필 설정 {step}/4</Text>
            <View
              accessibilityRole="progressbar"
              accessibilityLabel="온보딩 진행률"
              accessibilityValue={{ min: 0, max: 4, now: step }}
              style={styles.track}
            >
              <Animated.View
                testID="onboarding-progress-fill"
                style={[
                  styles.fill,
                  {
                    width: progress.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['0%', '100%'],
                    }),
                  },
                ]}
              />
            </View>
          </View>
        )}
        <ScreenTransition transitionKey={route} enabled={Platform.OS === 'web'}>
          {children}
        </ScreenTransition>
      </ScreenBackground>
    </OnboardingShellContext.Provider>
  );
}

const styles = StyleSheet.create({
  content: { flex: 1, minHeight: 0 },
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
  progressText: {
    paddingHorizontal: 24,
    fontSize: 12,
    fontWeight: '700',
    color: colors.textMuted,
  },
  track: {
    height: 6,
    marginHorizontal: 24,
    marginTop: 8,
    borderRadius: 3,
    backgroundColor: '#DCE8E4',
    overflow: 'hidden',
  },
  fill: { height: 6, borderRadius: 3, backgroundColor: colors.primary },
});
