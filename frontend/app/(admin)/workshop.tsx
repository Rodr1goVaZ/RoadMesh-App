import { Redirect, useLocalSearchParams } from "expo-router";
export default function LegacyCompany() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  return <Redirect href={{ pathname: "/(admin)/empresa", params: id ? { id } : {} }} />;
}
