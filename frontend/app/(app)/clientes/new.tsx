import { goBack } from "@/src/shared/utils/navigation";
import React, { useState } from "react";
import { View, ScrollView, KeyboardAvoidingView, Platform } from "react-native";
import { AppAlert as Alert } from "@/src/shared/utils/alerts";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQueryClient } from "@tanstack/react-query";
import { api } from "@/src/core/http/api";
import { colors, spacing } from "@/src/shared/theme/legacy";
import { ClientFields } from "@/src/features/clients/components/ClientFields";
import { Button } from "@/src/shared/ui/Button";
import { ScreenHeader } from "@/src/shared/layout/ScreenHeader";

export default function NewClient() {
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const [client, setClient] = useState({ name: "", nif: "", phone: "", email: "", address: "" });
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!client.name.trim()) { Alert.alert("Erro", "Nome é obrigatório"); return; }
    setLoading(true);
    try {
      await api.post("/clients", { ...client, name: client.name.trim() });
      qc.invalidateQueries({ queryKey: ["clients"] });
      qc.invalidateQueries({ queryKey: ["clients-all"] });
      goBack();
    } catch (e: any) { Alert.alert("Erro", e.message); }
    finally { setLoading(false); }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface }}>
      <ScreenHeader title="Novo Cliente" back testID="new-client-header" />
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ width: "100%", maxWidth: 1100, alignSelf: "center", padding: spacing.lg, gap: 12, paddingBottom: insets.bottom + 100 }} keyboardShouldPersistTaps="handled">
          <ClientFields value={client} onChange={setClient} />
          <Button title="Guardar" onPress={submit} loading={loading} testID="client-save" />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
