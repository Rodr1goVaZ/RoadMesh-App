import React, { useEffect, useState } from "react";
import { View, Text, ScrollView, StyleSheet, KeyboardAvoidingView, Platform } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ScreenHeader } from "@/src/components/ScreenHeader";
import { VehiclePicker } from "@/src/components/VehiclePicker";
import { DamageForm } from "@/src/components/DamageForm";
import { DamageHistory } from "@/src/components/DamageHistory";
import { colors, radius, spacing, shadows } from "@/src/theme";

export default function Damages() {
  const { vehicle_id, category } = useLocalSearchParams<{ vehicle_id?: string; category?: string }>();
  const [vehicleId, setVehicleId] = useState(vehicle_id || "");
  const insets = useSafeAreaInsets();
  useEffect(() => { setVehicleId(vehicle_id || ""); }, [vehicle_id]);
  const initialCategory = ["risco", "amolgadela", "fuga"].includes(category || "") ? category : "risco";
  return <View style={styles.screen}>
    <ScreenHeader title="Registo de danos" back testID="damage-header" />
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.flex}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}>
        <Text testID="damage-screen-help" style={styles.hint}>Registe o estado da viatura na receção e durante o serviço.</Text>
        <View style={styles.card}><VehiclePicker value={vehicleId} onChange={setVehicleId} /></View>
        {vehicleId ? <>
          <View style={styles.card}><DamageForm key={`${vehicleId}-${initialCategory}`} vehicleId={vehicleId} initialCategory={initialCategory} /></View>
          <DamageHistory vehicleId={vehicleId} />
        </> : <Text testID="damage-select-help" style={styles.hint}>Escolha uma viatura para registar ou consultar danos.</Text>}
      </ScrollView>
    </KeyboardAvoidingView>
  </View>;
}
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.surface }, flex: { flex: 1 },
  content: { padding: spacing.lg, gap: 20 },
  card: { padding: spacing.lg, gap: 16, backgroundColor: colors.surfaceSecondary, borderRadius: radius.lg, ...shadows.card },
  hint: { color: colors.muted, fontSize: 14, lineHeight: 21 },
});