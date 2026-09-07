import React, { useState } from "react";
import { Text } from "react-native";
import { useQueryClient } from "@tanstack/react-query";
import { api } from "../api";
import { Panel, areaStyles } from "./AreaUI";
import { Button } from "./Button";
import { Input } from "./Input";
import { Feedback } from "./Feedback";
import { appointmentLocal, localToInputs } from "./AppointmentForm";
export const APPOINTMENT_STATUS: Record<string, string> = { agendada: "Agendada · Aguarda confirmação", confirmada: "Confirmada", concluida: "Concluída", cancelada: "Cancelada" };
export function appointmentLabel(local: string) { const { date, time } = localToInputs(local); return `${date} às ${time}`; }
export function AppointmentCard({ item, portal, onEdit }: { item: any; portal: boolean; onEdit: (item: any) => void }) {
  const qc = useQueryClient(); const [details, setDetails] = useState(false); const [confirm, setConfirm] = useState(""); const [suggest, setSuggest] = useState(false);
  const [date, setDate] = useState(""); const [time, setTime] = useState(""); const [note, setNote] = useState(""); const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  const open = ["agendada", "confirmada"].includes(item.status); const future = new Date(item.scheduled_at).getTime() > Date.now();
  const prefix = portal ? "/portal/appointments" : "/appointments";
  const action = async (kind: string) => {
    setBusy(true); setError("");
    try {
      const body: any = { action: kind };
      if (kind === "suggest") { body.scheduled_local = appointmentLocal(date, time); body.note = note; }
      await api.post(`${prefix}/${item.id}/action`, body);
      await qc.invalidateQueries({ queryKey: [portal ? "portal-appointments" : "staff-appointments"] }); setConfirm(""); setSuggest(false);
    } catch (e: any) { setError(e.message); }
    finally { setBusy(false); }
  };
  const id = item.id;
  return <Panel testID={`appointment-card-${id}`} title={item.vehicle?.license_plate || "Viatura"}>
    <Text testID={`appointment-when-${id}`} style={areaStyles.label}>{appointmentLabel(item.scheduled_local)}</Text>
    <Text testID={`appointment-status-${id}`} style={areaStyles.hint}>{APPOINTMENT_STATUS[item.status]}</Text>
    {!portal && <Text testID={`appointment-client-${id}`} style={areaStyles.label}>{item.client_name}</Text>}
    {item.suggested_local && open && <Panel testID={`appointment-suggestion-${id}`} title="A oficina propôs outra data">
      <Text testID={`appointment-suggested-date-${id}`} style={areaStyles.label}>{appointmentLabel(item.suggested_local)}</Text>
      {!!item.suggestion_note && <Text testID={`appointment-suggestion-note-${id}`} style={areaStyles.hint}>{item.suggestion_note}</Text>}
      {portal && future && <Button testID={`appointment-accept-suggestion-${id}`} title="Aceitar esta data" loading={busy} onPress={() => action("accept_suggestion")} />}
    </Panel>}
    <Button testID={`appointment-details-${id}`} title={details ? "Ocultar detalhes" : "Ver detalhes"} variant="ghost" onPress={() => setDetails(!details)} />
    {details && <>
      <Text testID={`appointment-vehicle-detail-${id}`} style={areaStyles.hint}>{item.vehicle?.make} {item.vehicle?.model}</Text>
      <Text testID={`appointment-problem-${id}`} style={areaStyles.label}>{item.description}</Text>
      <Text testID={`appointment-contact-${id}`} style={areaStyles.hint}>Contacto: {item.contact}</Text>
      {open && (future || !portal) && <>
        {portal && <Button testID={`appointment-reschedule-${id}`} title="Reagendar" variant="secondary" disabled={busy} onPress={() => onEdit(item)} />}
        {!portal && <>
          {item.status === "agendada" && future && <Button testID={`appointment-confirm-${id}`} title="Confirmar marcação" loading={busy} onPress={() => action("confirm")} />}
          <Button testID={`appointment-suggest-${id}`} title="Sugerir outra data" variant="secondary" disabled={busy} onPress={() => setSuggest(!suggest)} />
          {suggest && <>
            <Input testID={`appointment-suggest-date-${id}`} label="Nova data (dd/mm/aaaa)" value={date} onChangeText={setDate} placeholder="25/12/2026" />
            <Input testID={`appointment-suggest-time-${id}`} label="Nova hora (hh:mm)" value={time} onChangeText={setTime} placeholder="10:00" />
            <Input testID={`appointment-suggest-note-${id}`} label="Mensagem para o cliente" value={note} onChangeText={setNote} />
            <Button testID={`appointment-send-suggestion-${id}`} title="Enviar proposta ao cliente" loading={busy} onPress={() => action("suggest")} />
          </>}
          <Button testID={`appointment-complete-${id}`} title="Marcar como concluída" variant="secondary" disabled={busy} onPress={() => setConfirm("complete")} />
        </>}
        {confirm ? <>
          <Text testID={`appointment-confirmation-${id}`} style={areaStyles.hint}>{confirm === "cancel" ? "Cancelar esta marcação?" : "Concluir esta marcação?"}</Text>
          <Button testID={`appointment-action-confirm-${id}`} title="Confirmar" loading={busy} onPress={() => action(confirm)} />
          <Button testID={`appointment-action-dismiss-${id}`} title="Voltar" variant="ghost" disabled={busy} onPress={() => setConfirm("")} />
        </> : <Button testID={`appointment-cancel-${id}`} title="Cancelar marcação" variant="ghost" disabled={busy} onPress={() => setConfirm("cancel")} />}
      </>}
    </>}
    <Feedback testID={`appointment-error-${id}`} error message={error} />
  </Panel>;
}