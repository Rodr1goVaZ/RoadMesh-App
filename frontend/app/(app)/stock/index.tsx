import React, { useState } from "react";
import { View, Text, StyleSheet, FlatList, Pressable, TextInput, ScrollView, RefreshControl } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/src/api";
import { colors, spacing, radius, shadows } from "@/src/theme";
import { Fab } from "@/src/components/Fab";
import { EmptyState } from "@/src/components/EmptyState";
import { formatEUR } from "@/src/utils/format";

const CATS = ["todos", "Óleos", "Travões", "Filtros", "Baterias", "Pneus"];

export default function Products() {
  const insets = useSafeAreaInsets();
  const [search, setSearch] = useState("");
  const [cat, setCat] = useState("todos");
  const { data = [], refetch, isRefetching } = useQuery({
    queryKey: ["products", search, cat],
    queryFn: () => api.get(`/products?search=${encodeURIComponent(search)}&category=${encodeURIComponent(cat)}`),
  });

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface }}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <View style={styles.headerTop}>
          <Text style={styles.title}>Produtos</Text>
          <Pressable testID="goto-orders" onPress={() => router.push("/(app)/stock/encomendas")}>
            <Text style={styles.link}>Encomendas ›</Text>
          </Pressable>
        </View>
        <View style={styles.searchBox}>
          <TextInput testID="prod-search" placeholder="Pesquisar produto, referência..." placeholderTextColor={colors.muted}
                     value={search} onChangeText={setSearch} style={styles.searchInput} />
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
          {CATS.map(c => (
            <Pressable key={c} testID={`cat-${c}`} onPress={() => setCat(c)} style={[styles.chip, cat === c && styles.chipActive]}>
              <Text style={[styles.chipTxt, cat === c && styles.chipTxtActive]}>{c === "todos" ? "Todos" : c}</Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>
      <FlatList
        data={data}
        keyExtractor={(x: any) => x.id}
        contentContainerStyle={{ padding: spacing.lg, gap: 10, paddingBottom: 100 }}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
        ListEmptyComponent={<EmptyState icon="📦" title="Stock vazio" message="Adicione o primeiro produto" actionLabel="+ Novo Produto" onAction={() => router.push("/(app)/stock/new")} />}
        renderItem={({ item }) => {
          const low = item.stock <= item.min_stock;
          return (
            <Pressable testID={`prod-item-${item.reference}`} onPress={() => router.push(`/(app)/stock/${item.id}`)} style={styles.card}>
              <View style={{ flex: 1, gap: 4 }}>
                <Text style={styles.ref}>{item.reference}</Text>
                <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
                <Text style={styles.sup}>{item.supplier || "—"}</Text>
              </View>
              <View style={{ alignItems: "flex-end" }}>
                <Text style={[styles.stock, low && { color: colors.error }]}>{item.stock}</Text>
                <Text style={styles.price}>{formatEUR(item.sale_price)}</Text>
              </View>
            </Pressable>
          );
        }}
      />
      <Fab testID="fab-new-product" onPress={() => router.push("/(app)/stock/new")} />
    </View>
  );
}
const styles = StyleSheet.create({
  header: { backgroundColor: colors.surface, paddingHorizontal: spacing.lg, paddingBottom: 8, gap: 8 },
  headerTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  title: { fontSize: 22, fontWeight: "800", color: colors.onSurface },
  link: { color: colors.brandPrimary, fontWeight: "700" },
  searchBox: { backgroundColor: colors.surfaceSecondary, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 12 },
  searchInput: { paddingVertical: 10, fontSize: 14, color: colors.onSurface },
  chipsRow: { gap: 8, paddingVertical: 4, paddingRight: 12 },
  chip: { paddingHorizontal: 14, height: 34, borderRadius: 999, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surfaceSecondary, justifyContent: "center", flexShrink: 0 },
  chipActive: { backgroundColor: colors.brandPrimary, borderColor: colors.brandPrimary },
  chipTxt: { color: colors.onSurface, fontSize: 13, fontWeight: "600" },
  chipTxtActive: { color: "#fff" },
  card: { backgroundColor: colors.surfaceSecondary, borderRadius: radius.lg, padding: spacing.lg, flexDirection: "row", gap: 12, ...shadows.card },
  ref: { fontSize: 11, color: colors.muted, fontWeight: "700" },
  name: { fontSize: 14, fontWeight: "700", color: colors.onSurface },
  sup: { fontSize: 12, color: colors.muted },
  stock: { fontSize: 18, fontWeight: "800", color: colors.onSurface },
  price: { color: colors.muted, fontSize: 13, marginTop: 2 },
});
