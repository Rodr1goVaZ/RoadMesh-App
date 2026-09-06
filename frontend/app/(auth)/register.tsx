import React, { useState } from "react";
import { View, Text, StyleSheet, ScrollView, KeyboardAvoidingView, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useAuth } from "@/src/auth";
import { Input } from "@/src/components/Input";
import { Button } from "@/src/components/Button";
import { ScreenHeader } from "@/src/components/ScreenHeader";
import { Logo } from "@/src/components/Logo";
import { colors, spacing } from "@/src/theme";

export default function RegisterScreen() {
  const insets = useSafeAreaInsets();
  const { register } = useAuth();
  const [workshop, setWorkshop] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const onSubmit = async () => {
    if (!workshop || !name || !email || !password) { setError("Preencha todos os campos"); return; }
    if (password.length < 6) { setError("A palavra-passe precisa de pelo menos 6 caracteres"); return; }
    setLoading(true); setError("");
    try {
      await register(workshop.trim(), name.trim(), email.trim(), password);
      router.replace("/(app)/inicio");
    } catch (e: any) { setError(e.message || "Falha no registo"); }
    finally { setLoading(false); }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface }}>
      <ScreenHeader title="Criar conta" back testID="register-header" />
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={[styles.wrap, { paddingBottom: insets.bottom + 24 }]} keyboardShouldPersistTaps="handled">
          <View style={styles.brand}>
            <Logo size={112} testID="register-logo" />
            <Text testID="register-brand-name" style={styles.brandName}>RoadMesh</Text>
          </View>
          <Text testID="register-help" style={styles.help}>Crie a sua oficina e comece a usar o RoadMesh.</Text>
          <Input testID="reg-workshop" label="Nome da oficina" value={workshop} onChangeText={setWorkshop} placeholder="Oficina Central" />
          <Input testID="reg-name" label="O seu nome" value={name} onChangeText={setName} placeholder="Rodrigo Ricardo" />
          <Input testID="reg-email" label="Email" autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail} placeholder="nome@oficina.pt" />
          <Input testID="reg-password" label="Palavra-passe" secureTextEntry value={password} onChangeText={setPassword} placeholder="Mínimo 6 caracteres" />
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <Button title="Criar conta" onPress={onSubmit} loading={loading} testID="register-submit-btn" />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
const styles = StyleSheet.create({
  brand: { alignItems: "center", gap: 8, marginBottom: 8 },
  brandName: { fontSize: 26, fontWeight: "800", color: colors.onSurface },
  wrap: { paddingHorizontal: spacing.xl, paddingTop: 16, gap: 14 },
  help: { color: colors.muted, fontSize: 13, marginBottom: 4 },
  error: { color: colors.error, fontSize: 13 },
});
