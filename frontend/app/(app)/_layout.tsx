import React, { useEffect } from "react";
import { Tabs, router } from "expo-router";
import { View, useWindowDimensions } from "react-native";
import { ModuleSwitch } from "@/src/workspace/ModuleSwitch";
import { companyModules, companyHome } from "@/src/company-modules";
import { useAuth, homeFor } from "@/src/auth";
import { SupportBanner } from "@/src/components/SupportBanner";
import { WorkspaceVisualContext, workspaceColors } from "@/src/workspace/theme";
import { WorkspaceHeader, WorkspaceNavigation, WorkspaceLink } from "@/src/workspace/WorkspaceChrome";
const items: WorkspaceLink[] = [
  { label: "Início", href: "/(app)/inicio", icon: "home-outline", activeIcon: "home", testID: "workshop-tab-home", matches: ["(app)/inicio"] },
  { label: "Serviço", href: "/(app)/servico", icon: "construct-outline", activeIcon: "construct", testID: "workshop-tab-services", matches: ["(app)/servico"] },
  { label: "Clientes", href: "/(app)/clientes", icon: "people-outline", activeIcon: "people", testID: "workshop-tab-clients", matches: ["(app)/clientes"] },
  { label: "Stock", href: "/(app)/stock", icon: "cube-outline", activeIcon: "cube", testID: "workshop-tab-stock", matches: ["(app)/stock"] },
  { label: "Mais", href: "/(app)/mais", icon: "grid-outline", activeIcon: "grid", testID: "workshop-tab-more", matches: ["(app)/mais","(app)/configuracoes","(app)/fornecedores","(app)/historicos","(app)/financeiro","(app)/faturacao","(app)/orcamentos","(app)/orcamento-new","(app)/viaturas","(app)/viatura","(app)/danos","(app)/marcacoes","(app)/fotos"] },
];
export default function AppLayout() {
  const { user, loading, support } = useAuth(); const mobile = useWindowDimensions().width < 700;
  const allowed = user && !user.password_change_required && (user.role === "workshop_staff" || (user.role === "admin" && support)) && companyModules(support || user).includes("workshop");
  useEffect(() => { if (!loading && !allowed) router.replace(support ? companyHome(support) : homeFor(user)); }, [user, support, loading, allowed]);
  if (!allowed) return null;
  return <WorkspaceVisualContext.Provider value={true}><View style={{ flex: 1, backgroundColor: workspaceColors.background }}>
    <SupportBanner />
    <WorkspaceHeader name={user.name} subtitle={`Oficina · ${support?.name || user.workshop_name || "A sua oficina"}`} items={items} profileHref="/(app)/mais" actionHref="/(app)/marcacoes" actionLabel="Ver marcações dos clientes" testID="workshop-header" />
    {!mobile && <ModuleSwitch current="workshop" />}
    <Tabs backBehavior="history" tabBar={() => mobile ? <><ModuleSwitch current="workshop" /><WorkspaceNavigation items={items} mobile /></> : null} screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: workspaceColors.background } }}>
      <Tabs.Screen name="inicio" options={{ title: "Início" }} />
      <Tabs.Screen name="servico" options={{ title: "Serviço" }} />
      <Tabs.Screen name="clientes" options={{ title: "Clientes" }} />
      <Tabs.Screen name="stock" options={{ title: "Stock" }} />
      <Tabs.Screen name="mais" options={{ title: "Mais" }} />
      <Tabs.Screen name="fotos" options={{ href: null }} />
      <Tabs.Screen name="fornecedores" options={{ href: null }} />
      <Tabs.Screen name="configuracoes" options={{ href: null }} />
      <Tabs.Screen name="historicos" options={{ href: null }} />
      <Tabs.Screen name="financeiro" options={{ href: null }} />
      <Tabs.Screen name="faturacao" options={{ href: null }} />
      <Tabs.Screen name="orcamentos" options={{ href: null }} />
      <Tabs.Screen name="orcamento-new" options={{ href: null }} />
      <Tabs.Screen name="viaturas" options={{ href: null }} />
      <Tabs.Screen name="viatura" options={{ href: null }} />
      <Tabs.Screen name="danos" options={{ href: null }} />
      <Tabs.Screen name="marcacoes" options={{ href: null }} />
    </Tabs>
  </View></WorkspaceVisualContext.Provider>;
}
