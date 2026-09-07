import React, { useState } from "react";
import { Text, View, Pressable, StyleSheet } from "react-native";
import { router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/src/api";
import { AreaPage, Panel, QueryState, areaStyles } from "@/src/components/AreaUI";
import { Input } from "@/src/components/Input";
import { Button } from "@/src/components/Button";
import { formatEUR } from "@/src/utils/format";
import { colors, radius } from "@/src/theme";
const STATUS: Record<string, string> = { all: "Todas", active: "Ativas", disabled: "Inativas", archived: "Arquivadas" };
export default function Workshops() {
  const [search, setSearch] = useState(""); const [status, setStatus] = useState("all");
  const { data = [], error, isLoading, refetch } = useQuery({ queryKey: ["admin-workshops", search, status], queryFn: () => api.get(`/admin/workshops?search=${encodeURIComponent(search)}&status=${status}`) });
  return <AreaPage title="Oficinas" testID="admin-workshops">
    <Input testID="admin-workshops-search" placeholder="Nome, NIF, email ou gerente" label="Pesquisar oficinas" value={search} onChangeText={setSearch} />
    <View style={areaStyles.row}>{Object.entries(STATUS).map(([value, label]) => <Pressable key={value} testID={`admin-filter-${value}`} onPress={() => setStatus(value)} style={[styles.chip, value === status && styles.active]}><Text style={[styles.chipText, value === status && styles.activeText]}>{label}</Text></Pressable>)}</View>
    <Button testID="admin-workshops-create" title="Criar nova oficina" onPress={() => router.push("/(admin)/workshop-form")} />
    <QueryState loading={isLoading} error={error} retry={refetch} testID="admin-workshops-query" />
    {!isLoading && !error && !data.length && <Text testID="admin-workshops-empty" style={areaStyles.hint}>Nenhuma oficina encontrada.</Text>}
    {data.map((workshop: any) => <Panel testID={`admin-workshop-${workshop.id}`} key={workshop.id} title={workshop.name}>
      <Text testID={`admin-workshop-status-${workshop.id}`} style={areaStyles.hint}>{STATUS[workshop.status]} · NIF {workshop.nif || "não indicado"}</Text>
      <Text testID={`admin-workshop-revenue-${workshop.id}`} style={areaStyles.label}>{formatEUR(workshop.metrics.revenue)} de faturação</Text>
      <Text testID={`admin-workshop-counts-${workshop.id}`} style={areaStyles.hint}>{workshop.metrics.clients} clientes · {workshop.metrics.vehicles} viaturas · {workshop.metrics.work_orders} OS</Text>
      <Button testID={`admin-workshop-open-${workshop.id}`} title="Ver oficina" variant="secondary" onPress={() => router.push({ pathname: "/(admin)/workshop", params: { id: workshop.id } })} />
    </Panel>)}
  </AreaPage>;
}
const styles = StyleSheet.create({ chip: { minHeight: 44, paddingHorizontal: 14, justifyContent: "center", borderRadius: radius.pill, backgroundColor: colors.surfaceSecondary, borderColor: colors.border, borderWidth: 1 }, active: { backgroundColor: colors.brandPrimary }, chipText: { color: colors.onSurface, fontSize: 13, fontWeight: "600" }, activeText: { color: colors.onBrand } });