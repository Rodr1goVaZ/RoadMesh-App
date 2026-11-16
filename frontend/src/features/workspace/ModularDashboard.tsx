import React from "react";
import { Text, View } from "react-native";
import { router, Href } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/src/core/auth/AuthProvider";
import { api } from "@/src/core/http/api";
import { featureCatalog, hasFeature, FeatureId } from "@/src/core/auth/company-features";
import { AreaPage, Panel, QueryState, useAreaStyles } from "@/src/shared/layout/AreaUI";
import { DashboardAction } from "@/src/shared/layout/DashboardUI";

const destinations = Object.fromEntries(featureCatalog.map(item => [item.id, item.href])) as Record<FeatureId, Href>;
export function ModularDashboard({ portal = false }: { portal?: boolean }) {
  const areaStyles = useAreaStyles();

  const { user, support } = useAuth(); const company = support || user;
  const query = useQuery({ queryKey: ["module-dashboard", company?.enabled_modules], queryFn: () => api.get("/dashboard"), enabled: !portal });
  const modules = featureCatalog.filter(item => hasFeature(company, item.id) && (!portal || ["customer_database", "vehicle_reception", "service_orders", "quotes", "appointments"].includes(item.id)));
  return <AreaPage title="Início" testID="modular-dashboard" back={false} breadcrumbs={false}>
    <Text accessibilityRole="header" style={[areaStyles.title, { fontSize: 28 }]}>{portal ? "O seu espaço" : support?.name || user?.workshop_name}</Text>
    <Text style={areaStyles.hint}>{portal ? "Acompanhe as informações e os serviços disponíveis para si." : "Os módulos ativos da sua empresa, num só lugar."}</Text>
    {!portal && <QueryState testID="module-dashboard-query" loading={query.isPending} error={query.error} retry={query.refetch} />}
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 20 }}>{modules.map(item => {
      const summary = query.data?.module_summary?.[item.id];
      const href: Href = portal ? item.id === "appointments" ? "/(portal)/marcacoes" : ["service_orders", "quotes"].includes(item.id) ? "/(portal)/historico" : "/(portal)/carros" : destinations[item.id];
      return <View key={item.id} style={{ flexGrow: 1, flexBasis: 320,  }}><Panel testID={`dashboard-module-${item.id}`} title={item.name}><Text style={areaStyles.hint}>{item.description}</Text>
        {summary && <Text style={areaStyles.hint}>{Object.entries(summary).map(([key, value]) => `${value} ${{ clients: "clientes", vehicles: "viaturas", products: "produtos", orders: "encomendas", services: "ordens de serviço", photos: "fotografias", damages: "danos", appointments: "marcações", records: "registos", modules: "módulos ativos" }[key] || key}`).join(" · ")}</Text>}
        <DashboardAction testID={`module-open-${item.id}`} label={`Abrir ${item.name.toLowerCase()}`} icon={item.icon} onPress={() => router.push(href)} />
      </Panel></View>;
    })}</View>
    {!modules.length && <Panel testID="dashboard-no-modules" title="Sem módulos ativos"><Text style={areaStyles.hint}>A sua conta está disponível. Contacte a RoadMesh para ativar os módulos de que precisa.</Text></Panel>}
  </AreaPage>;
}
