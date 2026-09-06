import React, { useState } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable, Alert, Image } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import * as ImagePicker from "expo-image-picker";
import { api } from "@/src/api";
import { colors, spacing, radius, shadows } from "@/src/theme";
import { ScreenHeader } from "@/src/components/ScreenHeader";
import { Button } from "@/src/components/Button";
import { EmptyState } from "@/src/components/EmptyState";

const ZONES = [
  { id: "exterior_360", label: "Exterior 360º" },
  { id: "interior", label: "Interior" },
  { id: "pneus_rodas", label: "Pneus/Rodas" },
  { id: "pintura", label: "Pintura" },
  { id: "chassis_inferior", label: "Chassis" },
];

export default function VehiclePhotos() {
  const { vehicleId } = useLocalSearchParams<{ vehicleId: string }>();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const [zone, setZone] = useState("exterior_360");
  const [selected, setSelected] = useState<string | null>(null);
  const { data: vehicle } = useQuery({ queryKey: ["vehicle", vehicleId], queryFn: () => api.get(`/vehicles/${vehicleId}`), enabled: !!vehicleId });
  const { data: photos = [], refetch } = useQuery({
    queryKey: ["photos", vehicleId], queryFn: () => api.get(`/photos?vehicle_id=${vehicleId}`), enabled: !!vehicleId,
  });

  const filtered = photos.filter((p: any) => p.zone === zone);
  const main = selected ? photos.find((p: any) => p.id === selected) : filtered[0];

  const pickImage = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) { Alert.alert("Permissão necessária"); return; }
    const res = await ImagePicker.launchImageLibraryAsync({ base64: true, quality: 0.6, allowsEditing: false });
    if (res.canceled || !res.assets?.[0]?.base64) return;
    const asset = res.assets[0];
    const uri = `data:image/jpeg;base64,${asset.base64}`;
    try {
      await api.post("/photos", { vehicle_id: vehicleId, zone, image_b64: uri, caption: null });
      qc.invalidateQueries({ queryKey: ["photos", vehicleId] });
      refetch();
    } catch (e: any) { Alert.alert("Erro", e.message); }
  };

  const del = (id: string) => Alert.alert("Apagar foto?", "", [
    { text: "Cancelar", style: "cancel" },
    { text: "Apagar", style: "destructive", onPress: async () => {
      await api.del(`/photos/${id}`);
      qc.invalidateQueries({ queryKey: ["photos", vehicleId] });
    }},
  ]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface }}>
      <ScreenHeader title="Fotos do Veículo" back />
      {vehicle && <Text style={styles.sub}>{vehicle.make} {vehicle.model} · {vehicle.license_plate}</Text>}
      <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.md, paddingBottom: insets.bottom + 40 }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingBottom: 4 }}>
          {ZONES.map(z => (
            <Pressable key={z.id} testID={`zone-${z.id}`} onPress={() => { setZone(z.id); setSelected(null); }}
                       style={[styles.chip, zone === z.id && styles.chipActive]}>
              <Text style={[styles.chipTxt, zone === z.id && styles.chipTxtActive]}>{z.label}</Text>
            </Pressable>
          ))}
        </ScrollView>

        {main ? (
          <View style={styles.mainCard}>
            <Image source={{ uri: main.image_b64 }} style={styles.mainImg} resizeMode="cover" />
          </View>
        ) : (
          <View style={[styles.mainCard, { padding: 40, alignItems: "center", justifyContent: "center" }]}>
            <Text style={{ color: colors.muted, marginBottom: 12 }}>Sem fotos nesta zona</Text>
          </View>
        )}

        {filtered.length > 0 && (
          <View style={styles.grid}>
            {filtered.map((p: any) => (
              <Pressable key={p.id} onPress={() => setSelected(p.id)} onLongPress={() => del(p.id)}
                         style={[styles.thumb, main?.id === p.id && { borderColor: colors.brandPrimary, borderWidth: 2 }]}>
                <Image source={{ uri: p.image_b64 }} style={{ width: "100%", height: "100%" }} />
              </Pressable>
            ))}
          </View>
        )}

        <Button title="Carregar fotografias" onPress={pickImage} testID="upload-photo" />
      </ScrollView>
    </View>
  );
}
const styles = StyleSheet.create({
  sub: { color: colors.muted, textAlign: "center", paddingBottom: 4 },
  chip: { paddingHorizontal: 12, height: 32, borderRadius: 999, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surfaceSecondary, justifyContent: "center", flexShrink: 0 },
  chipActive: { backgroundColor: colors.brandPrimary, borderColor: colors.brandPrimary },
  chipTxt: { fontSize: 12, color: colors.onSurface, fontWeight: "600" },
  chipTxtActive: { color: "#fff" },
  mainCard: { backgroundColor: colors.surfaceSecondary, borderRadius: radius.lg, overflow: "hidden", ...shadows.card },
  mainImg: { width: "100%", height: 220 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  thumb: { width: 80, height: 80, borderRadius: 8, overflow: "hidden", backgroundColor: colors.surfaceSecondary, borderWidth: 1, borderColor: colors.border },
});
