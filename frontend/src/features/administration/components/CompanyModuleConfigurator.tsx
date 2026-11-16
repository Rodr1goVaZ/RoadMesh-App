import { useAppTheme, createThemedStyles } from "@/src/shared/theme/ThemeProvider";
import React, { useState } from "react";
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/src/core/http/api";
import { featureCatalog, FeatureId, monthlySubscription } from "@/src/core/auth/company-features";
import { CompanyForm } from "../company-profile";
import { Button } from "@/src/shared/ui/Button";
import { Input } from "@/src/shared/ui/Input";
import { Feedback } from "@/src/shared/ui/Feedback";
import { formatEUR } from "@/src/shared/utils/format";


type Preset = { id?: string; name: string; enabled_modules: FeatureId[]; revision: number };
export function CompanyModuleConfigurator({ form, onChange, disabled, error }: { form: CompanyForm; onChange: (form: CompanyForm) => void; disabled: boolean; error?: string }) {
  const theme = useAppTheme();
  const c = theme.workspace;
  const s = useStyles();

  const catalog = useQuery<{ presets: Preset[] }>({ queryKey: ["module-catalog"], queryFn: () => api.get("/admin/module-catalog") });
  const [editing, setEditing] = useState<Preset | null>(null);
  const change = (values: Partial<CompanyForm>) => {
    const next = { ...form, ...values, subscription_version: 1 as const };
    onChange({ ...next, monthly_fee: monthlySubscription(next.base_monthly_fee, next.enabled_modules, next.module_prices) });
  };
  const total = monthlySubscription(form.base_monthly_fee, form.enabled_modules, form.module_prices);
  return <View style={s.section} testID="company-module-options">
    <View style={s.heading}><View style={s.flex}><Text style={s.title}>Começar com um preset</Text><Text style={s.hint}>Escolha um preset e personalize os módulos abaixo. Ao trocar de preset, a seleção atual é substituída.</Text></View><Button title="Novo preset" variant="ghost" testID="module-preset-new" disabled={disabled} onPress={() => setEditing({ name: "", enabled_modules: [], revision: 0 })} /></View>
    {catalog.isPending && <Text style={s.hint}>A carregar presets…</Text>}
    <Feedback testID="module-catalog-error" error message={catalog.error?.message} />
    {catalog.error && <Button title="Tentar novamente" variant="secondary" onPress={() => void catalog.refetch()} />}
    <View style={s.presets}>{catalog.data?.presets.map(preset => <View key={preset.id} style={s.preset}>
      <Pressable testID={`module-preset-${preset.id}`} accessibilityRole="button" accessibilityLabel={`Aplicar preset ${preset.name}`} disabled={disabled} style={s.presetApply} onPress={() => change({ enabled_modules: featureCatalog.map(item => item.id).filter(key => preset.enabled_modules.includes(key)) })}>
        <Ionicons name="layers-outline" size={23} color={c.brand} /><Text style={s.presetName}>{preset.name}</Text><Text style={s.hint}>{preset.enabled_modules.length} módulos</Text>
      </Pressable>
      <Pressable testID={`module-preset-edit-${preset.id}`} accessibilityRole="button" accessibilityLabel={`Editar preset ${preset.name}`} disabled={disabled} style={s.gear} onPress={() => setEditing({ ...preset, enabled_modules: [...preset.enabled_modules] })}><Ionicons name="settings-outline" size={20} color={c.muted} /></Pressable>
    </View>)}</View>
    <View style={s.divider} />
    <Text style={s.title}>Módulos da empresa</Text><Text style={s.hint}>Cada módulo é independente. Só os módulos ativos entram na mensalidade.</Text>
    <View style={s.modules}>{featureCatalog.map(item => {
      const active = form.enabled_modules.includes(item.id);
      return <View key={item.id} testID={`company-module-card-${item.id}`} style={[s.module, active && s.active]}>
        <Pressable testID={`company-module-${item.id}`} accessibilityRole="checkbox" accessibilityLabel={item.name} aria-checked={active} accessibilityState={{ checked: active, disabled }} disabled={disabled} style={s.moduleToggle} onPress={() => change({ enabled_modules: active ? form.enabled_modules.filter(key => key !== item.id) : [...form.enabled_modules, item.id] })}>
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
  const theme = useAppTheme();
  const c = theme.workspace;
  const s = useStyles();

  const [name, setName] = useState(preset.name); const [modules, setModules] = useState(preset.enabled_modules);
  const [editingName, setEditingName] = useState(!preset.id);
  const [busy, setBusy] = useState(false); const [error, setError] = useState(""); const qc = useQueryClient();
  const save = async () => {
    setError(""); if (name.trim().length < 2) { setEditingName(true); setError("Indique um nome com pelo menos 2 caracteres."); return; }
    setBusy(true);
    try {
      const body = { name: name.trim(), enabled_modules: modules, revision: preset.revision };
      if (preset.id) await api.put(`/admin/module-presets/${preset.id}`, body); else await api.post("/admin/module-presets", body);
      await qc.invalidateQueries({ queryKey: ["module-catalog"] }); onClose();
    } catch (error: any) { setError(error.message); } finally { setBusy(false); }
  };
  const dismiss = () => { if (!busy) onClose(); };
  return <Modal transparent visible animationType="fade" onRequestClose={dismiss}>
    <KeyboardAvoidingView style={s.overlay} behavior={Platform.OS === "ios" ? "padding" : "height"}>
      <Pressable testID="module-preset-backdrop" accessibilityRole="button" accessibilityLabel="Fechar editor de preset" disabled={busy} onPress={dismiss} style={StyleSheet.absoluteFill} />
      <View accessibilityViewIsModal style={s.dialog} testID="module-preset-editor">
        <View testID="module-preset-header" style={s.dialogHeader}>
          <View style={s.line}>
            <View style={s.presetIdentity}>
              {editingName ? <View style={s.flex}><Input accessibilityLabel="Nome do preset" placeholder="Nome do preset" testID="module-preset-name" value={name} onChangeText={setName} maxLength={60} editable={!busy} autoFocus selectTextOnFocus returnKeyType="done" onSubmitEditing={() => setEditingName(false)} /></View>
                : <Text accessibilityRole="header" numberOfLines={2} style={[s.title, { flexShrink: 1 }]}>{name.trim() || "Novo preset"}</Text>}
              <Pressable testID="module-preset-rename" accessibilityRole="button" accessibilityLabel={editingName ? "Concluir edição do nome" : "Editar nome do preset"} disabled={busy} onPress={() => setEditingName(current => !current)} style={s.gear}>
                <Ionicons name={editingName ? "checkmark" : "pencil"} size={20} color={c.muted} />
              </Pressable>
            </View>
            <Pressable testID="module-preset-close" accessibilityRole="button" accessibilityLabel="Fechar preset" disabled={busy} onPress={dismiss} style={({ pressed }) => [s.closeButton, pressed && { opacity: .65 }]}><Ionicons name="close" size={24} color={c.ink} /></Pressable>
          </View>
        </View>
        <ScrollView testID="module-preset-scroll" style={s.dialogScroll} keyboardShouldPersistTaps="handled" contentContainerStyle={s.dialogContent}>
    {featureCatalog.map(item => <Pressable key={item.id} accessibilityRole="checkbox" accessibilityLabel={item.name} aria-checked={modules.includes(item.id)} accessibilityState={{ checked: modules.includes(item.id), disabled: busy }} disabled={busy} testID={`module-preset-check-${item.id}`} onPress={() => setModules(prev => prev.includes(item.id) ? prev.filter(key => key !== item.id) : [...prev, item.id])} style={[s.moduleToggle, { flexBasis: "auto", flexGrow: 0, flexShrink: 0 }]}><Ionicons name={modules.includes(item.id) ? "checkbox" : "square-outline"} size={23} color={c.brand} /><Text style={s.name}>{item.name}</Text></Pressable>)}
        </ScrollView>
        <View testID="module-preset-footer" style={s.dialogFooter}>
          <Feedback testID="module-preset-error" error message={error} />
          <View style={s.line}>
            <Button title="Cancelar" testID="module-preset-cancel" variant="secondary" fullWidth={false} disabled={busy} onPress={dismiss} style={s.flex} />
            <Button title="Guardar" testID="module-preset-save" fullWidth={false} disabled={busy} loading={busy} onPress={() => void save()} style={s.flex} />
          </View>
        </View>
      </View>
    </KeyboardAvoidingView>
  </Modal>;
}
const useStyles = createThemedStyles((theme) => { const c = theme.workspace; return ({ section: { gap: 16 }, heading: { flexDirection: "row", alignItems: "center", gap: 12, flexWrap: "wrap" }, title: { fontSize: 18, fontWeight: "700", color: c.ink }, name: { fontSize: 14, fontWeight: "700", color: c.ink }, hint: { color: c.muted, fontSize: 13, lineHeight: 20 }, flex: { flex: 1, minWidth: 0 }, presets: { flexDirection: "row", flexWrap: "wrap", gap: 12 }, preset: { minWidth: 180, flexGrow: 1, borderRadius: 16, borderWidth: 1, borderColor: c.line, backgroundColor: c.card, flexDirection: "row", alignItems: "center" }, presetApply: { flex: 1, padding: 16, gap: 6, alignItems: "flex-start" }, presetName: { fontSize: 16, color: c.ink, fontWeight: "700" }, gear: { width: 44, height: 44, alignItems: "center", justifyContent: "center" }, divider: { height: 1, backgroundColor: c.line, marginVertical: 4 }, modules: { gap: 12, flexDirection: "row", flexWrap: "wrap" }, module: { flexGrow: 1, flexShrink: 1, flexBasis: 460, minWidth: 0, borderRadius: 16, borderWidth: 1, borderColor: c.line, flexDirection: "row", flexWrap: "wrap", alignItems: "center", backgroundColor: c.card }, active: { borderColor: c.brand, backgroundColor: theme.tones.card }, moduleToggle: { flexDirection: "row", alignItems: "center", padding: 16, gap: 12, flexGrow: 1, flexShrink: 1, flexBasis: 350 }, icon: { width: 40, height: 40, backgroundColor: c.warm, borderRadius: 12, alignItems: "center", justifyContent: "center" }, price: { width: 170, padding: 14 }, summary: { padding: 20, backgroundColor: c.soft, borderRadius: 16, flexDirection: "row", flexWrap: "wrap", gap: 24 }, base: { minWidth: 180, flexGrow: 1, flexBasis: 200 }, breakdown: { flexGrow: 2, flexBasis: 300, gap: 8 }, line: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 12 }, totalLine: { borderTopWidth: 1, borderColor: c.line, paddingTop: 12, marginTop: 6 }, total: { color: c.brand, fontWeight: "800", fontSize: 23 }, overlay: { flex: 1, backgroundColor: theme.tones.overlay, padding: 16, alignItems: "center", justifyContent: "center" }, dialog: { width: "100%", maxWidth: 560, maxHeight: "90%", backgroundColor: c.card, borderRadius: 22, overflow: "hidden" }, presetIdentity: { flex: 1, minWidth: 0, minHeight: 52, flexDirection: "row", alignItems: "center", gap: 8 }, dialogHeader: { paddingHorizontal: 24, paddingTop: 24, paddingBottom: 16, gap: 8, borderBottomWidth: 1, borderBottomColor: c.line }, closeButton: { width: 44, height: 44, borderRadius: 12, backgroundColor: c.soft, alignItems: "center", justifyContent: "center" }, dialogScroll: { flexShrink: 1, minHeight: 0 }, dialogContent: { padding: 24, gap: 16 }, dialogFooter: { paddingHorizontal: 24, paddingVertical: 18, gap: 12, backgroundColor: c.card, borderTopWidth: 1, borderTopColor: c.line } }); });
