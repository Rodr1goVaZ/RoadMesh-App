import React from "react";
import { View, Text, Pressable, StyleSheet, useWindowDimensions } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { workspaceColors as c, workspaceStyles } from "@/src/shared/theme/workspace";
type Icon = React.ComponentProps<typeof Ionicons>["name"];
export function DashboardHero({ title, description, button, onPress, icon = "shield-checkmark-outline", testID }: { title: string; description: string; button: string; onPress: () => void; icon?: Icon; testID: string }) {
  const wide = useWindowDimensions().width >= 700;
  return <View testID={testID} style={[workspaceStyles.card, s.hero, wide && { flexDirection: "row", alignItems: "center" }]}>
    <View style={s.heroIntro}><View style={s.heroIcon}><Ionicons name={icon} size={24} color={c.brand} /></View><View style={{ flex: 1, gap: 7 }}><Text style={s.heroTitle}>{title}</Text><Text style={workspaceStyles.hint}>{description}</Text></View></View>
    <Pressable accessibilityRole="button" testID={testID + "-action"} onPress={onPress} style={s.heroButton}><Text style={s.white}>{button}</Text></Pressable>
  </View>;
}
export function DashboardMetrics({ entries }: { entries: { label: string; value: string | number; icon: Icon; hint?: string; testID: string }[] }) {
  const columns = useWindowDimensions().width >= 1000 ? 4 : 2;
  return <View style={s.metrics}>{entries.map(entry => <View key={entry.testID} style={{ width: columns === 4 ? "23.8%" : "47%", flexGrow: 1 }}>
    <View testID={entry.testID} style={[workspaceStyles.card, s.metric]}>
      <View style={s.metricIcon}><Ionicons name={entry.icon} size={21} color={c.brand} /></View>
      <Text style={s.metricValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={.7}>{entry.value}</Text>
      <Text style={s.metricLabel}>{entry.label}</Text>{!!entry.hint && <Text style={s.small}>{entry.hint}</Text>}
    </View>
  </View>)}</View>;
}
export function DashboardAction({ label, description, icon, onPress, testID }: { label: string; description?: string; icon: Icon; onPress: () => void; testID: string }) {
  return <Pressable testID={testID} accessibilityRole="button" onPress={onPress} style={({ pressed }) => [s.action, pressed && { opacity: .7 }]}>
    <View style={s.actionIcon}><Ionicons name={icon} size={21} color={c.brand} /></View>
    <View style={{ flex: 1, gap: 4 }}><Text style={s.actionLabel}>{label}</Text>{!!description && <Text style={s.small}>{description}</Text>}</View>
    <Ionicons name="chevron-forward" size={18} color={c.muted} />
  </Pressable>;
}
export const dashboardStyles = StyleSheet.create({ columns: { gap: 22 }, main: { flex: 2, minWidth: 0, gap: 20 }, side: { flex: 1, minWidth: 0, gap: 20 }, heading: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 }, link: { fontSize: 13, fontWeight: "600", color: c.brand } });
const s = StyleSheet.create({
  hero: { padding: 24, backgroundColor: "#FFFCFC", gap: 22 }, heroIntro: { flex: 1, flexDirection: "row", alignItems: "center", gap: 16 }, heroIcon: { width: 52, height: 52, borderRadius: 26, backgroundColor: "#F2E7E7", justifyContent: "center", alignItems: "center" }, heroTitle: { color: c.brand, fontSize: 18, fontWeight: "700", lineHeight: 25 }, heroButton: { minHeight: 46, paddingHorizontal: 22, paddingVertical: 14, backgroundColor: c.brand, borderRadius: 15, alignItems: "center", justifyContent: "center" }, white: { color: "#FFF", fontWeight: "600", fontSize: 14 },
  metrics: { flexDirection: "row", flexWrap: "wrap", gap: 14 }, metric: { padding: 20, gap: 8, height: "100%" }, metricIcon: { width: 40, height: 40, backgroundColor: c.soft, borderRadius: 13, alignItems: "center", justifyContent: "center", marginBottom: 4 }, metricValue: { fontSize: 27, fontWeight: "700", color: c.ink }, metricLabel: { fontSize: 13, fontWeight: "600", color: c.muted }, small: { fontSize: 12, lineHeight: 18, color: c.muted },
  action: { backgroundColor: c.soft, borderRadius: 18, borderColor: c.line, borderWidth: 1, padding: 14, minHeight: 68, gap: 12, flexDirection: "row", alignItems: "center" }, actionIcon: { width: 42, height: 42, backgroundColor: "#EBEEF8", borderRadius: 12, justifyContent: "center", alignItems: "center" }, actionLabel: { color: c.ink, fontWeight: "600", fontSize: 14, lineHeight: 20 },
});
