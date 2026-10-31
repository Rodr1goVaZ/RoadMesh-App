import React from "react";
import { Stack } from "expo-router";
import { View, useWindowDimensions } from "react-native";
import { CompanyCreatedAccessProvider } from "@/src/features/administration/components/CompanyCreatedAccess";
import { RoleGate } from "@/src/features/auth/components/RoleGate";
import { useAuth } from "@/src/core/auth/AuthProvider";
import { AdminPageContext, adminContentWidth, WorkspaceVisualContext, workspaceColors } from "@/src/shared/theme/workspace";
import { WorkspaceHeader, WorkspaceNavigation, WorkspaceLink } from "@/src/shared/layout/WorkspaceChrome";
const items: WorkspaceLink[] = [
  { label: "Início", href: "/(admin)/dashboard", icon: "home-outline", activeIcon: "home", testID: "admin-tab-home", matches: ["(admin)/dashboard"] },
  { label: "Empresas", href: "/(admin)/empresas", icon: "business-outline", activeIcon: "business", testID: "admin-tab-workshops", matches: ["(admin)/empresas","(admin)/empresa"] },
  { label: "Conta", href: "/(admin)/conta", icon: "person-outline", activeIcon: "person", testID: "admin-tab-account", matches: ["(admin)/conta"] },
];
export default function AdminLayout() {
  const { user } = useAuth(); const mobile = useWindowDimensions().width < 700;
  return <RoleGate role="admin"><CompanyCreatedAccessProvider><AdminPageContext.Provider value={true}><WorkspaceVisualContext.Provider value={true}><View style={{ flex: 1, backgroundColor: workspaceColors.background }}>
    <WorkspaceHeader name={user?.name || "Administração"} subtitle="Administração RoadMesh" items={items} profileHref="/(admin)/conta" testID="admin-header" contentWidth={adminContentWidth} contentPadding={mobile ? 16 : 24} />
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: workspaceColors.background } }} />
    {mobile && <WorkspaceNavigation items={items} mobile />}
  </View></WorkspaceVisualContext.Provider></AdminPageContext.Provider></CompanyCreatedAccessProvider></RoleGate>;
}
