import { useAppTheme , createThemedStyles } from "@/src/shared/theme/ThemeProvider";
import React from "react";
import { View, Text, Pressable } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { router } from "expo-router";
import { useAuth } from "@/src/core/auth/AuthProvider";
import { companyModules, CompanyModule } from "@/src/core/auth/company-modules";


export function ModuleSwitch({ current }: { current: CompanyModule }) {
  const theme = useAppTheme();
  const s = useStyles();

  const { user, support } = useAuth();
  if ((support || user)?.subscription_version === 1) return null;
  const modules = companyModules(support || user);
  if (!modules.includes("workshop") || !modules.includes("stand")) return null;
  const stand = current === "workshop";
  return <View style={s.wrap}><Pressable testID="company-module-switch" accessibilityRole="button" accessibilityLabel={`Ir para ${stand ? "Stand" : "Oficina"}`} onPress={() => router.replace(stand ? "/(stand)/stand-inicio" : "/(app)/inicio")} style={s.button}>
    <Ionicons name={stand ? "car-sport-outline" : "construct-outline"} color={theme.tones.onAction} size={20} />
    <Text style={s.text}>{stand ? "Stand" : "Oficina"}</Text><Ionicons name="swap-horizontal" color={theme.tones.onAction} size={20} />
  </Pressable></View>;
}
const useStyles = createThemedStyles((theme) => { const c = theme.workspace; return ({ wrap: { paddingHorizontal: 22, paddingVertical: 7, alignItems: "flex-end", width: "100%", maxWidth: 1264, alignSelf: "center", backgroundColor: c.background }, button: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, minHeight: 44, paddingHorizontal: 20, backgroundColor: c.brandFill, borderRadius: 14 }, text: { color: theme.tones.onAction, fontSize: 14, fontWeight: "700" } }); });
