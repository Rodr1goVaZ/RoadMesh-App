import React from "react";
import { TextInput, View, Text, StyleSheet, TextInputProps } from "react-native";
import { colors, radius, spacing } from "../theme";

type Props = TextInputProps & { label?: string; error?: string };

export function Input({ label, error, style, ...rest }: Props) {
  return (
    <View style={styles.wrap}>
      {label ? <Text testID={rest.testID ? `${rest.testID}-label` : undefined} style={styles.label}>{label}</Text> : null}
      <TextInput
        placeholderTextColor={colors.muted}
        {...rest}
        style={[styles.input, error ? { borderColor: colors.error } : null, style]}
      />
      {error ? <Text testID={rest.testID ? `${rest.testID}-error` : undefined} style={styles.err}>{error}</Text> : null}
    </View>
  );
}
const styles = StyleSheet.create({
  wrap: { gap: 6 },
  label: { fontSize: 13, color: colors.onSurfaceTertiary, fontWeight: "600" },
  input: {
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    fontSize: 15,
    color: colors.onSurface,
  },
  err: { color: colors.error, fontSize: 12 },
});
