import React, { useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { AreaPage } from "@/src/components/AreaUI";
import { Input } from "@/src/components/Input";
import { Button } from "@/src/components/Button";
import { Feedback } from "@/src/components/Feedback";
import { api } from "@/src/api";

export default function ResetPassword() {
  const { token } = useLocalSearchParams<{ token: string }>();
  const [password, setPassword] = useState(""); const [confirm, setConfirm] = useState("");
  const [message, setMessage] = useState(""); const [error, setError] = useState(""); const [busy, setBusy] = useState(false);
  const submit = async () => {
    setError(""); if (password !== confirm) { setError("As palavras-passe não coincidem."); return; }
    setBusy(true);
    try {
      setMessage((await api.post("/auth/reset-password", { token, new_password: password })).message);
      // Clear the recovery token from the address bar after successful use.
      if (typeof window !== "undefined") window.history.replaceState(null, "", window.location.pathname);
    } catch (e: any) { setError(e.message); } finally { setBusy(false); }
  };
  return <AreaPage title="Nova palavra-passe" testID="reset-password">
    {!message && <><Input label="Nova palavra-passe (mínimo 12 caracteres)" secureTextEntry value={password} onChangeText={setPassword} autoComplete="new-password" />
      <Input label="Confirmar palavra-passe" secureTextEntry value={confirm} onChangeText={setConfirm} />
      <Button title="Guardar palavra-passe" onPress={submit} loading={busy} disabled={!token || password.length < 12} /></>}
    <Feedback testID="operation-success" message={message} /><Feedback testID="operation-error" error message={error} />
    {message && <Button title="Entrar" onPress={() => router.replace("/(auth)/login")} />}
  </AreaPage>;
}
