import React, { useState } from "react";
import { View, Text, StyleSheet, ActivityIndicator } from "react-native";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../api";
import { colors, radius, spacing } from "../theme";
import { formatDate } from "../utils/format";
import { SEVERITIES } from "./DamageForm";
import { Button } from "./Button";
import { Photo } from "./Photo";
import { Feedback } from "./Feedback";

const LABELS: Record<string, string> = { risco: "Risco", amolgadela: "Amolgadela", fuga: "Fuga", ferrugem: "Ferrugem", dano_estrutural: "Dano estrutural", desgaste_pneu: "Desgaste de pneu", outro: "Outro" };
export function DamageHistory({ vehicleId }: { vehicleId: string }) {
  const { data = [], isLoading, error, refetch } = useQuery({ queryKey: ["damages", vehicleId], queryFn: () => api.get(`/damages?vehicle_id=${vehicleId}`) });
  return <View style={styles.list}>
    <Text testID="damage-history-heading" style={styles.title}>Danos registados ({data.length})</Text>
    {isLoading && <ActivityIndicator testID="damage-history-loading" color={colors.brandPrimary} />}
    <Feedback testID="damage-history-error" message={error?.message} error />
    {error && <Button testID="damage-history-retry" title="Tentar novamente" onPress={() => refetch()} />}
    {!isLoading && !error && !data.length && <Text testID="damage-history-empty" style={styles.hint}>Ainda não existem danos registados nesta viatura.</Text>}
    {data.map((damage: any) => <DamageCard key={damage.id} damage={damage} />)}
  </View>;
}
function DamageCard({ damage }: { damage: any }) {
  const qc = useQueryClient();
  const [confirm, setConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const level = SEVERITIES.find(item => item.id === damage.severity);
  const remove = async () => {
    setLoading(true); setError("");
    try {
      await api.del(`/damages/${damage.id}`);
      await qc.invalidateQueries({ queryKey: ["damages", damage.vehicle_id] });
      qc.invalidateQueries({ queryKey: ["vehicle", damage.vehicle_id] });
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  };
  return <View testID={`damage-card-${damage.id}`} style={styles.card}>
    <View style={styles.row}>
      <Text testID={`damage-category-${damage.id}`} style={styles.label}>{LABELS[damage.category] || damage.category}</Text>
      <Text testID={`damage-level-${damage.id}`} style={[styles.level, { borderColor: level?.color || colors.muted }]}>{level?.label || damage.severity}</Text>
    </View>
    {(damage.media_id || damage.image_b64) && <Photo mediaId={damage.media_id} legacyUri={damage.image_b64} testID={`damage-photo-${damage.id}`} style={styles.photo} />}
    {!!damage.location && <Text testID={`damage-zone-${damage.id}`} style={styles.label}>{damage.location}</Text>}
    {!!damage.description && <Text testID={`damage-notes-${damage.id}`} style={styles.hint}>{damage.description}</Text>}
    <Text testID={`damage-date-${damage.id}`} style={styles.hint}>{formatDate(damage.created_at)}</Text>
    <Feedback testID={`damage-delete-error-${damage.id}`} error message={error} />
    {confirm ? <>
      <Text testID={`damage-delete-confirmation-${damage.id}`} style={styles.hint}>Apagar este registo de dano?</Text>
      <Button testID={`damage-delete-confirm-${damage.id}`} title="Sim, apagar" variant="danger" loading={loading} onPress={remove} />
      <Button testID={`damage-delete-cancel-${damage.id}`} title="Cancelar" variant="ghost" disabled={loading} onPress={() => setConfirm(false)} />
    </> : <Button testID={`damage-delete-${damage.id}`} title="Apagar registo" variant="ghost" onPress={() => setConfirm(true)} />}
  </View>;
}
const styles = StyleSheet.create({
  list: { gap: 16 }, title: { fontSize: 20, fontWeight: "700", color: colors.onSurface },
  card: { padding: spacing.lg, gap: 12, borderRadius: radius.lg, backgroundColor: colors.surfaceSecondary },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  label: { color: colors.onSurface, fontSize: 15, fontWeight: "600", flexShrink: 1 },
  level: { fontSize: 12, fontWeight: "700", color: colors.onSurface, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 6, borderRadius: radius.pill },
  hint: { color: colors.muted, fontSize: 14, lineHeight: 21 },
  photo: { width: "100%", height: 180, borderRadius: radius.md, backgroundColor: colors.surface },
});