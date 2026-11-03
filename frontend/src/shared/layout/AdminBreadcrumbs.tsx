import React from "react";
import { Link, useLocalSearchParams, useSegments, Href } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { workspaceColors as c } from "@/src/shared/theme/workspace";

type Crumb = { label: string; href?: Href };
export function AdminBreadcrumbs({ title }: { title: string }) {
  const segments = useSegments() as string[];
  const page = segments[segments.length - 1];
  const { id } = useLocalSearchParams<{ id?: string }>();
  const crumbs: Crumb[] = [{ label: "Roadmesh", href: "/(admin)/dashboard" }];
  if (["empresas", "empresa", "criar-empresa", "editar-empresa"].includes(page)) {
    crumbs.push({ label: "Empresas", href: "/(admin)/empresas" });
    if (page === "editar-empresa" && id) crumbs.push({ label: "Empresa", href: { pathname: "/(admin)/empresa", params: { id } } });
    if (page !== "empresas") crumbs.push({ label: page === "criar-empresa" ? "Criar empresa" : page === "editar-empresa" ? "Editar empresa" : title });
  } else if (page !== "dashboard") crumbs.push({ label: title });
  return <View testID="admin-breadcrumbs" accessibilityLabel="Caminho da página" style={s.row}>{crumbs.map((crumb, index) => <React.Fragment key={index}>
    {index > 0 && <Text accessible={false} style={s.separator}>/</Text>}
    {index < crumbs.length - 1 && crumb.href ? <Link href={crumb.href} asChild><Pressable testID={`admin-breadcrumb-${index}`} accessibilityRole="link" style={s.item}><Text style={s.link}>{crumb.label}</Text></Pressable></Link> : <Text testID="admin-breadcrumb-current" style={s.current}>{crumb.label}</Text>}
  </React.Fragment>)}</View>;
}
const s = StyleSheet.create({ row: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", columnGap: 10, rowGap: 2 }, item: { minHeight: 32, justifyContent: "center" }, link: { color: c.brand, fontSize: 12, fontWeight: "600" }, current: { color: c.muted, fontSize: 12, lineHeight: 32 }, separator: { color: c.muted, fontSize: 12 } });
