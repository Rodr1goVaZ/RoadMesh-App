import React, { useState } from "react";
import { View, Text, Pressable, StyleSheet, ActivityIndicator } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { api } from "../api";
import { colors, radius } from "../theme";
import { Input } from "./Input";
import { Feedback } from "./Feedback";
import { Button } from "./Button";

export function VehiclePicker({ value, onChange }: { value: string; onChange: (id: string) => void }) {
  const [search, setSearch] = useState("");
  const { data = [], isLoading, error, refetch } = useQuery({ queryKey: ["vehicles-all"], queryFn: () => api.get("/vehicles") });
  const selected = data.find((v: any) => v.id === value);
  const normalized = search.replace(/[^a-z0-9]/gi, "").toLowerCase();
  const filtered = data.filter((v: any) => v.license_plate.replace(/[^a-z0-9]/gi, "").toLowerCase().includes(normalized));
  return <View style={styles.wrap}>
    <Text testID="damage-vehicle-label" style={styles.label}>Viatura</Text>
    {isLoading && <ActivityIndicator testID="damage-vehicles-loading" color={colors.brandPrimary} />}
    <Feedback error testID="damage-vehicles-error" message={error?.message} />
    {error && <Button testID="damage-vehicles-retry" title="Tentar novamente" onPress={() => refetch()} />}
    {selected ? <View style={styles.selected}>
      <Text testID="damage-selected-vehicle" style={styles.label}>{selected.license_plate} · {selected.make} {selected.model}</Text>
      <Button testID="damage-change-vehicle" title="Mudar viatura" variant="ghost" onPress={() => onChange("")} />
    </View> : <>
      <Input testID="damage-vehicle-search" value={search} onChangeText={setSearch} placeholder="Procurar por matrícula" autoCapitalize="characters" autoCorrect={false} />
      {filtered.slice(0, 6).map((v: any) => <Pressable testID={`damage-select-vehicle-${v.id}`} key={v.id} onPress={() => onChange(v.id)} style={({ pressed }) => [styles.option, pressed && styles.pressed]}>
        <Text style={styles.label}>{v.license_plate} · {v.make} {v.model}</Text>
      </Pressable>)}
      {!isLoading && !error && !filtered.length && <Text testID="damage-vehicles-empty" style={styles.hint}>Nenhuma viatura encontrada.</Text>}
    </>}
  </View>;
}
const styles = StyleSheet.create({
  wrap: { gap: 8 },
  selected: { backgroundColor: colors.brandTertiary, borderRadius: radius.md, padding: 12 },
  label: { fontSize: 14, fontWeight: "600", color: colors.onSurface },
  option: { padding: 12, minHeight: 48, justifyContent: "center", borderRadius: radius.md, backgroundColor: colors.surface },
  hint: { color: colors.muted, fontSize: 14 },
  pressed: { opacity: .7 },
});