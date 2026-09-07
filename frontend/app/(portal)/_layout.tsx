import React from "react";
import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { RoleGate } from "@/src/components/RoleGate";
import { colors } from "@/src/theme";
export default function PortalLayout() {
  return <RoleGate role="client"><Tabs screenOptions={{ headerShown: false, tabBarActiveTintColor: colors.brandPrimary, tabBarInactiveTintColor: colors.muted, tabBarStyle: { backgroundColor: colors.surfaceSecondary, borderTopColor: colors.border }, tabBarLabelStyle: { fontSize: 12, fontWeight: "600" } }}>
    <Tabs.Screen name="marcacoes" options={{ title: "Marcações", tabBarButtonTestID: "portal-tab-appointments", tabBarIcon: ({ color }) => <Ionicons name="calendar-outline" color={color} size={23} /> }} />
    <Tabs.Screen name="carros" options={{ title: "Os Meus Carros", tabBarButtonTestID: "portal-tab-cars", tabBarIcon: ({ color }) => <Ionicons name="car-outline" color={color} size={23} /> }} />
    <Tabs.Screen name="perfil" options={{ title: "Perfil", tabBarButtonTestID: "portal-tab-profile", tabBarIcon: ({ color }) => <Ionicons name="person-circle-outline" color={color} size={24} /> }} />
    <Tabs.Screen name="carro" options={{ href: null }} />
  </Tabs></RoleGate>;
}