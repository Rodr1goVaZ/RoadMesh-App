import { createThemedStyles } from "@/src/shared/theme/ThemeProvider";
import React from "react";
import { Text } from "react-native";


export function Feedback({ message, error = false, testID }: { message?: string; error?: boolean; testID: string }) {
  const styles = useStyles();

  if (!message) return null;
  return <Text testID={testID} accessibilityLiveRegion="polite" style={[styles.message, error && styles.error]}>{message}</Text>;
}
const useStyles = createThemedStyles((theme) => { const colors = theme.colors; return ({
  message: { fontSize: 14, lineHeight: 21, color: colors.brandAccent, paddingVertical: 8 },
  error: { color: colors.error },
}); });