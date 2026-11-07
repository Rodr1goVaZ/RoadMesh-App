export type CompanyModule = "workshop" | "stand";
export function companyModules(value?: { modules?: CompanyModule[]; subscription_version?: number | null } | null): CompanyModule[] {
  if (value?.subscription_version === 1) return ["workshop"];
  return value?.modules === undefined ? ["workshop"] : value.modules.filter(name => name === "workshop" || name === "stand");
}
export function companyHome(value?: { modules?: CompanyModule[]; subscription_version?: number | null } | null) {
  const modules = companyModules(value);
  if (!modules.length) return "/(auth)/login" as const;
  return modules.includes("workshop") ? "/(app)/inicio" as const : "/(stand)/stand-inicio" as const;
}
