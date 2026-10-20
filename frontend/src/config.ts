import Constants from "expo-constants";

export const API_BASE = `${(Constants.expoConfig?.extra?.backendUrl || process.env.EXPO_PUBLIC_BACKEND_URL || "").replace(/\/$/, "")}/api`;
