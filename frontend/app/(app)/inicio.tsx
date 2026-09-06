import React from "react";
import { View, Text, StyleSheet, ScrollView, RefreshControl, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { api } from "@/src/api";
import { useAuth } from "@/src/auth";
import { colors, spacing, radius, shadows } from "@/src/theme";
import { KpiCard } from "@/src/components/Card";
import { StatusChip } from "@/src/components/StatusChip";
import { LogoWithText } from "@/src/components/Logo";
import { formatEUR, todayLongPT } from "@/src/utils/format";

export default function Inicio() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { data, refetch, isRefetching } = useQuery({
    queryKey: ["dashboard"],
    queryFn: () => api.get("/dashboard"),
  });
  const k = data?.kpis || { ordens: 0, em_reparacao: 0, aguarda_cliente: 0, faturacao: 0 };
  const recent = data?.recent_work_orders || [];

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface }}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <LogoWithText />
        <Pressable testID="header-user-btn" onPress={() => router.push("/(app)/mais")} style={styles.userBadge}>
          <Text style={styles.userInitials}>{(user?.name || "?").slice(0, 2).toUpperCase()}</Text>
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg, paddingBottom: 40 }}
                  refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}>
        <View>
          <Text style={styles.hi}>Olá, {user?.name?.split(" ")[0]}!</Text>
          <Text style={styles.today}>{todayLongPT()}</Text>
        </View>

        <View style={styles.kpiRow}>
          <KpiCard testID="kpi-ordens" label="Ordens de Serviço" value={String(k.ordens)} delta="este mês" />
          <KpiCard testID="kpi-em-reparacao" label="Em Reparação" value={String(k.em_reparacao)} delta="ativas" />
        </View>
        <View style={styles.kpiRow}>
          <KpiCard testID="kpi-aguarda" label="Aguardam Cliente" value={String(k.aguarda_cliente)} delta="a aguardar" />
          <KpiCard testID="kpi-faturacao" label="Faturação" value={formatEUR(k.faturacao)} delta="este mês" />
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Ordens de Serviço Recentes</Text>
            <Pressable onPress={() => router.push("/(app)/servico")}>
              <Text style={styles.link}>Ver todas</Text>
            </Pressable>
          </View>
          {recent.length === 0 ? (
            <View style={styles.card}><Text style={styles.empty}>Sem ordens de serviço ainda</Text></View>
          ) : recent.map((w: any) => (
            <Pressable key={w.id} testID={`wo-row-${w.number}`} onPress={() => router.push(`/(app)/servico/${w.id}`)} style={[styles.card, styles.woRow]}>
              <View style={{ flex: 1, gap: 4 }}>
                <Text style={styles.woNumber}>{w.number}</Text>
                <Text style={styles.woClient} numberOfLines={1}>{w.client_name}</Text>
                <Text style={styles.woVehicle} numberOfLines={1}>{w.vehicle_label} · {w.license_plate}</Text>
              </View>
              <View style={{ alignItems: "flex-end", gap: 6 }}>
                <StatusChip status={w.status} />
                <Text style={styles.woTotal}>{formatEUR(w.total)}</Text>
              </View>
            </Pressable>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Ações rápidas</Text>
          <View style={styles.actionsGrid}>
            <QuickAction label="Nova OS" onPress={() => router.push("/(app)/servico/new")} testID="qa-new-wo" />
            <QuickAction label="Novo Cliente" onPress={() => router.push("/(app)/clientes/new")} testID="qa-new-client" />
            <QuickAction label="Novo Produto" onPress={() => router.push("/(app)/stock/new")} testID="qa-new-product" />
            <QuickAction label="Nova Encomenda" onPress={() => router.push("/(app)/stock/encomenda-new")} testID="qa-new-order" />
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
function QuickAction({ label, onPress, testID }: any) {
  return (
    <Pressable testID={testID} onPress={onPress} style={({ pressed }) => [styles.action, pressed && { opacity: 0.75 }]}>
      <Text style={styles.actionTxt}>{label}</Text>
    </Pressable>
  );
}
const styles = StyleSheet.create({
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingHorizontal: spacing.lg, paddingBottom: 8, backgroundColor: colors.surface },
  userBadge: { width: 36, height: 36, borderRadius: 999, backgroundColor: colors.brandPrimary, alignItems: "center", justifyContent: "center" },
  userInitials: { color: "#fff", fontWeight: "700", fontSize: 13 },
  hi: { fontSize: 22, fontWeight: "800", color: colors.onSurface },
  today: { color: colors.muted, fontSize: 13, marginTop: 2 },
  kpiRow: { flexDirection: "row", gap: spacing.md },
  section: { gap: spacing.md },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  sectionTitle: { fontSize: 16, fontWeight: "700", color: colors.onSurface },
  link: { color: colors.brandPrimary, fontWeight: "600" },
  card: { backgroundColor: colors.surfaceSecondary, borderRadius: radius.lg, padding: spacing.lg, ...shadows.card },
  woRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  woNumber: { fontWeight: "800", fontSize: 15, color: colors.onSurface },
  woClient: { fontSize: 14, color: colors.onSurface },
  woVehicle: { fontSize: 12, color: colors.muted },
  woTotal: { fontWeight: "700", color: colors.onSurface },
  empty: { color: colors.muted, textAlign: "center" },
  actionsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  action: { backgroundColor: colors.brandTertiary, borderRadius: radius.md, paddingVertical: 14, paddingHorizontal: 16, flexGrow: 1, minWidth: "45%", alignItems: "center" },
  actionTxt: { color: colors.brandPrimary, fontWeight: "700" },
});
