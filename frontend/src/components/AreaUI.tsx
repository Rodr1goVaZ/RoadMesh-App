import React from "react";
import { View, Text, ScrollView, StyleSheet, KeyboardAvoidingView, Platform, useWindowDimensions, ActivityIndicator } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ScreenHeader } from "./ScreenHeader";
import { Button } from "./Button";
import { Feedback } from "./Feedback";
import { colors, radius, spacing, shadows } from "../theme";

export function AreaPage({ title, testID, back = true, children }: { title: string; testID: string; back?: boolean; children: React.ReactNode }) {
  const insets = useSafeAreaInsets();
  return <View style={areaStyles.screen}><ScreenHeader title={title} back={back} testID={`${testID}-header`} />
    <KeyboardAvoidingView style={areaStyles.flex} behavior={Platform.OS === "ios" ? "padding" : "height"}>
      <ScrollView testID={testID} keyboardShouldPersistTaps="handled" contentContainerStyle={[areaStyles.content, { paddingBottom: insets.bottom + 40 }]}>{children}</ScrollView>
    </KeyboardAvoidingView>
  </View>;
}
export function Panel({ title, testID, children }: { title?: string; testID: string; children: React.ReactNode }) {
  return <View testID={testID} style={areaStyles.panel}>{title && <Text testID={`${testID}-title`} style={areaStyles.title}>{title}</Text>}{children}</View>;
}
export function Metrics({ entries, testID }: { entries: { label: string; value: string | number }[]; testID: string }) {
  const { width } = useWindowDimensions();
  return <View style={areaStyles.grid}>{entries.map((entry, i) => <View key={entry.label} style={[areaStyles.metric, { width: width >= 700 ? "23%" : "47%" }]}>
    <Text testID={`${testID}-${i}-value`} style={areaStyles.metricValue}>{entry.value}</Text>
    <Text testID={`${testID}-${i}-label`} style={areaStyles.hint}>{entry.label}</Text>
  </View>)}</View>;
}
export function QueryState({ loading, error, retry, testID }: { loading?: boolean; error?: Error | null; retry: () => void; testID: string }) {
  return <>{loading && <ActivityIndicator testID={`${testID}-loading`} color={colors.brandPrimary} />}<Feedback testID={`${testID}-error`} error message={error?.message} />
    {!!error && <Button testID={`${testID}-retry`} title="Tentar novamente" variant="secondary" onPress={retry} />}</>;
}
export function CredentialsNotice({ credentials, onClose }: { credentials: any; onClose: () => void }) {
  return <Panel testID="new-credentials" title="Acesso criado">
    <Text testID="credentials-warning" style={areaStyles.hint}>Partilhe estes dados em privado. A palavra-passe é mostrada apenas agora e terá de ser alterada no primeiro acesso.</Text>
    <Text selectable testID="credentials-email" style={areaStyles.label}>{credentials.email}</Text>
    <Text selectable testID="credentials-password" style={areaStyles.secret}>{credentials.temporary_password}</Text>
    <Button testID="credentials-close" title="Já guardei os dados" onPress={onClose} />
  </Panel>;
}
export const areaStyles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.surface }, flex: { flex: 1 },
  content: { padding: spacing.lg, gap: 20, width: "100%", maxWidth: 1100, alignSelf: "center" },
  panel: { backgroundColor: colors.surfaceSecondary, borderRadius: radius.lg, padding: spacing.lg, gap: 14, ...shadows.card },
  title: { fontSize: 20, fontWeight: "700", color: colors.onSurface },
  label: { color: colors.onSurface, fontSize: 16, fontWeight: "600", lineHeight: 23 },
  hint: { color: colors.muted, fontSize: 14, lineHeight: 21 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  metric: { padding: spacing.lg, minHeight: 102, gap: 8, backgroundColor: colors.surfaceSecondary, borderRadius: radius.lg, flexGrow: 1, ...shadows.card },
  metricValue: { fontSize: 24, fontWeight: "800", color: colors.brandPrimary },
  row: { flexDirection: "row", gap: 10, flexWrap: "wrap", alignItems: "center" },
  secret: { color: colors.brandPrimary, fontSize: 17, fontWeight: "700", lineHeight: 26 },
});