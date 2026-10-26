import React, { useState } from "react";
import { TextInput, View, Text, StyleSheet, TextInputProps, Pressable } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { colors, radius, spacing } from "@/src/shared/theme/legacy";

type Props = TextInputProps & { label?: string; error?: string };

export function Input({ label, error, style, secureTextEntry, ...rest }: Props) {
  const [visible, setVisible] = useState(false);
  return (
    <View style={styles.wrap}>
      {label ? <Text testID={rest.testID ? `${rest.testID}-label` : undefined} style={styles.label}>{label}</Text> : null}
      <View style={styles.field}>
        <TextInput
        placeholderTextColor={colors.muted}
        {...rest}
        secureTextEntry={!!secureTextEntry && !visible}
        autoCapitalize={secureTextEntry ? "none" : rest.autoCapitalize}
        autoCorrect={secureTextEntry ? false : rest.autoCorrect}
        accessibilityLabel={rest.accessibilityLabel || label}
        style={[styles.input, error ? { borderColor: colors.error } : null, style, secureTextEntry && styles.password]}
      />
        {secureTextEntry && <Pressable testID={rest.testID ? `${rest.testID}-visibility` : undefined} accessibilityRole="button" accessibilityLabel={`${visible ? "Ocultar" : "Mostrar"} ${label?.toLowerCase() || "palavra-passe"}`} onPress={() => setVisible(value => !value)} style={styles.visibility}>
          <Ionicons name={visible ? "eye-off-outline" : "eye-outline"} size={22} color={colors.muted} />
        </Pressable>}
      </View>
      {error ? <Text testID={rest.testID ? `${rest.testID}-error` : undefined} style={styles.err}>{error}</Text> : null}
    </View>
  );
}
const styles = StyleSheet.create({
  wrap: { gap: 6 },
  field: { position: "relative" },
  password: { paddingRight: 54 },
  visibility: { position: "absolute", right: 0, top: 0, bottom: 0, minWidth: 48, minHeight: 44, alignItems: "center", justifyContent: "center" },
  label: { fontSize: 13, color: colors.onSurfaceTertiary, fontWeight: "600" },
  input: {
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.onSurface,
  },
  err: { color: colors.error, fontSize: 12 },
});
