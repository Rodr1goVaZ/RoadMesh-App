import { createThemedStyles } from "@/src/shared/theme/ThemeProvider";
import { isValidEmail } from "@/src/shared/utils/validation";
import React, { useState } from "react";
import { View, Text, useWindowDimensions } from "react-native";
import { router } from "expo-router";
import { useAuth, homeFor } from "@/src/core/auth/AuthProvider";
import { AreaPage } from "@/src/shared/layout/AreaUI";
import { Logo } from "@/src/shared/ui/Logo";
import { Input } from "@/src/shared/ui/Input";
import { Button } from "@/src/shared/ui/Button";
import { Feedback } from "@/src/shared/ui/Feedback";

import { api } from "@/src/core/http/api";

export function AccessLogin() {
  const styles = useStyles();
  const { height } = useWindowDimensions();

  const { login } = useAuth();
  const [email, setEmail] = useState(""); const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false); const [error, setError] = useState("");
  const [sending, setSending] = useState(false); const [recoveryMessage, setRecoveryMessage] = useState("");
  const recover = async () => {
    const address = email.trim();
    if (!address) { router.push("/(auth)/forgot-password"); return; }
    setError(""); setRecoveryMessage("");
    if (!isValidEmail(address)) { setError("Introduza um email válido para recuperar o acesso."); return; }
    if (sending) return;
    setSending(true);
    try { setRecoveryMessage((await api.post("/auth/forgot-password", { email: address })).message); }
    catch (e: any) { setError(e.message); }
    finally { setSending(false); }
  };
  const submit = async () => {
    setError(""); if (!email.trim() || !password) { setError("Preencha o email e a palavra-passe."); return; }
    setLoading(true);
    try { router.replace(homeFor(await login(email.trim(), password))); }
    catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  };
  return <AreaPage title="Entrar" testID="login-screen" back={false} contentStyle={styles.page}>
    <View style={styles.brand}><Logo size={110} testID="login-logo" />
      <Text testID="login-brand" style={styles.name}>RoadMesh</Text>
      <Text testID="login-help" style={styles.help}>Gestão inteligente para oficinas</Text>
    </View>
    <View testID="login-form" style={[styles.form, { minHeight: Math.min(430, Math.round(height * .4)) }]}>
      <Input testID="login-email" label="Email" autoComplete="email" autoCapitalize="none" autoCorrect={false} keyboardType="email-address" value={email} onChangeText={value => { setEmail(value); setRecoveryMessage(""); }} />
      <Input testID="login-password" label="Palavra-passe" autoComplete="current-password" secureTextEntry value={password} onChangeText={setPassword} onSubmitEditing={submit} />
      <Feedback testID="login-error" error message={error} />
      <Feedback testID="login-recovery-message" message={recoveryMessage} />
      <Button testID="login-submit-btn" title="Entrar" loading={loading} onPress={submit} />
      <Button testID="login-forgot-password" title="Esqueci-me da palavra-passe" variant="ghost" loading={sending} disabled={loading} onPress={recover} />
      </View>
  </AreaPage>;
}
const useStyles = createThemedStyles((theme) => { const colors = theme.colors; return ({
  page: { flexGrow: 1, alignItems: "center", justifyContent: "center", gap: 8, paddingTop: 24, paddingBottom: 32 },
  form: { width: "100%", maxWidth: 520, justifyContent: "center", gap: 20, paddingVertical: 24 },
  brand: { alignItems: "center", gap: 12, paddingVertical: 22 },
  name: { fontSize: 28, fontWeight: "800", color: colors.onSurface },
  help: { color: colors.muted, fontSize: 14, textAlign: "center" },
}); });
