import React from "react";
import { Stack, Redirect } from "expo-router";
import { View, useWindowDimensions } from "react-native";
import { useAuth, homeFor } from "@/src/core/auth/AuthProvider";
import { companyHome, companyModules } from "@/src/core/auth/company-modules";
import { SupportBanner } from "@/src/shared/layout/SupportBanner";
import { WorkspaceHeader, WorkspaceNavigation, WorkspaceLink } from "@/src/shared/layout/WorkspaceChrome";
import { WorkspaceVisualContext, workspaceColors as c } from "@/src/shared/theme/workspace";
import { ModuleSwitch } from "@/src/shared/layout/ModuleSwitch";
const items: WorkspaceLink[] = [
  { label: "Início", href: "/(stand)/stand-inicio", icon: "home-outline", activeIcon: "home", testID: "stand-tab-home", matches: ["(stand)/stand-inicio"] },
  { label: "Viaturas", href: "/(stand)/stand-viaturas", icon: "car-sport-outline", testID: "stand-tab-vehicles", matches: ["(stand)/stand-viaturas","(stand)/stand-viatura"] },
  { label: "Clientes", href: "/(stand)/stand-clientes", icon: "people-outline", testID: "stand-tab-clients", matches: ["(stand)/stand-clientes"] },
  { label: "Vendas", href: "/(stand)/stand-vendas", icon: "receipt-outline", testID: "stand-tab-sales", matches: ["(stand)/stand-vendas"] },
  { label: "Mais", href: "/(stand)/stand-mais", icon: "grid-outline", testID: "stand-tab-more", matches: ["(stand)/stand-mais","(stand)/stand-historico"] },
];
export default function StandLayout() {
  const { user, support, loading } = useAuth(); const mobile = useWindowDimensions().width < 700;
  if (loading) return null;
  if (!user || user.password_change_required || (user.role !== "workshop_staff" && !(user.role === "admin" && support))) return <Redirect href={homeFor(user)} />;
  if (!companyModules(support || user).includes("stand")) return <Redirect href={support ? companyHome(support) : homeFor(user)} />;
  return <WorkspaceVisualContext.Provider value={true}><View style={{ flex: 1, backgroundColor: c.background }}>
    <SupportBanner />
    <WorkspaceHeader name={user.name} subtitle={`Stand · ${support?.name || user.workshop_name}`} items={items} profileHref="/(stand)/stand-mais" actionHref="/(stand)/stand-viaturas" actionLabel="Consultar inventário do Stand" actionIcon="car-sport-outline" testID="stand-header" />
    {!mobile && <ModuleSwitch current="stand" />}
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: c.background } }} />
    {mobile && <><ModuleSwitch current="stand" /><WorkspaceNavigation items={items} mobile /></>}
  </View></WorkspaceVisualContext.Provider>;
}
