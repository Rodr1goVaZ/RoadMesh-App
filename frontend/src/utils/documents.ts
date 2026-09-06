import { Linking, Platform } from "react-native";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { API_BASE } from "../api";
import { session } from "../session";
import { formatDate, formatEUR } from "./format";

export function quoteMessage(quote: any) {
  const lines = quote.items.map((item: any) => `${item.item_type === "peca" ? "Peça" : "Mão de obra"}: ${item.description} — ${item.quantity} × ${formatEUR(item.unit_price)} (IVA ${item.vat_rate}%)`);
  return [`Olá, ${quote.client_name}.`, "", `Orçamento ${quote.number} · ${formatDate(quote.created_at)}`,
    `${quote.workshop_name} · ${quote.vehicle?.license_plate || ""}`, "", ...lines, "",
    `Subtotal: ${formatEUR(quote.subtotal)}`, `IVA: ${formatEUR(quote.vat)}`, `Total: ${formatEUR(quote.total)}`,
    ...(quote.notes ? ["", quote.notes] : []), "", "Agradecemos a confirmação para avançarmos com o serviço.", quote.workshop_name].join("\n");
}

export function whatsappPhone(raw?: string) {
  let number = (raw || "").replace(/[^0-9]/g, "");
  if (number.startsWith("00")) number = number.slice(2);
  if (number.length === 9) number = `351${number}`;
  return /^[1-9][0-9]{9,14}$/.test(number) ? number : "";
}

export async function shareQuote(quote: any, channel: "email" | "whatsapp") {
  const message = encodeURIComponent(quoteMessage(quote));
  let url: string;
  if (channel === "email") {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(quote.client_email || "")) throw new Error("O cliente não tem um email válido. Atualize os contactos na ficha do cliente.");
    url = `mailto:${encodeURIComponent(quote.client_email)}?subject=${encodeURIComponent(`Orçamento ${quote.number} — ${quote.workshop_name}`)}&body=${message}`;
  } else {
    const phone = whatsappPhone(quote.client_phone);
    if (!phone) throw new Error("O cliente não tem um telefone válido. Atualize os contactos na ficha do cliente.");
    url = `https://wa.me/${phone}?text=${message}`;
  }
  try { await Linking.openURL(url); }
  catch { throw new Error(channel === "email" ? "Não foi possível abrir o email. Configure uma aplicação de email no telemóvel." : "Não foi possível abrir o WhatsApp. Verifique se está instalado."); }
}

export async function exportInvoice(invoice: any) {
  const token = await session.getToken();
  const url = `${API_BASE}/invoices/${invoice.id}/pdf`;
  const headers = { Authorization: `Bearer ${token}` };
  if (Platform.OS === "web") {
    const response = await fetch(url, { headers });
    if (!response.ok) throw new Error("Não foi possível gerar o PDF. Tente novamente.");
    const blobUrl = URL.createObjectURL(await response.blob());
    try { await Linking.openURL(blobUrl); }
    finally { setTimeout(() => URL.revokeObjectURL(blobUrl), 60000); }
    return;
  }
  if (!await Sharing.isAvailableAsync()) throw new Error("A partilha de ficheiros não está disponível neste dispositivo.");
  const filename = `RoadMesh-${invoice.document_number.replace(/[^a-zA-Z0-9-]/g, "-")}.pdf`;
  const path = `${FileSystem.cacheDirectory}${filename}`;
  const result = await FileSystem.downloadAsync(url, path, { headers });
  if (result.status !== 200) {
    await FileSystem.deleteAsync(path, { idempotent: true });
    throw new Error("Não foi possível gerar o PDF. Tente novamente.");
  }
  await Sharing.shareAsync(result.uri, { mimeType: "application/pdf", UTI: "com.adobe.pdf", dialogTitle: "Guardar ou enviar documento" });
}