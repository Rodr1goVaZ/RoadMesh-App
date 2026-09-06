import React, { useState } from "react";
import { View, Text, StyleSheet, FlatList, Pressable, TextInput, RefreshControl } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/src/api";
import { colors, spacing, radius, shadows } from "@/src/theme";
import { Fab } from "@/src/components/Fab";
import { EmptyState } from "@/src/components/EmptyState";

export default function Clientes() {
  const insets = useSafeAreaInsets();
  const [search, setSearch] = useState("");
  const { data = [], refetch, isRefetching } = useQuery({
    queryKey: ["clients", search],
    queryFn: () => api.get(`/clients?search=${encodeURIComponent(search)}`),
  });

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface }}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Text style={styles.title}>Clientes</Text>
        <View style={styles.searchBox}>
          <TextInput
            testID="client-search"
            placeholder="Pesquisar por nome, NIF, telefone..."
            placeholderTextColor={colors.muted}
            value={search} onChangeText={setSearch} style={styles.searchInput}
          />
        </View>
      </View>
      <FlatList
        data={data}
        keyExtractor={(x: any) => x.id}
        contentContainerStyle={{ padding: spacing.lg, gap: 10, paddingBottom: 100 }}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
        ListEmptyComponent={<EmptyState icon="👥" title="Nenhum cliente" message="Adicione o primeiro cliente para começar" actionLabel="+ Novo Cliente" onAction={() => router.push("/(app)/clientes/new")} />}
        renderItem={({ item }) => (
          <Pressable testID={`client-item-${item.name}`} onPress={() => router.push(`/(app)/clientes/${item.id}`)} style={styles.card}>
            <View style={styles.avatar}><Text style={styles.avatarTxt}>{item.name.slice(0, 2).toUpperCase()}</Text></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
              <Text style={styles.sub} numberOfLines={1}>{item.phone || "—"}</Text>
            </View>
            <Text style={styles.count}>{item.vehicles_count} viatura{item.vehicles_count === 1 ? "" : "s"}</Text>
          </Pressable>
        )}
      />
      <Fab testID="fab-new-client" onPress={() => router.push("/(app)/clientes/new")} />
    </View>
  );
}
const styles = StyleSheet.create({
  header: { backgroundColor: colors.surface, paddingHorizontal: spacing.lg, paddingBottom: 8, gap: 8 },
  title: { fontSize: 22, fontWeight: "800", color: colors.onSurface },
  searchBox: { backgroundColor: colors.surfaceSecondary, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 12 },
  searchInput: { paddingVertical: 10, fontSize: 14, color: colors.onSurface },
  card: { backgroundColor: colors.surfaceSecondary, borderRadius: radius.lg, padding: spacing.md, flexDirection: "row", alignItems: "center", gap: 12, ...shadows.card },
  avatar: { width: 40, height: 40, borderRadius: 999, backgroundColor: colors.brandTertiary, alignItems: "center", justifyContent: "center" },
  avatarTxt: { fontWeight: "800", color: colors.brandPrimary, fontSize: 13 },
  name: { fontSize: 15, fontWeight: "700", color: colors.onSurface },
  sub: { color: colors.muted, fontSize: 12 },
  count: { color: colors.muted, fontSize: 11 },
});
