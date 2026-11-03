import React, { useState } from "react";
import { Text, View, Pressable, StyleSheet, useWindowDimensions } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/src/core/http/api";
import { AreaPage, QueryState } from "@/src/shared/layout/AreaUI";
import { Input } from "@/src/shared/ui/Input";
import { Button } from "@/src/shared/ui/Button";
import { companyModules } from "@/src/core/auth/company-modules";
import { workspaceColors as c } from "@/src/shared/theme/workspace";

const FILTERS = { all: "Todas", active: "Ativas", disabled: "Inativas", archived: "Arquivadas" };
const STATUS: Record<string, string> = { active: "Ativa", disabled: "Inativa", archived: "Arquivada" };
export default function Empresas() {
  const wide = useWindowDimensions().width >= 950;
  const [search, setSearch] = useState(""); const [status, setStatus] = useState("all");
  const { data = [], error, isLoading, refetch } = useQuery({ queryKey: ["admin-workshops", search, status], queryFn: () => api.get(`/admin/workshops?search=${encodeURIComponent(search)}&status=${status}`) });
  return <AreaPage title="Empresas" testID="admin-workshops">
    <View style={[s.intro, wide && s.row]}><View style={s.flex}><Text accessibilityRole="header" style={s.title}>Empresas</Text></View><Button testID="admin-workshops-create" title="Criar empresa" fullWidth={false} onPress={() => router.push("/(admin)/criar-empresa")} /></View>
    <View style={s.panel}>
      <View style={[s.toolbar, wide && s.row]}><View style={s.search}><Input testID="admin-workshops-search" placeholder="Nome, NIF, email ou responsável" label="Pesquisar empresas" value={search} onChangeText={setSearch} /></View><View style={s.filters}>{Object.entries(FILTERS).map(([value, label]) => <Pressable key={value} testID={`admin-filter-${value}`} accessibilityRole="button" accessibilityState={{ selected: value === status }} onPress={() => setStatus(value)} style={[s.filter, value === status && s.activeFilter]}><Text style={[s.filterText, value === status && s.activeFilterText]}>{label}</Text></Pressable>)}</View></View>
      <QueryState loading={isLoading} error={error} retry={refetch} testID="admin-workshops-query" />
      {!isLoading && !error && <Text style={s.count}>{data.length} {data.length === 1 ? "empresa encontrada" : "empresas encontradas"}</Text>}
      {wide && !!data.length && <View style={[s.companyRow, s.tableHead]}><Text style={[s.business, s.columnTitle]}>EMPRESA</Text><Text style={[s.contact, s.columnTitle]}>RESPONSÁVEL</Text><Text style={[s.state, s.columnTitle]}>ESTADO</Text><View style={s.action} /></View>}
      {!isLoading && !error && !data.length && <View style={s.empty}><Ionicons name="business-outline" size={32} color={c.muted} /><Text testID="admin-workshops-empty" style={s.companyName}>Nenhuma empresa encontrada.</Text><Text style={s.hint}>Experimente outro nome ou ajuste os filtros.</Text></View>}
      {data.map((company: any) => <View testID={`admin-workshop-${company.id}`} key={company.id} style={[s.companyRow, !wide && s.mobileRow]}>
        <View style={[s.business, s.identity]}><View style={s.companyIcon}><Ionicons name="business-outline" size={23} color={c.brand} /></View><View style={s.flex}><Text style={s.companyName}>{company.name}</Text><Text style={s.hint}>{companyModules(company).map(m => m === "stand" ? "Stand" : "Oficina").join(" + ")}</Text><Text style={s.small}>NIF/NIPC {company.nif || "não indicado"}</Text></View></View>
        <View style={s.contact}>{!wide && <Text style={s.small}>Responsável</Text>}<Text style={s.contactName}>{company.manager_name || "Por indicar"}</Text><Text style={s.hint}>{company.manager_email || "Email não indicado"}</Text></View>
        <View style={s.state}><View style={[s.status, company.status === "active" && s.statusActive]}><Text testID={`admin-workshop-status-${company.id}`} style={[s.statusText, company.status === "active" && { color: "#357962" }]}>{STATUS[company.status] || company.status}</Text></View></View>
        <View style={s.action}><Button testID={`admin-workshop-open-${company.id}`} title="Ver empresa" variant="secondary" onPress={() => router.push({ pathname: "/(admin)/empresa", params: { id: company.id } })} /></View>
      </View>)}
    </View>
  </AreaPage>;
}
const s = StyleSheet.create({
  flex: { flex: 1, minWidth: 0 }, row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" }, intro: { gap: 20, paddingVertical: 8 }, eyebrow: { fontSize: 11, letterSpacing: 1.8, fontWeight: "700", color: c.brand, marginBottom: 10 }, title: { fontSize: 30, fontWeight: "800", color: c.ink, marginBottom: 8 }, hint: { fontSize: 13, lineHeight: 21, color: c.muted }, small: { fontSize: 11, lineHeight: 18, color: c.muted },
  panel: { backgroundColor: "#FFF", borderWidth: 1, borderColor: c.line, borderRadius: 22, padding: 24, gap: 20 }, toolbar: { gap: 20, alignItems: "stretch" }, search: { flex: 1, maxWidth: 480 }, filters: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 8 }, filter: { minHeight: 40, paddingHorizontal: 16, borderRadius: 11, backgroundColor: c.soft, justifyContent: "center" }, activeFilter: { backgroundColor: "#F8EAEA" }, filterText: { fontSize: 12, color: c.muted, fontWeight: "600" }, activeFilterText: { color: c.brand }, count: { color: c.muted, fontSize: 12 },
  companyRow: { flexDirection: "row", alignItems: "center", gap: 24, paddingVertical: 20, borderTopWidth: 1, borderColor: c.line }, tableHead: { paddingVertical: 10 }, columnTitle: { fontSize: 10, letterSpacing: 1, color: c.muted, fontWeight: "700" }, business: { flex: 1.4, minWidth: 0 }, identity: { flexDirection: "row", alignItems: "center", gap: 14 }, companyIcon: { width: 46, height: 46, borderRadius: 14, backgroundColor: "#F8F0EF", alignItems: "center", justifyContent: "center" }, companyName: { fontSize: 16, fontWeight: "700", color: c.ink, marginBottom: 3 }, contact: { flex: 1.1, minWidth: 0 }, contactName: { fontSize: 14, fontWeight: "600", color: c.ink, marginBottom: 4 }, state: { flex: .6, alignItems: "flex-start", minWidth: 0 }, action: { width: 125 }, status: { borderRadius: 9, paddingHorizontal: 12, paddingVertical: 7, backgroundColor: c.soft }, statusActive: { backgroundColor: "#EDF6F0" }, statusText: { fontSize: 12, color: c.muted, fontWeight: "600" }, mobileRow: { flexDirection: "column", alignItems: "stretch", gap: 16 }, empty: { alignItems: "center", paddingVertical: 40, gap: 12 },
});
