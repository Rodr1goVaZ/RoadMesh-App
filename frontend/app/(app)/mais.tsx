import React from "react";
import { View, Text, useWindowDimensions } from "react-native";
import { AppAlert as Alert } from "@/src/utils/alerts";
import { router } from "expo-router";
import { useAuth } from "@/src/auth";
import { AreaPage, Panel, areaStyles } from "@/src/components/AreaUI";
import { Button } from "@/src/components/Button";
import { DashboardAction } from "@/src/workspace/DashboardUI";
import Ionicons from "@expo/vector-icons/Ionicons";
export default function Mais() {
  const { user, logout, support } = useAuth(); const wide = useWindowDimensions().width >= 900;
  const logoutConfirm = () => Alert.alert("Sair", "Terminar sessão?", [
    { text: "Cancelar", style: "cancel" }, { text: "Sair", style: "destructive", onPress: async () => { await logout(); router.replace("/(auth)/login"); } },
  ]);
  const items: { label: string; href: any; icon: React.ComponentProps<typeof Ionicons>["name"]; testID: string }[] = [
    { label: "Marcações dos Clientes", href: "/(app)/marcacoes", icon: "calendar-outline", testID: "mais-appointments" },
    { label: "Pesquisar por Matrícula", href: "/(app)/viaturas", icon: "search-outline", testID: "mais-search-plate" },
    { label: "Registo de Danos", href: "/(app)/danos", icon: "camera-outline", testID: "mais-damages" },
    { label: "Nova Ordem de Serviço", href: "/(app)/servico/new", icon: "construct-outline", testID: "mais-new-wo" },
    { label: "Novo Orçamento", href: "/(app)/orcamento-new", icon: "document-text-outline", testID: "mais-new-quote" },
    { label: "Novo Cliente", href: "/(app)/clientes/new", icon: "person-add-outline", testID: "mais-new-client" },
    { label: "Novo Produto", href: "/(app)/stock/new", icon: "cube-outline", testID: "mais-new-prod" },
    { label: "Nova Encomenda", href: "/(app)/stock/encomenda-new", icon: "cart-outline", testID: "mais-new-po" },
    { label: "Fornecedores", href: "/(app)/fornecedores", icon: "business-outline", testID: "mais-suppliers" },
    { label: "Configurações da oficina", href: "/(app)/configuracoes", icon: "settings-outline", testID: "mais-settings" },
    { label: "Históricos e movimentos", href: "/(app)/historicos", icon: "time-outline", testID: "mais-history" },
    { label: "Encomendas", href: "/(app)/stock/encomendas", icon: "bag-outline", testID: "mais-orders" },
    { label: "Faturação", href: "/(app)/faturacao", icon: "receipt-outline", testID: "mais-invoices" },
    { label: "Orçamentos", href: "/(app)/orcamentos", icon: "documents-outline", testID: "mais-quotes" },
  ];
  return <AreaPage title="Mais" testID="workshop-more" back={false}>
    <Panel title={user?.name} testID="workshop-account"><Text style={areaStyles.hint}>{support?.name || user?.workshop_name}</Text><Text style={areaStyles.label}>{user?.email}</Text></Panel>
    <View style={{ flexDirection: wide ? "row" : "column", flexWrap: "wrap", gap: 16 }}>
      {items.filter(it => user?.can_manage_workshop || support || !["mais-new-prod", "mais-new-po"].includes(it.testID)).map(it => <View key={it.testID} style={{ width: wide ? "48.8%" : "100%" }}><DashboardAction label={it.label} icon={it.icon} testID={it.testID} onPress={() => router.push(it.href)} /></View>)}
    </View>
    {(user?.can_manage_workshop || support) && <Button testID="mais-finance" title="Contas e pagamentos" onPress={() => router.push("/(app)/financeiro")} />}
    <Button testID="logout-btn" title="Sair" variant="ghost" onPress={logoutConfirm} />
  </AreaPage>;
}
