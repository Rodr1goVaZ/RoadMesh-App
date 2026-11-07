import React, { useState } from "react";
import { Platform, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { router } from "expo-router";
import { useAuth } from "@/src/core/auth/AuthProvider";
import { AreaPage } from "@/src/shared/layout/AreaUI";
import { Button } from "@/src/shared/ui/Button";
import { Input } from "@/src/shared/ui/Input";
import { Feedback } from "@/src/shared/ui/Feedback";
import { pickPhoto } from "@/src/shared/media/helpers";
import { workspaceColors as c } from "@/src/shared/theme/workspace";
import { AccountAvatar } from "./AccountAvatar";

export function AccountSettings() {
  const { user, updateProfile, updateAvatar, changePassword, logout } = useAuth();
  const wide = useWindowDimensions().width >= 850;
  const [name, setName] = useState(user?.name || "");
  const [profileBusy, setProfileBusy] = useState(false); const [photoBusy, setPhotoBusy] = useState(false);
  const [profileError, setProfileError] = useState(""); const [profileMessage, setProfileMessage] = useState("");
  const [current, setCurrent] = useState(""); const [next, setNext] = useState(""); const [confirm, setConfirm] = useState("");
  const [passwordBusy, setPasswordBusy] = useState(false); const [passwordError, setPasswordError] = useState(""); const [passwordMessage, setPasswordMessage] = useState("");
  const [logoutBusy, setLogoutBusy] = useState(false);
  const busy = profileBusy || photoBusy || passwordBusy || logoutBusy;
  const saveProfile = async () => {
    setProfileError(""); setProfileMessage("");
    if (!name.trim()) { setProfileError("Indique o nome da conta."); return; }
    setProfileBusy(true);
    try { await updateProfile(name.trim()); setName(name.trim()); setProfileMessage("Nome atualizado."); }
    catch (error: any) { setProfileError(error.message); }
    finally { setProfileBusy(false); }
  };
  const changePhoto = async (remove = false) => {
    setProfileError(""); setProfileMessage(""); setPhotoBusy(true);
    try {
      if (remove) { await updateAvatar(null); setProfileMessage("Fotografia removida."); return; }
      const photo = await pickPhoto();
      if (!photo) return;
      if (photo.fileSize && photo.fileSize > 5 * 1024 * 1024) throw new Error("A fotografia não pode exceder 5 MB.");
      const form = new FormData(); const fileName = photo.fileName || "fotografia.jpg";
      if (Platform.OS === "web") form.append("file", await (await fetch(photo.uri)).blob(), fileName);
      else form.append("file", { uri: photo.uri, name: fileName, type: photo.mimeType || "image/jpeg" } as any);
      await updateAvatar(form); setProfileMessage("Fotografia atualizada.");
    } catch (error: any) { setProfileError(error.message); }
    finally { setPhotoBusy(false); }
  };
  const savePassword = async () => {
    setPasswordError(""); setPasswordMessage("");
    if (!current || next.length < 12 || next !== confirm) { setPasswordError("Indique a palavra-passe atual e confirme uma nova com pelo menos 12 caracteres."); return; }
    if (next === current) { setPasswordError("Escolha uma palavra-passe diferente da atual."); return; }
    setPasswordBusy(true);
    try { await changePassword(current, next); setCurrent(""); setNext(""); setConfirm(""); setPasswordMessage("Palavra-passe alterada. As outras sessões foram terminadas."); }
    catch (error: any) { setPasswordError(error.message); }
    finally { setPasswordBusy(false); }
  };
  return <AreaPage title="Definições da conta" testID="account-settings" back={false}>
    <View testID="account-settings-card" style={s.card}>
    <View style={s.heading}><Text accessibilityRole="header" style={s.title}>Definições da conta</Text><Text style={s.hint}>O seu perfil, a sua fotografia e a segurança do seu acesso.</Text></View>
    <View style={[s.columns, wide && { flexDirection: "row" }]}>
      <View style={s.column} testID="account-profile">
        <Text accessibilityRole="header" style={s.sectionTitle}>Perfil da conta</Text>
        <View style={s.photoRow}><AccountAvatar uri={user?.avatar_url} size={88} /><View style={s.photoActions}><Button testID="account-photo-change" title={user?.avatar_url ? "Alterar fotografia" : "Adicionar fotografia"} variant="secondary" disabled={busy} loading={photoBusy} onPress={() => void changePhoto()} />{user?.avatar_url && <Button testID="account-photo-remove" title="Remover fotografia" variant="ghost" disabled={busy} onPress={() => void changePhoto(true)} />}</View></View>
        <Text style={s.hint}>JPEG, PNG ou WebP · até 5 MB.</Text>
        <Input testID="account-name" label="Nome da conta" value={name} onChangeText={setName} maxLength={120} editable={!busy} autoComplete="name" />
        <View style={s.email}><Text style={s.label}>Email de acesso</Text><Text testID="account-email" selectable style={s.emailText}>{user?.email}</Text></View>
        <Feedback testID="account-profile-error" error message={profileError} /><Feedback testID="account-profile-success" message={profileMessage} />
        <Button testID="account-profile-save" title="Guardar alterações" disabled={busy || name.trim() === user?.name} loading={profileBusy} onPress={() => void saveProfile()} />
      </View>
      <View style={[s.column, s.security, wide && s.securityWide]} testID="account-security">
        <Text accessibilityRole="header" style={s.sectionTitle}>Segurança</Text>
        <Text style={s.hint}>Escolha uma palavra-passe só sua. Ao alterá-la, os outros dispositivos terão de entrar novamente.</Text>
        <Input testID="account-password-current" label="Palavra-passe atual" secureTextEntry value={current} onChangeText={setCurrent} autoComplete="current-password" editable={!busy} />
        <Input testID="account-password-new" label="Nova palavra-passe" placeholder="Pelo menos 12 caracteres" secureTextEntry value={next} onChangeText={setNext} autoComplete="new-password" editable={!busy} />
        <Input testID="account-password-confirm" label="Confirmar nova palavra-passe" secureTextEntry value={confirm} onChangeText={setConfirm} autoComplete="new-password" editable={!busy} />
        <Feedback testID="account-password-error" error message={passwordError} /><Feedback testID="account-password-success" message={passwordMessage} />
        <Button testID="account-password-save" title="Alterar palavra-passe" loading={passwordBusy} disabled={busy} onPress={() => void savePassword()} />
      </View>
    </View>
    <View style={[s.session, wide && s.sessionWide]} testID="account-session">
      <View style={{ flex: 1, gap: 8 }}><Text accessibilityRole="header" style={s.sectionTitle}>Sessão</Text><Text style={s.hint}>Termine a sessão quando deixar de utilizar este dispositivo.</Text></View>
      <Button testID="account-logout" title="Terminar sessão" variant="secondary" loading={logoutBusy} disabled={busy} fullWidth={!wide} onPress={async () => { setLogoutBusy(true); await logout(); router.replace("/(auth)/login"); }} />
    </View>
    </View>
  </AreaPage>;
}
const s = StyleSheet.create({
  card: { backgroundColor: c.card, borderRadius: 24, padding: 24, gap: 28, borderWidth: 1, borderColor: c.line, shadowColor: "#20243A", shadowOffset: { width: 0, height: 4 }, shadowOpacity: .045, shadowRadius: 12, elevation: 2 },
  heading: { gap: 8 }, title: { fontSize: 27, fontWeight: "700", color: c.ink }, sectionTitle: { fontSize: 19, fontWeight: "700", color: c.ink }, hint: { color: c.muted, fontSize: 14, lineHeight: 22 },
  columns: { gap: 28 }, column: { flex: 1, minWidth: 0, gap: 14 }, security: { borderTopWidth: 1, borderTopColor: c.line, paddingTop: 28 }, securityWide: { borderTopWidth: 0, paddingTop: 0, borderLeftWidth: 1, borderLeftColor: c.line, paddingLeft: 28 },
  session: { borderTopWidth: 1, borderTopColor: c.line, paddingTop: 24, gap: 20 }, sessionWide: { flexDirection: "row", alignItems: "center" },
  photoRow: { flexDirection: "row", alignItems: "center", gap: 20, flexWrap: "wrap" }, photoActions: { gap: 2 },
  email: { gap: 8, paddingVertical: 8 }, label: { color: c.muted, fontSize: 13, fontWeight: "600" }, emailText: { color: c.ink, fontSize: 16 },
});
