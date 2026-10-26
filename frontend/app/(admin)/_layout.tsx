import React from "react";
import { Stack } from "expo-router";
import { View, useWindowDimensions } from "react-native";
import { RoleGate } from "@/src/features/auth/components/RoleGate";
import { useAuth } from "@/src/core/auth/AuthProvider";
import { WorkspaceVisualContext, workspaceColors } from "@/src/shared/theme/workspace";
import { WorkspaceHeader, WorkspaceNavigation, WorkspaceLink } from "@/src/shared/layout/WorkspaceChrome";
const items: WorkspaceLink[] = [
  { label: "Início", href: "/(admin)/dashboard", icon: "home-outline", activeIcon: "home", testID: "admin-tab-home", matches: ["(admin)/dashboard"] },
  { label: "Empresas", href: "/(admin)/workshops", icon: "business-outline", activeIcon: "business", testID: "admin-tab-workshops", matches: ["(admin)/workshops","(admin)/workshop"] },
  { label: "Criar", href: "/(admin)/workshop-form", icon: "add-circle-outline", activeIcon: "add-circle", testID: "admin-tab-create", matches: ["(admin)/workshop-form"] },
  { label: "Conta", href: "/(admin)/conta", icon: "person-outline", activeIcon: "person", testID: "admin-tab-account", matches: ["(admin)/conta"] },
];
export default function AdminLayout() {
  const { user } = useAuth(); const mobile = useWindowDimensions().width < 700;
  return <RoleGate role="admin"><WorkspaceVisualContext.Provider value={true}><View style={{ flex: 1, backgroundColor: workspaceColors.background }}>
    <WorkspaceHeader name={user?.name || "Administração"} subtitle="Administração RoadMesh" items={items} profileHref="/(admin)/conta" actionHref="/(admin)/workshop-form" actionLabel="Criar empresa" actionIcon="add-outline" testID="admin-header" />
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: workspaceColors.background } }} />
    {mobile && <WorkspaceNavigation items={items} mobile />}
  </View></WorkspaceVisualContext.Provider></RoleGate>;
}
