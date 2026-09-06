import React, { useState } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable, KeyboardAvoidingView, Platform, Alert } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/src/api";
import { colors, spacing, radius, shadows } from "@/src/theme";
import { Input } from "@/src/components/Input";
import { Button } from "@/src/components/Button";
import { ScreenHeader } from "@/src/components/ScreenHeader";
import { formatEUR } from "@/src/utils/format";

export default function NewOrder() {
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const { data: products = [] } = useQuery({ queryKey: ["products-all"], queryFn: () => api.get("/products") });
  const [supplier, setSupplier] = useState("");
  const [items, setItems] = useState<{ product_id: string; product_name: string; quantity: string; unit_price: string }[]>([]);
  const [loading, setLoading] = useState(false);

  const add = (p: any) => {
    if (items.find(i => i.product_id === p.id)) return;
    setItems(prev => [...prev, { product_id: p.id, product_name: p.name, quantity: "1", unit_price: String(p.purchase_price) }]);
  };

  const subtotal = items.reduce((s, it) => s + Number(it.quantity || 0) * Number(it.unit_price || 0), 0);
  const vat = subtotal * 0.23;
  const total = subtotal + vat;

  const submit = async () => {
    if (!supplier || items.length === 0) { Alert.alert("Erro", "Preencha fornecedor e itens"); return; }
    setLoading(true);
    try {
      await api.post("/purchase-orders", {
        supplier, notes: null,
        items: items.map(i => ({ product_id: i.product_id, quantity: Number(i.quantity), unit_price: Number(i.unit_price) })),
      });
      qc.invalidateQueries({ queryKey: ["purchase-orders"] });
      router.back();
    } catch (e: any) { Alert.alert("Erro", e.message); }
    finally { setLoading(false); }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface }}>
      <ScreenHeader title="Nova Encomenda" back />
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: 12, paddingBottom: insets.bottom + 120 }} keyboardShouldPersistTaps="handled">
          <View style={styles.card}>
            <Input label="Fornecedor" value={supplier} onChangeText={setSupplier} placeholder="Ex: Fornecedor X" testID="po-supplier" />
          </View>

          <View style={styles.card}>
            <Text style={styles.label}>Adicionar produto</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingVertical: 4 }}>
              {products.map((p: any) => (
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
              <Row label="IVA (23%)" value={formatEUR(vat)} />
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
