import React, { useLayoutEffect, useRef, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { Button } from '@/src/shared/ui/Button';
import { colors as c } from '@/src/shared/theme/legacy';
import { monthNames } from '../admin-analytics';

export function CompanyPeriodPicker({ anchorRef, value, minYear = 2000, maxYear = 2100, yearOnly = false, title, onChange, onClose }: { anchorRef: React.RefObject<View | null>; value: string; minYear?: number; maxYear?: number; yearOnly?: boolean; title?: string; onChange: (period: string) => void; onClose: () => void }) {
  const [year, setYear] = useState(Number(value.slice(0, 4))); const [month, setMonth] = useState(Number(value.slice(5)) || 1);
  const years = Array.from({ length: maxYear - minYear + 1 }, (_, index) => maxYear - index);
  const yearScroll = useRef<ScrollView>(null); const monthScroll = useRef<ScrollView>(null);
  const { width, height } = useWindowDimensions();
  const [position, setPosition] = useState<{ left: number; top: number; width: number; height: number } | null>(null);
  useLayoutEffect(() => {
    anchorRef.current?.measureInWindow((x, y, w, h) => {
      const panelWidth = Math.min(yearOnly ? 230 : 340, width - 24);
      const panelHeight = Math.min(360, height - 24);
      const below = y + h + 8;
      const top = below + panelHeight <= height - 12 ? below : Math.max(12, y - panelHeight - 8);
      setPosition({ left: Math.max(12, Math.min(x + w - panelWidth, width - panelWidth - 12)), top, width: panelWidth, height: panelHeight });
    });
  }, [anchorRef, width, height, yearOnly]);
  if (!position) return null;
  return <Modal transparent visible animationType="none" onRequestClose={onClose}><View style={s.overlay}><Pressable accessibilityRole="button" accessibilityLabel="Fechar seletor de datas" onPress={onClose} style={StyleSheet.absoluteFill} /><View accessibilityViewIsModal testID="company-period-picker" style={[s.dialog, position]}><Text accessibilityRole="header" style={s.title}>{title || (yearOnly ? 'Escolher ano do histórico' : 'Escolher mês e ano')}</Text><View style={s.columns}>
    {!yearOnly && <View style={s.column}><Text style={s.label}>Mês</Text><ScrollView ref={monthScroll} onContentSizeChange={() => monthScroll.current?.scrollTo({ y: Math.max(0, (month - 1) * 44 - 88), animated: false })} style={s.list} nestedScrollEnabled>{monthNames.map((name, index) => <Pressable key={name} accessibilityRole="button" accessibilityState={{ selected: month === index + 1 }} onPress={() => setMonth(index + 1)} style={[s.option, month === index + 1 && s.selected]}><Text style={s.text}>{name}</Text></Pressable>)}</ScrollView></View>}
    <View style={s.column}><Text style={s.label}>Ano</Text><ScrollView ref={yearScroll} onContentSizeChange={() => yearScroll.current?.scrollTo({ y: Math.max(0, (maxYear - year) * 44 - 88), animated: false })} style={s.list} nestedScrollEnabled>{years.map(number => <Pressable key={number} accessibilityRole="button" accessibilityState={{ selected: year === number }} onPress={() => setYear(number)} style={[s.option, year === number && s.selected]}><Text style={s.text}>{number}</Text></Pressable>)}</ScrollView></View>
    </View><View style={s.actions}><Button title="Cancelar" variant="ghost" fullWidth={false} onPress={onClose} /><Button title="Aplicar" testID="company-period-apply" fullWidth={false} onPress={() => { onChange(`${year}-${String(month).padStart(2, '0')}`); onClose(); }} /></View></View></View></Modal>;
}
const s = StyleSheet.create({ overlay: { flex: 1 }, dialog: { position: 'absolute', backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: c.border, borderRadius: 16, padding: 16, gap: 12, boxShadow: '0 8px 28px rgba(20,24,35,.14)' }, title: { fontSize: 16, fontWeight: '700', color: c.onSurface }, columns: { flexDirection: 'row', gap: 12, flex: 1 }, column: { flex: 1, minWidth: 0, gap: 10 }, label: { fontSize: 13, color: c.muted, fontWeight: '600' }, list: { height: 220, maxHeight: 220, flexShrink: 1, borderWidth: 1, borderColor: c.border, borderRadius: 12 }, option: { height: 44, justifyContent: 'center', paddingHorizontal: 14 }, selected: { backgroundColor: '#F6E8E6', borderRadius: 10 }, text: { color: c.onSurface, fontSize: 14 }, actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12 } });
