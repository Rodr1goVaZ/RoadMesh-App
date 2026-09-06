import React, { useState } from "react";
import { View, Text, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, Alert } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { api } from "@/src/api";
import { colors, spacing } from "@/src/theme";
import { Input } from "@/src/components/Input";
import { Button } from "@/src/components/Button";
import { ScreenHeader } from "@/src/components/ScreenHeader";

export default function NewClient() {
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [nif, setNif] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!name.trim()) { Alert.alert("Erro", "Nome é obrigatório"); return; }
    setLoading(true);
    try {
      await api.post("/clients", { name: name.trim(), nif, phone, email, address });
      qc.invalidateQueries({ queryKey: ["clients"] });
      qc.invalidateQueries({ queryKey: ["clients-all"] });
      router.back();
    } catch (e: any) { Alert.alert("Erro", e.message); }
    finally { setLoading(false); }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface }}>
      <ScreenHeader title="Novo Cliente" back testID="new-client-header" />
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: 12, paddingBottom: insets.bottom + 100 }} keyboardShouldPersistTaps="handled">
          <Input label="Nome *" value={name} onChangeText={setName} testID="client-name" />
          <Input label="NIF" value={nif} onChangeText={setNif} keyboardType="number-pad" testID="client-nif" />
          <Input label="Telefone" value={phone} onChangeText={setPhone} keyboardType="phone-pad" testID="client-phone" />
          <Input label="Email" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" testID="client-email" />
          <Input label="Morada" value={address} onChangeText={setAddress} multiline numberOfLines={2} testID="client-address" />
          <Button title="Guardar" onPress={submit} loading={loading} testID="client-save" />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
const styles = StyleSheet.create({});
