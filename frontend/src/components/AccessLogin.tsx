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

export function AccessLogin({ kind }: { kind: "staff" | "admin" | "client" }) {
  const { login } = useAuth();
  const [email, setEmail] = useState(""); const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false); const [error, setError] = useState("");
  const title = kind === "admin" ? "Administração RoadMesh" : kind === "client" ? "Área de cliente" : "Acesso da oficina";
  const submit = async () => {
    setError(""); if (!email.trim() || !password) { setError("Preencha o email e a palavra-passe."); return; }
    setLoading(true);
    try { router.replace(homeFor(await login(email.trim(), password, kind))); }
    catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  };
  return <AreaPage title={title} testID={`${kind}-login-screen`} back={kind !== "staff"}>
    <View style={styles.brand}><Logo size={110} testID={kind === "staff" ? "login-logo" : `${kind}-login-logo`} />
      <Text testID={`${kind}-login-brand`} style={styles.name}>RoadMesh</Text>
      <Text testID={`${kind}-login-help`} style={styles.help}>{kind === "admin" ? "Gestão global da plataforma" : kind === "client" ? "As suas marcações e os seus carros" : "Gestão inteligente para oficinas"}</Text>
    </View>
    <Input testID={kind === "staff" ? "login-email" : `${kind}-login-email`} label="Email" autoCapitalize="none" autoCorrect={false} keyboardType="email-address" value={email} onChangeText={setEmail} />
    <Input testID={kind === "staff" ? "login-password" : `${kind}-login-password`} label="Palavra-passe" secureTextEntry value={password} onChangeText={setPassword} onSubmitEditing={submit} />
    <Feedback testID={`${kind}-login-error`} error message={error} />
    <Button testID={kind === "staff" ? "login-submit-btn" : `${kind}-login-submit`} title="Entrar" loading={loading} onPress={submit} />
    {kind === "staff" && <>
      <Button testID="login-client-access" title="Sou cliente de uma oficina" variant="secondary" onPress={() => router.push("/(auth)/client-login")} />
      <Button testID="login-admin-access" title="Administrador RoadMesh" variant="ghost" onPress={() => router.push("/(auth)/admin-login")} />
      <Button testID="login-access-info" title="Ainda não tenho acesso" variant="ghost" onPress={() => router.push("/(auth)/register")} />
    </>}
  </AreaPage>;
}
const styles = StyleSheet.create({
  brand: { alignItems: "center", gap: 12, paddingVertical: 22 },
  name: { fontSize: 28, fontWeight: "800", color: colors.onSurface },
  help: { color: colors.muted, fontSize: 14, textAlign: "center" },
});