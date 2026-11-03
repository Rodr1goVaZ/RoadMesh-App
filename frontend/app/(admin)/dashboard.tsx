import React, { useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/src/core/http/api';
import { AreaPage, QueryState } from '@/src/shared/layout/AreaUI';
import { Button } from '@/src/shared/ui/Button';
import { Input } from '@/src/shared/ui/Input';
import { Feedback } from '@/src/shared/ui/Feedback';
import { formatEUR } from '@/src/shared/utils/format';
import { workspaceColors as c } from '@/src/shared/theme/workspace';
import { AdminAnalytics, changeLabel, hours, monthNames, ServiceCompany } from '@/src/features/administration/admin-analytics';
import { AdminTrendChart } from '@/src/features/administration/components/AdminTrendChart';
import { CompanyPeriodPicker } from '@/src/features/administration/components/CompanyPeriodPicker';
import { ServiceMonthEditor } from '@/src/features/administration/components/ServiceMonthEditor';

type Filter = 'all' | 'paid' | 'pending' | 'unrecorded';
const labels = { paid: 'Pago', pending: 'Pendente', unrecorded: 'Sem registo', free: 'Sem cobrança' };
const money = (value: number | null | undefined) => value == null ? '—' : formatEUR(value);

function Metric({ title, value, hint, icon, accent = false }: { title: string; value: string; hint: string; icon: React.ComponentProps<typeof Ionicons>['name']; accent?: boolean }) {
  return <View style={[s.metric, accent && s.metricAccent]}><View style={s.metricTop}><Text style={[s.metricTitle, accent && s.whiteMuted]}>{title}</Text><Ionicons name={icon} size={20} color={accent ? '#F3D4D1' : c.brand} /></View><Text style={[s.metricValue, accent && s.white]}>{value}</Text><Text style={[s.small, accent && s.whiteMuted]}>{hint}</Text></View>;
}
export default function AdminDashboard() {
  const today = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Lisbon', year: 'numeric', month: '2-digit' }).format(new Date());
  const [year, setYear] = useState(Number(today.slice(0, 4)));
  const [month, setMonth] = useState(Number(today.slice(5, 7)));
  const periodAnchor = useRef<View>(null);
  const [periodPicker, setPeriodPicker] = useState(false);
  const [mode, setMode] = useState<'month' | 'year'>('month');
  const [filter, setFilter] = useState<Filter>('all'); const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<ServiceCompany | null>(null); const [saved, setSaved] = useState('');
  const { width } = useWindowDimensions(); const desktop = width >= 1100; const mobile = width < 700;
  const analytics = useQuery<AdminAnalytics>({ queryKey: ['admin-analytics', year, month], queryFn: () => api.get(`/admin/dashboard/analytics?year=${year}&month=${month}`) });
  const overview = useQuery({ queryKey: ['admin-dashboard'], queryFn: () => api.get('/admin/dashboard') });
  const data = analytics.data; const totals = mode === 'month' ? data?.summary : data?.annual;
  const prior = mode === 'month' ? data?.previous_month : data?.previous_annual;
  const list = data?.companies.filter(company => (filter === 'all' || company.state === filter) && company.name.toLocaleLowerCase('pt-PT').includes(search.trim().toLocaleLowerCase('pt-PT'))) || [];
  const selectMonth = (value: number) => { setMonth(value); setMode('month'); setSaved(''); };
  const navigateMonth = (delta: number) => {
    const date = new Date(year, month - 1 + delta, 1); if (date.getFullYear() < 2001 || date.getFullYear() > 2100) return;
    setYear(date.getFullYear()); setMonth(date.getMonth() + 1); setSaved('');
  };
  const payments = data ? [
    { filter: 'paid' as const, title: 'Empresas que pagaram', count: data.summary.paid, color: '#357962', icon: 'checkmark-circle-outline' as const, hint: 'Valor faturado totalmente recebido' },
    { filter: 'pending' as const, title: 'Empresas por pagar', count: data.summary.pending_companies, color: '#AE7026', icon: 'time-outline' as const, hint: `${data.summary.overdue} com data limite ultrapassada` },
    { filter: 'unrecorded' as const, title: 'Sem registo do período', count: data.summary.unrecorded, color: '#777D88', icon: 'document-text-outline' as const, hint: 'Ainda sem dados para confirmar o pagamento' },
  ] : [];
  return <AreaPage title="Administração" testID="admin-dashboard" back={false} contentStyle={s.page} onRefresh={() => { void analytics.refetch(); void overview.refetch(); }} refreshing={analytics.isRefetching || overview.isRefetching}>
    <View style={[s.header, desktop && s.horizontal]}><View style={s.flex}><Text accessibilityRole="header" style={s.title}>Dashboard</Text></View><View style={s.headerActions}><Button title="Consultar empresas" testID="admin-open-workshops" variant="secondary" fullWidth={false} onPress={() => router.push('/(admin)/empresas')} /><Button title="Criar empresa" testID="admin-create-company" fullWidth={false} onPress={() => router.push('/(admin)/criar-empresa')} /></View></View>
    <View testID="admin-period-summary" style={s.summary}>
    <View style={[s.periodBar, mobile && { alignItems: 'stretch' }]}>
      <View style={s.toggle}>{(['month', 'year'] as const).map(value => <Pressable key={value} accessibilityRole="button" accessibilityState={{ selected: mode === value }} onPress={() => setMode(value)} style={[s.toggleButton, mode === value && s.toggleSelected]}><Text style={[s.toggleText, mode === value && { color: c.brand }]}>{value === 'month' ? 'Resumo mensal' : 'Resumo anual'}</Text></Pressable>)}</View>
      <View style={s.dateControls}>
        <Pressable testID="admin-period-previous" accessibilityRole="button" accessibilityLabel={mode === 'month' ? 'Mês anterior' : 'Ano anterior'} disabled={year <= 2001 && (mode === 'year' || month === 1)} onPress={() => { if (mode === 'month') navigateMonth(-1); else { setYear(year - 1); setSaved(''); } }} style={s.arrow}><Ionicons name="chevron-back" size={18} color={c.ink} /></Pressable>
        <Pressable ref={periodAnchor} testID="admin-select-period" accessibilityRole="button" accessibilityLabel={mode === 'month' ? 'Selecionar mês e ano' : 'Selecionar ano'} onPress={() => setPeriodPicker(true)} style={s.periodSelect}><Text style={s.periodLabel}>{mode === 'month' ? `${monthNames[month - 1]} ${year}` : year}</Text></Pressable>
        <Pressable testID="admin-period-next" accessibilityRole="button" accessibilityLabel={mode === 'month' ? 'Mês seguinte' : 'Ano seguinte'} disabled={year >= 2100 && (mode === 'year' || month === 12)} onPress={() => { if (mode === 'month') navigateMonth(1); else { setYear(year + 1); setSaved(''); } }} style={s.arrow}><Ionicons name="chevron-forward" size={18} color={c.ink} /></Pressable>
      </View>
    </View>
    <QueryState loading={analytics.isLoading} error={analytics.error} retry={analytics.refetch} testID="admin-analytics-query" />
    <Feedback testID="admin-service-month-saved" message={saved} />
    {data && totals && (<View style={s.metrics}>
        <Metric accent title="Faturação RoadMesh" value={money(totals.billed)} hint={changeLabel(totals.billed, prior?.billed ?? null, mode === 'month' ? 'mês anterior' : 'ano anterior')} icon="receipt-outline" />
        <Metric title="Valor recebido" value={money(totals.received)} hint={`${money(totals.pending)} por receber no período`} icon="wallet-outline" />
        <Metric title="Horas de assistência" value={hours(totals.hours_used)} hint={totals.hours_included === null ? 'Avenças por registar' : `${hours(totals.hours_included)} incluídas · ${hours(totals.hours_extra)} extra`} icon="timer-outline" />
        <Metric title="Empresas ativas" value={overview.isError ? '—' : String(overview.data?.active ?? '—')} hint={overview.data ? `${overview.data.workshops} empresas na plataforma · total atual` : 'A consultar empresas…'} icon="business-outline" />
      </View>)}
    </View>
    {data && totals && <>
      <View style={[s.chartColumns, desktop && s.horizontal]}>
        <View style={[s.card, s.flex]}><View style={s.cardHeader}><View style={s.flex}><Text style={s.cardTitle}>Evolução da faturação</Text><Text style={s.small}>Valores faturados por mês · comparação com {year - 1}</Text></View><View style={s.badge}><Text style={s.badgeText}>EUR</Text></View></View><AdminTrendChart kind="revenue" months={data.months} year={year} month={month} onMonth={selectMonth} /></View>
        <View style={[s.card, s.flex]}><View style={s.cardHeader}><View style={s.flex}><Text style={s.cardTitle}>Assistência às empresas</Text><Text style={s.small}>Horas utilizadas por mês · comparação com {year - 1}</Text></View><View style={[s.badge, { backgroundColor: '#EDF5F0' }]}><Text style={[s.badgeText, { color: '#52746A' }]}>HORAS</Text></View></View><AdminTrendChart kind="hours" months={data.months} year={year} month={month} onMonth={selectMonth} /></View>
      </View>
      <View style={s.card}><View style={s.cardHeader}><View style={s.flex}><Text style={s.cardTitle}>Situação dos pagamentos</Text><Text style={s.small}>{monthNames[month - 1]} de {year} · pagamentos associados à faturação deste mês</Text></View><Text style={s.periodTag}>{data.summary.recorded} empresas com registo</Text></View>
        <View style={[s.paymentCards, !mobile && s.horizontal]}>{payments.map(item => <Pressable key={item.filter} accessibilityRole="button" accessibilityLabel={`${item.title}: ${item.count}. Filtrar empresas.`} onPress={() => { setFilter(item.filter); setMode('month'); }} style={s.paymentCard}><View style={[s.paymentIcon, { backgroundColor: item.color + '12' }]}><Ionicons name={item.icon} size={23} color={item.color} /></View><View style={s.flex}><Text style={s.paymentCount}>{item.count}</Text><Text style={s.paymentTitle}>{item.title}</Text><Text style={s.small}>{item.hint}</Text></View><Ionicons name="chevron-forward" size={16} color={c.muted} /></Pressable>)}</View>
        {data.summary.recorded === 0 && <Text style={s.small}>Ainda não existem registos de avenças neste período. Sem registo não significa falta de pagamento.</Text>}
      </View>
      <View style={s.card}><View style={[s.cardHeader, mobile && { flexDirection: 'column', alignItems: 'stretch' }]}><View style={s.flex}><Text style={s.cardTitle}>Avenças e horas por empresa</Text><Text style={s.small}>{monthNames[month - 1]} de {year} · selecione uma empresa para registar ou atualizar o mês.</Text></View><View style={s.search}><Input testID="admin-service-company-search" label="Pesquisar empresa" placeholder="Nome da empresa" value={search} onChangeText={setSearch} /></View></View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.filters}>{([{ value: 'all', label: 'Todas' }, { value: 'paid', label: 'Pagas' }, { value: 'pending', label: 'Por pagar' }, { value: 'unrecorded', label: 'Sem registo' }] as { value: Filter; label: string }[]).map(item => <Pressable key={item.value} accessibilityRole="button" accessibilityState={{ selected: filter === item.value }} onPress={() => setFilter(item.value)} style={[s.filter, filter === item.value && s.activeFilter]}><Text style={[s.filterLabel, filter === item.value && s.activeFilterLabel]}>{item.label}</Text></Pressable>)}</ScrollView>
        {!mobile && <View style={[s.tableRow, s.tableHead]}><Text style={[s.companyCell, s.columnTitle]}>EMPRESA</Text><Text style={[s.numberCell, s.columnTitle]}>FATURADO / RECEBIDO</Text><Text style={[s.hoursCell, s.columnTitle]}>HORAS USADAS / INCLUÍDAS</Text><Text style={[s.statusCell, s.columnTitle]}>PAGAMENTO</Text><View style={s.actionCell} /></View>}
        {list.map(company => <View key={company.id} testID={`admin-service-company-${company.id}`} style={[s.tableRow, mobile && s.mobileCompany]}>
          <View style={s.companyCell}><Text style={s.companyName}>{company.name}</Text>{company.company_status !== 'active' && <Text style={s.small}>{company.company_status === 'archived' ? 'Arquivada' : 'Inativa'}</Text>}</View>
          <View style={s.numberCell}>{mobile && <Text style={s.small}>Faturado / recebido</Text>}<Text style={s.tableValue}>{company.record ? money(Number(company.record.billed)) : '—'}</Text><Text style={s.small}>{company.record ? `${money(Number(company.record.received))} recebidos` : 'Sem registo mensal'}</Text></View>
          <View style={s.hoursCell}>{mobile && <Text style={s.small}>Horas usadas / incluídas</Text>}<Text style={s.tableValue}>{company.record ? `${hours(Number(company.record.hours_used))} / ${hours(Number(company.record.hours_included))}` : '—'}</Text>{company.record && Number(company.record.hours_used) > Number(company.record.hours_included) && <Text style={s.extraHours}>{hours(Number(company.record.hours_used) - Number(company.record.hours_included))} extra</Text>}</View>
          <View style={s.statusCell}><View style={[s.statusPill, company.state === 'paid' && { backgroundColor: '#EDF6F0' }, company.state === 'pending' && { backgroundColor: '#FFF4E4' }]}><Text style={[s.statusLabel, company.state === 'paid' && { color: '#357962' }, company.state === 'pending' && { color: '#986022' }]}>{labels[company.state]}</Text></View></View>
          <View style={s.actionCell}><Button testID={`admin-service-edit-${company.id}`} title={company.record ? 'Editar' : 'Registar'} variant="secondary" disabled={company.company_status === 'archived'} onPress={() => setEditing(company)} /></View>
        </View>)}
        {!list.length && <View style={s.empty}><Ionicons name="business-outline" size={26} color={c.muted} /><Text style={s.cardTitle}>Nenhuma empresa encontrada.</Text><Text style={s.hint}>{data.companies.length ? 'Ajuste a pesquisa ou o filtro para ver outras empresas.' : 'As empresas deste período aparecem aqui para registar as avenças e o apoio prestado.'}</Text></View>}
      </View>
    </>}
    {periodPicker && <CompanyPeriodPicker anchorRef={periodAnchor} value={`${year}-${String(month).padStart(2, '0')}`} minYear={2001} yearOnly={mode === 'year'} title={mode === 'year' ? 'Escolher ano' : 'Escolher mês e ano'} onClose={() => setPeriodPicker(false)} onChange={value => { setYear(Number(value.slice(0, 4))); setMonth(Number(value.slice(5))); setSaved(''); }} />}
    {editing && <ServiceMonthEditor key={`${editing.id}-${year}-${month}`} company={editing} year={year} month={month} onClose={() => setEditing(null)} onSaved={() => { setSaved(`Registo de ${monthNames[month - 1].toLowerCase()} guardado.`); setEditing(null); }} />}
  </AreaPage>;
}
const s = StyleSheet.create({
  page: { maxWidth: 1500, paddingTop: 12, gap: 24 }, flex: { flex: 1, minWidth: 0 }, horizontal: { flexDirection: 'row' },
  headerActions: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  header: { gap: 18, alignItems: 'flex-start', justifyContent: 'space-between', paddingVertical: 6 }, eyebrow: { fontSize: 11, letterSpacing: 1.8, fontWeight: '700', color: c.brand, marginBottom: 10 }, title: { fontSize: 30, fontWeight: '800', color: c.ink, letterSpacing: -.8, marginBottom: 9 }, hint: { fontSize: 14, color: c.muted, lineHeight: 22 }, small: { fontSize: 12, color: c.muted, lineHeight: 19 },
  summary: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: c.line, borderRadius: 22, padding: 16, gap: 20 }, periodBar: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 16 }, toggle: { flexDirection: 'row', padding: 5, backgroundColor: '#EEF0F6', borderRadius: 13, alignSelf: 'flex-start' }, toggleButton: { minHeight: 38, paddingHorizontal: 18, justifyContent: 'center', borderRadius: 9 }, toggleSelected: { backgroundColor: '#FFF' }, toggleText: { fontWeight: '600', fontSize: 13, color: c.muted }, dateControls: { flexDirection: 'row', alignItems: 'center', gap: 3, flexWrap: 'wrap' }, arrow: { width: 34, height: 38, justifyContent: 'center', alignItems: 'center' }, periodLabel: { fontSize: 14, color: c.ink, fontWeight: '600', minWidth: 80, textAlign: 'center' }, periodSelect: { minHeight: 44, paddingHorizontal: 8, justifyContent: 'center', borderRadius: 10 },
  metrics: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 }, metric: { flex: 1, minWidth: 210, borderWidth: 1, borderColor: c.line, borderRadius: 20, padding: 22, backgroundColor: '#FFF', gap: 14 }, metricAccent: { backgroundColor: c.brand, borderColor: c.brand }, metricTop: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, alignItems: 'center' }, metricTitle: { fontSize: 13, color: c.muted, fontWeight: '600' }, metricValue: { fontSize: 30, fontWeight: '700', color: c.ink }, white: { color: '#FFF' }, whiteMuted: { color: '#E8C9C7' },
  chartColumns: { gap: 22, alignItems: 'stretch' }, card: { backgroundColor: '#FFF', padding: 24, borderWidth: 1, borderColor: c.line, borderRadius: 22, gap: 22 }, cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 16 }, cardTitle: { fontSize: 18, fontWeight: '700', color: c.ink, marginBottom: 5 }, badge: { paddingHorizontal: 10, paddingVertical: 6, backgroundColor: '#FBEEEE', borderRadius: 8 }, badgeText: { fontSize: 10, fontWeight: '700', color: c.brand, letterSpacing: .7 }, periodTag: { fontSize: 12, color: c.muted },
  paymentCards: { gap: 14 }, paymentCard: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', padding: 18, borderRadius: 16, backgroundColor: '#FAFBFD', gap: 14 }, paymentIcon: { width: 44, height: 44, borderRadius: 13, alignItems: 'center', justifyContent: 'center' }, paymentCount: { fontSize: 26, color: c.ink, fontWeight: '700', marginBottom: 4 }, paymentTitle: { fontSize: 13, color: c.ink, fontWeight: '600', marginBottom: 3 },
  search: { width: 260, maxWidth: '100%' }, filters: { flexDirection: 'row', gap: 8 }, filter: { minHeight: 36, paddingHorizontal: 15, justifyContent: 'center', borderRadius: 10, backgroundColor: '#F3F4F8' }, activeFilter: { backgroundColor: '#F8EAEA' }, filterLabel: { fontSize: 12, fontWeight: '600', color: c.muted }, activeFilterLabel: { color: c.brand },
  tableRow: { flexDirection: 'row', alignItems: 'center', gap: 16, paddingVertical: 16, borderTopWidth: 1, borderColor: c.line }, tableHead: { paddingBottom: 10 }, columnTitle: { fontSize: 9, letterSpacing: .7, color: c.muted, fontWeight: '700' }, companyCell: { flex: 1.4, minWidth: 0, gap: 4 }, companyName: { fontSize: 14, fontWeight: '700', color: c.ink }, numberCell: { flex: 1, minWidth: 0, gap: 3 }, hoursCell: { flex: 1.15, minWidth: 0, gap: 3 }, statusCell: { flex: .85, minWidth: 0, alignItems: 'flex-start' }, actionCell: { width: 95 }, tableValue: { fontSize: 14, color: c.ink, fontWeight: '600' }, extraHours: { color: '#AE7026', fontSize: 11 }, statusPill: { backgroundColor: '#F0F2F6', paddingHorizontal: 10, paddingVertical: 7, borderRadius: 9 }, statusLabel: { fontSize: 11, fontWeight: '600', color: c.muted }, mobileCompany: { flexDirection: 'column', alignItems: 'stretch', gap: 15 }, empty: { paddingVertical: 28, alignItems: 'center', gap: 10 },
});
