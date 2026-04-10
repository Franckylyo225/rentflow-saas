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

const BRAND_COLOR: [number, number, number] = [30, 64, 175];

const formatNumber = (num: number) =>
  num.toLocaleString("fr-FR").replace(/[\u00A0\u202F\u2009]/g, " ");

async function loadImageAsDataUrl(url: string): Promise<string | null> {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

async function buildInvoicePDF(data: InvoiceData): Promise<jsPDF> {
  const doc = new jsPDF();
  const marginLeft = 20;
  const marginRight = 20;
  const pageWidth = 210;
  const contentWidth = pageWidth - marginLeft - marginRight;
  const currency = data.currency || "FCFA";

  // === Top accent bar ===
  doc.setFillColor(...BRAND_COLOR);
  doc.rect(0, 0, pageWidth, 4, "F");

  let y = 18;

  // === Logo ===
  let logoOffset = 0;
  if (data.organizationLogoUrl) {
    const logoDataUrl = await loadImageAsDataUrl(data.organizationLogoUrl);
    if (logoDataUrl) {
      try {
        doc.addImage(logoDataUrl, "PNG", marginLeft, y - 5, 18, 18);
        logoOffset = 22;
      } catch {
        // ignore if image format unsupported
      }
    }
  }

  // === Header: org info left, invoice info right ===
  doc.setFontSize(15);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...BRAND_COLOR);
  doc.text(data.organizationName, marginLeft + logoOffset, y);
  doc.setTextColor(0);

  // Invoice title right
  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...BRAND_COLOR);
  doc.text("FACTURE", pageWidth - marginRight, y, { align: "right" });
  doc.setTextColor(0);

  y += 7;
  doc.setFontSize(8.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100);
  if (data.organizationAddress) { doc.text(data.organizationAddress, marginLeft + logoOffset, y); y += 4; }
  if (data.organizationPhone) { doc.text(`Tél : ${data.organizationPhone}`, marginLeft + logoOffset, y); y += 4; }
  if (data.organizationEmail) { doc.text(data.organizationEmail, marginLeft + logoOffset, y); y += 4; }
  if (data.organizationLegalName) { doc.text(data.organizationLegalName, marginLeft + logoOffset, y); y += 4; }
  if (data.organizationLegalId) { doc.text(`RCCM : ${data.organizationLegalId}`, marginLeft + logoOffset, y); y += 4; }

  // Invoice meta right aligned
  const metaX = pageWidth - marginRight;
  let metaY = 30;
  doc.setFontSize(9);
  doc.setTextColor(80);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...BRAND_COLOR);
  doc.text(`N° ${data.invoiceNumber}`, metaX, metaY, { align: "right" });
  doc.setTextColor(80);
  metaY += 5;
  doc.setFont("helvetica", "normal");
  doc.text(`Date : ${formatDate(data.invoiceDate)}`, metaX, metaY, { align: "right" });
  metaY += 5;

  const statusLabel = data.status === "paid" ? "PAYÉE" : data.status === "partial" ? "PARTIELLE" : "EN ATTENTE";
  const statusColor: [number, number, number] = data.status === "paid" ? [22, 163, 74] : data.status === "partial" ? [234, 179, 8] : [239, 68, 68];
  doc.setTextColor(...statusColor);
  doc.setFont("helvetica", "bold");
  doc.text(statusLabel, metaX, metaY, { align: "right" });
  doc.setTextColor(0);

  y = Math.max(y, metaY) + 10;

  // === Separator ===
  doc.setDrawColor(200, 210, 230);
  doc.setLineWidth(0.4);
  doc.line(marginLeft, y, pageWidth - marginRight, y);
  y += 10;

  // === Client info box ===
  doc.setFillColor(245, 247, 252);
  doc.setDrawColor(210, 218, 235);
  doc.roundedRect(marginLeft, y - 4, contentWidth, 28, 3, 3, "FD");

  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...BRAND_COLOR);
  doc.text("FACTURÉ À", marginLeft + 6, y + 2);
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

  // === Items table ===
  // Header row
  doc.setFillColor(...BRAND_COLOR);
  doc.roundedRect(marginLeft, y, contentWidth, 9, 1.5, 1.5, "F");
  doc.setTextColor(255);
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.text("Description", marginLeft + 5, y + 6);
  doc.text("Qté", marginLeft + 100, y + 6, { align: "center" });
  doc.text("Prix unit.", marginLeft + 125, y + 6, { align: "center" });
  doc.text(`Total (${currency})`, pageWidth - marginRight - 5, y + 6, { align: "right" });
  y += 9;

  // Items
  doc.setTextColor(0);
  doc.setFont("helvetica", "normal");
  data.items.forEach((item, i) => {
    const bgColor = i % 2 === 0 ? 255 : 249;
    doc.setFillColor(bgColor, bgColor, bgColor);
    doc.rect(marginLeft, y, contentWidth, 8, "F");

    doc.setFontSize(9);
    const descLines = doc.splitTextToSize(item.description, 88);
    doc.text(descLines[0], marginLeft + 5, y + 5.5);
    doc.text(item.quantity.toString(), marginLeft + 100, y + 5.5, { align: "center" });
    doc.text(formatNumber(item.unitPrice), marginLeft + 125, y + 5.5, { align: "center" });
    doc.setFont("helvetica", "bold");
    doc.text(formatNumber(item.total), pageWidth - marginRight - 5, y + 5.5, { align: "right" });
    doc.setFont("helvetica", "normal");
    y += 8;
  });

  // Bottom line
  doc.setDrawColor(200, 210, 230);
  doc.line(marginLeft, y, pageWidth - marginRight, y);
  y += 8;

  // === Totals ===
  const totalsX = pageWidth - marginRight - 70;

  doc.setFontSize(9);
  doc.text("Sous-total :", totalsX, y);
  doc.text(`${formatNumber(data.subtotal)} ${currency}`, pageWidth - marginRight - 5, y, { align: "right" });
  y += 6;

  if (data.discount && data.discount > 0) {
    doc.setTextColor(22, 163, 74);
    doc.text("Remise :", totalsX, y);
    doc.text(`-${formatNumber(data.discount)} ${currency}`, pageWidth - marginRight - 5, y, { align: "right" });
    doc.setTextColor(0);
    y += 6;
  }

  // Total box
  doc.setFillColor(...BRAND_COLOR);
  doc.roundedRect(totalsX - 4, y - 4, 74 + 4, 12, 2, 2, "F");
  doc.setTextColor(255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("TOTAL", totalsX, y + 4);
  doc.text(`${formatNumber(data.total)} ${currency}`, pageWidth - marginRight - 5, y + 4, { align: "right" });
  doc.setTextColor(0);
  y += 20;

  // === Payment info ===
  if (data.paymentMethod || data.paymentDate) {
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...BRAND_COLOR);
    doc.text("INFORMATIONS DE PAIEMENT", marginLeft, y);
    doc.setTextColor(0);
    y += 6;
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    if (data.paymentMethod) { doc.text(`Mode : ${data.paymentMethod}`, marginLeft, y); y += 5; }
    if (data.paymentDate) { doc.text(`Date de paiement : ${formatDate(data.paymentDate)}`, marginLeft, y); y += 5; }
    y += 5;
  }

  // === Notes ===
  if (data.notes) {
    doc.setFontSize(8);
    doc.setTextColor(120);
    doc.setFont("helvetica", "italic");
    const noteLines = doc.splitTextToSize(data.notes, contentWidth);
    doc.text(noteLines, marginLeft, y);
    y += noteLines.length * 4 + 5;
  }

  // === Footer ===
  doc.setDrawColor(200, 210, 230);
  doc.setLineWidth(0.3);
  doc.line(marginLeft, 270, pageWidth - marginLeft, 270);
  doc.setFontSize(7);
  doc.setTextColor(160);
  doc.setFont("helvetica", "italic");
  doc.text("Document généré automatiquement — RentFlow", pageWidth / 2, 275, { align: "center" });

  // Bottom accent bar
  doc.setFillColor(...BRAND_COLOR);
  doc.rect(0, 293, pageWidth, 4, "F");

  return doc;
}

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
  } catch {
    return dateStr;
  }
}

export async function downloadInvoice(data: InvoiceData) {
  const doc = await buildInvoicePDF(data);
  doc.save(`facture-${data.invoiceNumber}.pdf`);
}

export async function getInvoiceBlob(data: InvoiceData): Promise<Blob> {
  const doc = await buildInvoicePDF(data);
  return doc.output("blob");
}

export async function getInvoiceDataUrl(data: InvoiceData): Promise<string> {
  const doc = await buildInvoicePDF(data);
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
