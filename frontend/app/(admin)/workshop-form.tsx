import { Redirect, useLocalSearchParams } from "expo-router";
export default function LegacyCompanyForm() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  return <Redirect href={{ pathname: id ? "/(admin)/editar-empresa" : "/(admin)/criar-empresa", params: id ? { id } : {} }} />;
}
