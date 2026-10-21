import React, { useState } from "react";
import { AreaPage } from "@/src/components/AreaUI";
import { Input } from "@/src/components/Input";
import { Button } from "@/src/components/Button";
import { Feedback } from "@/src/components/Feedback";
import { api } from "@/src/api";

export default function ForgotPassword() {
  const [email, setEmail] = useState(""); const [message, setMessage] = useState("");
  const [error, setError] = useState(""); const [busy, setBusy] = useState(false);
  const submit = async () => {
    setError(""); setBusy(true);
    try { setMessage((await api.post("/auth/forgot-password", { email: email.trim() })).message); }
    catch (e: any) { setError(e.message); } finally { setBusy(false); }
  };
  return <AreaPage title="Recuperar acesso" testID="forgot-password">
    <Input label="Email da conta" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoComplete="email" />
    <Feedback testID="operation-success" message={message} /><Feedback testID="operation-error" error message={error} />
    <Button title="Enviar instruções" onPress={submit} loading={busy} disabled={!email.trim() || !!message} />
  </AreaPage>;
}
