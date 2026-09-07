import React, { useState } from "react";
import { Text } from "react-native";
import { useQueryClient } from "@tanstack/react-query";
import { api } from "../api";
import { Panel, areaStyles, CredentialsNotice } from "./AreaUI";
import { Button } from "./Button";
import { Input } from "./Input";
import { Feedback } from "./Feedback";
export function UserManager({ user }: { user: any }) {
  const qc = useQueryClient(); const [editing, setEditing] = useState(false); const [name, setName] = useState(user.name); const [email, setEmail] = useState(user.email);
  const [confirm, setConfirm] = useState(""); const [busy, setBusy] = useState(false); const [error, setError] = useState(""); const [credentials, setCredentials] = useState<any>(null);
  const action = async (kind: string) => {
    setBusy(true); setError("");
    try {
      if (kind === "reset") setCredentials((await api.post(`/admin/users/${user.id}/reset-password`, {})).credentials);
      else await api.put(`/admin/users/${user.id}`, { name, email, is_active: kind === "toggle" ? !user.is_active : user.is_active });
      await qc.invalidateQueries({ queryKey: ["admin-workshop"] }); setEditing(false); setConfirm("");
    } catch (e: any) { setError(e.message); }
    finally { setBusy(false); }
  };
  return <Panel testID={`managed-user-${user.id}`} title={user.name}>
    <Text testID={`managed-user-info-${user.id}`} style={areaStyles.hint}>{user.email}{"\n"}{user.role === "client" ? "Cliente" : user.is_manager ? "Gerente" : "Colaborador"} · {user.is_active ? "Ativo" : "Inativo"}</Text>
    {credentials && <CredentialsNotice credentials={credentials} onClose={() => setCredentials(null)} />}
    {editing ? <>
      <Input testID={`managed-user-name-${user.id}`} label="Nome" value={name} onChangeText={setName} />
      <Input testID={`managed-user-email-${user.id}`} label="Email" autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail} />
      <Button testID={`managed-user-save-${user.id}`} title="Guardar utilizador" loading={busy} onPress={() => action("save")} />
      <Button testID={`managed-user-cancel-${user.id}`} title="Cancelar edição" variant="ghost" disabled={busy} onPress={() => setEditing(false)} />
    </> : <Button testID={`managed-user-edit-${user.id}`} title="Editar utilizador" variant="secondary" onPress={() => setEditing(true)} />}
    {confirm ? <>
      <Text testID={`managed-user-confirmation-${user.id}`} style={areaStyles.hint}>{confirm === "reset" ? "Gerar uma nova palavra-passe temporária? As sessões atuais serão terminadas." : `${user.is_active ? "Desativar" : "Ativar"} este acesso?`}</Text>
      <Button testID={`managed-user-confirm-${user.id}`} title="Confirmar" loading={busy} onPress={() => action(confirm)} />
      <Button testID={`managed-user-dismiss-${user.id}`} title="Cancelar" variant="ghost" disabled={busy} onPress={() => setConfirm("")} />
    </> : <>
      <Button testID={`managed-user-toggle-${user.id}`} title={user.is_active ? "Desativar acesso" : "Ativar acesso"} variant="ghost" onPress={() => setConfirm("toggle")} />
      <Button testID={`managed-user-reset-${user.id}`} title="Gerar palavra-passe temporária" variant="ghost" onPress={() => setConfirm("reset")} />
    </>}
    <Feedback testID={`managed-user-error-${user.id}`} error message={error} />
  </Panel>;
}