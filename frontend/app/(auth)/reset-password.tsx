import React, { useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { AreaPage } from "@/src/shared/layout/AreaUI";
import { Input } from "@/src/shared/ui/Input";
import { Button } from "@/src/shared/ui/Button";
import { Feedback } from "@/src/shared/ui/Feedback";
import { api } from "@/src/core/http/api";

export default function ResetPassword() {
  const { token } = useLocalSearchParams<{ token: string }>();
  const [password, setPassword] = useState(""); const [confirm, setConfirm] = useState("");
  const [message, setMessage] = useState(""); const [error, setError] = useState(""); const [busy, setBusy] = useState(false);
  const validToken = typeof token === "string" && token.length >= 40 && token.length <= 200;
  const submit = async () => {
    if (busy || !validToken) return;
    setError(""); if (password !== confirm) { setError("As palavras-passe não coincidem."); return; }
    setBusy(true);
    try {
      setMessage((await api.post("/auth/reset-password", { token, new_password: password })).message);
      // Clear the recovery token from the address bar after successful use.
      if (typeof window !== "undefined") window.history.replaceState(null, "", window.location.pathname);
    } catch (e: any) { setError(e.message); } finally { setBusy(false); }
  };
  return <AreaPage title="Nova palavra-passe" testID="reset-password">
    {!message && validToken && <><Input testID="reset-password-new" label="Nova palavra-passe (mínimo 12 caracteres)" secureTextEntry value={password} onChangeText={setPassword} autoComplete="new-password" maxLength={72} />
      <Input testID="reset-password-confirm" label="Confirmar palavra-passe" secureTextEntry value={confirm} onChangeText={setConfirm} autoComplete="new-password" maxLength={72} />
      <Button testID="reset-password-submit" title="Guardar palavra-passe" onPress={submit} loading={busy} disabled={password.length < 12 || !confirm} /></>}
    {!message && !validToken && <Feedback testID="reset-password-invalid-link" error message="O link é inválido ou está incompleto. Peça um novo link de recuperação." />}
    <Feedback testID="operation-success" message={message} /><Feedback testID="operation-error" error message={error} />
    {message && <Button title="Entrar" onPress={() => router.replace("/(auth)/login")} />}
    {!message && <Button testID="reset-password-request-link" title="Pedir novo link" variant="ghost" onPress={() => router.replace("/(auth)/forgot-password")} />}
  </AreaPage>;
}
