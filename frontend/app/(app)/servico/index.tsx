import React, { useState, useMemo } from "react";
import { View, Text, StyleSheet, FlatList, Pressable, TextInput, ScrollView, RefreshControl } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/src/api";
import { colors, spacing, radius, shadows } from "@/src/theme";
import { StatusChip } from "@/src/components/StatusChip";
import { Fab } from "@/src/components/Fab";
import { EmptyState } from "@/src/components/EmptyState";
import { formatEUR, formatDate } from "@/src/utils/format";

const FILTERS = [
  { id: "todos", label: "Todos" },
  { id: "entrada", label: "Entrada" },
  { id: "diagnostico", label: "Diagnóstico" },
  { id: "aguardando_pecas", label: "Aguarda peças" },
  { id: "concluido", label: "Concluído" },
];

export default function OrdensList() {
  const insets = useSafeAreaInsets();
  const [filter, setFilter] = useState("todos");
  const [search, setSearch] = useState("");
  const { data = [], refetch, isRefetching } = useQuery({
    queryKey: ["work-orders", filter, search],
    queryFn: () => api.get(`/work-orders?status_filter=${filter}&search=${encodeURIComponent(search)}`),
  });

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface }}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Text style={styles.title}>Ordens de Serviço</Text>
        <Text style={styles.subtitle}>Gerir e acompanhar as ordens da oficina</Text>
        <View style={styles.searchBox}>
          <TextInput
            testID="wo-search"
            placeholder="Pesquisar por cliente, matrícula, nº..."
            placeholderTextColor={colors.muted}
            value={search} onChangeText={setSearch}
            style={styles.searchInput}
          />
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
          {FILTERS.map(f => (
            <Pressable
              key={f.id}
              testID={`filter-${f.id}`}
              onPress={() => setFilter(f.id)}
              style={[styles.chip, filter === f.id && styles.chipActive]}
            >
              <Text style={[styles.chipTxt, filter === f.id && styles.chipTxtActive]}>{f.label}</Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>
      <FlatList
        data={data}
        keyExtractor={(x: any) => x.id}
        contentContainerStyle={{ padding: spacing.lg, gap: 10, paddingBottom: 100 }}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
        ListEmptyComponent={<EmptyState icon="📋" title="Nenhuma OS encontrada" message="Crie a sua primeira ordem de serviço" />}
        renderItem={({ item }) => (
          <Pressable testID={`wo-item-${item.number}`} onPress={() => router.push(`/(app)/servico/${item.id}`)} style={[styles.card]}>
            <View style={styles.rowTop}>
              <Text style={styles.number}>{item.number}</Text>
              <StatusChip status={item.status} />
            </View>
            <Text style={styles.client} numberOfLines={1}>{item.client_name}</Text>
            <Text style={styles.vehicle} numberOfLines={1}>{item.vehicle_label} · {item.license_plate}</Text>
            <View style={styles.rowBottom}>
              <Text style={styles.date}>{formatDate(item.created_at)}</Text>
              <Text style={styles.total}>{formatEUR(item.total)}</Text>
            </View>
          </Pressable>
        )}
      />
      <Fab testID="fab-new-wo" onPress={() => router.push("/(app)/servico/new")} />
    </View>
  );
}
const styles = StyleSheet.create({
  header: { backgroundColor: colors.surface, paddingHorizontal: spacing.lg, paddingBottom: 8, gap: 8 },
  title: { fontSize: 22, fontWeight: "800", color: colors.onSurface },
  subtitle: { color: colors.muted, fontSize: 13 },
  searchBox: { backgroundColor: colors.surfaceSecondary, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 12, marginTop: 8 },
  searchInput: { paddingVertical: 10, fontSize: 14, color: colors.onSurface },
  chipsRow: { gap: 8, paddingVertical: 8, paddingRight: 12 },
  chip: { paddingHorizontal: 14, height: 36, borderRadius: 999, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surfaceSecondary, justifyContent: "center", flexShrink: 0 },
  chipActive: { backgroundColor: colors.brandPrimary, borderColor: colors.brandPrimary },
  chipTxt: { color: colors.onSurface, fontSize: 13, fontWeight: "600" },
  chipTxtActive: { color: "#fff" },
  card: { backgroundColor: colors.surfaceSecondary, borderRadius: radius.lg, padding: spacing.lg, gap: 6, ...shadows.card },
  rowTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  number: { fontWeight: "800", fontSize: 15, color: colors.onSurface },
  client: { fontSize: 14, color: colors.onSurface, fontWeight: "600" },
  vehicle: { fontSize: 12, color: colors.muted },
  rowBottom: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 4 },
  date: { fontSize: 12, color: colors.muted },
  total: { fontWeight: "700", color: colors.onSurface },
});
