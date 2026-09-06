import { useEffect } from "react";
import { View, ActivityIndicator } from "react-native";
import { router } from "expo-router";
import { useAuth } from "@/src/auth";
import { colors } from "@/src/theme";

export default function Index() {
  const { user, loading } = useAuth();
  useEffect(() => {
    if (loading) return;
    if (user) router.replace("/(app)/inicio");
    else router.replace("/(auth)/login");
  }, [user, loading]);
  return (
    <View style={{ flex: 1, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center" }}>
      <ActivityIndicator color={colors.brandPrimary} />
    </View>
  );
}
