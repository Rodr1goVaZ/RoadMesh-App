import React from "react";
import { Redirect, useLocalSearchParams } from "expo-router";
import { CompanyFormScreen } from "@/src/features/administration/components/CompanyFormScreen";
export default function CreateCompany() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  if (id) return <Redirect href={{ pathname: "/(admin)/editar-empresa", params: { id } }} />;
  return <CompanyFormScreen mode="create" />;
}
