import React from "react";
import { View, Text, ScrollView, StyleSheet, ActivityIndicator } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import { api } from "@/src/api";
import { ScreenHeader } from "@/src/components/ScreenHeader";
import { Button } from "@/src/components/Button";
import { Feedback } from "@/src/components/Feedback";
import { DamageQuickActions } from "@/src/components/DamageQuickActions";
import { colors, radius, spacing, shadows } from "@/src/theme";
import { formatDate, formatEUR } from "@/src/utils/format";

export default function VehicleDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, isLoading, error, refetch } = useQuery({ queryKey: ["vehicle", id], queryFn: () => api.get(`/vehicles/${id}`), enabled: !!id });
  return <View style={styles.screen}>
    <ScreenHeader title="Ficha da viatura" back testID="vehicle-detail-header" />
    <ScrollView contentContainerStyle={styles.content}>
      {isLoading && <ActivityIndicator testID="vehicle-detail-loading" color={colors.brandPrimary} />}
      <Feedback testID="vehicle-detail-error" message={error?.message} error />
      {error && <Button testID="vehicle-detail-retry" title="Tentar novamente" onPress={() => refetch()} />}
      {data && <>
        <View style={styles.card}>
          <Text testID="vehicle-detail-plate" style={styles.plate}>{data.license_plate}</Text>
          <Text testID="vehicle-detail-model" style={styles.title}>{data.make} {data.model}</Text>
          <Text testID="vehicle-detail-specs" style={styles.hint}>{data.year || "Ano não indicado"} · {data.mileage != null ? `${data.mileage} km` : "Km não indicados"}</Text>
          <Text testID="vehicle-detail-client" style={styles.hint}>{data.client?.name || "Sem cliente associado"}</Text>
          {data.client && <Button title="Ver cliente" testID="vehicle-open-client" variant="ghost" onPress={() => router.push(`/(app)/clientes/${data.client_id}`)} />}
        </View>
        <DamageQuickActions vehicleId={id} testID="vehicle-damage" />
        <Button testID="vehicle-open-damages" title={`Ver danos (${data.damages?.length || 0})`} variant="secondary" onPress={() => router.push({ pathname: "/(app)/danos", params: { vehicle_id: id } })} />
        <Button testID="vehicle-open-photos" title="Fotografias da viatura" variant="secondary" onPress={() => router.push(`/(app)/fotos/${id}`)} />
        <Text testID="vehicle-history-heading" style={styles.title}>Histórico de serviços</Text>
        {!data.work_orders?.length && <Text testID="vehicle-history-empty" style={styles.hint}>Esta viatura ainda não tem ordens de serviço.</Text>}
        {data.work_orders?.map((order: any) => <View key={order.id} style={styles.card}>
          <Text testID={`vehicle-order-summary-${order.id}`} style={styles.hint}>OS {order.number} · {formatDate(order.created_at)} · {formatEUR(order.total)}</Text>
          <Button testID={`vehicle-open-order-${order.id}`} title="Ver serviço" variant="ghost" onPress={() => router.push(`/(app)/servico/${order.id}`)} />
        </View>)}
      </>}
    </ScrollView>
  </View>;
}
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.surface },
  content: { padding: spacing.lg, gap: 16, paddingBottom: 40 },
  card: { padding: spacing.lg, gap: 8, borderRadius: radius.lg, backgroundColor: colors.surfaceSecondary, ...shadows.card },
  plate: { color: colors.brandPrimary, fontSize: 28, fontWeight: "800", letterSpacing: 1 },
  title: { fontSize: 20, fontWeight: "700", color: colors.onSurface },
  hint: { fontSize: 14, lineHeight: 21, color: colors.muted },
});