import jsPDF from "jspdf";

export interface InvoiceData {
  invoiceNumber: string;
  invoiceDate: string;
  // Organization (seller)
  organizationName: string;
  organizationAddress?: string;
  organizationPhone?: string;
  organizationEmail?: string;
  organizationLegalName?: string;
  organizationLegalId?: string;
  organizationLogoUrl?: string;
  // Client
  clientName: string;
  clientAddress?: string;
  clientPhone?: string;
  clientEmail?: string;
  // Line items
  items: {
    description: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }[];
  // Totals
  subtotal: number;
  discount?: number;
  total: number;
  currency?: string;
  // Payment info
  paymentMethod?: string;
  paymentDate?: string;
  status: "paid" | "pending" | "partial";
  // Notes
  notes?: string;
}

const formatNumber = (num: number) =>
  num.toLocaleString("fr-FR").replace(/[\u00A0\u202F\u2009]/g, " ");

function buildInvoicePDF(data: InvoiceData): jsPDF {
  const doc = new jsPDF();
  const marginLeft = 20;
  const marginRight = 20;
  const pageWidth = 210;
  const contentWidth = pageWidth - marginLeft - marginRight;
  const currency = data.currency || "FCFA";
  let y = 20;

  // --- Header: org info left, invoice info right ---
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(30, 64, 175);
  doc.text(data.organizationName, marginLeft, y);
  doc.setTextColor(0);

  // Invoice title right
  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.text("FACTURE", pageWidth - marginRight, y, { align: "right" });

  y += 7;
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100);
  if (data.organizationAddress) { doc.text(data.organizationAddress, marginLeft, y); y += 4; }
  if (data.organizationPhone) { doc.text(`Tel : ${data.organizationPhone}`, marginLeft, y); y += 4; }
  if (data.organizationEmail) { doc.text(data.organizationEmail, marginLeft, y); y += 4; }
  if (data.organizationLegalName) { doc.text(data.organizationLegalName, marginLeft, y); y += 4; }
  if (data.organizationLegalId) { doc.text(`RCCM : ${data.organizationLegalId}`, marginLeft, y); y += 4; }

  // Invoice meta right aligned
  const metaX = pageWidth - marginRight;
  let metaY = 30;
  doc.setFontSize(9);
  doc.setTextColor(80);
  doc.setFont("helvetica", "bold");
  doc.text(`N° ${data.invoiceNumber}`, metaX, metaY, { align: "right" });
  metaY += 5;
  doc.setFont("helvetica", "normal");
  doc.text(`Date : ${formatDate(data.invoiceDate)}`, metaX, metaY, { align: "right" });
  metaY += 5;

  const statusLabel = data.status === "paid" ? "PAYEE" : data.status === "partial" ? "PARTIELLE" : "EN ATTENTE";
  const statusColor = data.status === "paid" ? [22, 163, 74] : data.status === "partial" ? [234, 179, 8] : [239, 68, 68];
  doc.setTextColor(statusColor[0], statusColor[1], statusColor[2]);
  doc.setFont("helvetica", "bold");
  doc.text(statusLabel, metaX, metaY, { align: "right" });
  doc.setTextColor(0);

  y = Math.max(y, metaY) + 10;

  // Separator
  doc.setDrawColor(220);
  doc.setLineWidth(0.5);
  doc.line(marginLeft, y, pageWidth - marginRight, y);
  y += 10;

  // --- Client info ---
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(marginLeft, y - 4, contentWidth, 28, 2, 2, "FD");

  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(100);
  doc.text("FACTURE A", marginLeft + 6, y + 2);
  doc.setTextColor(0);

  doc.setFontSize(10);
  doc.text(data.clientName, marginLeft + 6, y + 9);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  let clientY = y + 14;
  if (data.clientAddress) { doc.text(data.clientAddress, marginLeft + 6, clientY); clientY += 4; }
  if (data.clientPhone) { doc.text(data.clientPhone, marginLeft + 6, clientY); clientY += 4; }
  if (data.clientEmail) { doc.text(data.clientEmail, marginLeft + 6, clientY); }

  y += 35;

  // --- Items table ---
  // Header row
  doc.setFillColor(30, 64, 175);
  doc.rect(marginLeft, y, contentWidth, 8, "F");
  doc.setTextColor(255);
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.text("Description", marginLeft + 4, y + 5.5);
  doc.text("Qte", marginLeft + 100, y + 5.5, { align: "center" });
  doc.text("Prix unit.", marginLeft + 125, y + 5.5, { align: "center" });
  doc.text(`Total (${currency})`, pageWidth - marginRight - 4, y + 5.5, { align: "right" });
  y += 8;

  // Items
  doc.setTextColor(0);
  doc.setFont("helvetica", "normal");
  data.items.forEach((item, i) => {
    const bgColor = i % 2 === 0 ? 255 : 249;
    doc.setFillColor(bgColor, bgColor, bgColor);
    doc.rect(marginLeft, y, contentWidth, 8, "F");

    doc.setFontSize(9);
    const descLines = doc.splitTextToSize(item.description, 90);
    doc.text(descLines[0], marginLeft + 4, y + 5.5);
    doc.text(item.quantity.toString(), marginLeft + 100, y + 5.5, { align: "center" });
    doc.text(formatNumber(item.unitPrice), marginLeft + 125, y + 5.5, { align: "center" });
    doc.setFont("helvetica", "bold");
    doc.text(formatNumber(item.total), pageWidth - marginRight - 4, y + 5.5, { align: "right" });
    doc.setFont("helvetica", "normal");
    y += 8;
  });

  // Bottom line
  doc.setDrawColor(220);
  doc.line(marginLeft, y, pageWidth - marginRight, y);
  y += 8;

  // --- Totals ---
  const totalsX = pageWidth - marginRight - 70;

  doc.setFontSize(9);
  doc.text("Sous-total :", totalsX, y);
  doc.text(`${formatNumber(data.subtotal)} ${currency}`, pageWidth - marginRight - 4, y, { align: "right" });
  y += 6;

  if (data.discount && data.discount > 0) {
    doc.setTextColor(22, 163, 74);
    doc.text("Remise :", totalsX, y);
    doc.text(`-${formatNumber(data.discount)} ${currency}`, pageWidth - marginRight - 4, y, { align: "right" });
    doc.setTextColor(0);
    y += 6;
  }

  // Total box
  doc.setFillColor(30, 64, 175);
  doc.roundedRect(totalsX - 4, y - 4, 74 + 4, 12, 2, 2, "F");
  doc.setTextColor(255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("TOTAL", totalsX, y + 4);
  doc.text(`${formatNumber(data.total)} ${currency}`, pageWidth - marginRight - 4, y + 4, { align: "right" });
  doc.setTextColor(0);
  y += 20;

  // --- Payment info ---
  if (data.paymentMethod || data.paymentDate) {
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text("Informations de paiement", marginLeft, y);
    y += 6;
    doc.setFont("helvetica", "normal");
    if (data.paymentMethod) { doc.text(`Mode : ${data.paymentMethod}`, marginLeft, y); y += 5; }
    if (data.paymentDate) { doc.text(`Date de paiement : ${formatDate(data.paymentDate)}`, marginLeft, y); y += 5; }
    y += 5;
  }

  // --- Notes ---
  if (data.notes) {
    doc.setFontSize(8);
    doc.setTextColor(120);
    doc.setFont("helvetica", "italic");
    const noteLines = doc.splitTextToSize(data.notes, contentWidth);
    doc.text(noteLines, marginLeft, y);
    y += noteLines.length * 4 + 5;
  }

  // --- Footer ---
  doc.setFontSize(7);
  doc.setTextColor(160);
  doc.setFont("helvetica", "italic");
  doc.text("Document genere automatiquement — SCI Binieba", pageWidth / 2, 285, { align: "center" });

  return doc;
}

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
  } catch {
    return dateStr;
  }
}

export function downloadInvoice(data: InvoiceData) {
  const doc = buildInvoicePDF(data);
  doc.save(`facture-${data.invoiceNumber}.pdf`);
}

export function getInvoiceBlob(data: InvoiceData): Blob {
  const doc = buildInvoicePDF(data);
  return doc.output("blob");
}

export function getInvoiceDataUrl(data: InvoiceData): string {
  const doc = buildInvoicePDF(data);
  return doc.output("datauristring");
}

// Helper to generate invoice number
export function generateInvoiceNumber(type: "rent" | "sub", id: string): string {
  const date = new Date();
  const prefix = type === "rent" ? "FAC-L" : "FAC-A";
  const dateStr = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, "0")}`;
  const shortId = id.slice(0, 6).toUpperCase();
  return `${prefix}-${dateStr}-${shortId}`;
}
