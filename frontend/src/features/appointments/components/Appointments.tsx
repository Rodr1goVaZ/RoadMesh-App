import React, { useState } from "react";
import { Text } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/src/core/http/api";
import { router, useLocalSearchParams } from "expo-router";
import { useNow } from "@/src/shared/hooks/useNow";
import { AreaPage, QueryState, areaStyles } from "@/src/shared/layout/AreaUI";
import { Button } from "@/src/shared/ui/Button";
import { AppointmentForm } from "@/src/features/appointments/components/AppointmentForm";
import { AppointmentCard } from "@/src/features/appointments/components/AppointmentCard";
export function Appointments({ portal = true }: { portal?: boolean }) {
  const now = useNow();
  const params = useLocalSearchParams<{ novo?: string; vehicleId?: string }>();
  const [editing, setEditing] = useState<any>(null);
  const form = editing || (portal && params.novo === "1" ? { initialVehicleId: params.vehicleId } : null);
  const setForm = (value: any) => {
    setEditing(value);
    if (params.novo === "1") router.setParams({ novo: undefined, vehicleId: undefined });
  };
  const { data = [], error, isLoading, refetch } = useQuery({ queryKey: [portal ? "portal-appointments" : "staff-appointments"], queryFn: () => api.get(portal ? "/portal/appointments" : "/appointments") });
  const upcoming = data.filter((item: any) => ["agendada", "confirmada"].includes(item.status) && new Date(item.scheduled_at).getTime() > now);
  const past = data.filter((item: any) => !upcoming.includes(item)).reverse();
  return <AreaPage key={form ? "form" : "list"} title="Marcações" testID={portal ? "portal-appointments" : "staff-appointments"} back={!portal}>
    {form ? <AppointmentForm initialVehicleId={form.initialVehicleId} appointment={form.id ? form : undefined} onClose={() => setForm(null)} /> : <>
      <Text testID="appointments-intro" style={areaStyles.hint}>{portal ? "Proponha uma visita à oficina e acompanhe as confirmações." : "Confirme pedidos, proponha outra data e acompanhe as visitas dos clientes."}</Text>
      {portal && <Button testID="appointment-new" title="Nova marcação" onPress={() => setForm({})} />}
      <Button testID="appointments-refresh" title="Atualizar marcações" variant="ghost" onPress={() => refetch()} />
      <QueryState testID="appointments-query" loading={isLoading} error={error} retry={refetch} />
      <Text testID="appointments-upcoming-title" style={areaStyles.title}>Próximas marcações</Text>
      {!isLoading && !upcoming.length && <Text testID="appointments-upcoming-empty" style={areaStyles.hint}>Não existem próximas marcações.</Text>}
      {upcoming.map((item: any) => <AppointmentCard item={item} portal={portal} onEdit={setForm} key={item.id} />)}
      <Text testID="appointments-past-title" style={areaStyles.title}>Marcações passadas e encerradas</Text>
      {!isLoading && !past.length && <Text testID="appointments-past-empty" style={areaStyles.hint}>O histórico de marcações aparecerá aqui.</Text>}
      {past.map((item: any) => <AppointmentCard item={item} portal={portal} onEdit={setForm} key={item.id} />)}
    </>}
  </AreaPage>;
}