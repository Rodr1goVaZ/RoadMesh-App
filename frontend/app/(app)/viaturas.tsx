import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, FlatList, Pressable, ActivityIndicator, KeyboardAvoidingView, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/src/api";
import { Input } from "@/src/components/Input";
import { ScreenHeader } from "@/src/components/ScreenHeader";
import { Feedback } from "@/src/components/Feedback";
import { Button } from "@/src/components/Button";
import { colors, radius, spacing, shadows } from "@/src/theme";

export default function Vehicles() {
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  useEffect(() => { const timer = setTimeout(() => setQuery(search), 250); return () => clearTimeout(timer); }, [search]);
  const { data = [], isLoading, error, refetch } = useQuery({ queryKey: ["vehicle-search", query], queryFn: () => api.get(`/vehicles?search=${encodeURIComponent(query)}`) });
  const searching = isLoading || query !== search;
  return <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.screen}>
    <ScreenHeader title="Pesquisar matrícula" back testID="vehicle-search-header" />
    <View style={styles.search}>
      <Input testID="vehicle-plate-search" label="Matrícula" value={search} onChangeText={setSearch} autoCapitalize="characters" autoCorrect={false} placeholder="Ex.: AA-12-BB ou AA12BB" returnKeyType="search" />
      <Text testID="vehicle-search-help" style={styles.hint}>Todas as viaturas da sua oficina, mesmo sem OS.</Text>
      {search ? <Button testID="vehicle-search-clear" title="Limpar pesquisa" variant="ghost" onPress={() => setSearch("")} /> : null}
      {searching && <ActivityIndicator testID="vehicle-search-loading" color={colors.brandPrimary} />}
      {!searching && !error && <Text testID="vehicle-search-count" style={styles.hint}>{data.length} viatura(s) encontrada(s)</Text>}
      <Feedback testID="vehicle-search-error" error message={error?.message} />
      {error && <Button testID="vehicle-search-retry" title="Tentar novamente" variant="secondary" onPress={() => refetch()} />}
    </View>
    <FlatList data={searching ? [] : data} keyExtractor={(v: any) => v.id} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.list}
      ListEmptyComponent={!searching && !error ? <Text testID="vehicle-search-empty" style={styles.empty}>Nenhuma viatura encontrada.</Text> : null}
      renderItem={({ item }) => <Pressable testID={`vehicle-result-${item.id}`} onPress={() => router.push({ pathname: "/(app)/viatura", params: { id: item.id } })} style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
        <View style={styles.icon}><Ionicons name="car-outline" size={26} color={colors.brandPrimary} /></View>
        <View style={styles.info}>
          <Text testID={`vehicle-plate-${item.id}`} style={styles.plate}>{item.license_plate}</Text>
          <Text testID={`vehicle-model-${item.id}`} style={styles.model}>{item.make} {item.model}</Text>
          <Text testID={`vehicle-owner-${item.id}`} style={styles.hint}>{item.client_name || "Sem cliente associado"}</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={colors.muted} />
      </Pressable>} />
  </KeyboardAvoidingView>;
}
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.surface },
  search: { padding: spacing.lg, gap: 8 },
  hint: { color: colors.muted, fontSize: 13, lineHeight: 19 },
  list: { padding: spacing.lg, paddingTop: 4, gap: 12, paddingBottom: 40 },
  card: { flexDirection: "row", alignItems: "center", gap: 12, padding: spacing.lg, borderRadius: radius.lg, backgroundColor: colors.surfaceSecondary, ...shadows.card },
  icon: { padding: 12, borderRadius: radius.md, backgroundColor: colors.brandTertiary },
  info: { flex: 1, gap: 4 },
  plate: { fontWeight: "800", fontSize: 18, letterSpacing: 1, color: colors.onSurface },
  model: { color: colors.onSurface, fontSize: 15 },
  empty: { paddingVertical: 32, textAlign: "center", color: colors.muted },
  pressed: { opacity: .7 },
});