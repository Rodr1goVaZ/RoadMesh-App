import React from "react";
import { Text, View, useWindowDimensions } from "react-native";
import { router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/src/core/http/api";
import { useAuth } from "@/src/core/auth/AuthProvider";
import { AreaPage, Panel, QueryState } from "@/src/shared/layout/AreaUI";
import { Button } from "@/src/shared/ui/Button";
import { formatEUR } from "@/src/shared/utils/format";
import { DashboardHero, DashboardMetrics, DashboardAction, dashboardStyles as ds } from "@/src/shared/layout/DashboardUI";
import { workspaceStyles } from "@/src/shared/theme/workspace";
export default function AdminDashboard() {
  const { logout } = useAuth(); const wide = useWindowDimensions().width >= 900;
  const { data, error, isLoading, refetch } = useQuery({ queryKey: ["admin-dashboard"], queryFn: () => api.get("/admin/dashboard") });
  return <AreaPage title="Administração" testID="admin-dashboard" back={false}>
    <DashboardHero title="Todas as empresas. Uma visão completa." description="Acompanhe a plataforma e mantenha a gestão de cada empresa por perto." button="Consultar empresas" onPress={() => router.push("/(admin)/workshops")} testID="admin-overview" icon="business-outline" />
    <QueryState loading={isLoading} error={error} retry={refetch} testID="admin-dashboard-query" />
    {data && <DashboardMetrics entries={[
      { label: "Empresas", value: data.workshops, icon: "business-outline", testID: "global-metrics-0-value" },
      { label: "Ativas", value: data.active, icon: "checkmark-circle-outline", testID: "global-metrics-1-value" },
      { label: "Inativas", value: data.disabled, icon: "pause-circle-outline", testID: "global-metrics-2-value" },
      { label: "Arquivadas", value: data.archived, icon: "archive-outline", testID: "global-metrics-3-value" },
      { label: "Clientes", value: data.clients, icon: "people-outline", testID: "global-metrics-4-value" },
      { label: "Viaturas", value: data.vehicles, icon: "car-outline", testID: "global-metrics-5-value" },
      { label: "Ordens de serviço", value: data.work_orders, icon: "construct-outline", testID: "global-metrics-6-value" },
      { label: "Faturação global", value: formatEUR(data.revenue), icon: "receipt-outline", testID: "global-metrics-7-value" },
    ]} />}
    <View style={[ds.columns, wide && { flexDirection: "row" }]}>
      <View style={ds.main}><Panel title="Gestão da plataforma" testID="admin-dashboard-actions">
        <DashboardAction testID="admin-open-workshops" icon="business-outline" label="Consultar empresas e faturação" description="Acessos, atividade, estado e suporte." onPress={() => router.push("/(admin)/workshops")} />
        <DashboardAction testID="admin-new-workshop" icon="add-circle-outline" label="Criar empresa" description="Adicionar uma empresa e o respetivo responsável." onPress={() => router.push("/(admin)/workshop-form")} />
      </Panel></View>
      <View style={ds.side}><Panel title="A sua conta" testID="admin-account-actions"><Text style={workspaceStyles.hint}>Os acessos e as operações de suporte continuam protegidos pelas permissões da administração.</Text>
        <Button testID="admin-change-password" title="Alterar palavra-passe" variant="secondary" onPress={() => router.push("/(auth)/change-password")} />
        <Button testID="admin-logout" title="Terminar sessão" variant="ghost" onPress={() => logout()} />
      </Panel></View>
    </View>
  </AreaPage>;
}
