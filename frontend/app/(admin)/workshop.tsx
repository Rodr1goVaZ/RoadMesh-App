import React, { useState } from "react";
import { Text, StyleSheet } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/src/api";
import { useAuth } from "@/src/auth";
import { AreaPage, Metrics, Panel, QueryState, areaStyles, CredentialsNotice } from "@/src/components/AreaUI";
import { Button } from "@/src/components/Button";
import { Input } from "@/src/components/Input";
import { Feedback } from "@/src/components/Feedback";
import { UserManager } from "@/src/components/UserManager";
import { Photo } from "@/src/components/Photo";
import { formatEUR } from "@/src/utils/format";
export default function WorkshopDetail() {
  const { id } = useLocalSearchParams<{ id: string }>(); const { startSupport } = useAuth(); const qc = useQueryClient();
  const { data, error: queryError, isLoading, refetch } = useQuery({ queryKey: ["admin-workshop", id], queryFn: () => api.get(`/admin/workshops/${id}`) });
  const [error, setError] = useState(""); const [busy, setBusy] = useState(false); const [confirm, setConfirm] = useState("");
  const [add, setAdd] = useState(false); const [name, setName] = useState(""); const [email, setEmail] = useState(""); const [credentials, setCredentials] = useState<any>(null);
  const action = async (kind: string) => {
    setBusy(true); setError("");
    try {
      if (kind === "support") { await startSupport(id); router.replace("/(app)/inicio"); return; }
      if (kind === "archive") await api.del(`/admin/workshops/${id}`);
      if (kind === "status") await api.post(`/admin/workshops/${id}/status`, { status: data.status === "active" ? "disabled" : "active" });
      if (kind === "staff") { const result = await api.post(`/admin/workshops/${id}/staff`, { name, email }); setCredentials(result.credentials); setAdd(false); setName(""); setEmail(""); }
      await Promise.all(["admin-workshops", "admin-workshop", "admin-dashboard"].map(key => qc.invalidateQueries({ queryKey: [key] }))); setConfirm("");
    } catch (e: any) { setError(e.message); }
    finally { setBusy(false); }
  };
  return <AreaPage title={data?.name || "Oficina"} testID="admin-workshop-detail">
    <QueryState loading={isLoading} error={queryError} retry={refetch} testID="admin-workshop-query" />
    {data && <>
      <Panel testID="admin-workshop-contact" title={data.name}>
        {data.logo_media_id && <Photo mediaId={data.logo_media_id} testID="admin-workshop-logo" style={styles.logo} />}
        <Text testID="admin-workshop-state" style={areaStyles.label}>{({ active: "Ativa", disabled: "Inativa", archived: "Arquivada" } as any)[data.status]}</Text>
        <Text testID="admin-workshop-contact-details" style={areaStyles.hint}>NIF: {data.nif || "—"}{"\n"}{data.address || "Morada não indicada"}{"\n"}{data.email || "Email da oficina não indicado"}</Text>
        <Button testID="admin-workshop-edit" title="Editar dados da oficina" variant="secondary" onPress={() => router.push({ pathname: "/(admin)/workshop-form", params: { id } })} />
      </Panel>
      <Metrics testID="workshop-metrics" entries={[{ label: "Clientes", value: data.metrics.clients }, { label: "Viaturas", value: data.metrics.vehicles }, { label: "Ordens de serviço", value: data.metrics.work_orders }, { label: "Faturação", value: formatEUR(data.metrics.revenue) }]} />
      <Panel testID="admin-support-panel" title="Consultar dados da oficina">
        <Text testID="admin-support-help" style={areaStyles.hint}>Clientes, viaturas, serviços, stock, encomendas, orçamentos e faturação. A visualização de suporte mostra um aviso permanente e fica registada.</Text>
        <Button testID="admin-enter-support" title="Entrar na oficina · Modo ADMIN" loading={busy} onPress={() => action("support")} />
      </Panel>
      {credentials && <CredentialsNotice credentials={credentials} onClose={() => setCredentials(null)} />}
      <Text testID="admin-users-title" style={areaStyles.title}>Utilizadores e colaboradores</Text>
      {data.users.map((user: any) => <UserManager user={user} key={user.id} />)}
      {add ? <Panel testID="admin-add-staff-form" title="Novo colaborador">
        <Input testID="admin-staff-name" label="Nome" value={name} onChangeText={setName} />
        <Input testID="admin-staff-email" label="Email" autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail} />
        <Button testID="admin-staff-save" title="Criar acesso" loading={busy} onPress={() => action("staff")} />
        <Button testID="admin-staff-cancel" title="Cancelar" variant="ghost" onPress={() => setAdd(false)} />
      </Panel> : data.status !== "archived" && <Button testID="admin-add-staff" title="Adicionar colaborador" variant="secondary" onPress={() => setAdd(true)} />}
      <Feedback testID="admin-workshop-action-error" error message={error} />
      {data.status !== "archived" && <Panel testID="admin-workshop-state-actions" title="Estado e arquivo">
        {confirm ? <>
          <Text testID="admin-workshop-confirmation" style={areaStyles.hint}>{confirm === "archive" ? "Arquivar esta oficina? Os dados são preservados, mas todos os acessos da oficina e dos clientes serão bloqueados." : data.status === "active" ? "Desativar a oficina e bloquear os acessos dos seus utilizadores?" : "Reativar os acessos desta oficina?"}</Text>
          <Button testID="admin-workshop-confirm" title="Confirmar" variant={confirm === "archive" ? "danger" : "primary"} loading={busy} onPress={() => action(confirm)} />
          <Button testID="admin-workshop-cancel" title="Cancelar" variant="ghost" disabled={busy} onPress={() => setConfirm("")} />
        </> : <>
          <Button testID="admin-workshop-toggle" title={data.status === "active" ? "Desativar oficina" : "Ativar oficina"} variant="secondary" onPress={() => setConfirm("status")} />
          <Button testID="admin-workshop-archive" title="Eliminar oficina (arquivar)" variant="ghost" onPress={() => setConfirm("archive")} />
        </>}
      </Panel>}
    </>}
  </AreaPage>;
}
const styles = StyleSheet.create({ logo: { width: "100%", height: 130 } });