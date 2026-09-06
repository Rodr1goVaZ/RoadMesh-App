import React from "react";
import { View, Text, StyleSheet, FlatList } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/src/api";
import { colors, spacing, radius, shadows } from "@/src/theme";
import { ScreenHeader } from "@/src/components/ScreenHeader";
import { EmptyState } from "@/src/components/EmptyState";
import { formatEUR, formatDate } from "@/src/utils/format";

const TYPE_LABEL: any = { orcamento: "Orçamento", fatura: "Fatura", fatura_recibo: "Fatura-Recibo" };
const TYPE_COLOR: any = { orcamento: "#0369A1", fatura: colors.brandPrimary, fatura_recibo: colors.success };

export default function Faturacao() {
  const insets = useSafeAreaInsets();
  const { data = [] } = useQuery({ queryKey: ["invoices"], queryFn: () => api.get("/invoices") });
  return (
    <View style={{ flex: 1, backgroundColor: colors.surface }}>
      <ScreenHeader title="Faturação" back />
      <FlatList
        data={data}
        keyExtractor={(x: any) => x.id}
        contentContainerStyle={{ padding: spacing.lg, gap: 10, paddingBottom: insets.bottom + 40 }}
        ListEmptyComponent={<EmptyState icon="🧾" title="Sem documentos" message="Emita a primeira fatura a partir de uma OS concluída" />}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <Text style={styles.num}>{item.document_number}</Text>
              <Text style={[styles.type, { color: TYPE_COLOR[item.document_type] }]}>{TYPE_LABEL[item.document_type]}</Text>
            </View>
            <Text style={styles.client} numberOfLines={1}>{item.client_name || "Cliente"} · OS {item.wo_number || ""}</Text>
            <Text style={styles.mut}>{formatDate(item.created_at)}</Text>
            <View style={styles.row}>
              <View><Text style={styles.mut}>Mão de obra</Text><Text style={styles.val}>{formatEUR(item.total_labor)}</Text></View>
              <View><Text style={styles.mut}>Peças</Text><Text style={styles.val}>{formatEUR(item.total_parts)}</Text></View>
              <View><Text style={styles.mut}>TOTAL</Text><Text style={[styles.val, { color: colors.brandPrimary }]}>{formatEUR(item.grand_total)}</Text></View>
            </View>
          </View>
        )}
      />
    </View>
  );
}
const styles = StyleSheet.create({
  card: { backgroundColor: colors.surfaceSecondary, borderRadius: radius.lg, padding: spacing.lg, gap: 6, ...shadows.card },
  num: { fontWeight: "800", color: colors.onSurface, fontSize: 15 },
  type: { fontWeight: "700", fontSize: 12 },
  client: { color: colors.onSurface, fontSize: 13, fontWeight: "600" },
  mut: { color: colors.muted, fontSize: 11 },
  val: { color: colors.onSurface, fontWeight: "700", fontSize: 14 },
  row: { flexDirection: "row", justifyContent: "space-between", marginTop: 6 },
});
