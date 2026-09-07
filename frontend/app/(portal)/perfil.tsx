import React from "react";
import { Text } from "react-native";
import { router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/src/api";
import { useAuth } from "@/src/auth";
import { AreaPage, Panel, QueryState, areaStyles } from "@/src/components/AreaUI";
import { Button } from "@/src/components/Button";
export default function ClientProfile() {
  const { logout } = useAuth();
  const { data, error, isLoading, refetch } = useQuery({ queryKey: ["portal-profile"], queryFn: () => api.get("/portal/profile") });
  return <AreaPage title="Perfil" testID="portal-profile" back={false}>
    <QueryState testID="portal-profile-query" loading={isLoading} error={error} retry={refetch} />
    {data && <>
      <Panel testID="portal-profile-data" title={data.client?.name || data.user.name}>
        <Text testID="portal-profile-email" style={areaStyles.label}>{data.user.email}</Text>
        <Text testID="portal-profile-contact" style={areaStyles.hint}>{data.client?.phone || "Telefone não indicado"}{"\n"}{data.client?.address || "Morada não indicada"}</Text>
      </Panel>
      <Panel testID="portal-profile-workshop" title="A minha oficina">
        <Text testID="portal-workshop-name" style={areaStyles.label}>{data.workshop?.name}</Text>
        <Text testID="portal-workshop-contact" style={areaStyles.hint}>{data.workshop?.email || "Contacte diretamente a oficina"}{"\n"}{data.workshop?.address || ""}</Text>
        <Text testID="portal-profile-data-help" style={areaStyles.hint}>Para atualizar os seus contactos ou associar outra viatura, fale com a sua oficina.</Text>
      </Panel>
    </>}
    <Button testID="portal-change-password" title="Alterar palavra-passe" variant="secondary" onPress={() => router.push("/(auth)/change-password")} />
    <Button testID="portal-logout" title="Terminar sessão" variant="ghost" onPress={() => logout()} />
  </AreaPage>;
}