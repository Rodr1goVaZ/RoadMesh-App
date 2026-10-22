import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { router } from "expo-router";
import { Photo } from "../components/Photo";
import { portalColors as c } from "./theme";
export function VehicleCard({ vehicle, nextDate, featured = false }: { vehicle: any; nextDate?: string | null; featured?: boolean }) {
  const open = () => router.push({ pathname: "/(portal)/carro", params: { id: vehicle.id } });
  return <View testID={`portal-car-${vehicle.id}`} style={s.card}>
    <View style={s.photoWrap}>
      {vehicle.cover ? <Photo mediaId={vehicle.cover.media_id} legacyUri={vehicle.cover.image_b64} testID={`portal-car-image-${vehicle.id}`} resizeMode="cover" style={s.photo} /> : <View style={[s.photo, s.placeholder]}><Ionicons name="car-sport-outline" size={74} color={c.brand} /><Text testID={`portal-car-no-photo-${vehicle.id}`} style={s.hint}>Sem fotografia</Text></View>}
      {featured && <View style={s.badge}><Text style={s.badgeText}>A sua viatura</Text></View>}
    </View>
    <View style={s.body}>
      <View style={s.heading}><Text testID={`portal-car-name-${vehicle.id}`} style={s.title}>{vehicle.make} {vehicle.model}</Text><View style={s.plate}><Text testID={`portal-car-plate-${vehicle.id}`} style={s.plateText}>{vehicle.license_plate}</Text></View></View>
      <Text testID={`portal-car-specs-${vehicle.id}`} style={s.hint}>{[vehicle.fuel, vehicle.year].filter(Boolean).join(" · ") || "Dados disponíveis na ficha da viatura"}</Text>
      <View style={s.stats}>
        <View style={s.stat}><Ionicons name="speedometer-outline" size={21} color={c.muted} /><Text style={s.statValue}>{vehicle.mileage != null ? vehicle.mileage.toLocaleString("pt-PT") + " km" : "Não indicada"}</Text><Text style={s.statLabel}>Quilometragem</Text></View>
        <View style={s.stat}><Ionicons name="calendar-outline" size={21} color={c.muted} /><Text style={[s.statValue, { color: c.brand }]}>{nextDate ? new Date(nextDate).toLocaleDateString("pt-PT", { day: "numeric", month: "short", year: "numeric", timeZone: "Europe/Lisbon" }) : nextDate === null ? "Por agendar" : "Consultar agenda"}</Text><Text style={s.statLabel}>Próxima marcação</Text></View>
      </View>
      <View style={s.actions}>
        <Pressable testID={`portal-car-schedule-${vehicle.id}`} accessibilityRole="button" onPress={() => router.push({ pathname: "/(portal)/marcacoes", params: { vehicleId: vehicle.id, novo: "1" } })} style={({ pressed }) => [s.schedule, pressed && { opacity: 0.8 }]}><Ionicons name="calendar-outline" size={19} color="#FFF" /><Text style={s.scheduleText}>Agendar</Text></Pressable>
        <Pressable testID={`portal-car-open-${vehicle.id}`} accessibilityRole="button" accessibilityLabel={`Ver carro e histórico de ${vehicle.license_plate}`} onPress={open} style={s.more}><Ionicons name="ellipsis-horizontal" size={23} color={c.muted} /></Pressable>
      </View>
    </View>
  </View>;
}
const s = StyleSheet.create({
  card: { borderRadius: 24, overflow: "hidden", backgroundColor: c.card, borderWidth: 1, borderColor: c.line, shadowColor: "#20243A", shadowOffset: { width: 0, height: 4 }, shadowOpacity: .05, shadowRadius: 12, elevation: 2 },
  photoWrap: { position: "relative" }, photo: { width: "100%", aspectRatio: 2.05, backgroundColor: c.soft },
  placeholder: { alignItems: "center", justifyContent: "center", gap: 8 }, badge: { position: "absolute", right: 16, top: 16, borderRadius: 10, backgroundColor: "#FFF", padding: 10 }, badgeText: { color: c.brand, fontSize: 11, fontWeight: "700" },
  body: { padding: 20, gap: 14 }, heading: { flexDirection: "row", gap: 12, alignItems: "flex-start", flexWrap: "wrap" }, title: { flex: 1, minWidth: 150, color: c.ink, fontSize: 22, fontWeight: "700" },
  hint: { fontSize: 14, lineHeight: 20, color: c.muted }, plate: { backgroundColor: c.soft, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 7 }, plateText: { color: c.ink, fontWeight: "600", fontSize: 14 },
  stats: { flexDirection: "row", gap: 12 }, stat: { flex: 1, backgroundColor: c.soft, borderColor: c.line, borderWidth: 1, borderRadius: 18, paddingVertical: 18, paddingHorizontal: 7, gap: 6, alignItems: "center", justifyContent: "center" },
  statValue: { color: c.ink, fontWeight: "700", fontSize: 15, textAlign: "center" }, statLabel: { color: c.muted, fontSize: 12, textAlign: "center" },
  actions: { flexDirection: "row", gap: 12 }, schedule: { flex: 1, minHeight: 48, padding: 12, borderRadius: 15, backgroundColor: c.brand, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 9 }, scheduleText: { color: "#FFF", fontSize: 15, fontWeight: "600" },
  more: { minWidth: 50, borderRadius: 15, backgroundColor: "#ECEEF3", alignItems: "center", justifyContent: "center" },
});
