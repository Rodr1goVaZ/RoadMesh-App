import React, { useEffect } from "react";
import { Tabs, router } from "expo-router";
import { View, Text, Platform } from "react-native";
import { useAuth, homeFor } from "@/src/auth";
import { SupportBanner } from "@/src/components/SupportBanner";
import { colors } from "@/src/theme";

function Icon({ label, focused }: { label: string; focused: boolean }) {
  return (
    <View style={{ alignItems: "center", justifyContent: "center", width: 28, height: 28 }}>
      <Text style={{ fontSize: 20, color: focused ? colors.brandPrimary : colors.muted }}>{label}</Text>
    </View>
  );
}

export default function AppLayout() {
  const { user, loading, support } = useAuth();
  const allowed = user && !user.password_change_required && (user.role === "workshop_staff" || (user.role === "admin" && support));
  useEffect(() => {
    if (!loading && !allowed) router.replace(homeFor(user));
  }, [user, loading, allowed]);
  if (!allowed) return null;

  return (
    <View style={{ flex: 1 }}><SupportBanner /><Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.brandPrimary,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: {
          backgroundColor: colors.surfaceSecondary,
          borderTopColor: colors.border,
          ...(Platform.OS === "web" ? { height: 64 } : {}),
        },
        tabBarItemStyle: { alignSelf: "center" },
        tabBarLabelStyle: { fontSize: 11, fontWeight: "600" },
      }}
    >
      <Tabs.Screen name="inicio" options={{ title: "Início", tabBarIcon: ({ focused }) => <Icon label="⌂" focused={focused} /> }} />
      <Tabs.Screen name="servico" options={{ title: "Serviço", tabBarIcon: ({ focused }) => <Icon label="⚙" focused={focused} /> }} />
      <Tabs.Screen name="clientes" options={{ title: "Clientes", tabBarIcon: ({ focused }) => <Icon label="◉" focused={focused} /> }} />
      <Tabs.Screen name="stock" options={{ title: "Stock", tabBarIcon: ({ focused }) => <Icon label="▤" focused={focused} /> }} />
      <Tabs.Screen name="mais" options={{ title: "Mais", tabBarIcon: ({ focused }) => <Icon label="⋯" focused={focused} /> }} />
      <Tabs.Screen name="fotos" options={{ href: null }} />
      <Tabs.Screen name="faturacao" options={{ href: null }} />
      <Tabs.Screen name="orcamentos" options={{ href: null }} />
      <Tabs.Screen name="orcamento-new" options={{ href: null }} />
      <Tabs.Screen name="viaturas" options={{ href: null }} />
      <Tabs.Screen name="viatura" options={{ href: null }} />
      <Tabs.Screen name="danos" options={{ href: null }} />
      <Tabs.Screen name="marcacoes" options={{ href: null }} />
    </Tabs></View>
  );
}
