import { ClientVehicleFields } from "@/src/components/RelationPicker";
import { useAuth } from "@/src/auth";
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
import { ProductPicker } from "@/src/components/ProductPicker";

export default function NewQuote() {
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const { user, support } = useAuth(); const manager = !!user?.can_manage_workshop || !!support;
  const { data: settings } = useQuery({ queryKey: ["workshop-settings"], queryFn: () => api.get("/workshop/settings") });
  const [clientId, setClientId] = useState(""); const [vehicleId, setVehicleId] = useState("");
  const [items, setItems] = useState([{ item_type: "mao_de_obra", description: "", quantity: "1", unit_price: "0", vat_rate: 23, product_id: null as string | null }]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notes, setNotes] = useState("");

  const submit = async () => {
    setError("");
    if (!clientId || !vehicleId) { setError("Escolha cliente e viatura"); return; }
    const number = (text: string) => Number(text.replace(",", "."));
    if (!items.length || items.some(i => (i.item_type !== "mao_de_obra" && !i.description.trim()) || !Number.isFinite(number(i.quantity)) || number(i.quantity) <= 0 || !i.unit_price.trim() || !Number.isFinite(number(i.unit_price)) || number(i.unit_price) < 0)) {
      setError("Preencha a descrição, uma quantidade positiva e um preço válido em todas as linhas."); return;
    }
    setLoading(true);
    try {
      await api.post("/quotes", {
        client_id: clientId, vehicle_id: vehicleId, notes: notes.trim() || null,
        items: items.map(i => ({
          item_type: i.item_type, description: i.description.trim() || (i.item_type === "mao_de_obra" ? "Mão de obra" : "Peça"),
          quantity: number(i.quantity), unit_price: i.item_type === "mao_de_obra" && settings?.configured ? Number(settings.labor_hour_rate) : number(i.unit_price), vat_rate: i.item_type === "mao_de_obra" && settings?.configured ? Number(settings.labor_vat_rate) : i.vat_rate, product_id: i.product_id,
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
        <ScrollView contentContainerStyle={{ width: "100%", maxWidth: 1100, alignSelf: "center", padding: spacing.lg, gap: 12, paddingBottom: insets.bottom + 100 }} keyboardShouldPersistTaps="handled">
          <View style={styles.card}>
            <ClientVehicleFields clientId={clientId} onClient={setClientId} onVehicle={setVehicleId} />
          </View>

          <View style={styles.card}>
            <Text style={styles.label}>Itens</Text>
            {items.map((it, idx) => (
              <View key={idx} style={{ gap: 6, marginTop: 8 }}>
                <View style={styles.types}>
                  {[{ id: "mao_de_obra", label: "Mão de obra" }, { id: "peca", label: "Peça" }].map(type => <Pressable key={type.id} testID={`quote-item-${idx}-${type.id}`} onPress={() => setItems(prev => prev.map((x, i) => i === idx ? { ...x, item_type: type.id, ...(type.id === "mao_de_obra" ? { product_id: null, vat_rate: 23 } : {}) } : x))} style={[styles.chip, it.item_type === type.id && styles.chipActive]}>
                    <Text style={[styles.chipTxt, it.item_type === type.id && styles.chipTxtActive]}>{type.label}</Text>
                  </Pressable>)}
                </View>
                {it.item_type === "peca" && <ProductPicker value={it.product_id} testID={`quote-item-product-${idx}`} onChange={product => setItems(prev => prev.map((item, i) => i === idx ? { ...item, product_id: product?.id || null, ...(product ? { description: product.name, unit_price: String(product.sale_price), vat_rate: product.vat_rate } : {}) } : item))} />}
                <Input testID={`quote-item-description-${idx}`} label={it.item_type === "mao_de_obra" ? "Descrição (opcional)" : "Descrição"} maxLength={1000} value={it.description} onChangeText={t => setItems(prev => prev.map((x, i) => i === idx ? { ...x, description: t } : x))} />
                <View style={{ flexDirection: "row", gap: 8 }}>
                  <View style={{ flex: 1 }}><Input testID={`quote-item-quantity-${idx}`} label={it.item_type === "mao_de_obra" ? "Horas" : "Quantidade"} keyboardType="decimal-pad" value={it.quantity} onChangeText={t => setItems(prev => prev.map((x, i) => i === idx ? { ...x, quantity: t } : x))} /></View>
                  <View style={{ flex: 1 }}><Input testID={`quote-item-price-${idx}`} label="Preço (€)" keyboardType="decimal-pad" editable={manager && !(it.item_type === "mao_de_obra" && settings?.configured)} value={it.item_type === "mao_de_obra" && settings?.configured ? String(settings.labor_hour_rate) : it.unit_price} onChangeText={t => setItems(prev => prev.map((x, i) => i === idx ? { ...x, unit_price: t } : x))} /></View>
                </View>
                {items.length > 1 && <Button testID={`quote-remove-item-${idx}`} title="Remover linha" variant="ghost" onPress={() => setItems(prev => prev.filter((_, i) => i !== idx))} />}
              </View>
            ))}
            <View style={{ height: 8 }} />
            <Button testID="quote-add-item" title="+ Adicionar linha" variant="secondary" onPress={() => setItems(prev => [...prev, { item_type: "mao_de_obra", description: "", quantity: "1", unit_price: "0", vat_rate: 23, product_id: null as string | null }])} />
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
