"""Paginated, branded internal invoice PDFs. No external requests at export time."""
from datetime import datetime
from html import escape
from io import BytesIO
from pathlib import Path

import reportlab
from reportlab.lib import colors
from reportlab.lib.enums import TA_RIGHT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import Image, Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

ROOT = Path(__file__).parent
FONTS = Path(reportlab.__file__).parent / "fonts"
pdfmetrics.registerFont(TTFont("RoadMesh", str(FONTS / "Vera.ttf")))
pdfmetrics.registerFont(TTFont("RoadMeshBold", str(FONTS / "VeraBd.ttf")))
BRAND = colors.HexColor("#7A1E2B")
MUTED = colors.HexColor("#6B7280")
PALE = colors.HexColor("#EEF3FA")


def euro(value):
    return f"{float(value or 0):,.2f}".replace(",", " ").replace(".", ",") + " €"


def date_pt(value):
    try:
        return datetime.fromisoformat(value).strftime("%d/%m/%Y")
    except (TypeError, ValueError):
        return "—"


def build_invoice_pdf(invoice):
    output = BytesIO()
    doc = SimpleDocTemplate(output, pagesize=A4, rightMargin=40, leftMargin=40,
                            topMargin=38, bottomMargin=54, title=invoice["document_number"], author="RoadMesh")
    width = A4[0] - 80
    normal = ParagraphStyle("body", fontName="RoadMesh", fontSize=9, leading=14, spaceAfter=3)
    bold = ParagraphStyle("bold", parent=normal, fontName="RoadMeshBold", textColor=BRAND)
    right = ParagraphStyle("right", parent=normal, alignment=TA_RIGHT)
    heading = ParagraphStyle("heading", parent=bold, fontSize=17, leading=23, spaceAfter=8)

    def p(text, style=normal):
        return Paragraph(escape(str(text or "—")).replace("\n", "<br/>"), style)

    snapshot = invoice["snapshot"]
    workshop, client, vehicle = (snapshot.get(key, {}) for key in ("workshop", "client", "vehicle"))
    name = {"fatura": "Fatura", "fatura_recibo": "Fatura-recibo", "orcamento": "Orçamento"}.get(invoice["document_type"], "Documento")
    logo = Image(str(ROOT / "assets" / "roadmesh-logo.png"), width=64, height=70, mask="auto")
    brand = [p("RoadMesh", heading), p(workshop.get("name"), bold)]
    for key, label in (("nif", "NIF"), ("address", "Morada")):
        if workshop.get(key):
            brand.append(p(f"{label}: {workshop[key]}"))
    header = Table([[logo, brand]], colWidths=[84, width - 84])
    header.setStyle(TableStyle([("VALIGN", (0, 0), (-1, -1), "TOP"), ("LEFTPADDING", (0, 0), (-1, -1), 0)]))
    story = [header, Spacer(1, 24), p(f"{name} · {invoice['document_number']}", heading),
             p("DOCUMENTO INTERNO · SEM VALIDADE FISCAL", bold),
             p(f"Data: {date_pt(invoice['created_at'])}     |     OS {snapshot.get('wo_number', '—')}"), Spacer(1, 18)]
    client_info = [p("CLIENTE", bold), p(client.get("name")), p(f"NIF: {client.get('nif') or '—'}"),
                   p(client.get("address")), p(client.get("email")), p(client.get("phone"))]
    vehicle_info = [p("VIATURA", bold), p(vehicle.get("license_plate")),
                    p(f"{vehicle.get('make', '')} {vehicle.get('model', '')}"), p(f"VIN: {vehicle.get('vin') or '—'}")]
    info = Table([[client_info, vehicle_info]], colWidths=[width * .56, width * .44])
    info.setStyle(TableStyle([("BACKGROUND", (0, 0), (-1, -1), PALE), ("VALIGN", (0, 0), (-1, -1), "TOP"),
                             ("TOPPADDING", (0, 0), (-1, -1), 12), ("BOTTOMPADDING", (0, 0), (-1, -1), 12)]))
    story.extend([info, Spacer(1, 20)])
    for category, label in (("peca", "Peças"), ("mao_de_obra", "Mão de obra")):
        items = [item for item in snapshot["items"] if item["item_type"] == category]
        story.append(p(label, bold))
        if not items:
            story.extend([p("Sem linhas nesta categoria."), Spacer(1, 12)])
            continue
        rows = [[p(x, bold) for x in ["Descrição", "Qtd.", "Preço unit.", "IVA", "Total s/ IVA"]]]
        for item in items:
            rows.append([p(item["description"]), p(f"{item['quantity']:g}", right), p(euro(item["unit_price"]), right),
                         p(f"{item.get('vat_rate', 23):g}%", right), p(euro(item["quantity"] * item["unit_price"]), right)])
        table = Table(rows, colWidths=[width - 245, 35, 78, 40, 92], repeatRows=1, hAlign="LEFT")
        table.setStyle(TableStyle([("BACKGROUND", (0, 0), (-1, 0), PALE), ("VALIGN", (0, 0), (-1, -1), "TOP"),
                                  ("LINEBELOW", (0, 0), (-1, -1), .4, colors.HexColor("#E5E7EB")),
                                  ("TOPPADDING", (0, 0), (-1, -1), 8), ("BOTTOMPADDING", (0, 0), (-1, -1), 8)]))
        story.extend([table, Spacer(1, 16)])
    totals = Table([[p(label, bold), p(euro(invoice[key]), right)] for label, key in
                    [("Peças (s/ IVA)", "total_parts"), ("Mão de obra (s/ IVA)", "total_labor"),
                     ("Subtotal", "subtotal"), ("IVA", "vat"), ("TOTAL", "grand_total")]], colWidths=[width - 120, 120])
    totals.setStyle(TableStyle([("BACKGROUND", (0, -1), (-1, -1), PALE), ("TOPPADDING", (0, 0), (-1, -1), 6)]))
    story.extend([totals, Spacer(1, 18)])
    if snapshot.get("notes"):
        story.extend([p("Observações", bold), p(snapshot["notes"])])

    def footer(canvas, document):
        canvas.saveState()
        canvas.setFont("RoadMesh", 8)
        canvas.setFillColor(MUTED)
        canvas.drawString(40, 30, "RoadMesh · Documento interno sem validade fiscal")
        canvas.drawRightString(A4[0] - 40, 30, f"Página {document.page}")
        canvas.restoreState()

    doc.build(story, onFirstPage=footer, onLaterPages=footer)
    return output.getvalue()