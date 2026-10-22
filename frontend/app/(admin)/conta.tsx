import React from "react";
import { Text } from "react-native";
import { router } from "expo-router";
import { useAuth } from "@/src/auth";
import { AreaPage, Panel, areaStyles } from "@/src/components/AreaUI";
import { Button } from "@/src/components/Button";
export default function AdminAccount() {
  const { user, logout } = useAuth();
  return <AreaPage title="A minha conta" testID="admin-account" back={false}>
    <Panel title={user?.name || "Administração"} testID="admin-account-data"><Text style={areaStyles.label}>{user?.email}</Text><Text style={areaStyles.hint}>Administração global da plataforma RoadMesh.</Text></Panel>
    <Panel title="Segurança da conta" testID="admin-account-security">
      <Button testID="admin-account-password" title="Alterar palavra-passe" onPress={() => router.push("/(auth)/change-password")} />
      <Button testID="admin-account-logout" title="Terminar sessão" variant="ghost" onPress={() => logout()} />
    </Panel>
  </AreaPage>;
}
