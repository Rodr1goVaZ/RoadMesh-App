export type CompanyModule = "workshop" | "stand";
export function companyModules(value?: { modules?: CompanyModule[] } | null): CompanyModule[] {
  return value?.modules === undefined ? ["workshop"] : value.modules.filter(name => name === "workshop" || name === "stand");
}
export function companyHome(value?: { modules?: CompanyModule[] } | null) {
  const modules = companyModules(value);
  if (!modules.length) return "/(auth)/login" as const;
  return modules.includes("workshop") ? "/(app)/inicio" as const : "/(stand)/stand-inicio" as const;
}
