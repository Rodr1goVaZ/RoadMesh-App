import React, { useState } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable, Alert, KeyboardAvoidingView, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/src/api";
import { colors, spacing, radius, shadows } from "@/src/theme";
import { Input } from "@/src/components/Input";
import { Button } from "@/src/components/Button";
import { ScreenHeader } from "@/src/components/ScreenHeader";

export default function NewQuote() {
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const { data: clients = [] } = useQuery({ queryKey: ["clients-all"], queryFn: () => api.get("/clients") });
  const { data: vehicles = [] } = useQuery({ queryKey: ["vehicles-all"], queryFn: () => api.get("/vehicles") });
  const [clientId, setClientId] = useState(""); const [vehicleId, setVehicleId] = useState("");
  const [items, setItems] = useState([{ description: "", quantity: "1", unit_price: "0" }]);
  const [loading, setLoading] = useState(false);
  const filteredV = clientId ? vehicles.filter((v: any) => v.client_id === clientId) : [];

  const submit = async () => {
    if (!clientId || !vehicleId) { Alert.alert("Erro", "Escolha cliente e viatura"); return; }
    setLoading(true);
    try {
      await api.post("/quotes", {
        client_id: clientId, vehicle_id: vehicleId, notes: null,
        items: items.filter(i => i.description).map(i => ({
          item_type: "mao_de_obra" as const, description: i.description,
          quantity: Number(i.quantity), unit_price: Number(i.unit_price), vat_rate: 23, product_id: null,
        })),
      });
      qc.invalidateQueries({ queryKey: ["quotes"] });
      router.back();
    } catch (e: any) { Alert.alert("Erro", e.message); }
    finally { setLoading(false); }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface }}>
      <ScreenHeader title="Novo Orçamento" back />
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: 12, paddingBottom: insets.bottom + 100 }} keyboardShouldPersistTaps="handled">
          <View style={styles.card}>
            <Text style={styles.label}>Cliente</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingVertical: 4 }}>
              {clients.map((c: any) => (
                <Pressable key={c.id} onPress={() => { setClientId(c.id); setVehicleId(""); }}
                           style={[styles.chip, clientId === c.id && styles.chipActive]}>
                  <Text style={[styles.chipTxt, clientId === c.id && styles.chipTxtActive]}>{c.name}</Text>
                </Pressable>
              ))}
            </ScrollView>
            {clientId ? <>
              <Text style={[styles.label, { marginTop: 8 }]}>Viatura</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingVertical: 4 }}>
                {filteredV.map((v: any) => (
                  <Pressable key={v.id} onPress={() => setVehicleId(v.id)} style={[styles.chip, vehicleId === v.id && styles.chipActive]}>
                    <Text style={[styles.chipTxt, vehicleId === v.id && styles.chipTxtActive]}>{v.license_plate}</Text>
                  </Pressable>
                ))}
              </ScrollView>
            </> : null}
          </View>

          <View style={styles.card}>
            <Text style={styles.label}>Itens</Text>
            {items.map((it, idx) => (
              <View key={idx} style={{ gap: 6, marginTop: 8 }}>
                <Input label="Descrição" value={it.description} onChangeText={t => setItems(prev => prev.map((x, i) => i === idx ? { ...x, description: t } : x))} />
                <View style={{ flexDirection: "row", gap: 8 }}>
                  <View style={{ flex: 1 }}><Input label="Qtd" keyboardType="numeric" value={it.quantity} onChangeText={t => setItems(prev => prev.map((x, i) => i === idx ? { ...x, quantity: t } : x))} /></View>
                  <View style={{ flex: 1 }}><Input label="Preço" keyboardType="numeric" value={it.unit_price} onChangeText={t => setItems(prev => prev.map((x, i) => i === idx ? { ...x, unit_price: t } : x))} /></View>
                </View>
              </View>
            ))}
            <View style={{ height: 8 }} />
            <Button title="+ Adicionar linha" variant="secondary" onPress={() => setItems(prev => [...prev, { description: "", quantity: "1", unit_price: "0" }])} />
          </View>
          <Button title="Guardar orçamento" onPress={submit} loading={loading} testID="quote-save" />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
const styles = StyleSheet.create({
  card: { backgroundColor: colors.surfaceSecondary, borderRadius: radius.lg, padding: spacing.lg, ...shadows.card },
  label: { color: colors.muted, fontSize: 12, fontWeight: "700", textTransform: "uppercase" },
  chip: { paddingHorizontal: 12, height: 32, borderRadius: 999, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, justifyContent: "center", flexShrink: 0 },
  chipActive: { backgroundColor: colors.brandPrimary, borderColor: colors.brandPrimary },
  chipTxt: { fontSize: 12, color: colors.onSurface, fontWeight: "600" },
  chipTxtActive: { color: "#fff" },
});
