import React, { useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/src/core/http/api";
import { featureCatalog, FeatureId, monthlySubscription } from "@/src/core/auth/company-features";
import { CompanyForm } from "../company-profile";
import { Button } from "@/src/shared/ui/Button";
import { Input } from "@/src/shared/ui/Input";
import { Feedback } from "@/src/shared/ui/Feedback";
import { formatEUR } from "@/src/shared/utils/format";
import { workspaceColors as c } from "@/src/shared/theme/workspace";

type Preset = { id?: string; name: string; enabled_modules: FeatureId[]; revision: number };
export function CompanyModuleConfigurator({ form, onChange, disabled, error }: { form: CompanyForm; onChange: (form: CompanyForm) => void; disabled: boolean; error?: string }) {
  const catalog = useQuery<{ presets: Preset[] }>({ queryKey: ["module-catalog"], queryFn: () => api.get("/admin/module-catalog") });
  const [editing, setEditing] = useState<Preset | null>(null);
  const change = (values: Partial<CompanyForm>) => {
    const next = { ...form, ...values, subscription_version: 1 as const };
    onChange({ ...next, monthly_fee: monthlySubscription(next.base_monthly_fee, next.enabled_modules, next.module_prices) });
  };
  const total = monthlySubscription(form.base_monthly_fee, form.enabled_modules, form.module_prices);
  return <View style={s.section} testID="company-module-options">
    <View style={s.heading}><View style={s.flex}><Text style={s.title}>Começar com um preset</Text><Text style={s.hint}>Adicione os módulos de um ou mais presets e personalize a seleção abaixo.</Text></View><Button title="Novo preset" variant="ghost" testID="module-preset-new" disabled={disabled} onPress={() => setEditing({ name: "", enabled_modules: [], revision: 0 })} /></View>
    {catalog.isPending && <Text style={s.hint}>A carregar presets…</Text>}
    <Feedback testID="module-catalog-error" error message={catalog.error?.message} />
    {catalog.error && <Button title="Tentar novamente" variant="secondary" onPress={() => void catalog.refetch()} />}
    <View style={s.presets}>{catalog.data?.presets.map(preset => <View key={preset.id} style={s.preset}>
      <Pressable testID={`module-preset-${preset.id}`} accessibilityRole="button" accessibilityLabel={`Adicionar módulos do preset ${preset.name}`} disabled={disabled} style={s.presetApply} onPress={() => change({ enabled_modules: featureCatalog.map(item => item.id).filter(key => form.enabled_modules.includes(key) || preset.enabled_modules.includes(key)) })}>
        <Ionicons name="layers-outline" size={23} color={c.brand} /><Text style={s.presetName}>{preset.name}</Text><Text style={s.hint}>{preset.enabled_modules.length} módulos</Text>
      </Pressable>
      <Pressable testID={`module-preset-edit-${preset.id}`} accessibilityRole="button" accessibilityLabel={`Editar preset ${preset.name}`} disabled={disabled} style={s.gear} onPress={() => setEditing({ ...preset, enabled_modules: [...preset.enabled_modules] })}><Ionicons name="settings-outline" size={20} color={c.muted} /></Pressable>
    </View>)}</View>
    <View style={s.divider} />
    <Text style={s.title}>Módulos da empresa</Text><Text style={s.hint}>Cada módulo é independente. Só os módulos ativos entram na mensalidade.</Text>
    <View style={s.modules}>{featureCatalog.map(item => {
      const active = form.enabled_modules.includes(item.id);
      return <View key={item.id} testID={`company-module-card-${item.id}`} style={[s.module, active && s.active]}>
        <Pressable testID={`company-module-${item.id}`} accessibilityRole="checkbox" accessibilityLabel={item.name} accessibilityState={{ checked: active, disabled }} disabled={disabled} style={s.moduleToggle} onPress={() => change({ enabled_modules: active ? form.enabled_modules.filter(key => key !== item.id) : [...form.enabled_modules, item.id] })}>
          <View style={s.icon}><Ionicons name={item.icon} size={23} color={c.brand} /></View><View style={s.flex}><Text style={s.name}>{item.name}</Text><Text style={s.hint}>{item.description}</Text></View><Ionicons name={active ? "checkbox" : "square-outline"} size={24} color={active ? c.brand : c.muted} />
        </Pressable>
        <View style={s.price}><Input label="Preço mensal (€)" accessibilityLabel={`Preço mensal de ${item.name} (€)`} testID={`company-module-price-${item.id}`} value={form.module_prices[item.id]} maxLength={16} keyboardType="decimal-pad" editable={!disabled} onChangeText={price => change({ module_prices: { ...form.module_prices, [item.id]: price } })} /></View>
      </View>;
    })}</View>
    <View style={s.summary} testID="company-subscription-summary"><View style={s.base}><Input label="Valor base mensal (€)" testID="company-base-monthly-fee" keyboardType="decimal-pad" maxLength={16} value={form.base_monthly_fee} editable={!disabled} onChangeText={base_monthly_fee => change({ base_monthly_fee })} /></View>
      <View style={s.breakdown}><Text style={s.name}>Resumo mensal</Text><Text style={s.hint}>Base: {formatEUR(Number(form.base_monthly_fee.replace(",", ".")))}</Text>{featureCatalog.filter(item => form.enabled_modules.includes(item.id)).map(item => <View key={item.id} style={s.line}><Text style={[s.hint, s.flex]}>{item.name}</Text><Text style={s.hint}>{formatEUR(Number(form.module_prices[item.id].replace(",", ".")))}</Text></View>)}<View style={[s.line, s.totalLine]}><Text style={s.name}>Total mensal</Text><Text testID="company-subscription-total" style={s.total}>{total ? formatEUR(Number(total.replace(",", "."))) : "Rever preços"}</Text></View></View>
    </View>
    <Text style={s.hint}>As alterações aplicam-se à mensalidade acordada daqui para a frente. Os meses já registados mantêm os respetivos valores.</Text>
    <Feedback testID="company-module-error" error message={error} />
    {editing && <PresetEditor key={editing.id || "new"} preset={editing} onClose={() => setEditing(null)} />}
  </View>;
}
function PresetEditor({ preset, onClose }: { preset: Preset; onClose: () => void }) {
  const [name, setName] = useState(preset.name); const [modules, setModules] = useState(preset.enabled_modules);
  const [busy, setBusy] = useState(false); const [error, setError] = useState(""); const qc = useQueryClient();
  const save = async () => {
    setError(""); if (name.trim().length < 2) { setError("Indique um nome com pelo menos 2 caracteres."); return; }
    setBusy(true);
    try {
      const body = { name: name.trim(), enabled_modules: modules, revision: preset.revision };
      if (preset.id) await api.put(`/admin/module-presets/${preset.id}`, body); else await api.post("/admin/module-presets", body);
      await qc.invalidateQueries({ queryKey: ["module-catalog"] }); onClose();
    } catch (error: any) { setError(error.message); } finally { setBusy(false); }
  };
  return <Modal transparent visible animationType="fade" onRequestClose={() => { if (!busy) onClose(); }}><View style={s.overlay}><View accessibilityViewIsModal style={s.dialog} testID="module-preset-editor"><ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={s.dialogContent}>
    <Text accessibilityRole="header" style={s.title}>{preset.id ? "Editar preset" : "Novo preset"}</Text><Text style={s.hint}>Este preset fica disponível para toda a administração. Alterá-lo não modifica empresas existentes nem a seleção atual.</Text>
    <Input label="Nome do preset" testID="module-preset-name" value={name} onChangeText={setName} maxLength={60} editable={!busy} />
    {featureCatalog.map(item => <Pressable key={item.id} accessibilityRole="checkbox" accessibilityLabel={item.name} accessibilityState={{ checked: modules.includes(item.id), disabled: busy }} disabled={busy} testID={`module-preset-check-${item.id}`} onPress={() => setModules(prev => prev.includes(item.id) ? prev.filter(key => key !== item.id) : [...prev, item.id])} style={[s.moduleToggle, { flexBasis: "auto", flexGrow: 0, flexShrink: 0 }]}><Ionicons name={modules.includes(item.id) ? "checkbox" : "square-outline"} size={23} color={c.brand} /><Text style={s.name}>{item.name}</Text></Pressable>)}
    <Feedback testID="module-preset-error" error message={error} /><View style={s.line}><Button title="Cancelar" variant="ghost" disabled={busy} onPress={onClose} style={s.flex} /><Button title="Guardar preset" testID="module-preset-save" loading={busy} onPress={() => void save()} style={s.flex} /></View>
  </ScrollView></View></View></Modal>;
}
const s = StyleSheet.create({ section: { gap: 16 }, heading: { flexDirection: "row", alignItems: "center", gap: 12, flexWrap: "wrap" }, title: { fontSize: 18, fontWeight: "700", color: c.ink }, name: { fontSize: 14, fontWeight: "700", color: c.ink }, hint: { color: c.muted, fontSize: 13, lineHeight: 20 }, flex: { flex: 1, minWidth: 0 }, presets: { flexDirection: "row", flexWrap: "wrap", gap: 12 }, preset: { minWidth: 180, flexGrow: 1, borderRadius: 16, borderWidth: 1, borderColor: c.line, backgroundColor: c.card, flexDirection: "row", alignItems: "center" }, presetApply: { flex: 1, padding: 16, gap: 6, alignItems: "flex-start" }, presetName: { fontSize: 16, color: c.ink, fontWeight: "700" }, gear: { width: 44, height: 44, alignItems: "center", justifyContent: "center" }, divider: { height: 1, backgroundColor: c.line, marginVertical: 4 }, modules: { gap: 12, flexDirection: "row", flexWrap: "wrap" }, module: { flexGrow: 1, flexShrink: 1, flexBasis: 460, minWidth: 0, borderRadius: 16, borderWidth: 1, borderColor: c.line, flexDirection: "row", flexWrap: "wrap", alignItems: "center", backgroundColor: c.card }, active: { borderColor: c.brand, backgroundColor: "#FFFBFB" }, moduleToggle: { flexDirection: "row", alignItems: "center", padding: 16, gap: 12, flexGrow: 1, flexShrink: 1, flexBasis: 350 }, icon: { width: 40, height: 40, backgroundColor: c.warm, borderRadius: 12, alignItems: "center", justifyContent: "center" }, price: { width: 170, padding: 14 }, summary: { padding: 20, backgroundColor: c.soft, borderRadius: 16, flexDirection: "row", flexWrap: "wrap", gap: 24 }, base: { minWidth: 180, flexGrow: 1, flexBasis: 200 }, breakdown: { flexGrow: 2, flexBasis: 300, gap: 8 }, line: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 12 }, totalLine: { borderTopWidth: 1, borderColor: c.line, paddingTop: 12, marginTop: 6 }, total: { color: c.brand, fontWeight: "800", fontSize: 23 }, overlay: { flex: 1, backgroundColor: "rgba(20,24,35,.45)", padding: 16, alignItems: "center", justifyContent: "center" }, dialog: { width: "100%", maxWidth: 560, maxHeight: "90%", backgroundColor: c.card, borderRadius: 22, overflow: "hidden" }, dialogContent: { padding: 24, gap: 16 } });
