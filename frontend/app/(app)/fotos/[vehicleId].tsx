import React, { useState } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable, Alert } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/src/api";
import { colors, spacing, radius, shadows } from "@/src/theme";
import { ScreenHeader } from "@/src/components/ScreenHeader";
import { Button } from "@/src/components/Button";
import { Photo } from "@/src/components/Photo";
import { pickPhoto, uploadPhoto } from "@/src/utils/media";
import { Feedback } from "@/src/components/Feedback";
import { DamageQuickActions } from "@/src/components/DamageQuickActions";

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
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const { data: vehicle } = useQuery({ queryKey: ["vehicle", vehicleId], queryFn: () => api.get(`/vehicles/${vehicleId}`), enabled: !!vehicleId });
  const { data: photos = [], refetch } = useQuery({
    queryKey: ["photos", vehicleId], queryFn: () => api.get(`/photos?vehicle_id=${vehicleId}`), enabled: !!vehicleId,
  });

  const filtered = photos.filter((p: any) => p.zone === zone);
  const main = selected ? photos.find((p: any) => p.id === selected) : filtered[0];

  const pickImage = async () => {
    setError(""); setUploading(true);
    try {
      const asset = await pickPhoto();
      if (!asset) return;
      const media = await uploadPhoto(asset);
      await api.post("/photos", { vehicle_id: vehicleId, zone, media_id: media.id, caption: null });
      qc.invalidateQueries({ queryKey: ["photos", vehicleId] });
      qc.invalidateQueries({ queryKey: ["vehicle", vehicleId] });
      refetch();
    } catch (e: any) { setError(e.message); }
    finally { setUploading(false); }
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
            <Photo mediaId={main.media_id} legacyUri={main.image_b64} testID="vehicle-main-photo" style={styles.mainImg} />
          </View>
        ) : (
          <View style={[styles.mainCard, { padding: 40, alignItems: "center", justifyContent: "center" }]}>
            <Text style={{ color: colors.muted, marginBottom: 12 }}>Sem fotos nesta zona</Text>
          </View>
        )}

        {filtered.length > 0 && (
          <View style={styles.grid}>
            {filtered.map((p: any) => (
              <Pressable key={p.id} testID={`vehicle-photo-thumb-${p.id}`} onPress={() => setSelected(p.id)} onLongPress={() => del(p.id)}
                         style={[styles.thumb, main?.id === p.id && { borderColor: colors.brandPrimary, borderWidth: 2 }]}>
                <Photo mediaId={p.media_id} legacyUri={p.image_b64} testID={`vehicle-photo-${p.id}`} style={styles.thumbImg} />
              </Pressable>
            ))}
          </View>
        )}

        <Feedback testID="vehicle-photo-upload-error" error message={error} />
        <Button title="Carregar fotografias" onPress={pickImage} testID="upload-photo" loading={uploading} />
        <DamageQuickActions vehicleId={vehicleId} testID="photos-damage" />
      </ScrollView>
    </View>
  );
}
const styles = StyleSheet.create({
  thumbImg: { width: "100%", height: "100%" },
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
