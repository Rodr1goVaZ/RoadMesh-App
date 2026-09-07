import React, { useState } from "react";
import { Text, Pressable, StyleSheet, View } from "react-native";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../api";
import { Panel, QueryState, areaStyles } from "./AreaUI";
import { Input } from "./Input";
import { Button } from "./Button";
import { Feedback } from "./Feedback";
import { colors, radius } from "../theme";

export function localToInputs(local?: string) {
  if (!local) return { date: "", time: "" };
  const [date, time] = local.split("T");
  return { date: date.split("-").reverse().join("/"), time: time.slice(0, 5) };
}
export function appointmentLocal(date: string, time: string) {
  if (!/^\d{2}\/\d{2}\/\d{4}$/.test(date) || !/^\d{2}:\d{2}$/.test(time)) throw new Error("Use a data dd/mm/aaaa e a hora hh:mm.");
  return `${date.split("/").reverse().join("-")}T${time}`;
}
export function AppointmentForm({ appointment, onClose }: { appointment?: any; onClose: () => void }) {
  const qc = useQueryClient(); const initial = localToInputs(appointment?.scheduled_local);
  const [vehicle, setVehicle] = useState(appointment?.vehicle_id || ""); const [date, setDate] = useState(initial.date); const [time, setTime] = useState(initial.time);
  const [description, setDescription] = useState(appointment?.description || ""); const [contact, setContact] = useState(appointment?.contact || "");
  const [error, setError] = useState(""); const [busy, setBusy] = useState(false);
  const { data = [], isLoading, error: loadError, refetch } = useQuery({ queryKey: ["portal-vehicles"], queryFn: () => api.get("/portal/vehicles") });
  const submit = async () => {
    setError("");
    try {
      if (!vehicle || description.trim().length < 3 || contact.trim().length < 3) throw new Error("Escolha a viatura e preencha a descrição e o contacto.");
      const payload = { vehicle_id: vehicle, scheduled_local: appointmentLocal(date, time), description: description.trim(), contact: contact.trim() };
      setBusy(true);
      if (appointment) await api.put(`/portal/appointments/${appointment.id}`, payload); else await api.post("/portal/appointments", payload);
      await qc.invalidateQueries({ queryKey: ["portal-appointments"] }); onClose();
    } catch (e: any) { setError(e.message); }
    finally { setBusy(false); }
  };
  return <Panel testID="appointment-form" title={appointment ? "Reagendar marcação" : "Nova marcação"}>
    <Text testID="appointment-form-help" style={areaStyles.hint}>Proponha uma data e hora. A oficina irá confirmar a disponibilidade. Horário de Portugal continental.</Text>
    <QueryState loading={isLoading} error={loadError} retry={refetch} testID="appointment-vehicles-query" />
    <Text testID="appointment-vehicle-label" style={areaStyles.label}>Viatura</Text>
    <View style={styles.choices}>{data.map((v: any) => <Pressable key={v.id} testID={`appointment-vehicle-${v.id}`} onPress={() => setVehicle(v.id)} style={[styles.choice, vehicle === v.id && styles.selected]}>
      <Text style={[styles.label, vehicle === v.id && styles.selectedText]}>{v.license_plate} · {v.make} {v.model}</Text>
    </Pressable>)}</View>
    {!isLoading && !data.length && <Text testID="appointment-no-vehicles" style={areaStyles.hint}>A oficina ainda não associou viaturas à sua conta.</Text>}
    <Input testID="appointment-date" label="Data (dd/mm/aaaa)" placeholder="25/12/2026" value={date} onChangeText={setDate} maxLength={10} keyboardType="numbers-and-punctuation" />
    <Input testID="appointment-time" label="Hora (hh:mm)" placeholder="09:30" value={time} onChangeText={setTime} maxLength={5} keyboardType="numbers-and-punctuation" />
    <Input testID="appointment-description" label="Descrição do problema" placeholder="Diga-nos o que se passa com o carro" multiline value={description} onChangeText={setDescription} maxLength={1500} />
    <Input testID="appointment-contact" label="Contacto" placeholder="Telefone ou email" value={contact} onChangeText={setContact} maxLength={150} />
    <Feedback testID="appointment-form-error" error message={error} />
    <Button testID="appointment-form-submit" title={appointment ? "Guardar nova proposta" : "Pedir marcação"} loading={busy} onPress={submit} />
    <Button testID="appointment-form-cancel" title="Cancelar" variant="ghost" disabled={busy} onPress={onClose} />
  </Panel>;
}
const styles = StyleSheet.create({ choices: { gap: 8 }, choice: { padding: 14, minHeight: 48, justifyContent: "center", borderRadius: radius.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }, selected: { borderColor: colors.brandPrimary, backgroundColor: colors.brandTertiary }, label: { color: colors.onSurface, fontSize: 14 }, selectedText: { color: colors.brandPrimary, fontWeight: "700" } });