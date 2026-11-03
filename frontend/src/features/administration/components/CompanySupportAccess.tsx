import React, { useRef, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { router } from "expo-router";
import { useAuth } from "@/src/core/auth/AuthProvider";
import { CompanyModule, companyHome, companyModules } from "@/src/core/auth/company-modules";
import { Button } from "@/src/shared/ui/Button";
import { Feedback } from "@/src/shared/ui/Feedback";
import { colors as c } from "@/src/shared/theme/legacy";

type Company = { id: string; name: string; status: string; modules?: CompanyModule[] };

export function CompanySupportAccess({ company }: { company: Company }) {
  const { startSupport } = useAuth();
  const pending = useRef(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const available = company.status !== "archived" && companyModules(company).length > 0;

  const enter = async () => {
    if (pending.current || !available) return;
    pending.current = true; setBusy(true); setError("");
    try {
      const context = await startSupport(company.id);
      router.replace(companyHome(context));
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "Não foi possível iniciar o modo de suporte. Tente novamente.");
    } finally {
      pending.current = false; setBusy(false);
    }
  };

  return <View style={s.card} testID="admin-workshop-support">
    <View style={s.heading}><Ionicons name="headset-outline" size={24} color={c.brandPrimary} /><Text accessibilityRole="header" style={s.title}>Suporte à empresa</Text></View>
    <Text style={s.hint}>{available
      ? `Aceda a ${company.name} com a sua conta de administrador. O acesso fica registado e pode regressar à administração em “Sair do modo”.`
      : "O modo de suporte não está disponível para empresas arquivadas ou sem módulos ativos."}</Text>
    <Button testID="admin-enter-support" title="Entrar no modo de suporte" disabled={!available} loading={busy} onPress={() => { void enter(); }} />
    <Feedback testID="admin-support-error" error message={error} />
  </View>;
}

const s = StyleSheet.create({
  card: { backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: c.border, borderRadius: 22, padding: 24, gap: 16 },
  heading: { flexDirection: "row", alignItems: "center", gap: 12 },
  title: { flex: 1, fontSize: 20, fontWeight: "700", color: c.onSurface },
  hint: { fontSize: 13, color: c.muted, lineHeight: 21 },
});
