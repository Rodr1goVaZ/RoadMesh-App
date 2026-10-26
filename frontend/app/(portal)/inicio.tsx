import React from "react";
import { View, Text, Pressable, StyleSheet, useWindowDimensions } from "react-native";
import { router } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/src/core/http/api";
import { AreaPage, QueryState } from "@/src/shared/layout/AreaUI";
import { VehicleCard } from "@/src/features/portal/VehicleCard";
import { portalColors as c, portalStyles } from "@/src/features/portal/theme";
import { useNow } from "@/src/shared/hooks/useNow";
export default function ClientHome() {
  const wide = useWindowDimensions().width >= 700; const now = useNow();
  const vehicles = useQuery({ queryKey: ["portal-vehicles"], queryFn: () => api.get("/portal/vehicles") });
  const appointments = useQuery({ queryKey: ["portal-appointments"], queryFn: () => api.get("/portal/appointments") });
  const vehicle = vehicles.data?.[0];
  const detail = useQuery({ queryKey: ["portal-vehicle", vehicle?.id], queryFn: () => api.get(`/portal/vehicles/${vehicle.id}`), enabled: !!vehicle?.id });
  const upcoming = (appointments.data || []).filter((a: any) => ["agendada", "confirmada"].includes(a.status) && new Date(a.scheduled_at).getTime() > now).sort((a: any, b: any) => Date.parse(a.scheduled_at) - Date.parse(b.scheduled_at));
  const next = upcoming.find((a: any) => a.vehicle_id === vehicle?.id);
  const history = () => router.navigate("/(portal)/historico");
  return <AreaPage title="Início" testID="portal-home" back={false}>
    <View style={[portalStyles.card, s.hero, wide && s.heroWide]}>
      <View style={s.heroIntro}><View style={s.shield}><Ionicons name="shield-checkmark" size={23} color={c.brand} /></View><View style={{ flex: 1, gap: 7 }}><Text style={s.heroTitle}>O histórico da sua viatura, sempre consigo.</Text><Text style={s.copy}>{detail.isError ? "Consulte as intervenções registadas pela oficina." : detail.data ? `${detail.data.history.length} registos no histórico.` : "Acompanhe as intervenções da sua oficina."}</Text></View></View>
      <Pressable accessibilityRole="button" testID="portal-home-history" onPress={history} style={[s.heroButton, wide && { alignSelf: "center" }]}><Text style={s.white}>Ver Histórico Completo</Text></Pressable>
    </View>
    <QueryState testID="portal-home-vehicles-query" loading={vehicles.isLoading} error={vehicles.error} retry={vehicles.refetch} />
    <View style={[s.columns, wide && { flexDirection: "row" }]}>
      <View style={{ flex: wide ? 2 : undefined, minWidth: 0 }}>
        {vehicle ? <VehicleCard vehicle={vehicle} nextDate={appointments.isSuccess ? next?.scheduled_at || null : undefined} featured /> : !vehicles.isLoading && !vehicles.error && <View style={portalStyles.card}><Ionicons name="car-outline" color={c.brand} size={48} /><Text style={portalStyles.title}>As suas viaturas estarão aqui</Text><Text style={portalStyles.hint}>Contacte a oficina para associar uma viatura à sua conta.</Text></View>}
      </View>
      <View style={{ flex: wide ? 1 : undefined, minWidth: 0, gap: 18 }}>
        <View style={portalStyles.card}>
          <View style={s.sectionTitle}><Ionicons name="warning" size={20} color={c.brand} /><Text style={portalStyles.title}>Alertas</Text></View>
          <QueryState testID="portal-home-appointments-query" loading={appointments.isLoading} error={appointments.error} retry={appointments.refetch} />
          {!appointments.isLoading && !appointments.error && <Pressable accessibilityRole="button" testID="portal-home-alert" onPress={() => router.push("/(portal)/marcacoes")} style={s.alert}>
            <Ionicons name={upcoming.length ? "calendar-outline" : "checkmark-circle-outline"} size={22} color={c.brand} />
            <View style={{ flex: 1, gap: 5 }}><Text style={s.alertTitle}>{upcoming.some((a: any) => a.suggested_local) ? "A oficina propôs uma nova data" : upcoming.length ? `${upcoming.length} ${upcoming.length === 1 ? "marcação em aberto" : "marcações em aberto"}` : "Sem marcações pendentes"}</Text><Text style={s.small}>{upcoming.length ? "Consulte as datas e confirmações da oficina." : "Pode pedir uma visita quando precisar."}</Text></View>
          </Pressable>}
        </View>
        <View style={portalStyles.card}><Text style={portalStyles.title}>Acesso Rápido</Text>
          <Quick icon="receipt-outline" title="Serviços e Orçamentos" onPress={history} testID="portal-quick-history" />
          <Quick icon="calendar-outline" title="As minhas marcações" onPress={() => router.push("/(portal)/marcacoes")} testID="portal-quick-appointments" />
          <Quick icon="business-outline" title="A minha oficina" onPress={() => router.navigate("/(portal)/perfil")} testID="portal-quick-workshop" />
        </View>
        {(vehicles.data?.length || 0) > 1 && <Quick icon="car-outline" title="Ver todas as viaturas" onPress={() => router.navigate("/(portal)/carros")} testID="portal-all-vehicles" />}
      </View>
    </View>
  </AreaPage>;
}
function Quick({ icon, title, onPress, testID }: { icon: React.ComponentProps<typeof Ionicons>["name"]; title: string; onPress: () => void; testID: string }) {
  return <Pressable testID={testID} accessibilityRole="button" onPress={onPress} style={({ pressed }) => [s.quick, pressed && { opacity: 0.7 }]}><View style={s.quickIcon}><Ionicons name={icon} size={19} color={c.brand} /></View><Text style={s.quickLabel}>{title}</Text><Ionicons name="chevron-forward" size={18} color={c.muted} /></Pressable>;
}
const s = StyleSheet.create({
  hero: { gap: 20, backgroundColor: "#FFFCFC", padding: 24 }, heroWide: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  heroIntro: { flexDirection: "row", alignItems: "center", gap: 16, flex: 1 }, shield: { width: 52, height: 52, borderRadius: 26, backgroundColor: "#F2E7E7", justifyContent: "center", alignItems: "center" },
  heroTitle: { color: c.brand, fontSize: 17, fontWeight: "700", lineHeight: 24 }, copy: { color: c.ink, fontSize: 14, lineHeight: 20 },
  heroButton: { backgroundColor: c.brand, borderRadius: 15, minHeight: 46, paddingHorizontal: 24, paddingVertical: 14, alignItems: "center", justifyContent: "center" }, white: { color: "#FFF", fontWeight: "600", fontSize: 14 },
  columns: { gap: 20 }, sectionTitle: { flexDirection: "row", alignItems: "center", gap: 9 },
  alert: { backgroundColor: c.warm, padding: 16, borderRadius: 18, gap: 12, flexDirection: "row", alignItems: "flex-start" }, alertTitle: { color: c.brand, fontWeight: "600", fontSize: 13, lineHeight: 19 }, small: { color: c.ink, fontSize: 12, lineHeight: 19 },
  quick: { flexDirection: "row", alignItems: "center", gap: 14, padding: 14, minHeight: 66, borderRadius: 18, borderWidth: 1, borderColor: c.line, backgroundColor: c.soft },
  quickIcon: { width: 42, height: 42, borderRadius: 12, backgroundColor: "#EBEEF8", alignItems: "center", justifyContent: "center" }, quickLabel: { flex: 1, fontSize: 14, lineHeight: 20, color: c.ink },
});
