import React from "react";
import { View, Text, StyleSheet, ScrollView, Alert } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/src/api";
import { colors, spacing, radius, shadows } from "@/src/theme";
import { ScreenHeader } from "@/src/components/ScreenHeader";
import { Button } from "@/src/components/Button";
import { formatEUR, formatDateTime } from "@/src/utils/format";

export default function ProductDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["product", id], queryFn: () => api.get(`/products/${id}`), enabled: !!id });
  if (!data) return <View style={{ flex: 1, backgroundColor: colors.surface }}><ScreenHeader title="Produto" back /></View>;
  const low = data.stock <= data.min_stock;

  const del = () => Alert.alert("Apagar produto", "Continuar?", [
    { text: "Cancelar", style: "cancel" },
    { text: "Apagar", style: "destructive", onPress: async () => {
      await api.del(`/products/${id}`);
      qc.invalidateQueries({ queryKey: ["products"] });
      router.back();
    }},
  ]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface }}>
      <ScreenHeader title={data.name} back />
      <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.md, paddingBottom: insets.bottom + 40 }}>
        <View style={styles.card}>
          <Text style={styles.ref}>{data.reference}</Text>
          <Text style={styles.name}>{data.name}</Text>
          <Text style={styles.mut}>{data.supplier || "—"} · {data.category || "—"}</Text>
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Stock atual</Text>
              <Text style={[styles.big, low && { color: colors.error }]}>{data.stock}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Stock mínimo</Text>
              <Text style={styles.big}>{data.min_stock}</Text>
            </View>
          </View>
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Preço compra</Text>
              <Text style={styles.big}>{formatEUR(data.purchase_price)}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Preço venda</Text>
              <Text style={styles.big}>{formatEUR(data.sale_price)}</Text>
            </View>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.section}>Movimentos de Stock</Text>
          {(data.movements || []).length === 0 && <Text style={styles.mut}>Sem movimentos.</Text>}
          {(data.movements || []).map((m: any) => (
            <View key={m.id} style={styles.mvRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.mvReason}>{m.reason}</Text>
                <Text style={styles.mut}>{formatDateTime(m.created_at)}</Text>
              </View>
              <Text style={[styles.mvDelta, { color: m.delta > 0 ? colors.success : colors.error }]}>
                {m.delta > 0 ? "+" : ""}{m.delta}
              </Text>
            </View>
          ))}
        </View>

        <Button title="Apagar produto" variant="danger" testID="prod-delete" onPress={del} />
      </ScrollView>
    </View>
  );
}
const styles = StyleSheet.create({
  card: { backgroundColor: colors.surfaceSecondary, borderRadius: radius.lg, padding: spacing.lg, gap: 8, ...shadows.card },
  ref: { fontSize: 11, color: colors.muted, fontWeight: "700" },
  name: { fontSize: 18, fontWeight: "800", color: colors.onSurface },
  mut: { color: colors.muted, fontSize: 13 },
  row: { flexDirection: "row", gap: 8, marginTop: 8 },
  label: { color: colors.muted, fontSize: 11, fontWeight: "600", textTransform: "uppercase" },
  big: { fontSize: 20, fontWeight: "800", color: colors.onSurface },
  section: { fontSize: 15, fontWeight: "700", color: colors.onSurface, marginBottom: 4 },
  mvRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 6, borderTopWidth: 1, borderTopColor: colors.divider },
  mvReason: { color: colors.onSurface, fontSize: 14 },
  mvDelta: { fontWeight: "800", fontSize: 15 },
});
