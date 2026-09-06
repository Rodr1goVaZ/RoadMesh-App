import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { colors } from "../theme";
import { Button } from "./Button";

export function EmptyState({ icon = "📭", title, message, actionLabel, onAction, testID }: {
  icon?: string; title: string; message?: string; actionLabel?: string; onAction?: () => void; testID?: string;
}) {
  return (
    <View testID={testID} style={styles.wrap}>
      <Text style={styles.icon}>{icon}</Text>
      <Text style={styles.title}>{title}</Text>
      {message ? <Text style={styles.msg}>{message}</Text> : null}
      {actionLabel && onAction ? (
        <View style={{ marginTop: 16, alignSelf: "stretch", paddingHorizontal: 24 }}>
          <Button title={actionLabel} onPress={onAction} testID="empty-action-btn" />
        </View>
      ) : null}
    </View>
  );
}
const styles = StyleSheet.create({
  wrap: { alignItems: "center", justifyContent: "center", padding: 32, gap: 8 },
  icon: { fontSize: 44 },
  title: { fontSize: 16, fontWeight: "700", color: colors.onSurface, textAlign: "center" },
  msg: { fontSize: 13, color: colors.muted, textAlign: "center", maxWidth: 300 },
});
