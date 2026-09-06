import React, { useState } from "react";
import { View, Text, Pressable, StyleSheet, Image } from "react-native";
import { ImagePickerAsset } from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import { useQueryClient } from "@tanstack/react-query";
import { api } from "../api";
import { colors, radius } from "../theme";
import { pickPhoto, uploadPhoto } from "../utils/media";
import { DAMAGE_TYPES } from "./DamageQuickActions";
import { Input } from "./Input";
import { Button } from "./Button";
import { Feedback } from "./Feedback";

export const SEVERITIES = [
  { id: "baixo", label: "Ligeira", color: colors.success },
  { id: "medio", label: "Moderada", color: colors.warning },
  { id: "critico", label: "Grave", color: colors.error },
];

export function DamageForm({ vehicleId, initialCategory = "risco" }: { vehicleId: string; initialCategory?: string }) {
  const qc = useQueryClient();
  const [category, setCategory] = useState(initialCategory);
  const [severity, setSeverity] = useState("baixo");
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const [photo, setPhoto] = useState<ImagePickerAsset | null>(null);
  const [mediaId, setMediaId] = useState("");
  const [loading, setLoading] = useState(false);
  const [picking, setPicking] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const pick = async (camera: boolean) => {
    setError(""); setMessage(""); setPicking(true);
    try { const asset = await pickPhoto(camera); if (asset) { setPhoto(asset); setMediaId(""); } }
    catch (e: any) { setError(e.message); }
    finally { setPicking(false); }
  };
  const save = async () => {
    setError(""); setMessage("");
    if (!photo) { setError("Adicione uma fotografia do dano antes de guardar."); return; }
    setLoading(true);
    try {
      const id = mediaId || (await uploadPhoto(photo)).id;
      setMediaId(id);
      await api.post("/damages", { vehicle_id: vehicleId, category, severity, location: location.trim(), description: description.trim(), media_id: id });
      await Promise.all([qc.invalidateQueries({ queryKey: ["damages", vehicleId] }), qc.invalidateQueries({ queryKey: ["vehicle", vehicleId] })]);
      setPhoto(null); setMediaId(""); setDescription(""); setLocation(""); setMessage("Dano registado com sucesso.");
    } catch (e: any) { setError(e.message || "Não foi possível guardar o dano."); }
    finally { setLoading(false); }
  };
  return <View testID="damage-form" style={styles.form}>
    <Text testID="damage-type-label" style={styles.label}>Tipo de dano</Text>
    <View style={styles.row}>{DAMAGE_TYPES.map(type => <Pressable testID={`damage-type-${type.id}`} key={type.id} disabled={loading} accessibilityRole="button" accessibilityState={{ selected: category === type.id }} onPress={() => setCategory(type.id)} style={({ pressed }) => [styles.choice, category === type.id && styles.selected, pressed && styles.pressed]}>
      <Ionicons name={type.icon} size={22} color={category === type.id ? colors.onBrand : colors.brandPrimary} />
      <Text style={[styles.choiceLabel, category === type.id && styles.selectedLabel]}>{type.label}</Text>
    </Pressable>)}</View>
    <Text testID="damage-severity-label" style={styles.label}>Gravidade</Text>
    <View style={styles.row}>{SEVERITIES.map(level => <Pressable testID={`damage-severity-${level.id}`} key={level.id} disabled={loading} accessibilityRole="button" accessibilityState={{ selected: severity === level.id }} onPress={() => setSeverity(level.id)} style={({ pressed }) => [styles.choice, severity === level.id && styles.outlined, pressed && styles.pressed]}>
      <View style={[styles.dot, { backgroundColor: level.color }]} /><Text style={styles.choiceLabel}>{level.label}</Text>
    </Pressable>)}</View>
    <Input testID="damage-location" label="Zona da viatura (opcional)" placeholder="Ex.: porta dianteira esquerda" value={location} onChangeText={setLocation} maxLength={150} editable={!loading} />
    <Input testID="damage-description" label="Observações (opcional)" placeholder="Descreva o dano observado…" value={description} onChangeText={setDescription} multiline maxLength={1000} editable={!loading} />
    <Text testID="damage-photo-label" style={styles.label}>Fotografia do dano</Text>
    {photo && <>
      <Image testID="damage-photo-preview" source={{ uri: photo.uri }} style={styles.photo} resizeMode="contain" />
      <Button testID="damage-remove-photo" title="Remover fotografia" variant="ghost" disabled={loading} onPress={() => { setPhoto(null); setMediaId(""); }} />
    </>}
    <View style={styles.row}>
      <Button testID="damage-camera" title="Tirar foto" variant="secondary" style={styles.flex} disabled={loading || picking} onPress={() => pick(true)} />
      <Button testID="damage-gallery" title="Galeria" variant="secondary" style={styles.flex} disabled={loading || picking} onPress={() => pick(false)} />
    </View>
    <Feedback testID="damage-form-error" message={error} error />
    <Feedback testID="damage-form-success" message={message} />
    <Button testID="damage-save" title="Guardar dano" onPress={save} loading={loading} disabled={picking} />
  </View>;
}
const styles = StyleSheet.create({
  form: { gap: 14 }, row: { flexDirection: "row", gap: 8 }, flex: { flex: 1 },
  label: { color: colors.onSurface, fontSize: 14, fontWeight: "600" },
  choice: { flex: 1, minHeight: 66, padding: 8, justifyContent: "center", alignItems: "center", borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, gap: 8 },
  selected: { backgroundColor: colors.brandPrimary, borderColor: colors.brandPrimary },
  outlined: { borderColor: colors.brandPrimary, borderWidth: 2, backgroundColor: colors.brandTertiary },
  choiceLabel: { color: colors.onSurface, fontSize: 12, fontWeight: "600" }, selectedLabel: { color: colors.onBrand },
  dot: { width: 8, height: 8, borderRadius: 4 },
  photo: { width: "100%", height: 200, borderRadius: radius.md, backgroundColor: colors.surface },
  pressed: { opacity: .7 },
});