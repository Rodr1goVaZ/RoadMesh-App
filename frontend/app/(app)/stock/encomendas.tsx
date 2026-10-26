import { useListState } from "@/src/shared/hooks/useListState";
import { YearFilter } from "@/src/shared/ui/YearFilter";
import React from "react";
import { Text } from "react-native";
import { router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/src/core/http/api";
import { useAuth } from "@/src/core/auth/AuthProvider";
import { AreaPage, Panel, QueryState, areaStyles } from "@/src/shared/layout/AreaUI";
import { Button } from "@/src/shared/ui/Button";
import { formatEUR, formatDate } from "@/src/shared/utils/format";
const labels: Record<string, string> = { rascunho: "Rascunho", por_validar: "Por validar", pendente: "Por receber", parcial: "Recebida parcialmente", recebida: "Recebida", cancelada: "Cancelada" };
export default function Orders() {
  const { user, support } = useAuth(); const [year, setYear] = useListState("encomendas-year", "");
  const query = useQuery({ queryKey: ["purchase-orders", year], queryFn: () => api.get(`/purchase-orders${year.length === 4 ? "?year=" + year : ""}`) });
  return <AreaPage title="Encomendas" testID="orders"><YearFilter resource="orders" value={year} onChange={setYear} />
    {(user?.can_manage_workshop || support) && <Button title="Nova encomenda" onPress={() => router.push("/(app)/stock/encomenda-new")} />}
    <QueryState loading={query.isLoading} error={query.error} retry={query.refetch} testID="orders-query" />
    {query.data?.length === 0 && <Text style={areaStyles.hint}>Sem encomendas neste período. Pode começar pelo botão Adicionar à encomenda num produto.</Text>}
    {(query.data || []).map((p: any) => <Panel key={p.id} title={p.supplier} testID={`order-${p.id}`}>
      <Text style={areaStyles.label}>{labels[p.status] || p.status} · {formatEUR(p.total)}</Text><Text style={areaStyles.hint}>{formatDate(p.created_at)} · {p.items.length} produto(s)</Text>
      <Button title="Abrir encomenda" variant="secondary" onPress={() => router.push({ pathname: "/(app)/stock/encomenda", params: { id: p.id } })} />
    </Panel>)}
  </AreaPage>;
}
