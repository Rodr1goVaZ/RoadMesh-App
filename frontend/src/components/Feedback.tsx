import React from "react";
import { Text, StyleSheet } from "react-native";
import { colors } from "../theme";

export function Feedback({ message, error = false, testID }: { message?: string; error?: boolean; testID: string }) {
  if (!message) return null;
  return <Text testID={testID} accessibilityLiveRegion="polite" style={[styles.message, error && styles.error]}>{message}</Text>;
}
const styles = StyleSheet.create({
  message: { fontSize: 14, lineHeight: 21, color: colors.brandPrimary, paddingVertical: 8 },
  error: { color: colors.error },
});