import React, { useState } from "react";
import { View, Text, StyleSheet, ScrollView, KeyboardAvoidingView, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useAuth } from "@/src/auth";
import { Input } from "@/src/components/Input";
import { Button } from "@/src/components/Button";
import { LogoWithText, Logo } from "@/src/components/Logo";
import { colors, spacing } from "@/src/theme";

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const onSubmit = async () => {
    if (!email || !password) { setError("Preencha email e palavra-passe"); return; }
    setLoading(true); setError("");
    try {
      await login(email.trim(), password);
      router.replace("/(app)/inicio");
    } catch (e: any) {
      setError(e.message || "Falha ao entrar");
    } finally { setLoading(false); }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1, backgroundColor: colors.surface }}>
      <ScrollView contentContainerStyle={[styles.wrap, { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 24 }]} keyboardShouldPersistTaps="handled">
        <View style={styles.brand}>
          <Logo size={72} />
          <Text style={styles.title}>RoadMesh</Text>
          <Text style={styles.subtitle}>Gestão inteligente para oficinas</Text>
        </View>
        <View style={styles.form}>
          <Input testID="login-email" label="Email" autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail} placeholder="nome@oficina.pt" />
          <Input testID="login-password" label="Palavra-passe" secureTextEntry value={password} onChangeText={setPassword} placeholder="••••••••" />
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <Button title="Entrar" onPress={onSubmit} loading={loading} testID="login-submit-btn" />
          <Button title="Criar conta" variant="secondary" onPress={() => router.push("/(auth)/register")} testID="login-goto-register-btn" />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
const styles = StyleSheet.create({
  wrap: { flexGrow: 1, paddingHorizontal: spacing.xl, justifyContent: "center", gap: 32 },
  brand: { alignItems: "center", gap: 8 },
  title: { fontSize: 26, fontWeight: "800", color: colors.onSurface, marginTop: 8 },
  subtitle: { color: colors.muted, fontSize: 14 },
  form: { gap: 14 },
  error: { color: colors.error, fontSize: 13 },
});
