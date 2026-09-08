import React, { useEffect, useRef } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Easing,
  Platform,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/routes';
import { ScreenBackground } from '../../shared/components/ScreenBackground';
import { PrimaryButton } from '../../shared/components/PrimaryButton';
import { colors } from '../../shared/theme/tokens';

export function ProfileCompleteScreen({
  navigation,
}: NativeStackScreenProps<RootStackParamList, 'ProfileComplete'>) {
  const appear = useRef(new Animated.Value(0)).current;
  const halo = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    let active = true;
    let animation: Animated.CompositeAnimation | undefined;
    AccessibilityInfo.isReduceMotionEnabled().then(reduced => {
      if (!active) return;
      if (reduced) {
        appear.setValue(1);
        halo.setValue(1);
        return;
      }
      animation = Animated.parallel([
        Animated.timing(appear, {
          toValue: 1,
          duration: 650,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: Platform.OS !== 'web',
        }),
        Animated.timing(halo, {
          toValue: 1,
          duration: 1100,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: Platform.OS !== 'web',
        }),
      ]);
      animation.start();
    });
    return () => {
      active = false;
      animation?.stop();
    };
  }, [appear, halo]);
  return (
    <ScreenBackground>
      <View style={styles.content}>
        <View style={styles.emblem}>
          <Animated.View
            style={[
              styles.halo,
              {
                opacity: halo.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.7, 0.15],
                }),
                transform: [
                  {
                    scale: halo.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.65, 1.45],
                    }),
                  },
                ],
              },
            ]}
          />
          <Animated.View
            style={[
              styles.checkCircle,
              {
                opacity: appear,
                transform: [
                  {
                    scale: appear.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.8, 1],
                    }),
                  },
                ],
              },
            ]}
          >
            <Text style={styles.check}>✓</Text>
          </Animated.View>
        </View>
        <Animated.View
          style={{
            opacity: appear,
            transform: [
              {
                translateY: appear.interpolate({
                  inputRange: [0, 1],
                  outputRange: [14, 0],
                }),
              },
            ],
          }}
        >
          <Text accessibilityRole="header" style={styles.title}>
            프로필 생성이{'\n'}완료되었어요!
          </Text>
          <Text style={styles.description}>
            이제 건강 데이터를 연결하고{'\n'}나에게 맞는 건강 관리를 시작해
            보세요.
          </Text>
        </Animated.View>
      </View>
      <View style={styles.footer}>
        <PrimaryButton
          label="건강 데이터 연결하기"
          onPress={() => navigation.replace('DataConnection')}
        />
      </View>
    </ScreenBackground>
  );
}
const styles = StyleSheet.create({
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  emblem: {
    width: 180,
    height: 180,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  halo: {
    width: 130,
    height: 130,
    borderRadius: 65,
    backgroundColor: colors.primary,
    position: 'absolute',
  },
  checkCircle: {
    width: 104,
    height: 104,
    borderRadius: 52,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  check: { fontSize: 52, fontWeight: '700', color: '#FFFFFF' },
  title: {
    textAlign: 'center',
    fontSize: 29,
    lineHeight: 40,
    fontWeight: '800',
    color: colors.text,
  },
  description: {
    marginTop: 16,
    textAlign: 'center',
    fontSize: 14,
    lineHeight: 23,
    color: colors.textMuted,
  },
  footer: { paddingHorizontal: 24, paddingBottom: 16 },
});
