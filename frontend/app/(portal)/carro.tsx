import React from "react";
import { Text, StyleSheet } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/src/api";
import { AreaPage, Panel, QueryState, areaStyles } from "@/src/components/AreaUI";
import { Photo } from "@/src/components/Photo";
import { formatDate, formatEUR } from "@/src/utils/format";
import { colors, radius } from "@/src/theme";
export default function ClientCar() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, error, isLoading, refetch } = useQuery({ queryKey: ["portal-vehicle", id], queryFn: () => api.get(`/portal/vehicles/${id}`) });
  return <AreaPage title={data?.license_plate || "O meu carro"} testID="portal-car-detail">
    <QueryState testID="portal-car-query" loading={isLoading} error={error} retry={refetch} />
    {data && <>
      <Panel testID="portal-car-information" title={`${data.make} ${data.model}`}>
        {data.cover && <Photo mediaId={data.cover.media_id} legacyUri={data.cover.image_b64} testID="portal-car-cover" style={styles.photo} />}
        <Text testID="portal-car-information-text" style={areaStyles.hint}>Matrícula: {data.license_plate}{"\n"}Ano: {data.year || "—"}{"\n"}Quilometragem: {data.mileage != null ? `${data.mileage} km` : "—"}{"\n"}VIN: {data.vin || "—"}{"\n"}Combustível: {data.fuel || "—"}</Text>
      </Panel>
      <Panel testID="portal-car-expenses" title="Despesas acumuladas">
        <Text testID="portal-car-total-expenses" style={styles.total}>{formatEUR(data.total_expenses)}</Text>
        <Text testID="portal-car-expenses-note" style={areaStyles.hint}>Total dos serviços concluídos, com IVA. Orçamentos e serviços em curso não são somados.</Text>
      </Panel>
      <Text testID="portal-history-title" style={areaStyles.title}>Histórico de intervenções</Text>
      {!data.history.length && <Text testID="portal-history-empty" style={areaStyles.hint}>Ainda não existem intervenções neste carro.</Text>}
      {data.history.map((entry: any) => <Panel testID={`portal-history-${entry.id}`} key={`${entry.type}-${entry.id}`} title={entry.type === "quote" ? `Orçamento ${entry.number}` : `Serviço ${entry.number}`}>
        <Text testID={`portal-history-status-${entry.id}`} style={areaStyles.label}>{({ orcamento: "Orçamento", em_reparacao: "Em reparação", concluido: "Concluído" } as any)[entry.display_status]}</Text>
        <Text testID={`portal-history-date-${entry.id}`} style={areaStyles.hint}>{formatDate(entry.completed_at || entry.created_at)}</Text>
        {entry.items.map((item: any, index: number) => <Text testID={`portal-history-item-${entry.id}-${index}`} key={index} style={areaStyles.hint}>{item.item_type === "peca" ? "Peça" : "Serviço"} · {item.description}{"\n"}{item.quantity} × {formatEUR(item.unit_price)} + IVA {item.vat_rate}%</Text>)}
        <Text testID={`portal-history-total-${entry.id}`} style={areaStyles.label}>{formatEUR(entry.total)}</Text>
      </Panel>)}
      <Text testID="portal-photos-title" style={areaStyles.title}>Fotografias e inspeções</Text>
      {!data.photos.length && !data.damages.length && <Text testID="portal-photos-empty" style={areaStyles.hint}>A oficina ainda não adicionou fotografias.</Text>}
      {data.photos.map((photo: any) => <Panel testID={`portal-photo-card-${photo.id}`} key={photo.id}>
        <Photo mediaId={photo.media_id} legacyUri={photo.image_b64} testID={`portal-photo-${photo.id}`} style={styles.photo} />
        <Text testID={`portal-photo-caption-${photo.id}`} style={areaStyles.hint}>{photo.caption || photo.zone.replace(/_/g, " ")} · {formatDate(photo.created_at)}</Text>
      </Panel>)}
      {data.damages.map((damage: any) => <Panel testID={`portal-damage-${damage.id}`} key={damage.id}>
        {(damage.media_id || damage.image_b64) && <Photo mediaId={damage.media_id} legacyUri={damage.image_b64} testID={`portal-damage-photo-${damage.id}`} style={styles.photo} />}
        <Text testID={`portal-damage-info-${damage.id}`} style={areaStyles.label}>{damage.category.charAt(0).toUpperCase() + damage.category.slice(1).replace(/_/g, " ")} · {({ baixo: "Ligeiro", medio: "Moderado", critico: "Grave" } as any)[damage.severity] || damage.severity}</Text>
        <Text testID={`portal-damage-description-${damage.id}`} style={areaStyles.hint}>{damage.location}{damage.description ? ` · ${damage.description}` : ""}{"\n"}{formatDate(damage.created_at)}</Text>
      </Panel>)}
    </>}
  </AreaPage>;
}
const styles = StyleSheet.create({ photo: { width: "100%", height: 210, borderRadius: radius.md, backgroundColor: colors.surface }, total: { fontSize: 32, fontWeight: "800", color: colors.brandPrimary } });