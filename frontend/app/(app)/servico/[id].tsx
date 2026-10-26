import { goBack } from "@/src/shared/utils/navigation";
import React, { useState } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable } from "react-native";
import { AppAlert as Alert } from "@/src/shared/utils/alerts";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/src/core/http/api";
import { useAuth } from "@/src/core/auth/AuthProvider";
import { colors, spacing, radius, shadows } from "@/src/shared/theme/legacy";
import { StatusChip } from "@/src/shared/ui/StatusChip";
import { Button } from "@/src/shared/ui/Button";
import { ScreenHeader } from "@/src/shared/layout/ScreenHeader";
import { formatEUR, formatDateTime, OS_STATUS_LABELS } from "@/src/shared/utils/format";
import { DamageQuickActions } from "@/src/features/inspections/components/DamageQuickActions";
import { Feedback } from "@/src/shared/ui/Feedback";

const STATUSES = ["entrada", "diagnostico", "aguardando_pecas", "concluido"];

export default function WoDetail() {
  const { user, support } = useAuth();
  const canManage = user?.can_manage_workshop === true || (user?.role === "admin" && !!support);
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const qc = useQueryClient();
  const { data, refetch } = useQuery({
    queryKey: ["wo", id],
    queryFn: () => api.get(`/work-orders/${id}`),
    enabled: !!id,
  });
  const [saving, setSaving] = useState(false);
  const [operationError, setOperationError] = useState("");
  const [issuing, setIssuing] = useState(false);
  const [invoiceError, setInvoiceError] = useState("");

  if (!data) return <View style={{ flex: 1, backgroundColor: colors.surface }}><ScreenHeader title="Ordem de Serviço" back /></View>;

  const changeStatus = async (st: string) => {
    setSaving(true); setOperationError("");
    try {
      await api.put(`/work-orders/${id}`, {
        client_id: data.client_id, vehicle_id: data.vehicle_id,
        mechanic: data.mechanic, complaint: data.complaint, notes: data.notes,
        mileage_in: data.mileage_in, status: st,
        items: data.items.map((it: any) => ({
          item_type: it.item_type, description: it.description,
          quantity: it.quantity, unit_price: it.unit_price,
          vat_rate: it.vat_rate, product_id: it.product_id || null,
        })),
      });
      await refetch();
      qc.invalidateQueries({ queryKey: ["work-orders"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    } catch (error) { setOperationError(error instanceof Error ? error.message : "Não foi possível alterar a ordem de serviço."); }
    finally { setSaving(false); }
  };

  const del = async () => {
    Alert.alert("Apagar Ordem de Serviço", "Tem a certeza?", [
      { text: "Cancelar", style: "cancel" },
      { text: "Apagar", style: "destructive", onPress: async () => {
        setSaving(true); setOperationError("");
        try {
          await api.del(`/work-orders/${id}`);
          await Promise.all(["work-orders", "products", "product", "dashboard", "quotes"].map(key => qc.invalidateQueries({ queryKey: [key] })));
          goBack();
        } catch (error) { setOperationError(error instanceof Error ? error.message : "Não foi possível apagar a ordem de serviço."); }
        finally { setSaving(false); }
      }},
    ]);
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface }}>
      <ScreenHeader title={`Ordem de Serviço ${data.number}`} back right={<StatusChip status={data.status} />} testID="wo-detail-header" />
      <ScrollView contentContainerStyle={{ width: "100%", maxWidth: 1100, alignSelf: "center", padding: spacing.lg, gap: spacing.md, paddingBottom: 140 }}>
        <Feedback testID="wo-operation-error" message={operationError} error />
        <View style={styles.card}>
          <Text style={styles.label}>Cliente</Text>
          <Text style={styles.value}>{data.client_name}</Text>
          <Text style={styles.mut}>{data.vehicle_label} · {data.license_plate}</Text>
        </View>

        <DamageQuickActions vehicleId={data.vehicle_id} testID="wo-damage" />
        <Button title="Ver viatura e danos" testID="wo-open-vehicle" variant="secondary" onPress={() => router.push({ pathname: "/(app)/viatura", params: { id: data.vehicle_id } })} />

        <View style={styles.card}>
          <Text style={styles.label}>Avaliação do Cliente</Text>
          <Text style={styles.value}>{data.complaint || "—"}</Text>
          {data.notes ? (<><Text style={[styles.label, { marginTop: 8 }]}>Notas técnicas</Text><Text style={styles.value}>{data.notes}</Text></>) : null}
          <Text style={[styles.label, { marginTop: 8 }]}>Mecânico</Text>
          <Text style={styles.value}>{data.mechanic || "—"}</Text>
          {data.mileage_in ? <><Text style={[styles.label, { marginTop: 8 }]}>Quilometragem</Text><Text style={styles.value}>{data.mileage_in} km</Text></> : null}
        </View>

        <View style={styles.card}>
          <View style={[styles.rowH, { marginBottom: 8 }]}>
            <Text style={[styles.label, { flex: 3 }]}>Serviço</Text>
            <Text style={[styles.label, { flex: 1, textAlign: "right" }]}>Qtd</Text>
            <Text style={[styles.label, { flex: 1, textAlign: "right" }]}>Preço</Text>
          </View>
          {data.items.map((it: any) => (
            <View key={it.id} style={styles.rowH}>
              <Text style={[styles.value, { flex: 3 }]}>{it.description}</Text>
              <Text style={[styles.value, { flex: 1, textAlign: "right" }]}>{it.quantity}</Text>
              <Text style={[styles.value, { flex: 1, textAlign: "right" }]}>{formatEUR(it.unit_price)}</Text>
            </View>
          ))}
          <View style={styles.divider} />
          <View style={styles.rowH}><Text style={[styles.mut, { flex: 1 }]}>Subtotal</Text><Text style={styles.value}>{formatEUR(data.subtotal)}</Text></View>
          <View style={styles.rowH}><Text style={[styles.mut, { flex: 1 }]}>IVA</Text><Text style={styles.value}>{formatEUR(data.vat)}</Text></View>
          <View style={styles.rowH}><Text style={[styles.label, { flex: 1, fontSize: 15 }]}>TOTAL</Text><Text style={styles.total}>{formatEUR(data.total)}</Text></View>
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>Alterar estado</Text>
          <View style={styles.chipsRow}>
            {STATUSES.map(s => (
              <Pressable key={s} testID={`set-status-${s}`} disabled={saving || issuing || (data.status === "concluido" && s !== "concluido" && !canManage)} onPress={() => changeStatus(s)}
                         style={[styles.chip, data.status === s && styles.chipActive, data.status === "concluido" && s !== "concluido" && !canManage && { opacity: 0.4 }]}>
                <Text style={[styles.chipTxt, data.status === s && styles.chipTxtActive]}>{OS_STATUS_LABELS[s] || s}</Text>
              </Pressable>
            ))}
          </View>
          {data.status === "concluido" && !canManage && <Text testID="wo-reopen-restricted" style={styles.mut}>Apenas o responsável pode reabrir esta ordem de serviço.</Text>}
        </View>

        {!!data.state_history?.length && <View style={styles.card}>
          <Text style={styles.label}>Histórico de estados</Text>
          {data.state_history.slice(-20).reverse().map((event: any, index: number) => <View key={`${event.at}-${index}`} style={{ paddingVertical: 6 }}>
            <Text style={styles.value}>{OS_STATUS_LABELS[event.from] || event.from} → {OS_STATUS_LABELS[event.to] || event.to}</Text>
            <Text style={styles.mut}>{event.actor_name} · {formatDateTime(event.at)}</Text>
          </View>)}
        </View>}

        <View style={styles.card}>
          <Feedback testID="wo-invoice-error" message={invoiceError} error />
          <Text testID="wo-invoice-notice" style={styles.mut}>Documento interno, sem validade fiscal.</Text>
          {data.status !== "concluido" ? <Text testID="wo-invoice-required-status" style={styles.mut}>Conclua a ordem de serviço antes de emitir a fatura.</Text> : null}
          <Button title="Emitir Fatura" variant="secondary" testID="wo-emit-invoice" loading={issuing} disabled={data.status !== "concluido" || !canManage} onPress={async () => {
            setIssuing(true); setInvoiceError("");
            try {
              await api.post("/invoices", { work_order_id: id, document_type: "fatura" });
              await qc.invalidateQueries({ queryKey: ["invoices"] });
              qc.invalidateQueries({ queryKey: ["dashboard"] });
              router.push("/(app)/faturacao");
            } catch (e: any) { setInvoiceError(e.message); }
            finally { setIssuing(false); }
          }} />
          <View style={{ height: 8 }} />
          {(data.status === "entrada" || canManage) && <Button title="Apagar Ordem de Serviço" variant="danger" testID="wo-delete" disabled={saving || issuing} onPress={del} />}
        </View>
      </ScrollView>
      <View style={[styles.sticky, { paddingBottom: insets.bottom + 12 }]}>
        <Button title={data.status === "concluido" ? "Reabrir" : "Concluir Ordem"} loading={saving}
                disabled={data.status === "concluido" && !canManage}
                onPress={() => changeStatus(data.status === "concluido" ? "diagnostico" : "concluido")}
                testID="wo-toggle-complete" />
      </View>
    </View>
  );
}
const styles = StyleSheet.create({
  card: { backgroundColor: colors.surfaceSecondary, borderRadius: radius.lg, padding: spacing.lg, gap: 4, ...shadows.card },
  label: { color: colors.muted, fontSize: 12, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5 },
  value: { color: colors.onSurface, fontSize: 14 },
  mut: { color: colors.muted, fontSize: 13 },
  rowH: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 4 },
  divider: { height: 1, backgroundColor: colors.divider, marginVertical: 8 },
  total: { fontWeight: "800", fontSize: 16, color: colors.brandPrimary },
  chipsRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 4 },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  chipActive: { backgroundColor: colors.brandPrimary, borderColor: colors.brandPrimary },
  chipTxt: { fontSize: 12, color: colors.onSurface, fontWeight: "600" },
  chipTxtActive: { color: "#fff" },
  sticky: { position: "absolute", left: 0, right: 0, bottom: 0, backgroundColor: colors.surfaceSecondary,
    borderTopColor: colors.border, borderTopWidth: 1, paddingHorizontal: spacing.lg, paddingTop: 12 },
});
