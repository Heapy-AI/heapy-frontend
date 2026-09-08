import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { colors } from '../theme/tokens';
export function ChoicePill({
  label,
  selected,
  onPress,
  flex = false,
  compact = false,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  flex?: boolean;
  compact?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      aria-pressed={selected}
      onPress={onPress}
      style={[
        styles.pill,
        compact && styles.compact,
        flex && styles.flex,
        selected && styles.selected,
      ]}
    >
      <Text
        numberOfLines={1}
        style={[
          styles.text,
          selected && styles.selectedText,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}
const styles = StyleSheet.create({
  pill: {
    flexShrink: 0,
    minHeight: 48,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  flex: { flex: 1 },
  compact: { paddingHorizontal: 6 },
  selected: { backgroundColor: '#ECF8F4', borderColor: colors.primary },
  text: { fontSize: 12, fontWeight: '700', color: colors.textMuted },
  selectedText: { color: colors.primaryDark },
});
