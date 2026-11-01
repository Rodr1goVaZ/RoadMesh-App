import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { workspaceColors as c } from '@/src/shared/theme/workspace';
import { formatEUR } from '@/src/shared/utils/format';
import { hours, monthNames, ServiceMonth } from '@/src/features/administration/admin-analytics';

export function AdminTrendChart({ months, year, month, kind, onMonth }: { months: ServiceMonth[]; year: number; month: number; kind: 'revenue' | 'hours'; onMonth: (month: number) => void }) {
  const money = kind === 'revenue'; const color = money ? c.brand : '#52746A';
  const points = months.map(row => ({ month: row.month, current: money ? row.billed : row.hours_used, previous: money ? row.previous_billed : row.previous_hours_used }));
  const values = points.flatMap(point => [point.current, point.previous]).filter(value => value !== null) as number[];
  const hasData = values.length > 0;
  const rawMax = Math.max(1, ...values);
  const step = 10 ** Math.floor(Math.log10(rawMax));
  const max = Math.ceil(rawMax / step) * step;
  const format = (n: number | null) => n === null ? 'Sem registo' : money ? formatEUR(n) : hours(n);
  const current = points[month - 1];
  return <View testID={`admin-${kind}-chart`} style={s.chart}>
    <View style={s.legend}><View style={s.legendItem}><View style={[s.dot, { backgroundColor: color }]} /><Text style={s.legendLabel}>{year}</Text></View><View style={s.legendItem}><View style={[s.dot, { backgroundColor: '#D9DFEA' }]} /><Text style={s.legendLabel}>{year - 1}</Text></View></View>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.scroll}>
      <View style={s.plot}>
        <View pointerEvents="none" style={s.grid}>{[1, .75, .5, .25].map(part => <View key={part} style={s.gridLine}><Text style={s.axis}>{(max * part).toLocaleString('pt-PT', { maximumFractionDigits: 2 }) + (money ? ' €' : ' h')}</Text></View>)}</View>
        <View style={s.groups}>{points.map(point => <Pressable key={point.month} testID={`admin-${kind}-month-${point.month}`} accessibilityRole="button" accessibilityState={{ selected: point.month === month }} accessibilityLabel={`${monthNames[point.month - 1]}: ${year}, ${format(point.current)}; ${year - 1}, ${format(point.previous)}`} onPress={() => onMonth(point.month)} style={[s.group, point.month === month && { backgroundColor: '#F7F5F5' }]}>
          <View style={s.bars}>{[point.previous, point.current].map((value, index) => <View key={index} style={[s.bar, { backgroundColor: index ? color : '#D9DFEA', height: value === null ? 0 : Math.max(value > 0 ? 3 : 1, value / max * 150) }]} />)}</View><Text style={[s.month, point.month === month && { color, fontWeight: '800' }]}>{monthNames[point.month - 1].slice(0, 3)}</Text>
        </Pressable>)}</View>
        {!hasData && <View pointerEvents="none" style={s.empty}><Text style={s.emptyTitle}>{money ? 'A sua faturação começa aqui.' : 'Cada hora de apoio conta.'}</Text><Text style={s.emptyHint}>{money ? 'Registe os valores mensais das avenças para acompanhar a evolução.' : 'Registe as horas de assistência prestadas a cada empresa.'}</Text></View>}
      </View>
    </ScrollView>
    <View style={s.selection}><Text style={s.selectionTitle}>{monthNames[month - 1]}</Text><Text style={s.legendLabel}>{year}: {format(current.current)} · {year - 1}: {format(current.previous)}</Text></View>
  </View>;
}
const s = StyleSheet.create({ chart: { gap: 14 }, legend: { flexDirection: 'row', gap: 20, justifyContent: 'flex-end' }, legendItem: { flexDirection: 'row', alignItems: 'center', gap: 7 }, dot: { width: 8, height: 8, borderRadius: 4 }, legendLabel: { color: c.muted, fontSize: 12, lineHeight: 18 }, scroll: { flexGrow: 1 }, plot: { flex: 1, minWidth: 480, height: 205, position: 'relative' }, grid: { position: 'absolute', top: 0, left: 0, right: 0, height: 170, justifyContent: 'space-between' }, gridLine: { borderTopWidth: 1, borderColor: c.line }, axis: { fontSize: 9, color: c.muted, backgroundColor: '#FFF', alignSelf: 'flex-start', paddingRight: 5 }, groups: { flexDirection: 'row', paddingLeft: 35, paddingTop: 18, height: 205 }, group: { flex: 1, minWidth: 30, justifyContent: 'flex-end', alignItems: 'center', gap: 9, borderRadius: 7, paddingBottom: 5 }, bars: { height: 155, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', gap: 3 }, bar: { width: 10, borderTopLeftRadius: 4, borderTopRightRadius: 4 }, month: { fontSize: 10, color: c.muted }, empty: { position: 'absolute', top: 38, left: 65, right: 35, gap: 7, alignItems: 'center', backgroundColor: 'rgba(255,255,255,.94)', padding: 17, borderRadius: 14 }, emptyTitle: { fontSize: 15, fontWeight: '700', color: c.ink, textAlign: 'center' }, emptyHint: { fontSize: 12, color: c.muted, lineHeight: 19, textAlign: 'center' }, selection: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'space-between', paddingTop: 12, borderTopWidth: 1, borderColor: c.line }, selectionTitle: { fontSize: 12, fontWeight: '700', color: c.ink } });
