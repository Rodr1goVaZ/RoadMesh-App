import React from "react";
import { Redirect } from "expo-router";
import { ActivityIndicator, View, StyleSheet } from "react-native";
import { homeFor, useAuth, User } from "@/src/core/auth/AuthProvider";
import { colors } from "@/src/shared/theme/legacy";

export function RoleGate({ role, children }: { role: User["role"]; children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <View style={styles.wait}><ActivityIndicator color={colors.brandPrimary} /></View>;
  if (!user || user.password_change_required || user.role !== role) return <Redirect href={homeFor(user)} />;
  return <>{children}</>;
}
const styles = StyleSheet.create({ wait: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.surface } });