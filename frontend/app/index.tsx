import { useAppTheme } from "@/src/shared/theme/ThemeProvider";
import { useEffect } from "react";
import { View, ActivityIndicator } from "react-native";
import { router } from "expo-router";
import { useAuth, homeFor } from "@/src/core/auth/AuthProvider";


export default function Index() {
  const theme = useAppTheme();
  const colors = theme.colors;

  const { user, loading } = useAuth();
  useEffect(() => {
    if (loading) return;
    router.replace(homeFor(user));
  }, [user, loading]);
  return (
    <View style={{ flex: 1, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center" }}>
      <ActivityIndicator color={colors.brandAccent} />
    </View>
  );
}
