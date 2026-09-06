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
import { formatEUR, formatDate } from "@/src/utils/format";

export default function Orders() {
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const { data = [] } = useQuery({ queryKey: ["purchase-orders"], queryFn: () => api.get("/purchase-orders") });

  const receive = (id: string) => Alert.alert("Rececionar", "Atualizar stock?", [
    { text: "Cancelar", style: "cancel" },
    { text: "Rececionar", onPress: async () => {
      await api.post(`/purchase-orders/${id}/receive`, {});
      qc.invalidateQueries({ queryKey: ["purchase-orders"] });
      qc.invalidateQueries({ queryKey: ["products"] });
    }},
  ]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface }}>
      <ScreenHeader title="Encomendas" back />
      <FlatList
        data={data}
        keyExtractor={(x: any) => x.id}
        contentContainerStyle={{ padding: spacing.lg, gap: 10, paddingBottom: 100 }}
        ListEmptyComponent={<EmptyState icon="🚚" title="Sem encomendas" message="Crie a primeira encomenda a fornecedores" />}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <Text style={styles.sup}>{item.supplier}</Text>
              <Text style={[styles.status, { color: item.status === "recebida" ? colors.success : colors.warning }]}>
                {item.status === "recebida" ? "Recebida" : "Pendente"}
              </Text>
            </View>
            <Text style={styles.mut}>{formatDate(item.created_at)} · {item.items.length} item(s)</Text>
            <Text style={styles.total}>{formatEUR(item.total)}</Text>
            {item.status !== "recebida" && (
              <Pressable testID={`receive-${item.id}`} onPress={() => receive(item.id)} style={styles.btn}>
                <Text style={styles.btnTxt}>Rececionar</Text>
              </Pressable>
            )}
          </View>
        )}
      />
      <Fab testID="fab-new-order" onPress={() => router.push("/(app)/stock/encomenda-new")} />
    </View>
  );
}
const styles = StyleSheet.create({
  card: { backgroundColor: colors.surfaceSecondary, borderRadius: radius.lg, padding: spacing.lg, gap: 6, ...shadows.card },
  sup: { fontWeight: "700", color: colors.onSurface, fontSize: 15 },
  status: { fontWeight: "700", fontSize: 12 },
  mut: { color: colors.muted, fontSize: 12 },
  total: { fontWeight: "800", color: colors.brandPrimary, fontSize: 16, marginTop: 4 },
  btn: { alignSelf: "flex-start", backgroundColor: colors.brandPrimary, paddingVertical: 8, paddingHorizontal: 14, borderRadius: 8, marginTop: 8 },
  btnTxt: { color: "#fff", fontWeight: "700", fontSize: 13 },
});
