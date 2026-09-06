import React from "react";
import { View, Text, StyleSheet, FlatList, Pressable, Alert } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/src/api";
import { colors, spacing, radius, shadows } from "@/src/theme";
import { ScreenHeader } from "@/src/components/ScreenHeader";
import { EmptyState } from "@/src/components/EmptyState";
import { Fab } from "@/src/components/Fab";
import { formatEUR, formatDate, QUOTE_STATUS_LABELS } from "@/src/utils/format";

export default function Orcamentos() {
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const { data = [] } = useQuery({ queryKey: ["quotes"], queryFn: () => api.get("/quotes") });

  const setStatus = (id: string, status: string) => Alert.alert("Alterar estado", `Marcar como ${QUOTE_STATUS_LABELS[status]}?`, [
    { text: "Cancelar", style: "cancel" },
    { text: "Confirmar", onPress: async () => {
      await api.post(`/quotes/${id}/status`, { status });
      qc.invalidateQueries({ queryKey: ["quotes"] });
    }},
  ]);

  const convert = (id: string) => Alert.alert("Converter em OS?", "Isto cria uma nova Ordem de Serviço.", [
    { text: "Cancelar", style: "cancel" },
    { text: "Converter", onPress: async () => {
      try {
        await api.post(`/quotes/${id}/convert`, {});
        qc.invalidateQueries({ queryKey: ["work-orders"] });
        Alert.alert("OK", "OS criada");
      } catch (e: any) { Alert.alert("Erro", e.message); }
    }},
  ]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface }}>
      <ScreenHeader title="Orçamentos" back />
      <FlatList
        data={data}
        keyExtractor={(x: any) => x.id}
        contentContainerStyle={{ padding: spacing.lg, gap: 10, paddingBottom: 100 }}
        ListEmptyComponent={<EmptyState icon="💰" title="Sem orçamentos" message="Crie o primeiro orçamento" />}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <Text style={styles.num}>{item.number}</Text>
              <Text style={styles.status}>{QUOTE_STATUS_LABELS[item.status]}</Text>
            </View>
            <Text style={styles.client}>{item.client_name}</Text>
            <Text style={styles.mut}>{formatDate(item.created_at)}</Text>
            <Text style={styles.total}>{formatEUR(item.total)}</Text>
            <View style={styles.actions}>
              {item.status === "rascunho" && <Pressable onPress={() => setStatus(item.id, "enviado")} style={styles.btn}><Text style={styles.btnTxt}>Enviar</Text></Pressable>}
              {item.status === "enviado" && <>
                <Pressable onPress={() => setStatus(item.id, "aceite")} style={styles.btn}><Text style={styles.btnTxt}>Aceite</Text></Pressable>
                <Pressable onPress={() => setStatus(item.id, "recusado")} style={[styles.btn, { backgroundColor: colors.error }]}><Text style={styles.btnTxt}>Recusar</Text></Pressable>
              </>}
              {item.status === "aceite" && <Pressable onPress={() => convert(item.id)} style={styles.btn}><Text style={styles.btnTxt}>Converter em OS</Text></Pressable>}
            </View>
          </View>
        )}
      />
      <Fab testID="fab-new-quote" onPress={() => router.push("/(app)/orcamento-new")} />
    </View>
  );
}
const styles = StyleSheet.create({
  card: { backgroundColor: colors.surfaceSecondary, borderRadius: radius.lg, padding: spacing.lg, gap: 4, ...shadows.card },
  num: { fontWeight: "800", color: colors.onSurface, fontSize: 15 },
  status: { fontWeight: "700", color: colors.brandPrimary, fontSize: 12 },
  client: { color: colors.onSurface, fontSize: 14, fontWeight: "600" },
  mut: { color: colors.muted, fontSize: 12 },
  total: { color: colors.brandPrimary, fontWeight: "800", fontSize: 16, marginTop: 4 },
  actions: { flexDirection: "row", gap: 8, marginTop: 8, flexWrap: "wrap" },
  btn: { backgroundColor: colors.brandPrimary, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6 },
  btnTxt: { color: "#fff", fontWeight: "700", fontSize: 12 },
});
