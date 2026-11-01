import React, { useRef, useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { router, useLocalSearchParams } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/src/core/http/api";
import { companyModules } from "@/src/core/auth/company-modules";
import { AreaPage, QueryState, CredentialsNotice } from "@/src/shared/layout/AreaUI";
import { Button } from "@/src/shared/ui/Button";
import { Input } from "@/src/shared/ui/Input";
import { Feedback } from "@/src/shared/ui/Feedback";
import { UserManager } from "@/src/features/administration/components/UserManager";
import { CompanyServicePanel } from "@/src/features/administration/components/CompanyServicePanel";
import { Photo } from "@/src/shared/media/Photo";
import { formatEUR } from "@/src/shared/utils/format";
import { colors as c } from "@/src/shared/theme/legacy";

export default function CompanyDetail() {
  const { id } = useLocalSearchParams<{ id: string }>(); const qc = useQueryClient(); const wide = useWindowDimensions().width >= 900;
  const { data, error: queryError, isLoading, refetch } = useQuery({ queryKey: ["admin-workshop", id], queryFn: () => api.get(`/admin/workshops/${id}`), enabled: !!id });
  const [details, setDetails] = useState(false); const [users, setUsers] = useState(false);
  const [error, setError] = useState(""); const [busy, setBusy] = useState(false); const pending = useRef(false);
  const [confirm, setConfirm] = useState<"status" | "archive" | "">(""); const [reason, setReason] = useState(""); const [modalError, setModalError] = useState("");
  const [add, setAdd] = useState(false); const [name, setName] = useState(""); const [email, setEmail] = useState(""); const [credentials, setCredentials] = useState<any>(null);
  const action = async (kind: "status" | "archive" | "staff") => {
    if (pending.current) return;
    if (kind !== "staff" && (kind === "archive" || data.status === "active") && reason.trim().length < 5) { setModalError("Indique o motivo, com pelo menos 5 caracteres."); return; }
    pending.current = true; setBusy(true); setError(""); setModalError("");
    try {
      if (kind === "archive") await api.post(`/admin/workshops/${id}/archive`, { reason: reason.trim() });
      if (kind === "status") await api.post(`/admin/workshops/${id}/status`, { status: data.status === "active" ? "disabled" : "active", reason: reason.trim() });
      if (kind === "staff") { const result = await api.post(`/admin/workshops/${id}/staff`, { name, email }); setCredentials(result.credentials); setAdd(false); setName(""); setEmail(""); }
      await Promise.all(["admin-workshops", "admin-workshop", "admin-dashboard", "admin-analytics"].map(key => qc.invalidateQueries({ queryKey: [key] })));
      setConfirm(""); setReason("");
    } catch (e: any) { if (kind === "staff") setError(e.message); else setModalError(e.message); }
    finally { pending.current = false; setBusy(false); }
  };
  const responsible = data?.users?.find((user: any) => user.id === data.manager_id) || data?.users?.find((user: any) => user.is_manager);
  const openConfirmation = (kind: "status" | "archive") => { setReason(""); setModalError(""); setConfirm(kind); };
  const title = confirm === "archive" ? "Eliminar esta empresa?" : data?.status === "active" ? "Desativar esta empresa?" : "Reativar esta empresa?";
  return <AreaPage title={data?.name || "Empresa"} testID="admin-workshop-detail" contentStyle={s.page}>
    <QueryState loading={isLoading} error={queryError} retry={refetch} testID="admin-workshop-query" />
    {data && <>
      <View style={s.card} testID="admin-workshop-contact">
        <View style={[s.identityRow, wide && s.horizontal]}>
          <View style={[s.identity, wide && { flex: 1.6 }]}>
            {data.logo_media_id && <Photo mediaId={data.logo_media_id} testID="admin-workshop-logo" style={s.logo} />}
            <View style={s.flex}><Text style={s.eyebrow}>EMPRESA</Text><Text accessibilityRole="header" style={s.title}>{data.name}</Text><View style={s.inline}><Text style={s.hint}>{companyModules(data).map(module => module === "stand" ? "Stand" : "Oficina").join(" + ")}</Text><Text testID="admin-workshop-state" style={[s.status, data.status !== "active" && s.inactive]}>{({ active: "Ativa", disabled: "Inativa", archived: "Arquivada" } as any)[data.status]}</Text></View><Text selectable style={s.contact}>{data.email || "Email geral não indicado"}</Text><Text selectable style={s.contact}>{data.mobile || data.phone || "Contacto não indicado"}</Text></View>
          </View>
          <View style={[s.responsible, wide && s.flex, wide ? s.sideDivider : s.topDivider]}><Text style={s.eyebrow}>PESSOA RESPONSÁVEL</Text><Text style={s.responsibleName}>{responsible?.name || data.manager_name || "Não indicada"}</Text><Text selectable style={s.contact}>{responsible?.email || data.manager_email || "Email não indicado"}</Text></View>
        </View>
        <View style={[s.identityActions, !wide && s.vertical]}><Pressable accessibilityRole="button" accessibilityState={{ expanded: details }} testID="company-toggle-details" onPress={() => setDetails(!details)} style={s.disclosure}><Text style={s.link}>{details ? "Ocultar dados da empresa" : "Ver restantes dados da empresa"}</Text><Ionicons name={details ? "chevron-up" : "chevron-down"} size={18} color={c.brandPrimary} /></Pressable><Button testID="admin-workshop-edit" title="Editar empresa" variant="secondary" fullWidth={false} disabled={data.status === "archived"} onPress={() => router.push({ pathname: "/(admin)/editar-empresa", params: { id } })} /></View>
        {details && <View testID="admin-workshop-contact-details" style={s.details}>{[
          ["Denominação social", data.legal_name], ["NIF/NIPC", data.nif],
          ["Tipo de entidade", data.entity_type === "company" ? "Sociedade" : data.entity_type === "sole_trader" ? "Empresário em nome individual" : null],
          ["Nome do titular", data.entity_type === "sole_trader" ? data.sole_trader_name : null], ["Pessoas associadas", data.entity_type === "company" ? data.company_people?.join(", ") : null],
          ["Morada", [data.address, data.postal_code, data.municipality, data.district, data.country].filter(Boolean).join(" · ")],
          ["Telefone", data.mobile ? data.phone : null], ["Email de faturação", data.billing_email], ["Website", data.website],
          ["Início de atividade", data.activity_start_date?.split("-").reverse().join("/")], ["Horário de funcionamento", data.opening_hours], ["Descrição", data.description],
          ["Motivo da desativação", data.status === "disabled" ? data.status_reason : null], ["Motivo da eliminação", data.archive_reason],
        ].filter(([, value]) => value).map(([label, value]) => <View key={label} style={s.detail}><Text style={s.hint}>{label}</Text><Text selectable style={s.contact}>{value}</Text></View>)}</View>}
      </View>
      <View style={s.card} testID="company-activity"><Text style={s.sectionTitle}>Atividade da empresa</Text><View style={s.metrics}>{[{ label: "Clientes", value: data.metrics.clients }, { label: "Viaturas", value: data.metrics.vehicles }, { label: "Ordens de serviço", value: data.metrics.work_orders }, { label: "Faturação da empresa", value: formatEUR(data.metrics.revenue) }].map((metric, index) => <View key={metric.label} style={[s.metric, { flexBasis: wide ? "22%" : "45%" }]}><Text style={s.hint}>{metric.label}</Text><Text testID={`workshop-metrics-${index}-value`} style={s.metricValue}>{metric.value}</Text></View>)}</View></View>
      <CompanyServicePanel company={data} />
      <View style={s.card}><Pressable accessibilityRole="button" accessibilityState={{ expanded: users }} testID="company-toggle-users" onPress={() => setUsers(!users)} style={s.disclosure}><Text style={[s.sectionTitle, s.flex]}>Utilizadores e acessos ({data.users.length})</Text><Ionicons name={users ? "chevron-up" : "chevron-down"} size={20} color={c.brandPrimary} /></Pressable>
        {users && <>
          {credentials && <CredentialsNotice credentials={credentials} onClose={() => setCredentials(null)} />}
          {data.users.map((user: any) => <UserManager user={user} key={user.id} />)}
          {add ? <View style={s.form}><Text style={s.sectionTitle}>Novo colaborador</Text><Input testID="admin-staff-name" label="Nome" value={name} onChangeText={setName} /><Input testID="admin-staff-email" label="Email" autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail} /><Button testID="admin-staff-save" title="Criar acesso" loading={busy} onPress={() => action("staff")} /><Button testID="admin-staff-cancel" title="Cancelar" variant="ghost" onPress={() => setAdd(false)} /></View> : data.status !== "archived" && <Button testID="admin-add-staff" title="Adicionar colaborador" variant="secondary" onPress={() => setAdd(true)} />}
          <Feedback testID="admin-workshop-action-error" error message={error} />
        </>}
      </View>
      {data.status !== "archived" && <View style={[s.card, s.danger]} testID="admin-workshop-state-actions"><View style={s.inline}><Ionicons name="warning-outline" color="#D62D37" size={23} /><Text style={s.dangerTitle}>Estado da empresa</Text></View><Text style={s.hint}>Estas ações afetam o acesso da empresa e dos seus utilizadores.</Text><View style={[s.dangerActions, wide && s.horizontal]}><Button testID="admin-workshop-toggle" title={data.status === "active" ? "Desativar empresa" : "Reativar empresa"} variant="secondary" fullWidth={!wide} style={s.deactivateButton} onPress={() => openConfirmation("status")} /><Button testID="admin-workshop-archive" title="Eliminar empresa" variant="danger" fullWidth={!wide} style={s.deleteButton} onPress={() => openConfirmation("archive")} /></View></View>}
      <Modal transparent visible={!!confirm} animationType="fade" onRequestClose={() => { if (!busy) setConfirm(""); }}><View style={s.overlay}><View accessibilityViewIsModal accessibilityRole="alert" style={s.dialog} testID="company-state-dialog"><ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={s.dialogContent}><Ionicons name={confirm === "archive" ? "trash-outline" : "warning-outline"} size={30} color="#D62D37" /><Text accessibilityRole="header" style={s.dangerTitle}>{title}</Text><Text style={s.contact}>{data.name}</Text><Text style={s.hint}>{confirm === "archive" ? "A empresa será arquivada e os acessos da empresa e dos clientes serão bloqueados. Os dados e o histórico são preservados." : data.status === "active" ? "Os utilizadores e os clientes deixam de conseguir aceder. Pode reativar a empresa mais tarde." : "Os utilizadores e os clientes com acesso ativo poderão voltar a entrar."}</Text><Input testID="company-state-reason" label={confirm === "archive" || data.status === "active" ? "Motivo *" : "Motivo · opcional"} placeholder="Explique o motivo desta alteração" multiline maxLength={500} value={reason} editable={!busy} onChangeText={setReason} style={s.reason} /><Feedback testID="company-state-error" error message={modalError} /><View style={[s.dangerActions, wide && s.horizontal]}><Button testID="admin-workshop-cancel" title="Cancelar" variant="ghost" disabled={busy} onPress={() => setConfirm("")} style={s.flex} /><Button testID="admin-workshop-confirm" title={confirm === "archive" ? "Confirmar eliminação" : data.status === "active" ? "Confirmar desativação" : "Reativar empresa"} variant="danger" loading={busy} onPress={() => { if (confirm) void action(confirm); }} style={s.flex} /></View></ScrollView></View></View></Modal>
    </>}
  </AreaPage>;
}
const s = StyleSheet.create({
  page: { paddingTop: 24, gap: 24 }, card: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: c.border, borderRadius: 22, padding: 24, gap: 22 }, flex: { flex: 1, minWidth: 0 }, horizontal: { flexDirection: 'row' }, vertical: { flexDirection: 'column', alignItems: 'stretch' }, identityRow: { gap: 28 }, identity: { minWidth: 0, flexDirection: 'row', alignItems: 'flex-start', gap: 18 }, logo: { width: 72, height: 72, borderRadius: 14 }, eyebrow: { fontSize: 11, fontWeight: '700', color: c.brandPrimary, letterSpacing: 1.3, marginBottom: 10 }, title: { fontSize: 27, fontWeight: '800', color: c.onSurface, marginBottom: 8 }, hint: { fontSize: 13, color: c.muted, lineHeight: 20 }, contact: { fontSize: 14, color: c.onSurface, lineHeight: 23, flexShrink: 1 }, inline: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 8 }, status: { fontSize: 12, fontWeight: '600', color: '#24754B', backgroundColor: '#EAF6EF', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, overflow: 'hidden' }, inactive: { color: '#A8500C', backgroundColor: '#FFF3E5' }, responsible: { minWidth: 0, gap: 4 }, responsibleName: { fontSize: 18, fontWeight: '700', color: c.onSurface, marginBottom: 3 }, sideDivider: { borderLeftWidth: 1, borderLeftColor: c.border, paddingLeft: 28 }, topDivider: { borderTopWidth: 1, borderTopColor: c.border, paddingTop: 22 }, identityActions: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12, borderTopWidth: 1, borderTopColor: c.border, paddingTop: 16 }, disclosure: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, minHeight: 44 }, link: { fontSize: 13, fontWeight: '600', color: c.brandPrimary }, details: { borderTopWidth: 1, borderTopColor: c.border, paddingTop: 20, flexDirection: 'row', flexWrap: 'wrap', gap: 22 }, detail: { flexGrow: 1, flexBasis: 280, minWidth: 0, gap: 5 }, sectionTitle: { fontSize: 20, fontWeight: '700', color: c.onSurface }, metrics: { flexDirection: 'row', flexWrap: 'wrap', gap: 18 }, metric: { flexGrow: 1, minWidth: 0, gap: 8 }, metricValue: { fontSize: 27, fontWeight: '700', color: c.onSurface }, form: { gap: 16 }, danger: { borderColor: '#F2CBD0' }, dangerTitle: { fontSize: 21, fontWeight: '700', color: '#D62D37' }, dangerActions: { gap: 12 }, deactivateButton: { backgroundColor: '#FFF4E8', borderColor: '#E4B586' }, deleteButton: { backgroundColor: '#D62D37' }, overlay: { flex: 1, backgroundColor: 'rgba(20,24,35,.5)', justifyContent: 'center', alignItems: 'center', padding: 20 }, dialog: { width: '100%', maxWidth: 540, maxHeight: '90%', backgroundColor: '#FFFFFF', borderRadius: 24, overflow: 'hidden' }, dialogContent: { padding: 28, gap: 18 }, reason: { minHeight: 100, textAlignVertical: 'top' },
});
