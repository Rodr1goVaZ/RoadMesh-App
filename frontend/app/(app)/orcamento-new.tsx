import React, { useState } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable, KeyboardAvoidingView, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/src/api";
import { colors, spacing, radius, shadows } from "@/src/theme";
import { Input } from "@/src/components/Input";
import { Button } from "@/src/components/Button";
import { ScreenHeader } from "@/src/components/ScreenHeader";
import { Feedback } from "@/src/components/Feedback";

export default function NewQuote() {
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const { data: clients = [] } = useQuery({ queryKey: ["clients-all"], queryFn: () => api.get("/clients") });
  const { data: vehicles = [] } = useQuery({ queryKey: ["vehicles-all"], queryFn: () => api.get("/vehicles") });
  const [clientId, setClientId] = useState(""); const [vehicleId, setVehicleId] = useState("");
  const [items, setItems] = useState([{ item_type: "mao_de_obra", description: "", quantity: "1", unit_price: "0" }]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notes, setNotes] = useState("");
  const filteredV = clientId ? vehicles.filter((v: any) => v.client_id === clientId) : [];

  const submit = async () => {
    setError("");
    if (!clientId || !vehicleId) { setError("Escolha cliente e viatura"); return; }
    const number = (text: string) => Number(text.replace(",", "."));
    if (!items.length || items.some(i => !i.description.trim() || !Number.isFinite(number(i.quantity)) || number(i.quantity) <= 0 || !i.unit_price.trim() || !Number.isFinite(number(i.unit_price)) || number(i.unit_price) < 0)) {
      setError("Preencha a descrição, uma quantidade positiva e um preço válido em todas as linhas."); return;
    }
    setLoading(true);
    try {
      await api.post("/quotes", {
        client_id: clientId, vehicle_id: vehicleId, notes: notes.trim() || null,
        items: items.filter(i => i.description).map(i => ({
          item_type: i.item_type, description: i.description.trim(),
          quantity: number(i.quantity), unit_price: number(i.unit_price), vat_rate: 23, product_id: null,
        })),
      });
      qc.invalidateQueries({ queryKey: ["quotes"] });
      router.replace("/(app)/orcamentos");
    } catch (e: any) { setError(e.message); }
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
                <Pressable key={c.id} testID={`quote-pick-client-${c.id}`} onPress={() => { setClientId(c.id); setVehicleId(""); }}
                           style={[styles.chip, clientId === c.id && styles.chipActive]}>
                  <Text style={[styles.chipTxt, clientId === c.id && styles.chipTxtActive]}>{c.name}</Text>
                </Pressable>
              ))}
            </ScrollView>
            {clientId ? <>
              <Text style={[styles.label, { marginTop: 8 }]}>Viatura</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingVertical: 4 }}>
                {filteredV.map((v: any) => (
                  <Pressable key={v.id} testID={`quote-pick-vehicle-${v.id}`} onPress={() => setVehicleId(v.id)} style={[styles.chip, vehicleId === v.id && styles.chipActive]}>
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
                <View style={styles.types}>
                  {[{ id: "mao_de_obra", label: "Mão de obra" }, { id: "peca", label: "Peça" }].map(type => <Pressable key={type.id} testID={`quote-item-${idx}-${type.id}`} onPress={() => setItems(prev => prev.map((x, i) => i === idx ? { ...x, item_type: type.id } : x))} style={[styles.chip, it.item_type === type.id && styles.chipActive]}>
                    <Text style={[styles.chipTxt, it.item_type === type.id && styles.chipTxtActive]}>{type.label}</Text>
                  </Pressable>)}
                </View>
                <Input testID={`quote-item-description-${idx}`} label="Descrição" maxLength={1000} value={it.description} onChangeText={t => setItems(prev => prev.map((x, i) => i === idx ? { ...x, description: t } : x))} />
                <View style={{ flexDirection: "row", gap: 8 }}>
                  <View style={{ flex: 1 }}><Input testID={`quote-item-quantity-${idx}`} label="Qtd" keyboardType="decimal-pad" value={it.quantity} onChangeText={t => setItems(prev => prev.map((x, i) => i === idx ? { ...x, quantity: t } : x))} /></View>
                  <View style={{ flex: 1 }}><Input testID={`quote-item-price-${idx}`} label="Preço (€)" keyboardType="decimal-pad" value={it.unit_price} onChangeText={t => setItems(prev => prev.map((x, i) => i === idx ? { ...x, unit_price: t } : x))} /></View>
                </View>
                {items.length > 1 && <Button testID={`quote-remove-item-${idx}`} title="Remover linha" variant="ghost" onPress={() => setItems(prev => prev.filter((_, i) => i !== idx))} />}
              </View>
            ))}
            <View style={{ height: 8 }} />
            <Button testID="quote-add-item" title="+ Adicionar linha" variant="secondary" onPress={() => setItems(prev => [...prev, { item_type: "mao_de_obra", description: "", quantity: "1", unit_price: "0" }])} />
          </View>
          <Input testID="quote-notes" label="Observações (opcional)" value={notes} onChangeText={setNotes} multiline maxLength={2000} />
          <Feedback testID="quote-save-error" message={error} error />
          <Button title="Guardar orçamento" onPress={submit} loading={loading} testID="quote-save" />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
const styles = StyleSheet.create({
  types: { flexDirection: "row", gap: 8 },
  card: { backgroundColor: colors.surfaceSecondary, borderRadius: radius.lg, padding: spacing.lg, ...shadows.card },
  label: { color: colors.muted, fontSize: 12, fontWeight: "700", textTransform: "uppercase" },
  chip: { paddingHorizontal: 12, minHeight: 44, borderRadius: 999, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, justifyContent: "center", flexShrink: 0 },
  chipActive: { backgroundColor: colors.brandPrimary, borderColor: colors.brandPrimary },
  chipTxt: { fontSize: 12, color: colors.onSurface, fontWeight: "600" },
  chipTxtActive: { color: colors.onBrand },
});
