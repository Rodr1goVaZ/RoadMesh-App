import React, { useState } from "react";
import { AreaPage, areaStyles } from "@/src/components/AreaUI";
import { Input } from "@/src/components/Input";
import { Button } from "@/src/components/Button";
import { Feedback } from "@/src/components/Feedback";
import { api } from "@/src/api";
import { Text } from "react-native";

export default function ForgotPassword() {
  const [email, setEmail] = useState(""); const [message, setMessage] = useState("");
  const [error, setError] = useState(""); const [busy, setBusy] = useState(false);
  const submit = async () => {
    if (busy) return;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) { setError("Introduza um email válido."); return; }
    setError(""); setBusy(true);
    try { setMessage((await api.post("/auth/forgot-password", { email: email.trim() })).message); }
    catch (e: any) { setError(e.message); } finally { setBusy(false); }
  };
  return <AreaPage title="Recuperar acesso" testID="forgot-password">
    <Text style={areaStyles.hint}>Indique o email da conta para receber um link e definir uma nova palavra-passe. O link é válido durante 20 minutos.</Text>
    <Input testID="recovery-email" label="Email da conta" value={email} onChangeText={value => { setEmail(value); setMessage(""); setError(""); }} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} autoComplete="email" />
    <Feedback testID="operation-success" message={message} /><Feedback testID="operation-error" error message={error} />
    <Button testID="recovery-submit" title="Enviar instruções" onPress={submit} loading={busy} disabled={!email.trim() || !!message} />
  </AreaPage>;
}
