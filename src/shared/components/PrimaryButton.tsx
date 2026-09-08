import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';

export function PrimaryButton({
  label,
  onPress,
  disabled,
  loading,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled || loading}
      onPress={onPress}
      style={({ pressed }) => [
        styles.wrap,
        (disabled || loading) && styles.disabled,
        pressed && styles.pressed,
      ]}
    >
      <LinearGradient
        colors={['#20BA8A', '#4285F4']}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={styles.button}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.label}>{label}</Text>
        )}
      </LinearGradient>
    </Pressable>
  );
}
const styles = StyleSheet.create({
  wrap: { borderRadius: 18, overflow: 'hidden' },
  button: { height: 60, alignItems: 'center', justifyContent: 'center' },
  label: { color: '#fff', fontSize: 16, fontWeight: '700' },
  disabled: { opacity: 0.45 },
  pressed: { opacity: 0.85 },
});
