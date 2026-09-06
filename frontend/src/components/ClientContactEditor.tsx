import React, { useState } from "react";
import { View, StyleSheet } from "react-native";
import { useQueryClient } from "@tanstack/react-query";
import { api } from "../api";
import { Input } from "./Input";
import { Button } from "./Button";
import { Feedback } from "./Feedback";

export function ClientContactEditor({ client }: { client: any }) {
  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [email, setEmail] = useState(client.email || "");
  const [phone, setPhone] = useState(client.phone || "");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const save = async () => {
    setError("");
    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) { setError("Introduza um email válido."); return; }
    setLoading(true);
    try {
      await api.put(`/clients/${client.id}`, { name: client.name, nif: client.nif, address: client.address, email: email.trim() || null, phone: phone.trim() || null });
      await Promise.all(["client", "clients", "clients-all", "quotes", "vehicle"].map(key => qc.invalidateQueries({ queryKey: [key] })));
      setEditing(false);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  };
  if (!editing) return <Button testID="client-edit-contacts" title="Editar contactos" variant="secondary" onPress={() => { setEmail(client.email || ""); setPhone(client.phone || ""); setError(""); setEditing(true); }} />;
  return <View style={styles.form}>
    <Input testID="client-edit-email" label="Email" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" editable={!loading} />
    <Input testID="client-edit-phone" label="Telefone (com indicativo, se internacional)" value={phone} onChangeText={setPhone} keyboardType="phone-pad" editable={!loading} />
    <Feedback testID="client-edit-error" message={error} error />
    <Button testID="client-save-contacts" title="Guardar contactos" loading={loading} onPress={save} />
    <Button testID="client-cancel-contacts" title="Cancelar" variant="ghost" disabled={loading} onPress={() => setEditing(false)} />
  </View>;
}
const styles = StyleSheet.create({ form: { gap: 12 } });