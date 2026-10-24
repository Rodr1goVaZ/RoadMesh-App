import { goBack } from "@/src/utils/navigation";
import React, { useState } from "react";
import { Image, StyleSheet, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/src/api";
import { AreaPage, CredentialsNotice, Panel, QueryState } from "@/src/components/AreaUI";
import { Input } from "@/src/components/Input";
import { Button } from "@/src/components/Button";
import { Feedback } from "@/src/components/Feedback";
import { Photo } from "@/src/components/Photo";
import { pickPhoto, uploadPhoto } from "@/src/utils/media";
import { CompanyModule, companyModules } from "@/src/company-modules";
import { colors } from "@/src/theme";
const EMPTY = { modules: ["workshop"] as CompanyModule[], name: "", nif: "", address: "", email: "", manager_name: "", manager_email: "", logo_media_id: null as string | null };
export default function WorkshopForm() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { data, isLoading, error: loadError, refetch } = useQuery({ queryKey: ["admin-workshop", id], queryFn: () => api.get(`/admin/workshops/${id}`), enabled: !!id });
  if (id && (isLoading || loadError || !data)) return <AreaPage title="Editar empresa" testID="workshop-form"><QueryState loading={isLoading} error={loadError} retry={refetch} testID="workshop-form-query" /></AreaPage>;
  return <WorkshopEditor key={id || "new"} id={id} data={data} />;
}

function WorkshopEditor({ id, data }: { id?: string; data?: any }) {
  const qc = useQueryClient();
  const [form, setForm] = useState(() => {
    if (!data) return EMPTY;
    const manager = data.users?.find((u: any) => u.is_manager) || data.users?.find((u: any) => u.role === "workshop_staff");
    return { modules: companyModules(data), name: data.name, nif: data.nif || "", address: data.address || "", email: data.email || "", manager_name: data.manager_name || manager?.name || "", manager_email: data.manager_email || manager?.email || "", logo_media_id: data.logo_media_id || null };
  });
  const [image, setImage] = useState<any>(null);
  const [error, setError] = useState(""); const [busy, setBusy] = useState(false); const [credentials, setCredentials] = useState<any>(null);
  const save = async () => {
    setError(""); setBusy(true);
    try {
      if (!form.name.trim() || !form.manager_name.trim() || !form.manager_email.trim()) throw new Error("Preencha o nome da empresa e os dados do gerente.");
      const mediaId = image ? (await uploadPhoto(image)).id : form.logo_media_id;
      const payload = { ...form, logo_media_id: mediaId, email: form.email.trim() || null };
      const response = id ? await api.put(`/admin/workshops/${id}`, payload) : await api.post("/admin/workshops", payload);
      await Promise.all(["admin-workshops", "admin-workshop", "admin-dashboard"].map(key => qc.invalidateQueries({ queryKey: [key] })));
      if (response.credentials) setCredentials(response.credentials); else goBack();
    } catch (e: any) { setError(e.message); }
    finally { setBusy(false); }
  };
  const pick = async () => { try { const photo = await pickPhoto(); if (photo) setImage(photo); } catch (e: any) { setError(e.message); } };
  return <AreaPage title={id ? "Editar empresa" : "Criar empresa"} testID="workshop-form">
    {credentials ? <CredentialsNotice credentials={credentials} onClose={() => router.replace("/(admin)/workshops")} /> : <>
      <Panel testID="company-module-options" title="Módulos da empresa">
        <View style={{ gap: 10 }}>{([{ label: "Oficina", modules: ["workshop"] }, { label: "Stand", modules: ["stand"] }, { label: "Oficina + Stand", modules: ["workshop", "stand"] }] as { label: string; modules: CompanyModule[] }[]).map(option => <Button key={option.label} testID={`company-modules-${option.modules.join("-")}`} title={option.label} variant={form.modules.join() === option.modules.join() ? "primary" : "secondary"} onPress={() => setForm({ ...form, modules: option.modules })} />)}</View>
      </Panel>
      <Panel testID="workshop-form-details" title="Dados da empresa">
        <Input testID="workshop-name" label="Nome da empresa" value={form.name} onChangeText={name => setForm({ ...form, name })} />
        <Input testID="workshop-nif" label="NIF" keyboardType="number-pad" value={form.nif} onChangeText={nif => setForm({ ...form, nif })} />
        <Input testID="workshop-address" label="Morada" value={form.address} onChangeText={address => setForm({ ...form, address })} />
        <Input testID="workshop-email" label="Email da empresa" autoCapitalize="none" keyboardType="email-address" value={form.email} onChangeText={email => setForm({ ...form, email })} />
        {image ? <Image testID="workshop-logo-preview" source={{ uri: image.uri }} style={styles.logo} resizeMode="contain" /> : form.logo_media_id ? <Photo mediaId={form.logo_media_id} testID="workshop-existing-logo" style={styles.logo} /> : null}
        <Button testID="workshop-pick-logo" title="Escolher logótipo" variant="secondary" disabled={busy} onPress={pick} />
        {(image || form.logo_media_id) && <Button testID="workshop-remove-logo" title="Remover logótipo" variant="ghost" disabled={busy} onPress={() => { setImage(null); setForm({ ...form, logo_media_id: null }); }} />}
      </Panel>
      <Panel testID="workshop-form-manager" title="Gerente">
        <Input testID="workshop-manager-name" label="Nome do gerente" value={form.manager_name} onChangeText={manager_name => setForm({ ...form, manager_name })} />
        <Input testID="workshop-manager-email" label="Email de acesso do gerente" autoCapitalize="none" keyboardType="email-address" value={form.manager_email} onChangeText={manager_email => setForm({ ...form, manager_email })} />
      </Panel>
      <Feedback testID="workshop-form-error" error message={error} />
      <Button testID="workshop-form-save" title={id ? "Guardar alterações" : "Criar empresa e acesso"} loading={busy} onPress={save} />
    </>}
  </AreaPage>;
}
const styles = StyleSheet.create({ logo: { width: "100%", height: 150, backgroundColor: colors.surface } });