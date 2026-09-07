import React from "react";
import { Stack } from "expo-router";
import { RoleGate } from "@/src/components/RoleGate";
export default function AdminLayout() { return <RoleGate role="admin"><Stack screenOptions={{ headerShown: false }} /></RoleGate>; }