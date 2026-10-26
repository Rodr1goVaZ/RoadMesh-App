import React, { useState } from "react";
import { Modal, View, Text, FlatList } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { api } from "@/src/core/http/api";
import { Button } from "@/src/shared/ui/Button";
import { Input } from "@/src/shared/ui/Input";
import { QueryState, areaStyles } from "@/src/shared/layout/AreaUI";
import { colors } from "@/src/shared/theme/legacy";

export function SearchPicker({ title, endpoint, label, selected, onSelect, disabled }: {
  title: string; endpoint: string; label: (r: any) => string; selected?: string; onSelect: (r: any) => void; disabled?: boolean;
}) {
  const [open, setOpen] = useState(false); const [search, setSearch] = useState(""); const insets = useSafeAreaInsets();
  const query = useQuery({ queryKey: ["relation-picker", endpoint, search], queryFn: () => api.get(`${endpoint}${endpoint.includes("?") ? "&" : "?"}search=${encodeURIComponent(search)}&limit=100`), enabled: open });
  return <><Button title={selected || title} variant="secondary" disabled={disabled} onPress={() => setOpen(true)} />
    <Modal visible={open} animationType="slide" onRequestClose={() => setOpen(false)}><View style={{ flex: 1, backgroundColor: colors.surface, paddingTop: insets.top + 16, paddingBottom: insets.bottom, paddingHorizontal: 20 }}>
      <View style={{ width: "100%", maxWidth: 900, alignSelf: "center", flex: 1, gap: 12 }}>
        <Text style={areaStyles.title}>{title}</Text><Input label="Pesquisar" autoFocus value={search} onChangeText={setSearch} />
        <QueryState loading={query.isLoading} error={query.error} retry={query.refetch} testID="relation-picker" />
        <FlatList data={query.data || []} keyExtractor={(r: any) => r.id} keyboardShouldPersistTaps="handled" contentContainerStyle={{ gap: 8 }}
          ListEmptyComponent={!query.isLoading ? <Text style={areaStyles.hint}>Sem resultados. Experimente outra pesquisa.</Text> : null}
          renderItem={({ item }) => <Button title={label(item)} variant="secondary" onPress={() => { onSelect(item); setOpen(false); }} />} />
        <Text style={areaStyles.hint}>Até 100 resultados por pesquisa.</Text><Button title="Fechar" variant="ghost" onPress={() => setOpen(false)} />
      </View></View></Modal></>;
}
export function ClientVehicleFields({ clientId, onClient, onVehicle }: { clientId: string; onClient: (id: string) => void; onVehicle: (id: string) => void }) {
  const [client, setClient] = useState<any>(null); const [vehicle, setVehicle] = useState<any>(null);
  return <View style={{ gap: 12 }}><SearchPicker title="Escolher cliente" endpoint="/clients" label={c => `${c.name}${c.nif ? " · " + c.nif : ""}`} selected={client?.name}
    onSelect={c => { setClient(c); setVehicle(null); onClient(c.id); onVehicle(""); }} />
    <SearchPicker title="Escolher viatura" endpoint={"/vehicles?client_id=" + encodeURIComponent(clientId)} label={v => `${v.license_plate} · ${v.make} ${v.model}`} selected={vehicle?.license_plate} disabled={!clientId}
      onSelect={v => { setVehicle(v); onVehicle(v.id); }} /></View>;
}
