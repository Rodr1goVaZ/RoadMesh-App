import { goBack } from "@/src/shared/utils/navigation";
import React, { useState } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable, KeyboardAvoidingView, Platform } from "react-native";
import { AppAlert as Alert } from "@/src/shared/utils/alerts";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/src/core/http/api";
import { colors, spacing, radius, shadows } from "@/src/shared/theme/legacy";
import { Input } from "@/src/shared/ui/Input";
import { Button } from "@/src/shared/ui/Button";
import { ScreenHeader } from "@/src/shared/layout/ScreenHeader";
import { formatEUR } from "@/src/shared/utils/format";

export default function NewOrder() {
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const { data: products = [] } = useQuery({ queryKey: ["products", "all"], queryFn: () => api.get("/products") });
  const [requestKey] = useState(() => `order-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  const [supplier, setSupplier] = useState("");
  const [items, setItems] = useState<{ product_id: string; product_name: string; quantity: string; unit_price: string; vat_rate: number }[]>([]);
  const [loading, setLoading] = useState(false);

  const add = (p: any) => {
    if (items.find(i => i.product_id === p.id)) return;
    setItems(prev => [...prev, { product_id: p.id, product_name: p.name, quantity: "1", unit_price: String(p.purchase_price), vat_rate: p.vat_rate }]);
  };

  const number = (text: string) => Number(text.trim().replace(",", "."));
  const lines = items.map(item => Math.round((number(item.quantity || "0") * number(item.unit_price || "0") + Number.EPSILON) * 100));
  const subtotalCents = lines.reduce((sum, cents) => sum + cents, 0);
  const vatCents = lines.reduce((sum, cents, index) => sum + Math.round(cents * items[index].vat_rate / 100), 0);
  const subtotal = subtotalCents / 100, vat = vatCents / 100, total = (subtotalCents + vatCents) / 100;

  const submit = async () => {
    if (!supplier || items.length === 0) { Alert.alert("Erro", "Preencha fornecedor e itens"); return; }
    if (items.some(item => !Number.isInteger(number(item.quantity)) || number(item.quantity) <= 0 || !item.unit_price.trim() || !Number.isFinite(number(item.unit_price)) || number(item.unit_price) < 0)) {
      Alert.alert("Erro", "Indique quantidades inteiras positivas e preços válidos."); return;
    }
    setLoading(true);
    try {
      await api.post("/purchase-orders", {
        supplier, notes: null, idempotency_key: requestKey,
        items: items.map(i => ({ product_id: i.product_id, quantity: number(i.quantity), unit_price: number(i.unit_price) })),
      });
      qc.invalidateQueries({ queryKey: ["purchase-orders"] });
      goBack();
    } catch (e: any) { Alert.alert("Erro", e.message); }
    finally { setLoading(false); }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface }}>
      <ScreenHeader title="Nova Encomenda" back />
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ width: "100%", maxWidth: 1100, alignSelf: "center", padding: spacing.lg, gap: 12, paddingBottom: insets.bottom + 120 }} keyboardShouldPersistTaps="handled">
          <View style={styles.card}>
            <Input label="Fornecedor" value={supplier} onChangeText={setSupplier} placeholder="Ex: Fornecedor X" testID="po-supplier" />
          </View>

          <View style={styles.card}>
            <Text style={styles.label}>Adicionar produto</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingVertical: 4 }}>
              {products.filter((p: any) => !p.supplier || p.supplier.trim().toLowerCase() === supplier.trim().toLowerCase()).map((p: any) => (
                <Pressable key={p.id} onPress={() => add(p)} style={styles.chip}>
                  <Text style={styles.chipTxt}>{p.name}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>

          {items.map((it, idx) => (
            <View key={it.product_id} style={styles.card}>
              <Text style={styles.itemName}>{it.product_name}</Text>
              <View style={{ flexDirection: "row", gap: 8 }}>
                <View style={{ flex: 1 }}><Input label="Qtd" keyboardType="numeric" value={it.quantity}
                  onChangeText={t => setItems(prev => prev.map((x, i) => i === idx ? { ...x, quantity: t } : x))} /></View>
                <View style={{ flex: 1 }}><Input label="Preço" keyboardType="numeric" value={it.unit_price}
                  onChangeText={t => setItems(prev => prev.map((x, i) => i === idx ? { ...x, unit_price: t } : x))} /></View>
              </View>
              <Pressable onPress={() => setItems(prev => prev.filter((_, i) => i !== idx))}>
                <Text style={{ color: colors.error, marginTop: 8, fontSize: 13 }}>Remover</Text>
              </Pressable>
            </View>
          ))}

          {items.length > 0 && (
            <View style={styles.card}>
              <Row label="Subtotal" value={formatEUR(subtotal)} />
              <Row label="IVA" value={formatEUR(vat)} />
              <Row label="TOTAL" value={formatEUR(total)} bold />
            </View>
          )}
        </ScrollView>
        <View style={[styles.sticky, { paddingBottom: insets.bottom + 12 }]}>
          <Button title="Emitir encomenda" onPress={submit} loading={loading} testID="po-save" />
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}
function Row({ label, value, bold }: any) {
  return <View style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 4 }}>
    <Text style={{ color: colors.muted }}>{label}</Text>
    <Text style={{ color: bold ? colors.brandPrimary : colors.onSurface, fontWeight: bold ? "800" : "600" }}>{value}</Text>
  </View>;
}
const styles = StyleSheet.create({
  card: { backgroundColor: colors.surfaceSecondary, borderRadius: radius.lg, padding: spacing.lg, ...shadows.card },
  label: { color: colors.muted, fontSize: 12, fontWeight: "700", textTransform: "uppercase" },
  itemName: { fontSize: 14, fontWeight: "700", color: colors.onSurface, marginBottom: 8 },
  chip: { paddingHorizontal: 12, height: 32, borderRadius: 999, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, justifyContent: "center", flexShrink: 0 },
  chipTxt: { fontSize: 12, color: colors.onSurface },
  sticky: { position: "absolute", left: 0, right: 0, bottom: 0, backgroundColor: colors.surfaceSecondary,
    borderTopColor: colors.border, borderTopWidth: 1, paddingHorizontal: spacing.lg, paddingTop: 12 },
});
