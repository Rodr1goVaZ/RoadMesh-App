import React from "react";
import { View, Text, FlatList, StyleSheet, ActivityIndicator } from "react-native";
import { router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/src/api";
import { colors, spacing } from "@/src/theme";
import { ScreenHeader } from "@/src/components/ScreenHeader";
import { Feedback } from "@/src/components/Feedback";
import { Button } from "@/src/components/Button";
import { Fab } from "@/src/components/Fab";
import { QuoteCard } from "@/src/components/QuoteCard";

export default function Quotes() {
  const { data = [], error, isLoading, refetch, isRefetching } = useQuery({ queryKey: ["quotes"], queryFn: () => api.get("/quotes") });
  return <View style={styles.screen}>
    <ScreenHeader title="Orçamentos" back testID="quotes-header" />
    <FlatList data={data} keyExtractor={(item: any) => item.id} contentContainerStyle={styles.list} refreshing={isRefetching} onRefresh={refetch}
      ListHeaderComponent={<>
        <Text testID="quotes-sharing-help" style={styles.hint}>Envie ao cliente por email ou WhatsApp. O envio é concluído na aplicação escolhida.</Text>
        {isLoading && <ActivityIndicator testID="quotes-loading" color={colors.brandPrimary} />}
        <Feedback testID="quotes-error" error message={error?.message} />
        {error && <Button testID="quotes-retry" title="Tentar novamente" onPress={() => refetch()} />}
      </>}
      ListEmptyComponent={!isLoading && !error ? <Text testID="quotes-empty" style={styles.hint}>Sem orçamentos. Crie o primeiro no botão +.</Text> : null}
      renderItem={({ item }) => <QuoteCard quote={item} />} />
    <Fab testID="fab-new-quote" onPress={() => router.push("/(app)/orcamento-new")} />
  </View>;
}
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.surface },
  list: { padding: spacing.lg, gap: 16, paddingBottom: 100 },
  hint: { color: colors.muted, fontSize: 14, lineHeight: 21, paddingBottom: 8 },
});