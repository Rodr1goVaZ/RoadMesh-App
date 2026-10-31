import { useCompanyCreatedAccess } from "./CompanyCreatedAccess";
import { CompanyOpeningHours } from "./CompanyOpeningHours";
import { numericCompanyInput } from "../company-opening-hours";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuth } from "@/src/core/auth/AuthProvider";
import { companyDraftKey, createCompanyDraftStore, decodeCompanyDraft } from "@/src/features/administration/company-draft";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, ScrollView, Pressable, StyleSheet, Text, TextInput, TextInputProps, useWindowDimensions, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { router, useLocalSearchParams } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/src/core/http/api";
import { AreaPage, QueryState } from "@/src/shared/layout/AreaUI";
import { Input } from "@/src/shared/ui/Input";
import { Button } from "@/src/shared/ui/Button";
import { Feedback } from "@/src/shared/ui/Feedback";
import { Photo } from "@/src/shared/media/Photo";
import { pickPhoto, uploadPhoto } from "@/src/shared/media/helpers";
import { CompanyModule } from "@/src/core/auth/company-modules";
import { formatEUR } from "@/src/shared/utils/format";
import { colors as c } from "@/src/shared/theme/legacy";
import { companyForm, companyPayload, CompanyForm, CompanyErrors, requiredCompanyFields, validateCompany, formatCompanyDate, formatCompanyPostalCode, companySteps, isCompanyStepComplete, companyFieldStep, validateCompanyStep, selectCompanyModules, defaultMonthlyFee } from "@/src/features/administration/company-profile";

const businesses: { label: string; hint: string; icon: keyof typeof Ionicons.glyphMap; modules: CompanyModule[] }[] = [
  { label: "Oficina", hint: "Manutenção e reparação", icon: "construct-outline", modules: ["workshop"] },
  { label: "Stand", hint: "Compra e venda de viaturas", icon: "car-sport-outline", modules: ["stand"] },
  { label: "Oficina + Stand", hint: "Os dois negócios, uma conta", icon: "business-outline", modules: ["workshop", "stand"] },
];
export function CompanyFormScreen({ mode }: { mode: "create" | "edit" }) {
  const params = useLocalSearchParams<{ id?: string }>();
  const id = mode === "edit" ? params.id : undefined;
  const { data, isLoading, error, refetch } = useQuery({ queryKey: ["admin-workshop", id], queryFn: () => api.get(`/admin/workshops/${id}`), enabled: !!id });
  if (mode === "edit" && !id) return <AreaPage title="Editar empresa" testID="company-edit-missing"><Text>Selecione uma empresa para editar.</Text><Button title="Ver empresas" onPress={() => router.replace("/(admin)/empresas")} /></AreaPage>;
  if (id && (isLoading || error || !data)) return <AreaPage title="Editar empresa" testID="workshop-form"><QueryState loading={isLoading} error={error} retry={refetch} testID="workshop-form-query" /></AreaPage>;
  return <WorkshopEditor key={id || "new"} id={id} data={data} />;
}
function WorkshopEditor({ id, data }: { id?: string; data?: any }) {
  const { user } = useAuth();
  const showCreatedAccess = useCompanyCreatedAccess();
  const userId = user!.id;
  const draft = useMemo(() => createCompanyDraftStore(AsyncStorage, companyDraftKey(userId, id)), [userId, id]);
  const scroll = useRef<ScrollView>(null);
  const [step, setStep] = useState(0);
  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [draftStatus, setDraftStatus] = useState("");
  const [cloudBusy, setCloudBusy] = useState(false);
  const [cloudError, setCloudError] = useState("");
  const [cloudSnapshot, setCloudSnapshot] = useState("");
  const cloudSaving = useRef(false);
  const draftUrl = `/admin/company-drafts/${id || "new"}`;
  const done = useRef(false); const writeVersion = useRef(0);
  const qc = useQueryClient(); const { width } = useWindowDimensions();
  const desktop = width >= 1050; const paired = width >= 700;
  const [form, setForm] = useState(() => companyForm(data));
  const portugueseAddress = ["portugal", "pt"].includes(form.country.trim().toLowerCase());
  const [logoBusy, setLogoBusy] = useState(false);
  const [errors, setErrors] = useState<CompanyErrors>({});
  const [error, setError] = useState(""); const [busy, setBusy] = useState(false);
  const saving = useRef(false);
  const inputs = useRef<Partial<Record<keyof CompanyForm, TextInput>>>({});
  const originalForm = useRef(companyForm(data));
  useEffect(() => {
    let cancelled = false;
    Promise.all([draft.load(), api.get(draftUrl).then(value => value ? decodeCompanyDraft(JSON.stringify(value)) : null).catch(() => {
      if (!cancelled) setCloudError("Não foi possível consultar o rascunho na base de dados. Pode tentar guardar novamente.");
      return null;
    })]).then(([local, remote]) => {
      if (cancelled) return;
      const value = local && (!remote || Date.parse(local.savedAt) > Date.parse(remote.savedAt)) ? local : remote;
      if (value) { setForm(value.form); setStep(value.step); }
      if (remote) setCloudSnapshot(JSON.stringify(remote.form));
      else if (id && originalForm.current.payment_day.trim() && originalForm.current.support_hours.trim()) setCloudSnapshot(JSON.stringify(originalForm.current));
      setReady(true);
    }).catch(() => { if (!cancelled) setLoadError("Não foi possível recuperar o rascunho. Volte a abrir esta página para tentar novamente."); });
    return () => { cancelled = true; };
  }, [draft, draftUrl, id]);
  const saveDraft = async () => {
    const version = ++writeVersion.current; const time = new Date().toISOString(); setDraftStatus("A guardar…");
    try { await draft.save(form, step, time); if (version === writeVersion.current) { setDraftStatus(""); } return true; }
    catch { if (version === writeVersion.current) setDraftStatus("Não foi possível guardar. Tente novamente."); return false; }
  };
  const saveCloudDraft = async () => {
    if (cloudSaving.current || saving.current) return;
    cloudSaving.current = true; setCloudBusy(true); setCloudError("");
    const snapshot = JSON.stringify(form);
    try {
      const stored = await api.put(draftUrl, { form, step });
      setCloudSnapshot(snapshot);
      await draft.save(form, step, stored.savedAt);
    } catch (e: any) { setCloudError(e.message || "Não foi possível guardar o rascunho na base de dados."); }
    finally { cloudSaving.current = false; setCloudBusy(false); }
  };
  const cloudSaved = cloudSnapshot === JSON.stringify(form);
  useEffect(() => { if (ready && !done.current) void saveDraft(); }, [form, step, ready]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { scroll.current?.scrollTo({ y: 0, animated: false }); }, [step]);
  const move = (target: number) => {
    if (target > step) {
      for (let index = 0; index < target; index++) {
        const invalid = validateCompanyStep(form, index);
        if (Object.keys(invalid).length) { setErrors(invalid); setStep(index); setError("Preencha os campos assinalados para continuar."); requestAnimationFrame(() => inputs.current[Object.keys(invalid)[0] as keyof CompanyForm]?.focus()); return; }
      }
    }
    setErrors({}); setError(""); setStep(target);
  };
  const update = <K extends keyof CompanyForm>(key: K, value: CompanyForm[K]) => {
    setForm(prev => key === "modules" ? selectCompanyModules(prev, value as CompanyModule[]) : ({ ...prev, [key]: value })); setErrors(prev => ({ ...prev, ...(key === "phone" || key === "mobile" ? { phone: undefined, mobile: undefined } : {}), [key]: undefined }));
  };
  const field = (key: keyof CompanyForm, label: string, props: TextInputProps & { trailingAction?: React.ReactNode } = {}, hint?: string) =><View style={s.field} key={key}>
    <Input inputRef={node => { if (node) inputs.current[key] = node; }} testID={`workshop-${key.replace(/_/g, "-")}`} label={`${label}${key in requiredCompanyFields ? " *" : ""}`} value={String(form[key] || "")} editable={!busy && !cloudBusy} onChangeText={value => update(key, (key === "activity_start_date" ? formatCompanyDate(value, form.activity_start_date) : key === "postal_code" && portugueseAddress ? formatCompanyPostalCode(value, form.postal_code) : numericCompanyInput(key, value)) as never)} error={errors[key]} {...props} />
    {hint && <Text style={s.fieldHint}>{hint}</Text>}
  </View>;
  const row = (...fields: React.ReactNode[]) =><View style={[s.fields, paired && s.fieldsRow]}>{fields.map((child, index) =><View key={index} style={paired ? s.flex : undefined}>{child}</View>)}</View>;
  const pick = async () => {
    try { const photo = await pickPhoto(); if (!photo) return; setLogoBusy(true); setError(""); const media = await uploadPhoto(photo); update("logo_media_id", media.id); }
    catch (e: any) { setError(e.message); } finally { setLogoBusy(false); }
  };
  const save = async () => {
    if (saving.current || cloudSaving.current) return;
    setError(""); const invalid = validateCompany(form); setErrors(invalid);
    if (Object.keys(invalid).length) {
      setError("Reveja os campos assinalados antes de guardar. Os seus dados continuam no formulário.");
      const first = Object.keys(invalid)[0] as keyof CompanyForm;
      setStep(companyFieldStep(first));
      requestAnimationFrame(() => inputs.current[first]?.focus());
      return;
    }
    saving.current = true; setBusy(true);
    try {
      const payload = companyPayload(form, form.logo_media_id);
      const response = id ? await api.put(`/admin/workshops/${id}`, payload) : await api.post("/admin/workshops", payload);
      done.current = true;
      if (response.credentials) {
        showCreatedAccess(response.credentials, form.name.trim());
        router.replace("/(admin)/empresas");
      } else router.replace({ pathname: "/(admin)/empresa", params: { id: id! } });
      // Show the one-time credentials immediately; background refresh/cleanup must not hide them.
      await Promise.allSettled([
        ...["admin-workshops", "admin-workshop", "admin-dashboard", "admin-analytics"].map(key => qc.invalidateQueries({ queryKey: [key] })),
        api.del(draftUrl), draft.clear(),
      ]);
    } catch (e: any) { setError(e.message); }
    finally { saving.current = false; setBusy(false); }
  };
  return <AreaPage title={id ? "Editar empresa" : "Adicionar empresa"} testID="workshop-form" contentStyle={s.page} scrollRef={scroll}>
    {!ready ? <View style={s.card}>{loadError ? <Feedback testID="company-draft-load-error" error message={loadError} /> : <ActivityIndicator color={c.brandPrimary} />}</View> : <>
      <View style={s.intro}><Text accessibilityRole="header" style={s.title}>{id ? "Editar empresa" : "Criar empresa"}</Text></View>
      <View style={s.stepper}><Text style={s.progressLabel}>Passo {step + 1} de {companySteps.length}</Text><View style={s.progressTrack}><View style={[s.progressFill, { width: `${(step + 1) / companySteps.length * 100}%` }]} /></View></View>
      <View style={s.stepNavigation}>{companySteps.map((title, index) => {
        const complete = isCompanyStepComplete(form, index);
        return <Pressable key={title} testID={`company-step-${index + 1}`} accessibilityRole="button" accessibilityLabel={`Etapa ${index + 1}: ${title}${complete ? ", completa" : ""}`} accessibilityState={{ selected: step === index, disabled: busy || cloudBusy || logoBusy }} disabled={busy || cloudBusy || logoBusy} onPress={() => move(index)} style={({ pressed }) => [s.stepButton, step === index && s.stepSelected, pressed && s.pressed]}><View style={[s.stepInner, width < 600 && { gap: 3 }]}><Text style={[s.stepText, width < 600 && { fontSize: 11 }, step === index && { color: c.brandPrimary }]}>{width < 600 ? ["Introdução", "Identif.", "Morada", "Faturação", "Contactos"][index] : title}</Text>{complete && <Ionicons name="checkmark-circle" size={width < 600 ? 13 : 16} color={c.brandPrimary} />}</View>{index < companySteps.length - 1 && <View style={s.stepDivider} />}</Pressable>;
      })}</View>
      <View style={s.card} testID="company-step-panel">
        <View style={s.sectionHeader}><View style={s.number}><Text style={s.numberText}>0{step + 1}</Text></View><Text accessibilityRole="header" style={[s.sectionTitle, s.flex]}>{["Introdução", "Identificação da empresa", "Morada", "Faturação e assistência", "Contactos e pessoa responsável"][step]}</Text><Pressable accessibilityRole="button" accessibilityLabel={cloudSaved ? "Rascunho guardado na base de dados. Guardar novamente" : "Guardar rascunho na base de dados"} testID="company-save-draft" disabled={busy || cloudBusy || logoBusy} onPress={() => void saveCloudDraft()} style={[s.draftButton, cloudSaved && s.draftSaved]}>{cloudBusy ? <ActivityIndicator size="small" color={c.brandPrimary} /> : cloudSaved ? <View style={s.cloudIndicator}><Ionicons name="cloud-done-outline" size={24} color="#24754B" /><Ionicons name="checkmark" size={14} color="#24754B" /></View> : <Ionicons name="save-outline" size={22} color={c.brandPrimary} />}</Pressable></View>
      {step === 0 && <>
      <View testID="company-module-options">
        <View style={[s.businessOptions, paired && s.fieldsRow]}>{businesses.map(option => {
          const selected = form.modules.join() === option.modules.join();
          return <Pressable key={option.label} testID={`company-modules-${option.modules.join("-")}`} accessibilityRole="radio" accessibilityState={{ checked: selected, disabled: busy || cloudBusy }} accessibilityLabel={option.label} disabled={busy || cloudBusy} onPress={() => update("modules", option.modules)} style={({ pressed }) => [s.business, selected && s.selected, pressed && s.pressed]}><View style={[s.businessIcon, selected && s.iconSelected]}><Ionicons name={option.icon} color={selected ? c.brandPrimary : c.onSurfaceTertiary} size={24} /></View><View style={s.flex}><Text style={s.optionTitle}>{option.label}</Text><Text style={s.hint}>{option.hint}</Text><Text style={s.priceHint}>{formatEUR(defaultMonthlyFee(option.modules))}/mês</Text></View><Ionicons name={selected ? "radio-button-on" : "radio-button-off"} color={selected ? c.brandPrimary : c.borderStrong} size={21} /></Pressable>;
        })}</View>
      </View>
      <View style={s.fields}>{field("name", "Nome comercial", { placeholder: "Ex.: Auto Central", maxLength: 100 })}{field("description", "Descrição da empresa", { placeholder: "Uma breve apresentação do negócio…", multiline: true, maxLength: 2000, style: s.multiline })}</View>
      </>}
      {step === 1 && <View style={s.columns}>
          <View style={s.fields} testID="workshop-form-details">
            <View>{field("legal_name", "Denominação social", { placeholder: "Ex.: Auto Central, Lda.", maxLength: 200 })}<Pressable accessibilityRole="button" disabled={busy || cloudBusy || !form.name.trim()} onPress={() => update("legal_name", form.name)}><Text style={s.shortcut}>Usar o nome comercial</Text></Pressable></View>
            {field("nif", "NIF/NIPC", { placeholder: "Ex.: 500123456", keyboardType: "number-pad", maxLength: 30 })}
            <View style={s.entityGroup}><Text style={s.label}>Tipo de entidade *</Text><View style={[s.entityOptions, paired && s.fieldsRow]}>{([{ value: "sole_trader", label: "Empresário em nome individual", icon: "person-outline" }, { value: "company", label: "Sociedade", icon: "business-outline" }] as const).map(option =><Pressable key={option.value} testID={`company-entity-${option.value}`} accessibilityRole="radio" accessibilityState={{ checked: form.entity_type === option.value, disabled: busy || cloudBusy }} disabled={busy || cloudBusy} onPress={() => update("entity_type", option.value)} style={[s.entityOption, form.entity_type === option.value && s.selected]}><Ionicons name={option.icon} size={19} color={c.brandPrimary} /><Text style={[s.label, s.flex]}>{option.label}</Text><Ionicons name={form.entity_type === option.value ? "checkmark-circle" : "ellipse-outline"} size={19} color={form.entity_type === option.value ? c.brandPrimary : c.borderStrong} /></Pressable>)}</View>{errors.entity_type && <Text style={s.invalid}>{errors.entity_type}</Text>}</View>
            {form.entity_type === "sole_trader" && field("sole_trader_name", "Nome do titular (opcional)", { placeholder: "Nome completo", maxLength: 100 })}
            {form.entity_type === "company" && <View style={s.entityGroup}><Text style={s.label}>Pessoas associadas à sociedade · opcional</Text>{(form.company_people.length ? form.company_people : [""]).map((name, index) =><View key={index} style={s.personField}><Text style={s.label}>{`Pessoa ${index + 1}`}</Text><View style={s.personRow}><View style={s.flex}><Input accessibilityLabel={`Pessoa ${index + 1}`} value={name} editable={!busy && !cloudBusy} maxLength={100} onChangeText={value => { const people = form.company_people.length ? [...form.company_people] : [""]; people[index] = value; update("company_people", people); }} /></View><Pressable accessibilityRole="button" accessibilityLabel={`Remover pessoa ${index + 1}`} disabled={busy || cloudBusy} onPress={() => update("company_people", form.company_people.filter((_, i) => i !== index))} style={s.removePerson}><Ionicons name="close-outline" size={22} color={c.muted} /></Pressable></View></View>)}<Button title="Adicionar pessoa" variant="ghost" disabled={busy || cloudBusy || form.company_people.length >= 20} onPress={() => update("company_people", [...(form.company_people.length ? form.company_people : [""]), ""])} /></View>}
            {field("activity_start_date", "Início de atividade", { placeholder: "DD/MM/AAAA", maxLength: 10, keyboardType: "number-pad" })}
            {field("website", "Website", { placeholder: "https://empresa.pt", autoCapitalize: "none", keyboardType: "url", maxLength: 300 })}
            <CompanyOpeningHours value={form.opening_hours} onChange={value => update("opening_hours", value)} disabled={busy || cloudBusy} error={errors.opening_hours} />
          </View>
        <View style={s.fields} testID="workshop-form-brand"><Text style={s.sectionTitle}>Logótipo <Text style={s.optional}>· opcional</Text></Text>
            {logoBusy ? <ActivityIndicator color={c.brandPrimary} /> : form.logo_media_id ? <Photo mediaId={form.logo_media_id} testID="workshop-existing-logo" style={s.logo} /> : <View style={s.logoEmpty}><Ionicons name="image-outline" size={28} color={c.muted} /><Text style={s.hint}>JPEG, PNG ou WebP</Text></View>}
            <View style={[s.fields, paired && s.fieldsRow]}><Button testID="workshop-pick-logo" title={form.logo_media_id ? "Alterar logótipo" : "Escolher logótipo"} variant="secondary" disabled={busy || cloudBusy || logoBusy} onPress={pick} style={s.flex} />{(form.logo_media_id) && <Button testID="workshop-remove-logo" title="Remover" variant="ghost" disabled={busy || cloudBusy || logoBusy} onPress={() => { update("logo_media_id", null); }} />}</View>
          </View></View>}
      {step === 2 && <><View style={s.fields} testID="workshop-form-address">
            {row(field("country", "País", { placeholder: "Portugal", maxLength: 100 }), field("district", "Distrito / região", { placeholder: "Ex.: Lisboa", maxLength: 100 }))}
            {row(field("municipality", "Concelho / município", { placeholder: "Ex.: Sintra", maxLength: 100 }), field("postal_code", "Código postal", { placeholder: portugueseAddress ? "0000-000" : "Código postal", maxLength: portugueseAddress ? 8 : 20, keyboardType: portugueseAddress ? "number-pad" : "default" }))}
            {field("address", "Morada", { placeholder: "Rua, número, andar ou fração", maxLength: 300, autoComplete: "street-address" })}
          </View></>}
      {step === 3 && <View style={[s.columns, desktop && s.fieldsRow]}>
        <View style={[s.column, desktop && s.flex]} testID="company-billing-terms"><Text style={s.subheading}>Condições de faturação</Text>
          {field("monthly_fee", "Valor mensal acordado (€)", { placeholder: "Ex.: 200,00", keyboardType: "decimal-pad", maxLength: 16 }, "Valor sugerido pelo tipo de empresa. Pode ajustá-lo ao acordo com o cliente.")}
          <View style={s.entityGroup}><Text style={s.label}>Periodicidade de pagamento *</Text><View style={[s.entityOptions, paired && s.fieldsRow]}>{[{ value: "monthly", label: "Mensal" }, { value: "quarterly", label: "Trimestral" }, { value: "yearly", label: "Anual" }].map(option => <Pressable key={option.value} testID={`company-billing-cycle-${option.value}`} accessibilityRole="radio" accessibilityLabel={option.label} accessibilityState={{ checked: form.billing_cycle === option.value }} disabled={busy || cloudBusy} onPress={() => update("billing_cycle", option.value)} style={[s.cycleOption, form.billing_cycle === option.value && s.selected]}><Text style={s.label}>{option.label}</Text></Pressable>)}</View>{errors.billing_cycle && <Text style={s.invalid}>{errors.billing_cycle}</Text>}</View>
          {!!form.monthly_fee.trim() && !validateCompanyStep(form, 3).monthly_fee && <Text style={s.billingTotal}>{formatEUR(Number(form.monthly_fee.replace(",", ".")) * (form.billing_cycle === "quarterly" ? 3 : form.billing_cycle === "yearly" ? 12 : 1))} {form.billing_cycle === "quarterly" ? "a cada 3 meses" : form.billing_cycle === "yearly" ? "por ano" : "por mês"}</Text>}
          {field("payment_day", "Dia de pagamento", { placeholder: "1 a 31", keyboardType: "number-pad", maxLength: 2 }, "Nos meses sem esse dia, considera-se o último dia do mês.")}
            {field("billing_email", "Email de faturação", { placeholder: "faturacao@empresa.pt", autoCapitalize: "none", keyboardType: "email-address", maxLength: 254 }, "Opcional. Preencha se for diferente do email geral.")}
        </View>
        <View style={[s.column, desktop && s.flex, desktop && s.billingSide]} testID="company-assistance-terms"><Text style={s.subheading}>Assistência técnica</Text>
          {field("support_hours", "Horas incluídas por mês", { placeholder: "Ex.: 10", keyboardType: "decimal-pad", maxLength: 16 }, "Use 0 se a avença não incluir horas de assistência.")}
          {field("extra_hour_rate", "Preço da hora extra (€)", { placeholder: "Opcional", keyboardType: "decimal-pad", maxLength: 16 })}
        </View>
      </View>}
      {step === 4 && <View style={[s.columns, desktop && s.fieldsRow]}><View style={[s.column, desktop && s.flex]}><View style={s.fields} testID="workshop-form-contacts"><Text style={s.subheading}>Contactos</Text>
            {row(field("mobile", "Telemóvel", { placeholder: "+351 910 000 000", keyboardType: "phone-pad", maxLength: 30 }), field("phone", "Telefone", { placeholder: "+351 210 000 000", keyboardType: "phone-pad", maxLength: 30 }))}
            <Text style={s.fieldHint}>Preencha o telemóvel ou o telefone.</Text>
            {field("email", "Email geral", { placeholder: "geral@empresa.pt", autoCapitalize: "none", keyboardType: "email-address", autoComplete: "email", maxLength: 254 })}
          </View></View><View style={[s.column, desktop && s.flex]}><View style={s.fields} testID="workshop-form-manager"><Text style={s.subheading}>Pessoa responsável</Text>
            {field("manager_name", "Nome do responsável", { placeholder: "Nome completo", autoComplete: "name", maxLength: 100 })}
            {field("manager_email", "Email de acesso do responsável", { placeholder: "responsavel@empresa.pt", autoCapitalize: "none", keyboardType: "email-address", maxLength: 254, trailingAction: <Pressable testID="company-use-general-email" accessibilityRole="button" accessibilityLabel="Usar o email geral" disabled={busy || cloudBusy || !form.email.trim()} onPress={() => update("manager_email", form.email)} style={{ width: 32, height: 32, borderRadius: 8, borderWidth: 1, borderColor: c.border, alignItems: "center", justifyContent: "center", opacity: form.email.trim() ? 1 : .4 }}><Ionicons name="copy-outline" size={17} color={c.brandPrimary} /></Pressable> })}
          </View></View></View>}
      <Feedback testID="company-cloud-draft-error" error message={cloudError} />
      <Feedback testID="company-draft-save-error" error message={draftStatus && draftStatus !== "A guardar…" ? draftStatus : ""} />
      <Feedback testID="workshop-form-error" error message={error} />
      <View style={[s.footerRow, paired && s.fieldsRow]}>
<View style={[s.actions, !paired && { flexDirection: "column" }]}><Button title={step === 0 ? id ? "Voltar à empresa" : "Voltar às empresas" : "Anterior"} testID="company-previous" variant="ghost" disabled={busy || cloudBusy || logoBusy} onPress={async () => { if (step) move(step - 1); else if (await saveDraft()) router.replace(id ? { pathname: "/(admin)/empresa", params: { id } } : "/(admin)/empresas"); }} />{step < companySteps.length - 1 ? <Button testID="company-next" title="Continuar" disabled={busy || cloudBusy || logoBusy} onPress={() => move(step + 1)} /> : <Button testID="workshop-form-save" title={id ? "Guardar alterações" : "Criar empresa e acesso"} disabled={logoBusy || cloudBusy} loading={busy} onPress={save} />}</View></View>
      </View>
    </>}
  </AreaPage>;
}
const s = StyleSheet.create({
  priceHint: { fontSize: 13, fontWeight: "700", color: c.brandPrimary, marginTop: 5 }, cycleOption: { flex: 1, minHeight: 44, padding: 12, borderWidth: 1, borderColor: c.border, borderRadius: 12, justifyContent: "center", alignItems: "center" }, billingTotal: { fontSize: 18, fontWeight: "700", color: c.brandPrimary }, billingSide: { borderLeftWidth: 1, borderLeftColor: c.border, paddingLeft: 24 },
  draftSaved: { backgroundColor: "#EAF6EF", width: 56 }, cloudIndicator: { flexDirection: "row", alignItems: "center", gap: 2 },
  stepNavigation: { flexDirection: "row", gap: 0, borderRadius: 14, overflow: "hidden", borderWidth: 1, borderColor: c.border, backgroundColor: "#FFFFFF", padding: 3 },
  stepButton: { flex: 1, minWidth: 0, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7, minHeight: 40, paddingHorizontal: 4, paddingVertical: 8, borderRadius: 10, position: "relative" },
  stepSelected: { backgroundColor: "#F6E8E6" }, stepInner: { flex: 1, minWidth: 0, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 }, stepDivider: { position: "absolute", right: -1, top: "25%", height: "50%", width: 1, backgroundColor: c.border },
  stepText: { color: c.muted, fontSize: 12, fontWeight: "600", flexShrink: 1, textAlign: "center" },
  personField: { gap: 6 }, personRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  removePerson: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
   draftButton: { width: 44, height: 44, alignItems: "center", justifyContent: "center", borderRadius: 12, backgroundColor: "#FCF5F4" }, stepper: { gap: 16 },
  subheading: { fontSize: 15, fontWeight: "700", color: c.onSurface },
  page: { maxWidth: 1500, paddingTop: 24, gap: 24 }, flex: { flex: 1, minWidth: 0 },
  intro: { gap: 0, paddingVertical: 0 },
  eyebrow: { fontSize: 11, fontWeight: "700", letterSpacing: 1.8, color: c.brandPrimary, marginBottom: 10 }, title: { fontSize: 28, fontWeight: "800", color: c.onSurface, letterSpacing: -0.7, marginBottom: 0 },  hint: { fontSize: 13, color: c.muted, lineHeight: 20 }, fieldHint: { fontSize: 12, color: c.muted, lineHeight: 18 },
   progressLabel: { fontSize: 12, fontWeight: "600", color: c.onSurfaceTertiary }, progressTrack: { height: 5, borderRadius: 5, backgroundColor: c.border, overflow: "hidden" }, progressFill: { height: 5, borderRadius: 5, backgroundColor: c.brandPrimary },
   businessOptions: { gap: 12, marginTop: 10 }, business: { flex: 1, flexDirection: "row", alignItems: "center", gap: 12, padding: 18, borderRadius: 16, borderWidth: 1.5, borderColor: c.border, backgroundColor: "#FFFFFF" }, selected: { borderColor: c.brandPrimary, backgroundColor: "#FCF5F4" }, pressed: { opacity: 0.8 }, businessIcon: { width: 44, height: 44, borderRadius: 12, backgroundColor: "#F3F4F6", alignItems: "center", justifyContent: "center" }, iconSelected: { backgroundColor: "#F6E5E3" }, optionTitle: { fontSize: 15, fontWeight: "700", color: c.onSurface, marginBottom: 4 },
  columns: { gap: 24, alignItems: "stretch" }, column: { minWidth: 0, gap: 24 }, card: { padding: 24, borderRadius: 22, borderWidth: 1, borderColor: c.border, backgroundColor: "#FFFFFF", gap: 20 }, sectionHeader: { flexDirection: "row", gap: 12, alignItems: "center", marginBottom: 2 }, number: { width: 34, height: 34, borderRadius: 10, backgroundColor: "#F6EDEB", alignItems: "center", justifyContent: "center" }, numberText: { color: c.brandPrimary, fontWeight: "800", fontSize: 12 }, sectionTitle: { fontSize: 18, fontWeight: "700", color: c.onSurface, marginBottom: 3 },
  fields: { gap: 16 }, fieldsRow: { flexDirection: "row" }, field: { minWidth: 0, gap: 6 }, label: { fontSize: 13, fontWeight: "600", color: c.onSurfaceTertiary }, entityGroup: { gap: 10 }, entityOptions: { gap: 10 }, entityOption: { flex: 1, flexDirection: "row", alignItems: "center", gap: 10, borderWidth: 1, borderColor: c.border, borderRadius: 12, padding: 14, minHeight: 54 }, invalid: { color: c.error, fontSize: 12 }, shortcut: { color: c.brandPrimary, fontSize: 12, fontWeight: "600", paddingVertical: 4 }, multiline: { minHeight: 80, textAlignVertical: "top" }, info: { flexDirection: "row", gap: 10, padding: 14, borderRadius: 12, backgroundColor: "#F8F5F3" }, optional: { color: c.muted, fontSize: 13, fontWeight: "400" },
  logo: { width: "100%", height: 110, borderRadius: 12 }, logoEmpty: { minHeight: 90, alignItems: "center", justifyContent: "center", gap: 8, borderRadius: 12, backgroundColor: "#F8F9FB", borderWidth: 1, borderStyle: "dashed", borderColor: c.borderStrong },  footerRow: { gap: 20, alignItems: "stretch", justifyContent: "flex-end", borderTopWidth: 1, borderTopColor: c.border, paddingTop: 20 },  actions: { flexDirection: "row", gap: 12 },
});
