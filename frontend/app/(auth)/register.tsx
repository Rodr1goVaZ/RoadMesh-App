import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { router } from "expo-router";
import { AreaPage, areaStyles } from "@/src/components/AreaUI";
import { Logo } from "@/src/components/Logo";
import { Button } from "@/src/components/Button";
export default function RegisterInfo() {
  return <AreaPage title="Obter acesso" testID="register-screen"><View style={styles.brand}><Logo size={110} testID="register-logo" /></View>
    <Text testID="register-help" style={areaStyles.title}>Uma conta, o acesso certo</Text>
    <Text testID="register-workshop-info" style={areaStyles.hint}>As contas de oficina são criadas pela administração RoadMesh. Se é gerente ou colaborador, utilize os dados fornecidos pelo responsável.</Text>
    <Text testID="register-client-info" style={areaStyles.hint}>É cliente? Peça à sua oficina que ative o seu acesso. Os seus carros e o histórico ficam associados automaticamente.</Text>
    <Button title="Entrar como cliente" testID="register-client-login" onPress={() => router.replace("/(auth)/client-login")} />
    <Button title="Entrar como oficina" testID="register-staff-login" variant="secondary" onPress={() => router.replace("/(auth)/login")} />
  </AreaPage>;
}
const styles = StyleSheet.create({ brand: { alignItems: "center", paddingVertical: 24 } });