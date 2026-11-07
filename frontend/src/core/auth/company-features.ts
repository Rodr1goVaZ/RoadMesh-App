import { CompanyModule } from "./company-modules";

export const featureCatalog = [
  { id: "customer_database", name: "Base de dados", description: "Fichas de clientes e viaturas.", icon: "people-outline" },
  { id: "inventory", name: "Gestão de stocks", description: "Produtos, fornecedores, encomendas e movimentos.", icon: "cube-outline" },
  { id: "service_orders", name: "Ordens de serviço", description: "Serviços, orçamentos e documentos de trabalho.", icon: "construct-outline" },
  { id: "vehicle_reception", name: "Receção de veículos", description: "Fotografias e danos registados à entrada da viatura.", icon: "camera-outline" },
  { id: "customer_notifications", name: "Notificações aos clientes", description: "Marcações, acompanhamento e comunicações.", icon: "notifications-outline" },
] as const;
export type FeatureId = typeof featureCatalog[number]["id"];
export type FeatureConfiguration = { subscription_version?: number | null; enabled_modules?: FeatureId[]; modules?: CompanyModule[] };
export function enabledFeatures(value?: FeatureConfiguration | null): FeatureId[] {
  if (value?.subscription_version === 1) return featureCatalog.map(item => item.id).filter(id => value.enabled_modules?.includes(id));
  return !value?.modules || value.modules.includes("workshop") ? featureCatalog.map(item => item.id) : [];
}
export const hasFeature = (value: FeatureConfiguration | null | undefined, feature: FeatureId) => enabledFeatures(value).includes(feature);
export const featureSummary = (value: FeatureConfiguration) => value.subscription_version === 1
  ? featureCatalog.filter(item => hasFeature(value, item.id)).map(item => item.name).join(" · ") || "Sem módulos ativos"
  : (value.modules || ["workshop"]).map(item => item === "stand" ? "Stand" : "Oficina").join(" + ");
export function monthlySubscription(base: string, active: FeatureId[], prices: Record<FeatureId, string>): string {
  const cents = (value: string) => {
    if (!/^\d+(?:[.,]\d{1,2})?$/.test(value.trim())) return NaN;
    const [whole, fraction = ""] = value.trim().replace(",", ".").split(".");
    return Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
  };
  const total = active.reduce((sum, key) => sum + cents(prices[key]), cents(base));
  return Number.isSafeInteger(total) && total <= 99999999999 ? (total / 100).toFixed(2).replace(".", ",") : "";
}
export function featureForScreen(page: string): FeatureId | null {
  if (["stock", "fornecedores"].includes(page)) return "inventory";
  if (["clientes", "viaturas"].includes(page)) return "customer_database";
  if (["servico", "orcamentos", "orcamento-new", "faturacao", "financeiro"].includes(page)) return "service_orders";
  if (["rececao", "fotos", "danos"].includes(page)) return "vehicle_reception";
  if (page === "marcacoes") return "customer_notifications";
  return null;
}
