import React, { PropsWithChildren } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../theme/tokens';

export function ScreenBackground({
  children,
  enabled = true,
}: PropsWithChildren<{ enabled?: boolean }>) {
  return (
    <SafeAreaView
      edges={enabled ? undefined : []}
      style={[styles.safe, !enabled && styles.transparent]}
    >
      {enabled && <View style={styles.greenCircle} />}
      {enabled && <View style={styles.blueCircle} />}
      <View style={styles.content}>{children}</View>
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  transparent: { backgroundColor: 'transparent' },
  safe: { flex: 1, backgroundColor: colors.background, overflow: 'hidden' },
  content: { flex: 1 },
  greenCircle: {
    position: 'absolute',
    width: 170,
    height: 170,
    borderRadius: 85,
    backgroundColor: '#E1F5EE',
    left: -80,
    top: -20,
  },
  blueCircle: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: '#E8F0FF',
    right: -95,
    top: 25,
  },
});
