import { useAppTheme, createThemedStyles } from "@/src/shared/theme/ThemeProvider";
import React, { useContext } from "react";
import { Pressable, Text, ActivityIndicator, ViewStyle, ColorValue } from "react-native";
import { radius, spacing } from "@/src/shared/theme/legacy";
import { PortalVisualContext } from "@/src/features/portal/theme";

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
  textColor?: ColorValue;
};

export function Button({ title, onPress, variant = "primary", loading, disabled, fullWidth = true, testID, style, contrast = false, textColor }: Props) {
  const theme = useAppTheme();
  const colors = theme.colors;
  const portalColors = theme.workspace;
  const styles = useStyles();

  const portal = useContext(PortalVisualContext);
  const bg =
    variant === "primary" ? colors.brandPrimary :
    variant === "secondary" ? colors.surfaceSecondary :
    variant === "danger" ? colors.errorFill :
    "transparent";
  const fg = textColor ?? (
    variant === "primary" || variant === "danger" ? colors.onBrand :
    variant === "secondary" && theme.scheme === "dark" ? colors.onSurface : colors.brandAccent);
  const border = variant === "secondary" ? (theme.scheme === "dark" ? colors.borderStrong : colors.brandPrimary) : "transparent";
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.btn,
        portal && { borderRadius: 15 },
        { backgroundColor: contrast ? "transparent" : portal && variant === "primary" ? portalColors.brandFill : bg, borderColor: contrast ? theme.tones.onAction : portal && variant === "secondary" ? portalColors.line : border, borderWidth: contrast || variant === "secondary" ? 1.5 : 0 },
        fullWidth ? { alignSelf: "stretch" } : { alignSelf: "flex-start" },
        (pressed || disabled) && { opacity: 0.75 },
        style,
      ]}
    >
      {loading ? <ActivityIndicator testID={testID ? `${testID}-loading` : undefined} color={fg} /> : <Text testID={testID ? `${testID}-label` : undefined} style={[styles.txt, { color: contrast ? theme.tones.onAction : fg }]}>{title}</Text>}
    </Pressable>
  );
}
const useStyles = createThemedStyles((theme) => {   return ({
  btn: { minHeight: 48, paddingVertical: 14, paddingHorizontal: spacing.lg, borderRadius: radius.md, alignItems: "center", justifyContent: "center" },
  txt: { fontSize: 15, fontWeight: "700" },
}); });
