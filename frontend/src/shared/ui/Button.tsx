import React, { useContext } from "react";
import { Pressable, Text, StyleSheet, ActivityIndicator, ViewStyle } from "react-native";
import { colors, radius, spacing } from "@/src/shared/theme/legacy";
import { PortalVisualContext, portalColors } from "@/src/features/portal/theme";

type Props = {
  title: string;
  onPress?: () => void;
  variant?: "primary" | "secondary" | "ghost" | "danger";
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  testID?: string;
  style?: ViewStyle;
  contrast?: boolean;
};

export function Button({ title, onPress, variant = "primary", loading, disabled, fullWidth = true, testID, style, contrast = false }: Props) {
  const portal = useContext(PortalVisualContext);
  const bg =
    variant === "primary" ? colors.brandPrimary :
    variant === "secondary" ? colors.surfaceSecondary :
    variant === "danger" ? colors.error :
    "transparent";
  const fg =
    variant === "primary" || variant === "danger" ? colors.onBrand :
    variant === "secondary" ? colors.brandPrimary : colors.brandPrimary;
  const border = variant === "secondary" ? colors.brandPrimary : "transparent";
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.btn,
        portal && { borderRadius: 15 },
        { backgroundColor: contrast ? "transparent" : portal && variant === "primary" ? portalColors.brand : bg, borderColor: contrast ? "#FFFFFF" : portal && variant === "secondary" ? portalColors.line : border, borderWidth: contrast || variant === "secondary" ? 1.5 : 0 },
        fullWidth ? { alignSelf: "stretch" } : { alignSelf: "flex-start" },
        (pressed || disabled) && { opacity: 0.75 },
        style,
      ]}
    >
      {loading ? <ActivityIndicator testID={testID ? `${testID}-loading` : undefined} color={fg} /> : <Text testID={testID ? `${testID}-label` : undefined} style={[styles.txt, { color: contrast ? "#FFFFFF" : fg }]}>{title}</Text>}
    </Pressable>
  );
}
const styles = StyleSheet.create({
  btn: { minHeight: 48, paddingVertical: 14, paddingHorizontal: spacing.lg, borderRadius: radius.md, alignItems: "center", justifyContent: "center" },
  txt: { fontSize: 15, fontWeight: "700" },
});
