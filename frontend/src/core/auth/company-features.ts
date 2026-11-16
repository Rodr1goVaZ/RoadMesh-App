import { CompanyModule } from "./company-modules";
export const featureCatalog = [
  {"id":"customer_database","name":"Base de dados","description":"Fichas de clientes e viaturas.","icon":"people-outline","href":"/(app)/clientes"},
  {"id":"vehicle_reception","name":"Receção de veículos","description":"Entradas, fotografias, danos e relatórios.","icon":"camera-outline","href":"/(app)/rececao"},
  {"id": "quotes", "name": "Orçamentos", "description": "Propostas, estados de aprovação e conversão em serviço.", "icon": "document-text-outline", "href": "/(app)/orcamentos"},
  {"id":"service_orders","name":"Ordens de serviço","description":"Trabalhos, materiais e quadro de execução.","icon":"construct-outline","href":"/(app)/servico"},
  {"id":"inventory","name":"Stocks e encomendas","description":"Produtos, fornecedores e movimentos.","icon":"cube-outline","href":"/(app)/stock"},
  {"id": "appointments", "name": "Agenda e capacidade", "description": "Pedidos de marcação e acompanhamento.", "icon": "calendar-outline", "href": "/(app)/marcacoes"},
  {"id": "digital_inspections", "name": "Inspeção e diagnóstico", "description": "Registos de inspeção e recomendações.", "icon": "clipboard-outline", "href": "/(app)/produtos/digital_inspections"},
  {"id": "technician_time", "name": "Equipa técnica e tempos", "description": "Trabalhos e registo de tempos.", "icon": "stopwatch-outline", "href": "/(app)/produtos/technician_time"},
  {"id":"customer_notifications","name":"Comunicações","description":"Modelos, mensagens e acompanhamento de envios.","icon":"notifications-outline","href":"/(app)/produtos/customer_notifications"},
  {"id": "online_bookings", "name": "Reservas online", "description": "Registo e confirmação de pedidos de reserva.", "icon": "globe-outline", "href": "/(app)/produtos/online_bookings"},
  {"id":"payments","name":"Pagamentos e conta corrente","description":"Cobranças, movimentos e saldos.","icon":"wallet-outline","href":"/(app)/financeiro"},
  {"id":"invoicing","name":"Integração com faturação","description":"Configuração e acompanhamento de faturação externa.","icon":"receipt-outline","href":"/(app)/produtos/invoicing"},
  {"id": "reports", "name": "Relatórios", "description": "Contagens dos módulos ativos.", "icon": "bar-chart-outline", "href": "/(app)/produtos/reports"},
  {"id":"technical_data","name":"Dados técnicos","description":"Referências técnicas e configuração de fornecedores.","icon":"library-outline","href":"/(app)/produtos/technical_data"},
  {"id": "marketing", "name": "Marketing e satisfação", "description": "Preparação de campanhas e segmentos.", "icon": "megaphone-outline", "href": "/(app)/produtos/marketing"},
  {"id": "multi_location", "name": "Multi-localização", "description": "Registo de unidades e responsáveis.", "icon": "business-outline", "href": "/(app)/produtos/multi_location"},
] as const;
export type FeatureId = typeof featureCatalog[number]["id"];
export type FeatureConfiguration = { subscription_version?: number | null; enabled_modules?: FeatureId[]; modules?: CompanyModule[] };
const legacyFeatures: FeatureId[] = ["customer_database", "inventory", "service_orders", "vehicle_reception", "customer_notifications", "quotes", "appointments", "payments", "reports", "invoicing"];
export function enabledFeatures(value?: FeatureConfiguration | null): FeatureId[] {
  if (value?.subscription_version === 1) return featureCatalog.map(item => item.id).filter(id => value.enabled_modules?.includes(id));
  return !value?.modules || value.modules.includes("workshop") ? [...legacyFeatures] : [];
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
  const total = active.reduce((sum, key) => sum + cents(prices[key] ?? "0"), cents(base));
  return Number.isSafeInteger(total) && total <= 99999999999 ? (total / 100).toFixed(2).replace(".", ",") : "";
}
export function featureForScreen(page: string): FeatureId | null {
  if (["stock", "fornecedores"].includes(page)) return "inventory";
  if (["clientes", "viaturas"].includes(page)) return "customer_database";
  if (page === "servico") return "service_orders";
  if (["orcamentos", "orcamento-new"].includes(page)) return "quotes";
  if (page === "faturacao") return "invoicing";
  if (page === "financeiro") return "payments";
  if (["rececao", "fotos", "danos"].includes(page)) return "vehicle_reception";
  if (page === "marcacoes") return "appointments";
  return null;
}
