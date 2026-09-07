import React from "react";
import { Text } from "react-native";
import { router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/src/api";
import { useAuth } from "@/src/auth";
import { AreaPage, Metrics, Panel, QueryState, areaStyles } from "@/src/components/AreaUI";
import { LogoWithText } from "@/src/components/Logo";
import { Button } from "@/src/components/Button";
import { formatEUR } from "@/src/utils/format";
export default function AdminDashboard() {
  const { logout } = useAuth();
  const { data, error, isLoading, refetch } = useQuery({ queryKey: ["admin-dashboard"], queryFn: () => api.get("/admin/dashboard") });
  return <AreaPage title="Administração" testID="admin-dashboard" back={false}>
    <LogoWithText testID="admin-brand" />
    <Text testID="admin-dashboard-heading" style={areaStyles.title}>Visão global da plataforma</Text>
    <Text testID="admin-dashboard-help" style={areaStyles.hint}>Todas as oficinas. Um único centro de gestão.</Text>
    <QueryState loading={isLoading} error={error} retry={refetch} testID="admin-dashboard-query" />
    {data && <Metrics testID="global-metrics" entries={[{ label: "Oficinas", value: data.workshops }, { label: "Ativas", value: data.active }, { label: "Inativas", value: data.disabled }, { label: "Arquivadas", value: data.archived }, { label: "Clientes", value: data.clients }, { label: "Viaturas", value: data.vehicles }, { label: "Ordens de serviço", value: data.work_orders }, { label: "Faturação global", value: formatEUR(data.revenue) }]} />}
    <Panel title="Gestão da plataforma" testID="admin-dashboard-actions">
      <Button testID="admin-open-workshops" title="Consultar oficinas e faturação" onPress={() => router.push("/(admin)/workshops")} />
      <Button testID="admin-new-workshop" title="Criar oficina" variant="secondary" onPress={() => router.push("/(admin)/workshop-form")} />
      <Button testID="admin-change-password" title="Alterar palavra-passe" variant="ghost" onPress={() => router.push("/(auth)/change-password")} />
      <Button testID="admin-logout" title="Terminar sessão" variant="ghost" onPress={() => logout()} />
    </Panel>
  </AreaPage>;
}