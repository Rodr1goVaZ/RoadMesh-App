import { ClientVehicleFields } from "@/src/components/RelationPicker";
import { useAuth } from "@/src/auth";
import { goBack } from "@/src/utils/navigation";
import React, { useState } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable, KeyboardAvoidingView, Platform } from "react-native";
import { AppAlert as Alert } from "@/src/utils/alerts";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/src/api";
import { colors, spacing, radius, shadows } from "@/src/theme";
import { Input } from "@/src/components/Input";
import { Button } from "@/src/components/Button";
import { ScreenHeader } from "@/src/components/ScreenHeader";
import { ProductPicker } from "@/src/components/ProductPicker";

type Item = { item_type: "peca" | "mao_de_obra"; description: string; quantity: string; unit_price: string; vat_rate: number; product_id?: string | null };

export default function NewWo() {
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const { user, support } = useAuth(); const manager = !!user?.can_manage_workshop || !!support;
  const { data: settings } = useQuery({ queryKey: ["workshop-settings"], queryFn: () => api.get("/workshop/settings") });

  const [clientId, setClientId] = useState<string>("");
  const [vehicleId, setVehicleId] = useState<string>("");
  const [mechanic, setMechanic] = useState("");
  const [complaint, setComplaint] = useState("");
  const [mileage, setMileage] = useState("");
  const [items, setItems] = useState<Item[]>([{ item_type: "mao_de_obra", description: "", quantity: "1", unit_price: "0", vat_rate: 23 }]);
  const [saving, setSaving] = useState(false);


  const submit = async () => {
    if (!clientId || !vehicleId) { Alert.alert("Erro", "Escolha cliente e viatura"); return; }
    const number = (text: string) => Number(text.trim().replace(",", "."));
    if (items.some(item => (item.item_type !== "mao_de_obra" && !item.description.trim()) || !Number.isFinite(number(item.quantity)) || number(item.quantity) <= 0 || !item.unit_price.trim() || !Number.isFinite(number(item.unit_price)) || number(item.unit_price) < 0)) {
      Alert.alert("Erro", "Preencha a descrição, uma quantidade positiva e um preço válido em todas as linhas."); return;
    }
    setSaving(true);
    try {
      await api.post("/work-orders", {
        client_id: clientId, vehicle_id: vehicleId,
        mechanic: mechanic || null, complaint: complaint || null, notes: null,
        mileage_in: mileage ? Number(mileage) : null,
        status: "entrada",
        items: items.map(i => ({
          item_type: i.item_type, description: i.description.trim() || (i.item_type === "mao_de_obra" ? "Mão de obra" : "Peça"),
          quantity: number(i.quantity), unit_price: i.item_type === "mao_de_obra" && settings?.configured ? Number(settings.labor_hour_rate) : number(i.unit_price),
          vat_rate: i.item_type === "mao_de_obra" && settings?.configured ? Number(settings.labor_vat_rate) : i.vat_rate, product_id: i.product_id || null,
        })),
      });
      qc.invalidateQueries({ queryKey: ["work-orders"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      qc.invalidateQueries({ queryKey: ["products"] });
      qc.invalidateQueries({ queryKey: ["product"] });
      goBack();
    } catch (e: any) { Alert.alert("Erro", e.message); }
    finally { setSaving(false); }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface }}>
      <ScreenHeader title="Nova Ordem de Serviço" back testID="new-wo-header" />
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ width: "100%", maxWidth: 1100, alignSelf: "center", padding: spacing.lg, gap: spacing.md, paddingBottom: insets.bottom + 100 }}>
          <View style={styles.card}>
            <ClientVehicleFields clientId={clientId} onClient={setClientId} onVehicle={setVehicleId} />
          </View>

          <View style={styles.card}>
            <Input label="Mecânico responsável" value={mechanic} onChangeText={setMechanic} placeholder="Nome" testID="wo-mechanic" />
            <View style={{ height: 8 }} />
            <Input label="Avaliação do Cliente" value={complaint} onChangeText={setComplaint} multiline numberOfLines={3} testID="wo-complaint" />
            <View style={{ height: 8 }} />
            <Input label="Quilometragem" value={mileage} onChangeText={setMileage} keyboardType="numeric" testID="wo-mileage" />
          </View>

          <View style={styles.card}>
            <Text style={styles.label}>Serviços / Peças</Text>
            {items.map((it, idx) => (
              <View key={idx} style={{ gap: 8, marginTop: 8, paddingTop: 8, borderTopWidth: idx > 0 ? 1 : 0, borderTopColor: colors.divider }}>
                <View style={{ flexDirection: "row", gap: 6 }}>
                  <Pressable onPress={() => setItems(prev => prev.map((x, i) => i === idx ? { ...x, item_type: "mao_de_obra", product_id: null, vat_rate: 23 } : x))}
                             style={[styles.chip, it.item_type === "mao_de_obra" && styles.chipActive]}>
                    <Text style={[styles.chipTxt, it.item_type === "mao_de_obra" && styles.chipTxtActive]}>Mão de obra</Text>
                  </Pressable>
                  <Pressable onPress={() => setItems(prev => prev.map((x, i) => i === idx ? { ...x, item_type: "peca" } : x))}
                             style={[styles.chip, it.item_type === "peca" && styles.chipActive]}>
                    <Text style={[styles.chipTxt, it.item_type === "peca" && styles.chipTxtActive]}>Peça</Text>
                  </Pressable>
                </View>
                {it.item_type === "peca" && <ProductPicker value={it.product_id} testID={`wo-item-product-${idx}`} onChange={product => setItems(prev => prev.map((item, i) => i === idx ? { ...item, product_id: product?.id || null, ...(product ? { description: product.name, unit_price: String(product.sale_price), vat_rate: product.vat_rate } : {}) } : item))} />}
                <Input testID={`wo-item-description-${idx}`} label={it.item_type === "mao_de_obra" ? "Descrição (opcional)" : "Descrição"} value={it.description} onChangeText={t => setItems(prev => prev.map((x, i) => i === idx ? { ...x, description: t } : x))} />
                <View style={{ flexDirection: "row", gap: 8 }}>
                  <View style={{ flex: 1 }}><Input testID={`wo-item-quantity-${idx}`} label={it.item_type === "mao_de_obra" ? "Horas" : "Quantidade"} keyboardType="decimal-pad" value={it.quantity} onChangeText={t => setItems(prev => prev.map((x, i) => i === idx ? { ...x, quantity: t } : x))} /></View>
                  <View style={{ flex: 1 }}><Input testID={`wo-item-price-${idx}`} label="Preço" keyboardType="decimal-pad" editable={manager && !(it.item_type === "mao_de_obra" && settings?.configured)} value={it.item_type === "mao_de_obra" && settings?.configured ? String(settings.labor_hour_rate) : it.unit_price} onChangeText={t => setItems(prev => prev.map((x, i) => i === idx ? { ...x, unit_price: t } : x))} /></View>
                </View>
              </View>
            ))}
            <View style={{ height: 8 }} />
            <Button title="+ Adicionar linha" variant="secondary" testID="wo-add-item"
                    onPress={() => setItems(prev => [...prev, { item_type: "mao_de_obra", description: "", quantity: "1", unit_price: "0", vat_rate: 23 }])} />
          </View>
        </ScrollView>
        <View style={[styles.sticky, { paddingBottom: insets.bottom + 12 }]}>
          <Button title="Guardar Ordem de Serviço" onPress={submit} loading={saving} testID="wo-save" />
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}
const styles = StyleSheet.create({
  card: { backgroundColor: colors.surfaceSecondary, borderRadius: radius.lg, padding: spacing.lg, ...shadows.card },
  label: { color: colors.muted, fontSize: 12, fontWeight: "700", textTransform: "uppercase" },
  chipsRow: { gap: 6, paddingVertical: 4 },
  chip: { paddingHorizontal: 12, height: 34, borderRadius: 999, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, justifyContent: "center", flexShrink: 0 },
  chipActive: { backgroundColor: colors.brandPrimary, borderColor: colors.brandPrimary },
  chipTxt: { fontSize: 12, color: colors.onSurface, fontWeight: "600" },
  chipTxtActive: { color: "#fff" },
  sticky: { position: "absolute", left: 0, right: 0, bottom: 0, backgroundColor: colors.surfaceSecondary,
    borderTopColor: colors.border, borderTopWidth: 1, paddingHorizontal: spacing.lg, paddingTop: 12 },
});
