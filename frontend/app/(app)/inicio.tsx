import React from "react";
import { View, Text, StyleSheet, Pressable, useWindowDimensions } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { api } from "@/src/core/http/api";
import { useAuth } from "@/src/core/auth/AuthProvider";
import { AreaPage, Panel, QueryState } from "@/src/shared/layout/AreaUI";
import { StatusChip } from "@/src/shared/ui/StatusChip";
import { formatEUR, todayLongPT } from "@/src/shared/utils/format";
import Ionicons from "@expo/vector-icons/Ionicons";
import { DamageQuickActions } from "@/src/features/inspections/components/DamageQuickActions";
import { DashboardHero, DashboardMetrics, DashboardAction, dashboardStyles as ds } from "@/src/shared/layout/DashboardUI";
import { workspaceColors as c, workspaceStyles } from "@/src/shared/theme/workspace";
export default function Inicio() {
  const { user, support } = useAuth(); const wide = useWindowDimensions().width >= 900;
  const { data, error, isLoading, refetch, isRefetching } = useQuery({ queryKey: ["dashboard"], queryFn: () => api.get("/dashboard") });
  const k = data?.kpis; const recent = data?.recent_work_orders || [];
  const manage = !!(user?.can_manage_workshop || support);
  return <AreaPage title="Início" testID="workshop-dashboard" back={false} onRefresh={refetch} refreshing={isRefetching}>
    <DashboardHero testID="workshop-overview" icon="construct-outline" title="A sua oficina, num só lugar." description={todayLongPT()} button="Nova ordem de serviço" onPress={() => router.push("/(app)/servico/new")} />
    <Pressable testID="dashboard-search-plate" accessibilityRole="button" onPress={() => router.push("/(app)/viaturas")} style={s.search}><Ionicons name="search-outline" size={23} color={c.brand} /><Text style={s.searchText}>Pesquisar por matrícula</Text><Ionicons name="chevron-forward" size={18} color={c.muted} /></Pressable>
    <QueryState testID="workshop-dashboard-query" loading={isLoading} error={error} retry={refetch} />
    {k && <DashboardMetrics entries={[
      { label: "Ordens de Serviço", value: k.ordens, hint: "este mês", icon: "construct-outline", testID: "kpi-ordens" },
      { label: "Em reparação", value: k.em_reparacao, hint: "ativas", icon: "build-outline", testID: "kpi-em-reparacao" },
      { label: "Aguardam cliente", value: k.aguarda_cliente, hint: "a aguardar", icon: "time-outline", testID: "kpi-aguarda" },
      { label: "Faturação", value: formatEUR(k.faturacao), hint: "este mês", icon: "receipt-outline", testID: "kpi-faturacao" },
    ]} />}
    <View style={[ds.columns, wide && { flexDirection: "row" }]}>
      <View style={ds.main}>
        <Panel testID="workshop-recent-orders">
          <View style={ds.heading}><Text style={workspaceStyles.title}>Ordens de Serviço Recentes</Text><Pressable accessibilityRole="button" onPress={() => router.push("/(app)/servico")} style={{ minHeight: 44, justifyContent: "center" }}><Text style={ds.link}>Ver todas</Text></Pressable></View>
          {!isLoading && !error && !recent.length && <Text style={workspaceStyles.hint}>Sem ordens de serviço ainda.</Text>}
          {recent.map((w: any) => <Pressable key={w.id} testID={`wo-row-${w.number}`} accessibilityRole="button" onPress={() => router.push(`/(app)/servico/${w.id}`)} style={s.order}>
            <View style={{ flex: 1, gap: 5, minWidth: 0 }}><Text style={s.orderNumber}>{w.number}</Text><Text style={s.orderClient} numberOfLines={1}>{w.client_name}</Text><Text style={workspaceStyles.hint} numberOfLines={1}>{w.vehicle_label} · {w.license_plate}</Text></View>
            <View style={{ alignItems: "flex-end", gap: 8 }}><StatusChip status={w.status} /><Text style={s.orderNumber}>{formatEUR(w.total)}</Text></View>
          </Pressable>)}
        </Panel>
        <DamageQuickActions testID="dashboard-damage" />
      </View>
      <View style={ds.side}>
        <Panel title="Acesso Rápido" testID="workshop-quick-actions">
          <DashboardAction testID="qa-new-wo" label="Nova ordem de serviço" icon="construct-outline" onPress={() => router.push("/(app)/servico/new")} />
          <DashboardAction testID="qa-new-client" label="Novo cliente" icon="person-add-outline" onPress={() => router.push("/(app)/clientes/new")} />
          {manage && <DashboardAction testID="qa-new-product" label="Novo produto" icon="cube-outline" onPress={() => router.push("/(app)/stock/new")} />}
          {manage && <DashboardAction testID="qa-new-order" label="Nova encomenda" icon="cart-outline" onPress={() => router.push("/(app)/stock/encomenda-new")} />}
        </Panel>
        <Panel title="Agenda da oficina" testID="workshop-agenda"><Text style={workspaceStyles.hint}>Confirme pedidos e acompanhe as próximas visitas dos clientes.</Text><DashboardAction testID="dashboard-appointments" label="Ver marcações" icon="calendar-outline" onPress={() => router.push("/(app)/marcacoes")} /></Panel>
      </View>
    </View>
  </AreaPage>;
}
const s = StyleSheet.create({
  search: { flexDirection: "row", alignItems: "center", gap: 14, minHeight: 60, backgroundColor: c.card, padding: 18, borderRadius: 19, borderWidth: 1, borderColor: c.line }, searchText: { flex: 1, fontSize: 15, color: c.muted },
  order: { flexDirection: "row", alignItems: "center", gap: 12, borderWidth: 1, borderColor: c.line, borderRadius: 18, padding: 16, backgroundColor: c.soft },
  orderNumber: { fontSize: 15, fontWeight: "700", color: c.ink }, orderClient: { fontSize: 14, color: c.ink },
});
