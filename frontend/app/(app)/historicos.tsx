import React, { useState } from "react";
import { Text } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/src/core/http/api";
import { useAuth } from "@/src/core/auth/AuthProvider";
import { AreaPage, Panel, QueryState, areaStyles } from "@/src/shared/layout/AreaUI";
import { YearFilter } from "@/src/shared/ui/YearFilter";
import { Button } from "@/src/shared/ui/Button";
import { formatDateTime, formatEUR } from "@/src/shared/utils/format";

export default function Histories() {
  const { user, support } = useAuth(); const [resource, setResource] = useState("stock");
  const [year, setYear] = useState(""); const [page, setPage] = useState(0);
  const q = useQuery({ queryKey: ["history", resource, year, page], queryFn: () => api.get(`/history/${resource}?skip=${page * 50}&limit=50${year ? "&year=" + year : ""}`) });
  return <AreaPage title="Históricos e movimentos" testID="histories">
    {Object.entries({ stock: "Stock", receipts: "Receções", orders: "Encomendas", services: "Ordens de Serviço", quotes: "Orçamentos", invoices: "Documentos", photos: "Fotografias", damages: "Danos", ...(user?.can_manage_workshop || support ? { payments: "Pagamentos e ajustes" } : {}) }).map(([key, title]) =>
      <Button key={key} title={title} variant={resource === key ? "primary" : "secondary"} onPress={() => { setResource(key); setYear(""); setPage(0); }} />)}
    <YearFilter resource={resource} value={year} onChange={v => { setYear(v); setPage(0); }} />
    <QueryState loading={q.isLoading} error={q.error} retry={q.refetch} testID="history-query" />
    {q.data?.items.map((m: any) => <Panel key={m.id} testID={`history-${m.id}`} title={m.reason || m.description || m.product_name || m.supplier || m.document_number || m.number || m.kind || "Registo"}>
      <Text selectable style={areaStyles.hint}>{formatDateTime(m.created_at)} · {m.actor_name || "Registo anterior"}</Text>
      <Text style={areaStyles.label}>{resource === "payments" ? formatEUR(m.amount) : resource === "stock" ? `${m.delta > 0 ? "+" : ""}${m.delta} unidades` : m.status ? `Estado: ${m.status}` : `${m.items?.length || 0} produto(s)`}</Text>
      <Text selectable style={areaStyles.hint}>{m.product_id ? `Produto: ${m.product_id}` : m.purchase_order_id ? `Encomenda: ${m.purchase_order_id}` : m.work_order_id ? `Ordem de Serviço: ${m.work_order_id}` : m.vehicle_id ? `Viatura: ${m.vehicle_id}` : `Referência: ${m.id}`}</Text>
    </Panel>)}
    {q.data?.total === 0 && <Text style={areaStyles.hint}>Sem movimentos neste período.</Text>}
    <Text style={areaStyles.hint}>Página {page + 1} · {q.data?.total || 0} movimentos</Text>
    <Button title="Anterior" variant="secondary" disabled={page === 0} onPress={() => setPage(p => p - 1)} />
    <Button title="Seguinte" variant="secondary" disabled={!q.data || (page + 1) * 50 >= q.data.total} onPress={() => setPage(p => p + 1)} />
  </AreaPage>;
}
