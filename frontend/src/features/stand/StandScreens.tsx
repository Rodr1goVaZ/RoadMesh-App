import { requireDecimal as number, parseDecimal } from "@/src/shared/utils/validation";
import { ClientFields } from "@/src/features/clients/components/ClientFields";
import React, { useState } from "react";
import { Text, View, useWindowDimensions } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/src/core/http/api";
import { useAuth } from "@/src/core/auth/AuthProvider";
import { AreaPage, Panel, QueryState, areaStyles } from "@/src/shared/layout/AreaUI";
import { Button } from "@/src/shared/ui/Button";
import { Input } from "@/src/shared/ui/Input";
import { Feedback } from "@/src/shared/ui/Feedback";
import { SearchPicker } from "@/src/shared/pickers/RelationPicker";
import { DashboardHero, DashboardMetrics, DashboardAction } from "@/src/shared/layout/DashboardUI";
import { formatEUR, formatShortDate as date } from "@/src/shared/utils/format";

const inventoryStates = { disponivel: "Disponível", reservado: "Reservado", vendido: "Vendido", retirado: "Retirado" };
const leadStates = { novo: "Novo", contactado: "Contactado", interessado: "Interessado", fechado: "Fechado" };
function useManager() { const { user, support } = useAuth(); return !!(user?.can_manage_workshop || support); }
function useStandQuery(key: string, path: string, enabled = true) {
  return useQuery({ queryKey: ["stand", key, path], queryFn: () => api.get(path), enabled });
}
function State({ query }: { query: ReturnType<typeof useStandQuery> }) { return <QueryState loading={query.isLoading} error={query.error} retry={query.refetch} testID="stand-query" />; }
function Choices({ options, value, onChange }: { options: Record<string, string>; value: string; onChange: (value: string) => void }) {
  return <View style={areaStyles.row}>{Object.entries(options).map(([key, label]) => <Button key={key} title={label} variant={value === key ? "primary" : "secondary"} fullWidth={false} onPress={() => onChange(key)} />)}</View>;
}

async function refresh(qc: ReturnType<typeof useQueryClient>) {
  await Promise.all(["stand", "clients", "clients-all", "vehicles", "vehicles-all", "dashboard", "admin-workshop", "admin-dashboard", "relation-picker"].map(key => qc.invalidateQueries({ queryKey: [key] })));
}

export function StandHome() {
  const query = useStandQuery("dashboard", "/stand/dashboard"); const d = query.data; const manage = useManager();
  return <AreaPage title="Stand" testID="stand-dashboard" back={false}>
    <DashboardHero title="O seu Stand, numa só plataforma." description="Viaturas, interessados e vendas da sua empresa." button="Consultar viaturas" onPress={() => router.push("/(stand)/stand-viaturas")} icon="car-sport-outline" testID="stand-overview" />
    <State query={query} />
    {d && <DashboardMetrics entries={[
      { label: "Disponíveis", value: d.disponivel, icon: "car-sport-outline", testID: "stand-kpi-available" },
      { label: "Reservadas", value: d.reservado, icon: "time-outline", testID: "stand-kpi-reserved" },
      { label: "Vendidas", value: d.vendido, icon: "checkmark-circle-outline", testID: "stand-kpi-sold" },
      { label: "Contactos em aberto", value: d.leads, icon: "people-outline", testID: "stand-kpi-leads" },
      ...(d.can_manage ? [{ label: "Vendas registadas", value: formatEUR(d.sales_total), icon: "receipt-outline" as const, testID: "stand-kpi-sales" }, { label: "Margem bruta", value: formatEUR(d.margin_total), hint: "venda menos custo de compra", icon: "stats-chart-outline" as const, testID: "stand-kpi-margin" }] : []),
    ]} />}
    <Panel title="Acesso rápido" testID="stand-dashboard-actions">
      {manage && <DashboardAction label="Adicionar viatura" icon="add-circle-outline" testID="stand-new-inventory" onPress={() => router.push("/(stand)/stand-viatura")} />}
      <DashboardAction label="Clientes e interessados" icon="people-outline" testID="stand-open-clients" onPress={() => router.push("/(stand)/stand-clientes")} />
      {d?.can_manage && <DashboardAction label="Registar uma venda" icon="receipt-outline" testID="stand-open-sales" onPress={() => router.push("/(stand)/stand-vendas")} />}
    </Panel>
  </AreaPage>;
}

export function StandInventory() {
  const [search, setSearch] = useState(""); const [status, setStatus] = useState(""); const manage = useManager(); const wide = useWindowDimensions().width >= 900;
  const query = useStandQuery("inventory", `/stand/inventory?search=${encodeURIComponent(search)}&status=${status}`);
  return <AreaPage title="Viaturas do Stand" testID="stand-inventory" back={false}>
    <Input testID="stand-inventory-search" label="Pesquisar viaturas" placeholder="Matrícula, marca ou modelo" value={search} onChangeText={setSearch} />
    <Choices options={{ "": "Todas", ...inventoryStates }} value={status} onChange={setStatus} />
    {manage && <Button testID="stand-inventory-add" title="Adicionar viatura" onPress={() => router.push("/(stand)/stand-viatura")} />}
    <State query={query} />
    {query.data?.length === 0 && <Text style={areaStyles.hint}>Sem viaturas para esta pesquisa.</Text>}
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 18 }}>{query.data?.map((v: any) => <View key={v.id} style={{ width: wide ? "48%" : "100%", flexGrow: 1 }}><Panel title={`${v.make} ${v.model}`} testID={`stand-vehicle-${v.id}`}>
      <Text style={areaStyles.label}>{v.license_plate} · {inventoryStates[v.status as keyof typeof inventoryStates]}</Text>
      <Text style={areaStyles.hint}>{v.year || "Ano não indicado"} · {v.mileage == null ? "Km não indicados" : `${v.mileage.toLocaleString("pt-PT")} km`}</Text>
      <Text style={areaStyles.title}>{formatEUR(Number(v.asking_price))}</Text>
      <Button title={manage && v.status !== "vendido" ? "Consultar e editar" : "Consultar viatura"} variant="secondary" onPress={() => router.push({ pathname: "/(stand)/stand-viatura", params: { id: v.id } })} />
    </Panel></View>)}</View>
  </AreaPage>;
}

const emptyVehicle = { license_plate: "", make: "", model: "", year: "", vin: "", mileage: "", fuel: "", description: "", purchase_price: "0", asking_price: "0", status: "disponivel", vehicle_id: null as string | null };
export function StandVehicle() {
  const { id } = useLocalSearchParams<{ id?: string }>(); const manage = useManager();
  const query = useStandQuery("vehicle", `/stand/inventory/${id}`, !!id);
  if (id && (!query.data || query.error)) return <AreaPage title="Viatura" testID="stand-vehicle"><State query={query} /></AreaPage>;
  return <InventoryEditor key={id || "new"} data={query.data} manage={manage} />;
}
function InventoryEditor({ data, manage }: { data?: any; manage: boolean }) {
  const qc = useQueryClient(); const [form, setForm] = useState(() => data ? { ...emptyVehicle, ...Object.fromEntries(Object.keys(emptyVehicle).map(key => [key, key === "vehicle_id" ? data[key] || null : String(data[key] ?? "")])) } : emptyVehicle);
  const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  const editable = manage && data?.status !== "vendido";
  const set = (key: string, value: string) => { setForm({ ...form, [key]: value }); };
  const save = async () => {
    if (busy) return; setError(""); setBusy(true);
    try {
      const payload = { ...form, year: form.year ? number(form.year) : null, mileage: form.mileage ? number(form.mileage) : null, asking_price: number(form.asking_price), purchase_price: number(form.purchase_price) };
      if (data) await api.put(`/stand/inventory/${data.id}`, payload); else await api.post("/stand/inventory", payload);
      await refresh(qc); router.replace("/(stand)/stand-viaturas");
    } catch (e: any) { setError(e.message); } finally { setBusy(false); }
  };
  const fields = [["license_plate", "Matrícula"], ["make", "Marca"], ["model", "Modelo"], ["year", "Ano"], ["vin", "VIN"], ["mileage", "Quilometragem"], ["fuel", "Combustível"], ["description", "Descrição"], ["asking_price", "Preço anunciado (€)"], ...(manage ? [["purchase_price", "Preço de compra (€)"]] : [])];
  return <AreaPage title={data ? "Viatura do Stand" : "Nova viatura"} testID="stand-vehicle-editor">
    <Panel title={data ? `${data.make} ${data.model}` : "Adicionar viatura ao Stand"} testID="stand-vehicle-form">
      {fields.map(([key, label]) => <Input key={key} testID={`stand-field-${key}`} label={label} value={String(form[key as keyof typeof form] ?? "")} editable={editable} onChangeText={value => set(key, value)} keyboardType={["year", "mileage", "asking_price", "purchase_price"].includes(key) ? "decimal-pad" : "default"} multiline={key === "description"} />)}
      {editable ? <Choices options={{ disponivel: "Disponível", reservado: "Reservado", retirado: "Retirado" }} value={form.status} onChange={value => set("status", value)} /> : <Text style={areaStyles.label}>{inventoryStates[data?.status as keyof typeof inventoryStates] || "Apenas o responsável pode adicionar ou editar viaturas."}</Text>}
      <Feedback testID="stand-vehicle-error" error message={error} />
      {editable && <Button testID="stand-vehicle-save" title="Guardar viatura" loading={busy} onPress={save} />}
      {manage && data && ["disponivel", "reservado"].includes(data.status) && <Button title="Registar venda desta viatura" variant="secondary" onPress={() => router.push({ pathname: "/(stand)/stand-vendas", params: { inventoryId: data.id } })} />}
      {data?.vehicle_id && <Text style={areaStyles.hint}>Viatura associada ao registo partilhado da empresa.</Text>}
    </Panel>
  </AreaPage>;
}

export function StandClients() {
  const qc = useQueryClient(); const [search, setSearch] = useState(""); const [newClient, setNewClient] = useState(false); const [leadOpen, setLeadOpen] = useState(false);
  const [editingClientId, setEditingClientId] = useState<string | null>(null);
  const clients = useStandQuery("clients", `/clients?search=${encodeURIComponent(search)}`); const leads = useStandQuery("leads", "/stand/leads");
  const [error, setError] = useState(""); const [busy, setBusy] = useState(false);
  const [client, setClient] = useState({ name: "", nif: "", email: "", phone: "", address: "" });
  const [lead, setLead] = useState<any>({ client_id: "", inventory_id: null, status: "novo", notes: "" }); const [clientLabel, setClientLabel] = useState(""); const [vehicleLabel, setVehicleLabel] = useState("");
  const save = async (kind: "client" | "lead") => {
    if (busy) return; setBusy(true); setError("");
    try {
      if (kind === "client") { if (editingClientId) await api.put(`/clients/${editingClientId}`, client); else await api.post("/clients", client); setNewClient(false); setEditingClientId(null); setClient({ name: "", nif: "", email: "", phone: "", address: "" }); }
      else { const { id, ...body } = lead; if (id) await api.put(`/stand/leads/${id}`, body); else await api.post("/stand/leads", body); setLeadOpen(false); }
      await refresh(qc);
    } catch (e: any) { setError(e.message); } finally { setBusy(false); }
  };
  return <AreaPage title="Clientes e interessados" testID="stand-clients" back={false}>
    <Panel title="Clientes da empresa" testID="stand-shared-clients"><Text style={areaStyles.hint}>Os clientes são partilhados com a Oficina. Pesquise antes de criar um novo registo.</Text>
      <Input testID="stand-client-search" label="Pesquisar clientes" value={search} onChangeText={setSearch} />
      <Button testID="stand-client-add" title="Novo cliente" variant="secondary" onPress={() => { setEditingClientId(null); setClient({ name: "", nif: "", email: "", phone: "", address: "" }); setNewClient(true); setError(""); }} />
      {newClient && <><ClientFields value={client} onChange={setClient} testIDPrefix="stand-client" /><Button testID="stand-client-save" title={editingClientId ? "Guardar alterações do cliente" : "Guardar cliente"} loading={busy} onPress={() => save("client")} /><Button title="Cancelar edição do cliente" variant="ghost" onPress={() => { setNewClient(false); setEditingClientId(null); }} /></>}
      <State query={clients} />{clients.data?.map((c: any) => <View key={c.id} style={{ gap: 4, paddingVertical: 8 }}><Text style={areaStyles.label}>{c.name}</Text><Text style={areaStyles.hint}>{[c.nif, c.email, c.phone].filter(Boolean).join(" · ") || "Contactos não indicados"}</Text><Button title="Editar cliente" variant="secondary" onPress={() => { setEditingClientId(c.id); setClient({ name: c.name, nif: c.nif || "", email: c.email || "", phone: c.phone || "", address: c.address || "" }); setNewClient(true); setError(""); }} /><Button title="Registar interesse" variant="ghost" onPress={() => { setLead({ client_id: c.id, inventory_id: null, status: "novo", notes: "" }); setClientLabel(c.name); setVehicleLabel(""); setLeadOpen(true); }} /></View>)}
      {clients.data?.length === 0 && <Text style={areaStyles.hint}>Nenhum cliente encontrado.</Text>}
    </Panel>
    <Feedback testID="stand-clients-error" error message={error} />
    <Panel title="Acompanhamento comercial" testID="stand-leads">
      <Button testID="stand-lead-add" title="Novo contacto comercial" onPress={() => { setLead({ client_id: "", inventory_id: null, status: "novo", notes: "" }); setClientLabel(""); setVehicleLabel(""); setLeadOpen(true); }} />
      {leadOpen && <>
        <SearchPicker title="Escolher cliente" endpoint="/clients" label={r => r.name} selected={clientLabel} onSelect={r => { setLead({ ...lead, client_id: r.id }); setClientLabel(r.name); }} />
        <SearchPicker title="Associar viatura (opcional)" endpoint="/stand/inventory" label={r => `${r.license_plate} · ${r.make} ${r.model}`} selected={vehicleLabel} onSelect={r => { setLead({ ...lead, inventory_id: r.id }); setVehicleLabel(r.license_plate); }} />
        {!!lead.inventory_id && <Button title="Sem viatura associada" variant="ghost" onPress={() => { setLead({ ...lead, inventory_id: null }); setVehicleLabel(""); }} />}
        <Choices options={leadStates} value={lead.status} onChange={status => setLead({ ...lead, status })} />
        <Input testID="stand-lead-notes" label="Notas do contacto" value={lead.notes} onChangeText={notes => setLead({ ...lead, notes })} multiline />
        <Button testID="stand-lead-save" title="Guardar contacto" disabled={!lead.client_id} loading={busy} onPress={() => save("lead")} /><Button title="Cancelar" variant="ghost" onPress={() => setLeadOpen(false)} />
      </>}
      <State query={leads} />{leads.data?.map((l: any) => <View key={l.id} style={{ gap: 7, paddingVertical: 10 }}><Text style={areaStyles.label}>{l.client_name || "Cliente"} · {leadStates[l.status as keyof typeof leadStates]}</Text><Text style={areaStyles.hint}>{l.license_plate || "Interesse geral"} · {date(l.created_at)}</Text><Text style={areaStyles.hint}>{l.notes || "Sem notas"}</Text><Button title="Atualizar contacto" variant="secondary" onPress={() => { setLead({ id: l.id, client_id: l.client_id, inventory_id: l.inventory_id, status: l.status, notes: l.notes }); setClientLabel(l.client_name || "Cliente selecionado"); setVehicleLabel(l.license_plate || ""); setLeadOpen(true); }} /></View>)}
      {leads.data?.length === 0 && <Text style={areaStyles.hint}>Sem contactos comerciais registados.</Text>}
    </Panel>
  </AreaPage>;
}

export function StandSales() {
  const manage = useManager(); const qc = useQueryClient(); const { inventoryId } = useLocalSearchParams<{ inventoryId?: string }>();
  const sales = useStandQuery("sales", "/stand/sales", manage);
  const [vehicle, setVehicle] = useState<any>(inventoryId ? { id: inventoryId } : null); const [buyer, setBuyer] = useState<any>(null);
  const [amount, setAmount] = useState(""); const [notes, setNotes] = useState(""); const [key, setKey] = useState(() => `stand-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  const [confirm, setConfirm] = useState(false); const [busy, setBusy] = useState(false); const [error, setError] = useState(""); const [message, setMessage] = useState("");
  const sell = async () => {
    if (busy) return; setBusy(true); setError("");
    try { await api.post("/stand/sales", { inventory_id: vehicle.id, client_id: buyer.id, amount: number(amount), notes, idempotency_key: key }); await refresh(qc); setMessage("Venda registada. A viatura está associada ao cliente nos registos da empresa."); setConfirm(false); setVehicle(null); setBuyer(null); setAmount(""); setNotes(""); setKey(`stand-${Date.now()}-${Math.random().toString(36).slice(2)}`); }
    catch (e: any) { setError(e.message); } finally { setBusy(false); }
  };
  if (!manage) return <AreaPage title="Vendas" testID="stand-sales" back={false}><Text style={areaStyles.hint}>O registo e os valores das vendas estão reservados ao responsável da empresa.</Text></AreaPage>;
  return <AreaPage title="Vendas do Stand" testID="stand-sales" back={false}>
    <Panel title="Registar venda" testID="stand-sale-form"><Text style={areaStyles.hint}>Confirme a viatura, o comprador e o valor. O registo de venda fica guardado no histórico.</Text>
      <SearchPicker title="Escolher viatura" endpoint="/stand/inventory" label={r => `${r.license_plate} · ${inventoryStates[r.status as keyof typeof inventoryStates]}`} selected={vehicle?.license_plate || (vehicle?.id ? "Viatura selecionada" : undefined)} onSelect={r => { setVehicle(r); setAmount(String(r.asking_price)); setConfirm(false); }} />
      <SearchPicker title="Escolher comprador" endpoint="/clients" label={r => r.name} selected={buyer?.name} onSelect={r => { setBuyer(r); setConfirm(false); }} />
      <Input testID="stand-sale-amount" label="Valor de venda (€)" value={amount} keyboardType="decimal-pad" onChangeText={value => { setAmount(value); setConfirm(false); }} />
      <Input label="Notas" value={notes} onChangeText={value => { setNotes(value); setConfirm(false); }} multiline />
      <Feedback testID="stand-sale-error" error message={error} /><Feedback testID="stand-sale-success" message={message} />
      {confirm ? <><Text style={areaStyles.label}>Confirmar venda a {buyer?.name} por {formatEUR(parseDecimal(amount))}?</Text><Button testID="stand-sale-confirm" title="Confirmar registo da venda" loading={busy} onPress={sell} /><Button title="Rever dados" variant="ghost" onPress={() => setConfirm(false)} /></> : <Button testID="stand-sale-review" title="Rever venda" disabled={!vehicle?.id || !buyer?.id || !(parseDecimal(amount) > 0)} onPress={() => setConfirm(true)} />}
    </Panel>
    <State query={sales} />{sales.data?.map((s: any) => <Panel key={s.id} title={`${s.snapshot.license_plate} · ${s.snapshot.make} ${s.snapshot.model}`} testID={`stand-sale-${s.id}`}><Text style={areaStyles.label}>{s.snapshot.client_name} · {date(s.created_at)}</Text><Text style={areaStyles.label}>{formatEUR(Number(s.amount))}</Text><Text style={areaStyles.hint}>Compra: {formatEUR(Number(s.purchase_price))} · Margem bruta: {formatEUR(Number(s.amount)-Number(s.purchase_price))}</Text><Text style={areaStyles.hint}>{s.notes || "Sem notas adicionais"}</Text></Panel>)}
    {sales.data?.length === 0 && <Text style={areaStyles.hint}>Sem vendas registadas.</Text>}
  </AreaPage>;
}

export function StandHistory() {
  const manage = useManager(); const query = useStandQuery("history", "/stand/history", manage);
  const labels: Record<string, string> = { "stand.vehicle.created": "Viatura adicionada", "stand.vehicle.updated": "Viatura atualizada", "stand.lead.created": "Contacto criado", "stand.lead.updated": "Contacto atualizado", "stand.sale.created": "Venda registada" };
  return <AreaPage title="Histórico do Stand" testID="stand-history"><Text style={areaStyles.hint}>{manage ? "Registos de viaturas, contactos e vendas da empresa." : "O histórico global está reservado ao responsável da empresa."}</Text><State query={query} />{query.data?.map((row: any) => <Panel key={row.id} title={labels[row.action] || row.action} testID={`stand-history-${row.id}`}><Text style={areaStyles.hint}>{date(row.created_at)}</Text><Text selectable style={areaStyles.hint}>Referência: {row.resource}</Text></Panel>)}{query.data?.length === 0 && <Text style={areaStyles.hint}>Sem movimentos registados.</Text>}</AreaPage>;
}
export function StandMore() {
  const { user, logout } = useAuth(); const manage = useManager();
  return <AreaPage title="Mais · Stand" testID="stand-more" back={false}><Panel title={user?.name} testID="stand-account"><Text style={areaStyles.hint}>{user?.workshop_name}</Text><Text style={areaStyles.label}>{user?.email}</Text></Panel>
    {manage && <DashboardAction testID="stand-open-history" label="Histórico de transações e alterações" icon="time-outline" onPress={() => router.push("/(stand)/stand-historico")} />}
    <Button title="Alterar palavra-passe" variant="secondary" onPress={() => router.push("/(auth)/change-password")} /><Button title="Terminar sessão" variant="ghost" onPress={() => logout()} />
  </AreaPage>;
}
