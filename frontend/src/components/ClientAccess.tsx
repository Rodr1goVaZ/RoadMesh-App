import React, { useState } from "react";
import { Text, View, StyleSheet } from "react-native";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../api";
import { Input } from "./Input";
import { Button } from "./Button";
import { Feedback } from "./Feedback";
import { CredentialsNotice, QueryState, areaStyles } from "./AreaUI";
export function ClientAccess({ client }: { client: any }) {
  const qc = useQueryClient(); const [email, setEmail] = useState(client.email || ""); const [open, setOpen] = useState(false); const [busy, setBusy] = useState(false);
  const [error, setError] = useState(""); const [credentials, setCredentials] = useState<any>(null);
  const { data, isLoading, error: queryError, refetch } = useQuery({ queryKey: ["client-account", client.id], queryFn: () => api.get(`/clients/${client.id}/account`) });
  const create = async () => {
    setBusy(true); setError("");
    try {
      const response = await api.post(`/clients/${client.id}/account`, { name: client.name, email });
      setCredentials(response.credentials); setOpen(false);
      await qc.invalidateQueries({ queryKey: ["client-account", client.id] }); qc.invalidateQueries({ queryKey: ["client", client.id] });
    } catch (e: any) { setError(e.message); }
    finally { setBusy(false); }
  };
  return <View style={styles.wrap}>
    <Text testID="client-portal-access-title" style={areaStyles.label}>Área de cliente</Text>
    <QueryState loading={isLoading} error={queryError} retry={refetch} testID="client-account-query" />
    {credentials && <CredentialsNotice credentials={credentials} onClose={() => setCredentials(null)} />}
    {data ? <Text testID="client-portal-account" style={areaStyles.hint}>{data.email} · {data.is_active ? "Acesso ativo" : "Acesso inativo"}{data.password_change_required ? " · Palavra-passe temporária" : ""}</Text> : !isLoading && !queryError && <>
      <Text testID="client-portal-access-help" style={areaStyles.hint}>Crie um acesso para o cliente consultar as suas viaturas e propor marcações.</Text>
      {open ? <>
        <Input testID="client-portal-email" label="Email de acesso" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
        <Button testID="client-portal-create-confirm" title="Criar acesso do cliente" loading={busy} onPress={create} />
        <Button testID="client-portal-create-cancel" title="Cancelar" variant="ghost" disabled={busy} onPress={() => setOpen(false)} />
      </> : <Button testID="client-portal-create" title="Ativar acesso do cliente" variant="secondary" onPress={() => setOpen(true)} />}
    </>}
    <Feedback testID="client-portal-access-error" error message={error} />
  </View>;
}
const styles = StyleSheet.create({ wrap: { gap: 12, paddingVertical: 20 } });