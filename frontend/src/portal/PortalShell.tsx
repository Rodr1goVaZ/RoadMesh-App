import React from "react";
import { View, useWindowDimensions } from "react-native";
import { Tabs } from "expo-router";
import { useAuth } from "../auth";
import { RoleGate } from "../components/RoleGate";
import { WorkspaceVisualContext, workspaceColors } from "../workspace/theme";
import { WorkspaceHeader, WorkspaceNavigation, WorkspaceLink } from "../workspace/WorkspaceChrome";
const items: WorkspaceLink[] = [
  { label: "Início", href: "/(portal)/inicio", icon: "home-outline", activeIcon: "home", testID: "portal-tab-home", matches: ["(portal)/inicio"] },
  { label: "Veículos", href: "/(portal)/carros", icon: "car-outline", activeIcon: "car", testID: "portal-tab-cars", matches: ["(portal)/carros","(portal)/carro"] },
  { label: "Histórico", href: "/(portal)/historico", icon: "time-outline", activeIcon: "time", testID: "portal-tab-history", matches: ["(portal)/historico"] },
  { label: "Perfil", href: "/(portal)/perfil", icon: "person-outline", activeIcon: "person", testID: "portal-tab-profile", matches: ["(portal)/perfil"] },
];
export function PortalShell() {
  const { user } = useAuth(); const mobile = useWindowDimensions().width < 700;
  return <RoleGate role="client"><WorkspaceVisualContext.Provider value={true}><View style={{ flex: 1, backgroundColor: workspaceColors.background }}>
    <WorkspaceHeader name={user?.name || "Cliente"} subtitle="Bem-vindo" items={items} profileHref="/(portal)/perfil" actionHref="/(portal)/marcacoes" actionLabel="Ver marcações e atualizações da oficina" testID="portal-header" />
    <Tabs backBehavior="history" tabBar={() => mobile ? <WorkspaceNavigation items={items} mobile /> : null} screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: workspaceColors.background } }}>
      <Tabs.Screen name="inicio" options={{ title: "Início" }} /><Tabs.Screen name="carros" options={{ title: "Veículos" }} /><Tabs.Screen name="historico" options={{ title: "Histórico" }} /><Tabs.Screen name="perfil" options={{ title: "Perfil" }} />
      <Tabs.Screen name="marcacoes" options={{ href: null }} /><Tabs.Screen name="carro" options={{ href: null }} />
    </Tabs>
  </View></WorkspaceVisualContext.Provider></RoleGate>;
}
