import React from "react";
import { View, Text, StyleSheet, ScrollView, Pressable, Alert } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useAuth } from "@/src/auth";
import { colors, spacing, radius, shadows } from "@/src/theme";
import { LogoWithText } from "@/src/components/Logo";

export default function Mais() {
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuth();

  const logoutConfirm = () => Alert.alert("Sair", "Terminar sessão?", [
    { text: "Cancelar", style: "cancel" },
    { text: "Sair", style: "destructive", onPress: async () => { await logout(); router.replace("/(auth)/login"); } },
  ]);

  const items = [
    { label: "Marcações dos Clientes", onPress: () => router.push("/(app)/marcacoes"), testID: "mais-appointments" },
    { label: "Pesquisar por Matrícula", onPress: () => router.push("/(app)/viaturas"), testID: "mais-search-plate" },
    { label: "Registo de Danos", onPress: () => router.push("/(app)/danos"), testID: "mais-damages" },
    { label: "Nova Ordem de Serviço", onPress: () => router.push("/(app)/servico/new"), testID: "mais-new-wo" },
    { label: "Novo Orçamento", onPress: () => router.push("/(app)/orcamento-new"), testID: "mais-new-quote" },
    { label: "Novo Cliente", onPress: () => router.push("/(app)/clientes/new"), testID: "mais-new-client" },
    { label: "Novo Produto", onPress: () => router.push("/(app)/stock/new"), testID: "mais-new-prod" },
    { label: "Nova Encomenda", onPress: () => router.push("/(app)/stock/encomenda-new"), testID: "mais-new-po" },
    { label: "Encomendas", onPress: () => router.push("/(app)/stock/encomendas"), testID: "mais-orders" },
    { label: "Faturação", onPress: () => router.push("/(app)/faturacao"), testID: "mais-invoices" },
    { label: "Orçamentos", onPress: () => router.push("/(app)/orcamentos"), testID: "mais-quotes" },
  ];

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.surface }} contentContainerStyle={{ paddingTop: insets.top + 12, paddingBottom: insets.bottom + 40 }}>
      <View style={{ paddingHorizontal: spacing.lg, gap: spacing.lg }}>
        <LogoWithText testID="more-brand" />
        <View style={styles.userCard}>
          <View style={styles.avatar}><Text style={styles.avatarTxt}>{(user?.name || "?").slice(0, 2).toUpperCase()}</Text></View>
          <View style={{ flex: 1 }}>
            <Text style={styles.name}>{user?.name}</Text>
            <Text style={styles.mut}>{user?.workshop_name}</Text>
            <Text style={styles.mut}>{user?.email}</Text>
          </View>
        </View>
        <Text style={styles.section}>Atalhos</Text>
        {items.map((it, i) => (
          <Pressable key={i} testID={it.testID} onPress={it.onPress} style={styles.row}>
            <Text style={styles.rowTxt}>{it.label}</Text>
            <Text style={{ color: colors.muted, fontSize: 18 }}>›</Text>
          </Pressable>
        ))}
        <Pressable testID="logout-btn" onPress={logoutConfirm} style={[styles.row, { marginTop: 8 }]}>
          <Text style={[styles.rowTxt, { color: colors.error }]}>Sair</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}
const styles = StyleSheet.create({
  userCard: { backgroundColor: colors.surfaceSecondary, borderRadius: radius.lg, padding: spacing.lg, flexDirection: "row", alignItems: "center", gap: 12, ...shadows.card },
  avatar: { width: 48, height: 48, borderRadius: 999, backgroundColor: colors.brandPrimary, alignItems: "center", justifyContent: "center" },
  avatarTxt: { color: "#fff", fontWeight: "800", fontSize: 15 },
  name: { fontWeight: "800", color: colors.onSurface, fontSize: 16 },
  mut: { color: colors.muted, fontSize: 12 },
  section: { fontWeight: "700", color: colors.onSurface, fontSize: 14, marginTop: 8 },
  row: { backgroundColor: colors.surfaceSecondary, borderRadius: radius.md, paddingVertical: 14, paddingHorizontal: 16, flexDirection: "row", justifyContent: "space-between", alignItems: "center", ...shadows.card },
  rowTxt: { color: colors.onSurface, fontWeight: "600", fontSize: 14 },
});
