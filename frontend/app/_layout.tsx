import { ThemeProvider, useAppTheme } from "@/src/shared/theme/ThemeProvider";
import { QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";

import { ErrorBoundary } from "@/src/shared/ui/error-boundary";
import { queryClient } from "@/src/core/query-client";
import { AuthProvider } from "@/src/core/auth/AuthProvider";
import { AlertHost } from "@/src/shared/ui/AlertHost";


export default function RootLayout() { return <ThemeProvider><ThemedRootLayout /></ThemeProvider>; }

function ThemedRootLayout() {
 const theme = useAppTheme();
  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <AlertHost />
            <StatusBar style={theme.scheme === "dark" ? "light" : "dark"} />
            <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: theme.tones.background } }} />
          </AuthProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}
