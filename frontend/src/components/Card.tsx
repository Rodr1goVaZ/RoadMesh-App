import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { colors, radius, spacing, shadows } from "../theme";

export function Card({ children, style, testID }: any) {
  return <View testID={testID} style={[styles.card, style]}>{children}</View>;
}

export function KpiCard({ label, value, delta, testID }: { label: string; value: string; delta?: string; testID?: string }) {
  return (
    <View testID={testID} style={[styles.card, styles.kpi]}>
      <Text style={styles.kpiLabel} numberOfLines={1}>{label}</Text>
      <Text style={styles.kpiValue} numberOfLines={1}>{value}</Text>
      {delta ? <Text style={styles.kpiDelta}>{delta}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.lg,
    padding: spacing.lg,
    ...shadows.card,
  },
  kpi: { flex: 1, minWidth: 140, gap: 4 },
  kpiLabel: { color: colors.muted, fontSize: 12, fontWeight: "600" },
  kpiValue: { color: colors.onSurface, fontSize: 22, fontWeight: "800" },
  kpiDelta: { color: colors.muted, fontSize: 11 },
});
