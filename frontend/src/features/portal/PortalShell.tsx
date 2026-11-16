import { useAppTheme } from "@/src/shared/theme/ThemeProvider";
import React from "react";
import { View, useWindowDimensions } from "react-native";
import { Tabs, useSegments, Redirect } from "expo-router";
import { RoleGate } from "@/src/features/auth/components/RoleGate";
import { WorkspaceVisualContext } from "@/src/shared/theme/workspace";
import { WorkspaceHeader, WorkspaceNavigation, WorkspaceLink } from "@/src/shared/layout/WorkspaceChrome";
import { useAuth } from "@/src/core/auth/AuthProvider";
import { hasFeature } from "@/src/core/auth/company-features";
const allItems: WorkspaceLink[] = [
  { label: "Início", href: "/(portal)/inicio", icon: "home-outline", activeIcon: "home", testID: "portal-tab-home", matches: ["(portal)/inicio"] },
  { label: "Veículos", href: "/(portal)/carros", icon: "car-outline", activeIcon: "car", testID: "portal-tab-cars", matches: ["(portal)/carros","(portal)/carro"] },
  { label: "Histórico", href: "/(portal)/historico", icon: "time-outline", activeIcon: "time", testID: "portal-tab-history", matches: ["(portal)/historico"] },
  { label: "Perfil", href: "/(portal)/perfil", icon: "person-outline", activeIcon: "person", testID: "portal-tab-profile", matches: ["(portal)/perfil"] },
];
export function PortalShell() {
  const theme = useAppTheme();
  const workspaceColors = theme.workspace;

  const { user } = useAuth(); const segments = useSegments() as string[];
  const hasHistory = hasFeature(user, "service_orders") || hasFeature(user, "quotes");
  const hasCars = hasFeature(user, "customer_database") || hasHistory || hasFeature(user, "vehicle_reception") || hasFeature(user, "appointments");
  const items = allItems.filter(item => item.testID === "portal-tab-cars" ? hasCars : item.testID === "portal-tab-history" ? hasHistory : true);
  const page = segments[1];
  const permitted = user?.subscription_version !== 1 || (page === "marcacoes" ? hasFeature(user, "appointments") : page === "historico" ? hasHistory : ["carros", "carro"].includes(page) ? hasCars : true);
  const mobile = useWindowDimensions().width < 700;
  if (user && !permitted) return <Redirect href="/(portal)/inicio" />;
  return <RoleGate role="client"><WorkspaceVisualContext.Provider value={true}><View style={{ flex: 1, backgroundColor: workspaceColors.background }}>
    <WorkspaceHeader items={items} profileHref="/(portal)/conta-cliente" actionHref={hasFeature(user, "appointments") ? "/(portal)/marcacoes" : undefined} actionLabel="Ver marcações e atualizações da oficina" testID="portal-header" />
    <Tabs backBehavior="history" tabBar={() => mobile ? <WorkspaceNavigation items={items} mobile /> : null} screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: workspaceColors.background } }}>
      <Tabs.Screen name="inicio" options={{ title: "Início" }} /><Tabs.Screen name="carros" options={{ title: "Veículos" }} /><Tabs.Screen name="historico" options={{ title: "Histórico" }} /><Tabs.Screen name="perfil" options={{ title: "Perfil" }} />
      <Tabs.Screen name="conta-cliente" options={{ href: null }} /><Tabs.Screen name="marcacoes" options={{ href: null }} /><Tabs.Screen name="carro" options={{ href: null }} />
    </Tabs>
  </View></WorkspaceVisualContext.Provider></RoleGate>;
}
