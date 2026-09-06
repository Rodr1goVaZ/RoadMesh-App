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

type Item = { item_type: "peca" | "mao_de_obra"; description: string; quantity: string; unit_price: string; vat_rate: number; product_id?: string | null };

export default function NewWo() {
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const { data: clients = [] } = useQuery({ queryKey: ["clients-all"], queryFn: () => api.get("/clients") });
  const { data: vehicles = [] } = useQuery({ queryKey: ["vehicles-all"], queryFn: () => api.get("/vehicles") });

  const [clientId, setClientId] = useState<string>("");
  const [vehicleId, setVehicleId] = useState<string>("");
  const [mechanic, setMechanic] = useState("");
  const [complaint, setComplaint] = useState("");
  const [mileage, setMileage] = useState("");
  const [items, setItems] = useState<Item[]>([{ item_type: "mao_de_obra", description: "", quantity: "1", unit_price: "0", vat_rate: 23 }]);
  const [saving, setSaving] = useState(false);

  const filteredVehicles = clientId ? vehicles.filter((v: any) => v.client_id === clientId) : [];

  const submit = async () => {
    if (!clientId || !vehicleId) { Alert.alert("Erro", "Escolha cliente e viatura"); return; }
    setSaving(true);
    try {
      await api.post("/work-orders", {
        client_id: clientId, vehicle_id: vehicleId,
        mechanic: mechanic || null, complaint: complaint || null, notes: null,
        mileage_in: mileage ? Number(mileage) : null,
        status: "entrada",
        items: items.filter(i => i.description).map(i => ({
          item_type: i.item_type, description: i.description,
          quantity: Number(i.quantity || 0), unit_price: Number(i.unit_price || 0),
          vat_rate: i.vat_rate, product_id: null,
        })),
      });
      qc.invalidateQueries({ queryKey: ["work-orders"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      router.back();
    } catch (e: any) { Alert.alert("Erro", e.message); }
    finally { setSaving(false); }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface }}>
      <ScreenHeader title="Nova Ordem de Serviço" back testID="new-wo-header" />
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.md, paddingBottom: insets.bottom + 100 }}>
          <View style={styles.card}>
            <Text style={styles.label}>Cliente</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
              {clients.map((c: any) => (
                <Pressable key={c.id} testID={`pick-client-${c.name}`} onPress={() => { setClientId(c.id); setVehicleId(""); }}
                           style={[styles.chip, clientId === c.id && styles.chipActive]}>
                  <Text style={[styles.chipTxt, clientId === c.id && styles.chipTxtActive]}>{c.name}</Text>
                </Pressable>
              ))}
            </ScrollView>
            {clientId ? <>
              <Text style={[styles.label, { marginTop: 12 }]}>Viatura</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
                {filteredVehicles.map((v: any) => (
                  <Pressable key={v.id} testID={`pick-vehicle-${v.license_plate}`} onPress={() => setVehicleId(v.id)}
                             style={[styles.chip, vehicleId === v.id && styles.chipActive]}>
                    <Text style={[styles.chipTxt, vehicleId === v.id && styles.chipTxtActive]}>{v.license_plate} · {v.make} {v.model}</Text>
                  </Pressable>
                ))}
              </ScrollView>
            </> : null}
          </View>

          <View style={styles.card}>
            <Input label="Mecânico responsável" value={mechanic} onChangeText={setMechanic} placeholder="Nome" testID="wo-mechanic" />
            <View style={{ height: 8 }} />
            <Input label="Queixa do cliente" value={complaint} onChangeText={setComplaint} multiline numberOfLines={3} testID="wo-complaint" />
            <View style={{ height: 8 }} />
            <Input label="Quilometragem" value={mileage} onChangeText={setMileage} keyboardType="numeric" testID="wo-mileage" />
          </View>

          <View style={styles.card}>
            <Text style={styles.label}>Serviços / Peças</Text>
            {items.map((it, idx) => (
              <View key={idx} style={{ gap: 8, marginTop: 8, paddingTop: 8, borderTopWidth: idx > 0 ? 1 : 0, borderTopColor: colors.divider }}>
                <View style={{ flexDirection: "row", gap: 6 }}>
                  <Pressable onPress={() => setItems(prev => prev.map((x, i) => i === idx ? { ...x, item_type: "mao_de_obra" } : x))}
                             style={[styles.chip, it.item_type === "mao_de_obra" && styles.chipActive]}>
                    <Text style={[styles.chipTxt, it.item_type === "mao_de_obra" && styles.chipTxtActive]}>Mão de obra</Text>
                  </Pressable>
                  <Pressable onPress={() => setItems(prev => prev.map((x, i) => i === idx ? { ...x, item_type: "peca" } : x))}
                             style={[styles.chip, it.item_type === "peca" && styles.chipActive]}>
                    <Text style={[styles.chipTxt, it.item_type === "peca" && styles.chipTxtActive]}>Peça</Text>
                  </Pressable>
                </View>
                <Input label="Descrição" value={it.description} onChangeText={t => setItems(prev => prev.map((x, i) => i === idx ? { ...x, description: t } : x))} />
                <View style={{ flexDirection: "row", gap: 8 }}>
                  <View style={{ flex: 1 }}><Input label="Qtd" keyboardType="numeric" value={it.quantity} onChangeText={t => setItems(prev => prev.map((x, i) => i === idx ? { ...x, quantity: t } : x))} /></View>
                  <View style={{ flex: 1 }}><Input label="Preço" keyboardType="numeric" value={it.unit_price} onChangeText={t => setItems(prev => prev.map((x, i) => i === idx ? { ...x, unit_price: t } : x))} /></View>
                </View>
              </View>
            ))}
            <View style={{ height: 8 }} />
            <Button title="+ Adicionar linha" variant="secondary" testID="wo-add-item"
                    onPress={() => setItems(prev => [...prev, { item_type: "mao_de_obra", description: "", quantity: "1", unit_price: "0", vat_rate: 23 }])} />
          </View>
        </ScrollView>
        <View style={[styles.sticky, { paddingBottom: insets.bottom + 12 }]}>
          <Button title="Guardar OS" onPress={submit} loading={saving} testID="wo-save" />
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
