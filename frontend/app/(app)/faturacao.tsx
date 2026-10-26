import { useListState } from "@/src/shared/hooks/useListState";
import { YearFilter } from "@/src/shared/ui/YearFilter";
import React from "react";
import { View, Text, FlatList, StyleSheet, ActivityIndicator } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/src/core/http/api";
import { colors, spacing } from "@/src/shared/theme/legacy";
import { ScreenHeader } from "@/src/shared/layout/ScreenHeader";
import { Feedback } from "@/src/shared/ui/Feedback";
import { Button } from "@/src/shared/ui/Button";
import { InvoiceCard } from "@/src/features/finance/components/InvoiceCard";

export default function Invoices() {
  const [year, setYear] = useListState("faturacao-year", "");
  const { data = [], error, isLoading, refetch, isRefetching } = useQuery({ queryKey: ["invoices", year], queryFn: () => api.get(`/invoices${year.length === 4 ? "?year=" + year : ""}`) });
  return <View style={styles.screen}>
    <ScreenHeader title="Faturação" back testID="invoices-header" />
    <FlatList data={data} keyExtractor={(item: any) => item.id} contentContainerStyle={styles.list} refreshing={isRefetching} onRefresh={refetch}
      ListHeaderComponent={<>
        <YearFilter resource="invoices" value={year} onChange={setYear} />
        <Text testID="invoices-internal-notice" style={styles.hint}>Documentos internos, sem validade fiscal. Exporte o PDF para guardar ou enviar ao cliente.</Text>
        {isLoading && <ActivityIndicator testID="invoices-loading" color={colors.brandPrimary} />}
        <Feedback testID="invoices-error" error message={error?.message} />
        {error && <Button testID="invoices-retry" title="Tentar novamente" onPress={() => refetch()} />}
      </>}
      ListEmptyComponent={!isLoading && !error ? <Text testID="invoices-empty" style={styles.hint}>Sem documentos. Emita uma fatura a partir de uma ordem de serviço.</Text> : null}
      renderItem={({ item }) => <InvoiceCard invoice={item} />} />
  </View>;
}
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.surface },
  list: { width: "100%", maxWidth: 1100, alignSelf: "center", padding: spacing.lg, gap: 16, paddingBottom: 40 },
  hint: { color: colors.muted, fontSize: 14, lineHeight: 21, paddingBottom: 8 },
});