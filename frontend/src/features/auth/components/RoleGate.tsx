import { useAppTheme, createThemedStyles } from "@/src/shared/theme/ThemeProvider";
import React from "react";
import { Redirect } from "expo-router";
import { ActivityIndicator, View } from "react-native";
import { homeFor, useAuth, User } from "@/src/core/auth/AuthProvider";


export function RoleGate({ role, children }: { role: User["role"]; children: React.ReactNode }) {
  const theme = useAppTheme();
  const colors = theme.colors;
  const styles = useStyles();

  const { user, loading } = useAuth();
  if (loading) return <View style={styles.wait}><ActivityIndicator color={colors.brandAccent} /></View>;
  if (!user || user.password_change_required || user.role !== role) return <Redirect href={homeFor(user)} />;
  return <>{children}</>;
}
const useStyles = createThemedStyles((theme) => { const colors = theme.colors; return ({ wait: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.surface } }); });