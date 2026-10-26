import React, { useState } from "react";
import { Text } from "react-native";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/src/core/http/api";
import { useAuth } from "@/src/core/auth/AuthProvider";
import { AreaPage, Panel, QueryState, areaStyles } from "@/src/shared/layout/AreaUI";
import { Input } from "@/src/shared/ui/Input";
import { Button } from "@/src/shared/ui/Button";
import { Feedback } from "@/src/shared/ui/Feedback";

export default function Settings() {
  const { user, support } = useAuth(); const manager = !!user?.can_manage_workshop || !!support;
  const qc = useQueryClient(); const query = useQuery({ queryKey: ["workshop-settings"], queryFn: () => api.get("/workshop/settings") });
  const [editedRate, setRate] = useState<string | null>(null); const [editedVat, setVat] = useState<string | null>(null);
  const rate = editedRate ?? String(query.data?.labor_hour_rate ?? ""); const vat = editedVat ?? String(query.data?.labor_vat_rate ?? 23); const [busy, setBusy] = useState(false);
  const [error, setError] = useState(""); const [message, setMessage] = useState("");
  const save = async () => {
    setBusy(true); setError(""); setMessage("");
    try { await api.put("/workshop/settings", { labor_hour_rate: rate.replace(",", "."), labor_vat_rate: vat.replace(",", ".") });
      await qc.invalidateQueries({ queryKey: ["workshop-settings"] }); setMessage("Preços guardados para novos trabalhos."); }
    catch (e: any) { setError(e.message); } finally { setBusy(false); }
  };
  return <AreaPage title="Configurações da oficina" testID="settings"><QueryState loading={query.isLoading} error={query.error} retry={query.refetch} testID="settings-query" />
    <Panel title="Mão de obra" testID="labor-settings"><Text style={areaStyles.hint}>Preço por hora sem IVA. Os trabalhos e documentos existentes conservam os preços registados.</Text>
      <Input label="Preço/hora (€)" keyboardType="decimal-pad" value={rate} onChangeText={setRate} editable={manager} />
      <Input label="IVA (%)" keyboardType="decimal-pad" value={vat} onChangeText={setVat} editable={manager} />
      <Feedback testID="operation-success" message={message} /><Feedback testID="operation-error" error message={error} />
      {manager && <Button title="Guardar" onPress={save} loading={busy} />}
    </Panel></AreaPage>;
}
