import { ServiceMovementPanel } from "./ServiceMovementPanel";
import React, { useRef, useState } from 'react';
import { Modal, ScrollView, StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { api } from '@/src/core/http/api';
import { Input } from '@/src/shared/ui/Input';
import { Button } from '@/src/shared/ui/Button';
import { Feedback } from '@/src/shared/ui/Feedback';
import { workspaceColors as c } from '@/src/shared/theme/workspace';
import { monthNames, parseDueDate, readAmount, ServiceCompany } from '@/src/features/administration/admin-analytics';

export function ServiceMonthEditor({ company, year, month, onClose, onSaved, initialSection = "all" }: { initialSection?: "payment" | "assistance" | "all"; company: ServiceCompany; year: number; month: number; onClose: () => void; onSaved: () => void }) {
  const firstField = useRef<TextInput>(null);
  const [record, setRecord] = useState(company.record); const wide = useWindowDimensions().width >= 700;
  const [form, setForm] = useState({ billed: String(record?.billed ?? '').replace('.', ','), received: String(record?.received ?? 0).replace('.', ','), hours_included: String(record?.hours_included ?? '').replace('.', ','), hours_used: String(record?.hours_used ?? 0).replace('.', ','), due_date: record?.due_date?.split('-').reverse().join('/') || '', note: record?.note || '' });
  const [error, setError] = useState(''); const [busy, setBusy] = useState(false); const saving = useRef(false); const qc = useQueryClient();
  const save = async () => {
    if (saving.current) return;
    setError('');
    try {
      const payload = { billed: readAmount(form.billed), received: readAmount(form.received), hours_included: readAmount(form.hours_included), hours_used: readAmount(form.hours_used), due_date: parseDueDate(form.due_date), note: form.note.trim(), revision: record?.revision || 0 };
      if (payload.received > payload.billed) throw new Error('O valor recebido não pode exceder o valor faturado.');
      saving.current = true; setBusy(true);
      await api.put(`/admin/workshops/${company.id}/service-months/${year}/${month}`, payload);
      await qc.invalidateQueries({ queryKey: ['admin-analytics'] });
      onSaved();
    } catch (e: any) { setError(e.message); }
    finally { saving.current = false; setBusy(false); }
  };
  const field = (key: keyof typeof form, label: string, placeholder: string) => <View style={s.field}><Input inputRef={initialSection !== "all" && key === (initialSection === "assistance" ? "hours_used" : "received") ? firstField : undefined} label={label} testID={`service-month-${key}`} value={form[key]} onChangeText={value => setForm(prev => ({ ...prev, [key]: value }))} keyboardType="decimal-pad" placeholder={placeholder} editable={!busy && key !== 'received' && key !== 'hours_used'} maxLength={16} /></View>;
  return <Modal transparent visible animationType="fade" onShow={() => firstField.current?.focus()} onRequestClose={() => { if (!busy) onClose(); }}>
    <View style={s.overlay}><View accessibilityViewIsModal style={s.dialog} testID="service-month-editor"><ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={s.content}>
      <Text style={s.eyebrow}>{monthNames[month - 1].toUpperCase()} {year} · {initialSection === "assistance" ? "ASSISTÊNCIA TÉCNICA" : initialSection === "payment" ? "PAGAMENTO MANUAL" : "AVENÇA E ASSISTÊNCIA"}</Text>
      <Text accessibilityRole="header" style={s.title}>{company.name}</Text>
      <Text style={s.hint}>Configure o valor faturado e as horas incluídas. Recebimentos e horas utilizadas são calculados pelos movimentos do histórico.</Text>
      {initialSection === "assistance" ? <>
      <View style={[s.row, wide && s.horizontal]}>{field('hours_included', 'Horas incluídas na avença *', 'Ex.: 10')}{field('hours_used', 'Horas de assistência utilizadas *', 'Ex.: 3,5')}</View>
      <View style={[s.row, wide && s.horizontal]}>{field('billed', 'Faturado no mês (€) *', 'Ex.: 150,00')}{field('received', 'Recebido no mês (€) *', 'Ex.: 150,00')}</View>
      </> : <>
      <View style={[s.row, wide && s.horizontal]}>{field('billed', 'Faturado no mês (€) *', 'Ex.: 150,00')}{field('received', 'Recebido no mês (€) *', 'Ex.: 150,00')}</View>
      <View style={[s.row, wide && s.horizontal]}>{field('hours_included', 'Horas incluídas na avença *', 'Ex.: 10')}{field('hours_used', 'Horas de assistência utilizadas *', 'Ex.: 3,5')}</View>
      </>}
      <Text style={s.hint}>Guarde primeiro as condições do mês para registar pagamentos ou assistência. As horas acima da avença são assinaladas como horas extra; não geram cobranças automaticamente.</Text>
      <Input testID="service-month-due-date" label="Data limite de pagamento · opcional" placeholder="DD/MM/AAAA" value={form.due_date} onChangeText={due_date => setForm(prev => ({ ...prev, due_date }))} editable={!busy} maxLength={10} />
      <Input testID="service-month-note" label="Notas internas · opcional" placeholder="Ex.: assistência na configuração e alterações pedidas." value={form.note} onChangeText={note => setForm(prev => ({ ...prev, note }))} editable={!busy} multiline maxLength={1000} style={{ minHeight: 80 }} />
      {record && <ServiceMovementPanel companyId={company.id} year={year} month={month} onRecord={value => { setRecord(value); setForm(previous => ({ ...previous, received: String(value.received), hours_used: String(value.hours_used) })); }} />}
      <Text style={s.hint}>Registo interno. Não emite documentos nem movimenta dinheiro.</Text>
      <Feedback error message={error} testID="service-month-error" />
      <View style={[s.row, wide && s.horizontal]}><Button title="Cancelar" variant="ghost" onPress={onClose} disabled={busy} style={s.field} /><Button title="Guardar registo mensal" onPress={save} loading={busy} testID="service-month-save" style={s.field} /></View>
    </ScrollView></View></View>
  </Modal>;
}
const s = StyleSheet.create({ overlay: { flex: 1, backgroundColor: 'rgba(20,24,35,.48)', alignItems: 'center', justifyContent: 'center', padding: 16 }, dialog: { width: '100%', maxWidth: 650, maxHeight: '94%', backgroundColor: '#FFF', borderRadius: 24, overflow: 'hidden' }, content: { padding: 26, gap: 20 }, eyebrow: { color: c.brand, fontWeight: '700', fontSize: 11, letterSpacing: 1.2 }, title: { fontSize: 24, fontWeight: '700', color: c.ink }, hint: { fontSize: 13, lineHeight: 20, color: c.muted }, row: { gap: 16 }, horizontal: { flexDirection: 'row' }, field: { flex: 1, minWidth: 0 } });
