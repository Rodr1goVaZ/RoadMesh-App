import React, { useState } from "react";
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { useQueryClient } from "@tanstack/react-query";
import { api } from "@/src/core/http/api";
import Ionicons from "@expo/vector-icons/Ionicons";
import { colors as c } from "@/src/shared/theme/legacy";
import { areaStyles, CredentialsNotice } from "@/src/shared/layout/AreaUI";
import { Button } from "@/src/shared/ui/Button";
import { Input } from "@/src/shared/ui/Input";
import { Feedback } from "@/src/shared/ui/Feedback";
export function UserManager({ user }: { user: any }) {
  const wide = useWindowDimensions().width >= 900;
  const [hint, setHint] = useState("");
  const qc = useQueryClient(); const [editing, setEditing] = useState(false); const [name, setName] = useState(user.name); const [email, setEmail] = useState(user.email);
  const [confirm, setConfirm] = useState(""); const [busy, setBusy] = useState(false); const [error, setError] = useState(""); const [credentials, setCredentials] = useState<any>(null);
  const action = async (kind: string) => {
    setBusy(true); setError("");
    try {
      if (kind === "reset") setCredentials((await api.post(`/admin/users/${user.id}/reset-password`, {})).credentials);
      else await api.put(`/admin/users/${user.id}`, { name: kind === "save" ? name : user.name, email: kind === "save" ? email : user.email, is_active: kind === "toggle" ? !user.is_active : user.is_active });
      await qc.invalidateQueries({ queryKey: ["admin-workshop"] }); setEditing(false); setConfirm("");
    } catch (e: any) { setError(e.message); }
    finally { setBusy(false); }
  };
  const iconButton = (kind: string, label: string, icon: keyof typeof Ionicons.glyphMap, onPress: () => void, danger = false) => <View style={s.iconWrap} key={kind}><Pressable testID={`managed-user-${kind}-${user.id}`} accessibilityRole="button" accessibilityLabel={label} disabled={busy} onPress={onPress} onHoverIn={() => setHint(kind)} onHoverOut={() => setHint("")} onFocus={() => setHint(kind)} onBlur={() => setHint("")} style={[s.iconButton, danger && s.dangerButton]}><Ionicons name={icon} size={20} color={danger ? "#D62D37" : c.brandPrimary} /></Pressable>{hint === kind && <View pointerEvents="none" style={[s.tooltip, kind !== "toggle" && !wide && { left: 0, right: undefined }]}><Text style={s.tooltipText}>{label}</Text></View>}</View>;
  return <View testID={`managed-user-${user.id}`} style={s.user}>
    <View style={[s.header, !wide && s.vertical]}><View style={s.identity}><Text style={s.name}>{user.name}</Text><Text testID={`managed-user-info-${user.id}`} style={areaStyles.hint}>{user.email}{"\n"}{user.role === "client" ? "Cliente" : user.is_manager ? "Responsável" : "Colaborador"} · {user.is_active ? "Ativo" : "Inativo"}</Text></View><View style={s.actions}>
      {iconButton("reset", "Reset palavra-passe", "key-outline", () => { setConfirm("reset"); setEditing(false); })}
      {iconButton("edit", "Editar utilizador", "create-outline", () => { setName(user.name); setEmail(user.email); setEditing(true); setConfirm(""); })}
      {iconButton("toggle", user.is_active ? "Desativar acesso" : "Ativar acesso", user.is_active ? "close-outline" : "checkmark-outline", () => { setConfirm("toggle"); setEditing(false); }, user.is_active)}
    </View></View>
    {credentials && <CredentialsNotice credentials={credentials} onClose={() => setCredentials(null)} />}
    {editing ? <>
      <Input testID={`managed-user-name-${user.id}`} label="Nome" value={name} onChangeText={setName} />
      <Input testID={`managed-user-email-${user.id}`} label="Email" autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail} />
      <Button testID={`managed-user-save-${user.id}`} title="Guardar utilizador" loading={busy} onPress={() => action("save")} />
      <Button testID={`managed-user-cancel-${user.id}`} title="Cancelar edição" variant="ghost" disabled={busy} onPress={() => setEditing(false)} />
    </> : null}
    {confirm ? <>
      <Text testID={`managed-user-confirmation-${user.id}`} style={areaStyles.hint}>{confirm === "reset" ? "Gerar uma nova palavra-passe temporária? As sessões atuais serão terminadas." : `${user.is_active ? "Desativar" : "Ativar"} este acesso?`}</Text>
      <Button testID={`managed-user-confirm-${user.id}`} title="Confirmar" loading={busy} onPress={() => action(confirm)} />
      <Button testID={`managed-user-dismiss-${user.id}`} title="Cancelar" variant="ghost" disabled={busy} onPress={() => setConfirm("")} />
    </> : null}
    <Feedback testID={`managed-user-error-${user.id}`} error message={error} />
  </View>;
}

const s = StyleSheet.create({
  user: { borderTopWidth: 1, borderTopColor: c.border, paddingVertical: 18, gap: 14 }, header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 14 }, vertical: { flexDirection: "column", alignItems: "flex-start" }, identity: { minWidth: 0, flexShrink: 1, gap: 5 }, name: { fontSize: 16, fontWeight: "700", color: c.onSurface }, actions: { flexDirection: "row", gap: 8 }, iconWrap: { position: "relative", zIndex: 2 }, iconButton: { width: 40, height: 40, borderRadius: 11, backgroundColor: "#F7F3F2", alignItems: "center", justifyContent: "center" }, dangerButton: { backgroundColor: "#FFF0F1" }, tooltip: { position: "absolute", bottom: 48, right: 0, backgroundColor: "#242830", paddingHorizontal: 10, paddingVertical: 7, borderRadius: 8, minWidth: 155, zIndex: 10 }, tooltipText: { fontSize: 12, color: "#FFFFFF", textAlign: "center" },
});
