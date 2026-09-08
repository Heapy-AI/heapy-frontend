import React from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
} from 'react-native';
import { colors } from '../theme/tokens';
import { InputVisibilityContext } from './KeyboardAwareScrollView';

export function FormField({
  label,
  error,
  style,
  onFocus,
  ...props
}: TextInputProps & { label: string; error?: string }) {
  const reveal = React.useContext(InputVisibilityContext);
  const input = React.useRef<TextInput>(null);
  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        ref={input}
        placeholderTextColor="#9AA9A4"
        {...props}
        accessibilityLabel={props.accessibilityLabel ?? label}
        style={[
          styles.input,
          props.multiline && styles.multiline,
          error && styles.invalid,
          style,
        ]}
        onFocus={event => {
          onFocus?.(event);
          reveal(input.current);
        }}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}
const styles = StyleSheet.create({
  wrap: { gap: 8 },
  label: { fontSize: 13, fontWeight: '700', color: colors.text },
  input: {
    height: 58,
    borderRadius: 18,
    backgroundColor: colors.surfaceMuted,
    paddingHorizontal: 18,
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  invalid: { borderColor: colors.danger },
  multiline: { height: 116, paddingVertical: 16, textAlignVertical: 'top' },
  error: { fontSize: 12, color: colors.danger },
});
