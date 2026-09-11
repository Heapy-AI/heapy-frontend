import React, { PropsWithChildren } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { chatColors, colors } from '../theme/tokens';

export function ScreenBackground({
  children,
  enabled = true,
  theme = 'default',
}: PropsWithChildren<{ enabled?: boolean; theme?: 'default' | 'chat' }>) {
  return (
    <SafeAreaView
      edges={enabled ? undefined : []}
      testID={theme === 'chat' ? 'chat-safe-area' : undefined}
      style={[
        styles.safe,
        theme === 'chat' && styles.chat,
        !enabled && styles.transparent,
      ]}
    >
      {enabled && theme === 'default' && (
        <View pointerEvents="none" style={styles.decoration}>
          <View style={styles.greenCircle} />
          <View style={styles.blueCircle} />
        </View>
      )}
      <View style={styles.content}>{children}</View>
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  decoration: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    overflow: 'hidden',
  },
  transparent: { backgroundColor: 'transparent' },
  chat: { backgroundColor: chatColors.surface },
  safe: { flex: 1, backgroundColor: colors.background, overflow: 'hidden' },
  content: {
    flex: 1,
    minHeight: 0,
    width: '100%',
    maxWidth: 720,
    alignSelf: 'center',
  },
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
