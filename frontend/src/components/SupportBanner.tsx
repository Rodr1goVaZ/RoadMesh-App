import React, { useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useAuth } from "../auth";
import { Button } from "./Button";
import { colors } from "../theme";
export function SupportBanner() {
  const { user, support, endSupport } = useAuth(); const [busy, setBusy] = useState(false);
  if (user?.role !== "admin" || !support) return null;
  const leave = async () => { setBusy(true); try { await endSupport(); } finally { setBusy(false); router.replace("/(admin)/dashboard"); } };
  return <SafeAreaView edges={["top"]} style={styles.wrap}>
    <View testID="admin-support-banner" style={styles.row}>
      <View style={styles.info}><Text testID="admin-support-mode" style={styles.title}>MODO ADMIN · SUPORTE</Text><Text testID="admin-support-workshop" style={styles.name} numberOfLines={1}>{support.name}</Text></View>
      <Button testID="admin-exit-support" title="Sair do modo" variant="secondary" fullWidth={false} loading={busy} onPress={leave} />
    </View>
  </SafeAreaView>;
}
const styles = StyleSheet.create({ wrap: { backgroundColor: colors.brandPrimary }, row: { padding: 12, gap: 12, flexDirection: "row", alignItems: "center" }, info: { flex: 1 }, title: { color: colors.onBrand, fontWeight: "800", fontSize: 11 }, name: { color: colors.onBrand, fontSize: 14, marginTop: 5 } });