import React, { useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import { router } from "expo-router";
import { useAuth, homeFor } from "../auth";
import { AreaPage } from "./AreaUI";
import { Logo } from "./Logo";
import { Input } from "./Input";
import { Button } from "./Button";
import { Feedback } from "./Feedback";
import { colors } from "../theme";

export function AccessLogin() {
  const { login } = useAuth();
  const [email, setEmail] = useState(""); const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false); const [error, setError] = useState("");
  const submit = async () => {
    setError(""); if (!email.trim() || !password) { setError("Preencha o email e a palavra-passe."); return; }
    setLoading(true);
    try { router.replace(homeFor(await login(email.trim(), password))); }
    catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  };
  return <AreaPage title="Entrar" testID="login-screen" back={false}>
    <View style={styles.brand}><Logo size={110} testID="login-logo" />
      <Text testID="login-brand" style={styles.name}>RoadMesh</Text>
      <Text testID="login-help" style={styles.help}>Gestão inteligente para oficinas</Text>
    </View>
    <Input testID="login-email" label="Email" autoCapitalize="none" autoCorrect={false} keyboardType="email-address" value={email} onChangeText={setEmail} />
    <Input testID="login-password" label="Palavra-passe" secureTextEntry value={password} onChangeText={setPassword} onSubmitEditing={submit} />
    <Feedback testID="login-error" error message={error} />
    <Button testID="login-submit-btn" title="Entrar" loading={loading} onPress={submit} />
    <Button title="Esqueci-me da palavra-passe" variant="ghost" onPress={() => router.push("/(auth)/forgot-password")} />
  </AreaPage>;
}
const styles = StyleSheet.create({
  brand: { alignItems: "center", gap: 12, paddingVertical: 22 },
  name: { fontSize: 28, fontWeight: "800", color: colors.onSurface },
  help: { color: colors.muted, fontSize: 14, textAlign: "center" },
});