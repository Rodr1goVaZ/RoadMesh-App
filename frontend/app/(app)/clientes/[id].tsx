import React, { useState } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable, Alert, KeyboardAvoidingView, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/src/api";
import { colors, spacing, radius, shadows } from "@/src/theme";
import { StatusChip } from "@/src/components/StatusChip";
import { ScreenHeader } from "@/src/components/ScreenHeader";
import { Button } from "@/src/components/Button";
import { formatEUR, formatDate } from "@/src/utils/format";
import { ClientContactEditor } from "@/src/components/ClientContactEditor";

const TABS = ["contactos", "viaturas", "historico"] as const;

export default function ClientDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const [tab, setTab] = useState<typeof TABS[number]>("contactos");
  const { data } = useQuery({ queryKey: ["client", id], queryFn: () => api.get(`/clients/${id}`), enabled: !!id });
  if (!data) return <View style={{ flex: 1, backgroundColor: colors.surface }}><ScreenHeader title="Cliente" back /></View>;

  const del = () => Alert.alert("Apagar cliente", "Continuar?", [
    { text: "Cancelar", style: "cancel" },
    { text: "Apagar", style: "destructive", onPress: async () => {
      await api.del(`/clients/${id}`);
      qc.invalidateQueries({ queryKey: ["clients"] });
      router.back();
    }},
  ]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface }}>
      <ScreenHeader title={data.name} back testID="client-detail-header" />
      <View style={styles.tabs}>
        {TABS.map(t => (
          <Pressable key={t} testID={`tab-${t}`} onPress={() => setTab(t)} style={[styles.tab, tab === t && styles.tabActive]}>
            <Text style={[styles.tabTxt, tab === t && styles.tabTxtActive]}>{t.charAt(0).toUpperCase() + t.slice(1)}</Text>
          </Pressable>
        ))}
      </View>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : "height"}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: spacing.lg, gap: spacing.md, paddingBottom: insets.bottom + 40 }}>
        {tab === "contactos" && (
          <View style={styles.card}>
            <Row label="Nome" value={data.name} />
            <Row label="NIF" value={data.nif || "—"} />
            <Row label="Telefone" value={data.phone || "—"} />
            <Row label="Email" value={data.email || "—"} />
            <Row label="Morada" value={data.address || "—"} />
            <ClientContactEditor key={data.id} client={data} />
            <View style={{ height: 8 }} />
            <Button title="Apagar cliente" variant="danger" testID="client-delete" onPress={del} />
          </View>
        )}
        {tab === "viaturas" && (
          <>
            {(data.vehicles || []).length === 0 && <Text style={styles.mut}>Sem viaturas registadas.</Text>}
            {(data.vehicles || []).map((v: any) => (
              <Pressable key={v.id} testID={`client-vehicle-${v.id}`} onPress={() => router.push({ pathname: "/(app)/viatura", params: { id: v.id } })} style={[styles.card, { gap: 4 }]}>
                <Text style={styles.title}>{v.make} {v.model}</Text>
                <Text style={styles.mut}>{v.license_plate} · {v.year || "—"} · {v.fuel || "—"}</Text>
                <Text style={styles.link}>Ver viatura, fotos e danos →</Text>
              </Pressable>
            ))}
            <Button title="+ Adicionar viatura" variant="secondary" testID="add-vehicle"
                    onPress={() => router.push(`/(app)/clientes/viatura-new?client_id=${id}`)} />
          </>
        )}
        {tab === "historico" && (
          <>
            {(data.work_orders || []).length === 0 && <Text style={styles.mut}>Sem histórico de intervenções.</Text>}
            {(data.work_orders || []).map((w: any) => (
              <Pressable key={w.id} onPress={() => router.push(`/(app)/servico/${w.id}`)} style={styles.card}>
                <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                  <Text style={styles.title}>{w.number}</Text>
                  <StatusChip status={w.status} />
                </View>
                <Text style={styles.mut}>{formatDate(w.created_at)} · {formatEUR(w.total)}</Text>
              </Pressable>
            ))}
          </>
        )}
      </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
function Row({ label, value }: any) {
  return <View style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 6 }}>
    <Text style={{ color: colors.muted, fontSize: 13 }}>{label}</Text>
    <Text style={{ color: colors.onSurface, fontSize: 14, fontWeight: "600", maxWidth: "60%", textAlign: "right" }}>{value}</Text>
  </View>;
}
const styles = StyleSheet.create({
  flex: { flex: 1 },
  tabs: { flexDirection: "row", paddingHorizontal: spacing.lg, gap: 8, paddingVertical: 4 },
  tab: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 999, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surfaceSecondary },
  tabActive: { backgroundColor: colors.brandPrimary, borderColor: colors.brandPrimary },
  tabTxt: { color: colors.onSurface, fontWeight: "600", fontSize: 13 },
  tabTxtActive: { color: "#fff" },
  card: { backgroundColor: colors.surfaceSecondary, borderRadius: radius.lg, padding: spacing.lg, ...shadows.card },
  title: { fontSize: 15, fontWeight: "700", color: colors.onSurface },
  mut: { color: colors.muted, fontSize: 12, marginTop: 2 },
  link: { color: colors.brandPrimary, fontWeight: "600", marginTop: 6, fontSize: 13 },
});
