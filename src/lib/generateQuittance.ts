import jsPDF from "jspdf";

export interface QuittanceData {
  quittanceNumber?: string;
  agentName?: string;
  tenantName: string;
  tenantPhone: string;
  tenantEmail: string;
  unitName: string;
  propertyName: string;
  propertyAddress: string;
  amount: number;
  paidAmount: number;
  dueDate: string;
  month: string;
  paymentDate?: string;
  paymentMethod?: string;
  organizationName?: string;
  organizationAddress?: string;
  organizationPhone?: string;
  organizationEmail?: string;
  organizationLogoUrl?: string;
  rentPaymentId?: string;
  organizationId?: string;
}

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

// Brand colors (green)
const BRAND: [number, number, number] = [15, 82, 55];
const BRAND_LIGHT: [number, number, number] = [220, 235, 226];
const BRAND_SOFT: [number, number, number] = [240, 248, 244];

async function buildQuittancePDF(data: QuittanceData): Promise<jsPDF> {
  const doc = new jsPDF();
  const today = new Date().toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" });
  const dueDateFormatted = new Date(data.dueDate).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
  const paymentDateFormatted = data.paymentDate
    ? new Date(data.paymentDate).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })
    : today;

  const pageWidth = 210;
  const marginLeft = 15;
  const contentWidth = pageWidth - marginLeft * 2;

  // ============== HEADER BLOCK (colored background like the reference) ==============
  const headerHeight = 70;
  doc.setFillColor(...BRAND_SOFT);
  doc.rect(0, 0, pageWidth, headerHeight, "F");

  // Decorative diagonal accent
  doc.setFillColor(...BRAND_LIGHT);
  doc.triangle(pageWidth - 70, 0, pageWidth, 0, pageWidth, 70, "F");

  // === Title "QUITTANCE" left ===
  doc.setFont("helvetica", "bold");
  doc.setFontSize(28);
  doc.setTextColor(...BRAND);
  doc.text("QUITTANCE", marginLeft, 25);

  // Logo + agency under title (like "YOUR RENT AGENTS")
  let logoBottom = 32;
  if (data.organizationLogoUrl) {
    const logoDataUrl = await loadImageAsDataUrl(data.organizationLogoUrl);
    if (logoDataUrl) {
      try {
        doc.addImage(logoDataUrl, "PNG", marginLeft, 38, 12, 12);
        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(...BRAND);
        doc.text((data.organizationName || "AGENCE").toUpperCase(), marginLeft + 16, 44);
        doc.setFontSize(7.5);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(80);
        doc.text("GESTION LOCATIVE", marginLeft + 16, 49);
        logoBottom = 55;
      } catch {
        // ignore
      }
    }
  } else {
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...BRAND);
    doc.text((data.organizationName || "AGENCE").toUpperCase(), marginLeft, 44);
    doc.setFontSize(7.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(80);
    doc.text("GESTION LOCATIVE", marginLeft, 49);
    logoBottom = 55;
  }

  // === Right side header: 4-column info grid (Bill from / Bill to / Info / Payment) ===
  const colTop = 22;
  const col1X = 78;  // Bailleur
  const col2X = 122; // Locataire
  const col3X = 166; // Info

  // Headers
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(...BRAND);
  doc.text("BAILLEUR", col1X, colTop);
  doc.text("LOCATAIRE", col2X, colTop);
  doc.text("QUITTANCE", col3X, colTop);

  // Bailleur block
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(40);
  let by = colTop + 5;
  const orgName = data.organizationName || "Agence";
  const orgNameLines = doc.splitTextToSize(orgName, 40);
  doc.text(orgNameLines, col1X, by);
  by += orgNameLines.length * 3.5;
  if (data.organizationAddress) {
    const addrLines = doc.splitTextToSize(data.organizationAddress, 40);
    doc.text(addrLines, col1X, by);
    by += addrLines.length * 3.5;
  }
  if (data.organizationPhone) { doc.text(data.organizationPhone, col1X, by); by += 3.5; }
  if (data.organizationEmail) {
    const emailLines = doc.splitTextToSize(data.organizationEmail, 40);
    doc.text(emailLines, col1X, by);
  }

  // Locataire block
  let ty = colTop + 5;
  const tenantNameLines = doc.splitTextToSize(data.tenantName, 40);
  doc.text(tenantNameLines, col2X, ty);
  ty += tenantNameLines.length * 3.5;
  const logementLines = doc.splitTextToSize(`${data.unitName} — ${data.propertyName}`, 40);
  doc.text(logementLines, col2X, ty);
  ty += logementLines.length * 3.5;
  if (data.propertyAddress) {
    const addrLines = doc.splitTextToSize(data.propertyAddress, 40);
    doc.text(addrLines, col2X, ty);
    ty += addrLines.length * 3.5;
  }
  if (data.tenantPhone) { doc.text(data.tenantPhone, col2X, ty); ty += 3.5; }

  // Info / Quittance block
  let iy = colTop + 5;
  doc.text(`Date : ${today}`, col3X, iy); iy += 3.5;
  if (data.quittanceNumber) {
    doc.text(`N° : ${data.quittanceNumber}`, col3X, iy); iy += 3.5;
  }
  doc.text(`Période :`, col3X, iy); iy += 3.5;
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...BRAND);
  const periodLines = doc.splitTextToSize(data.month, 38);
  doc.text(periodLines, col3X, iy);

  // ============== BODY ==============
  let y = headerHeight + 18;

  // Section title "DÉTAILS DU PAIEMENT" (like Description bar)
  doc.setFillColor(...BRAND_LIGHT);
  doc.rect(marginLeft, y - 6, contentWidth, 9, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(...BRAND);
  doc.text("DÉTAILS DU PAIEMENT", marginLeft + 4, y);
  doc.text("MONTANT", pageWidth - marginLeft - 4, y, { align: "right" });
  y += 10;

  // Rows
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(40);

  const drawRow = (label: string, value: string, bold = false) => {
    doc.setDrawColor(230);
    doc.setLineWidth(0.2);
    doc.line(marginLeft + 2, y + 3, pageWidth - marginLeft - 2, y + 3);
    if (bold) doc.setFont("helvetica", "bold"); else doc.setFont("helvetica", "normal");
    doc.text(label, marginLeft + 4, y);
    doc.text(value, pageWidth - marginLeft - 4, y, { align: "right" });
    y += 8;
  };

  drawRow("Loyer mensuel", `${formatNumber(data.amount)} FCFA`);
  drawRow("Échéance", dueDateFormatted);
  if (data.paymentDate) drawRow("Date de paiement", paymentDateFormatted);
  if (data.paymentMethod) drawRow("Mode de paiement", data.paymentMethod);

  y += 4;

  // === Total box (right aligned, like Subtotal/Total in reference) ===
  const totalBoxWidth = 80;
  const totalBoxX = pageWidth - marginLeft - totalBoxWidth;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(80);
  doc.text("Loyer dû", totalBoxX + 4, y);
  doc.text(`${formatNumber(data.amount)} FCFA`, pageWidth - marginLeft - 4, y, { align: "right" });
  y += 7;

  // Highlighted total
  doc.setFillColor(...BRAND_LIGHT);
  doc.rect(totalBoxX, y - 5, totalBoxWidth, 10, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...BRAND);
  doc.text("Montant réglé", totalBoxX + 4, y + 1.5);
  doc.text(`${formatNumber(data.paidAmount)} FCFA`, pageWidth - marginLeft - 4, y + 1.5, { align: "right" });
  y += 18;

  // ============== "Je soussigné" paragraph ==============
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(40);
  const signataire = data.agentName || data.organizationName || "l'agence immobilière";
  const confirmParagraph = `Je soussigné(e), ${signataire}, représentant(e) de ${data.organizationName || "l'agence immobilière"}, reconnais avoir reçu de ${data.tenantName} la somme de ${formatNumber(data.paidAmount)} FCFA au titre du loyer du mois de ${data.month}, et lui en donne quittance, sous réserve de tous droits.`;
  const wrappedLines = doc.splitTextToSize(confirmParagraph, contentWidth);
  doc.text(wrappedLines, marginLeft, y);
  y += wrappedLines.length * 5 + 12;

  // ============== Signature block ==============
  // Stylized signature line (like the reference)
  doc.setDrawColor(...BRAND);
  doc.setLineWidth(0.5);
  doc.line(marginLeft, y, marginLeft + 50, y);
  y += 5;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...BRAND);
  doc.text(data.agentName || data.organizationName || "La Direction", marginLeft, y);
  y += 4;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(100);
  doc.text("Le bailleur", marginLeft, y);

  // ============== Footer (payment terms style) ==============
  const footerY = 275;
  doc.setDrawColor(...BRAND_LIGHT);
  doc.setLineWidth(0.3);
  doc.line(marginLeft, footerY - 6, pageWidth - marginLeft, footerY - 6);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(...BRAND);
  doc.text("Conditions :", marginLeft, footerY);
  doc.setFont("helvetica", "italic");
  doc.setTextColor(110);
  const termsText = "Cette quittance annule tous les reçus qui auraient pu être établis précédemment et atteste du règlement effectif du loyer pour la période indiquée.";
  const termsLines = doc.splitTextToSize(termsText, contentWidth - 22);
  doc.text(termsLines, marginLeft + 22, footerY);

  // Bottom accent bar
  doc.setFillColor(...BRAND);
  doc.rect(0, 293, pageWidth, 4, "F");

  return doc;
}

export async function downloadQuittance(data: QuittanceData) {
  const doc = await buildQuittancePDF(data);
  doc.save(`quittance-${data.quittanceNumber || data.month}-${data.tenantName.replace(/\s+/g, "-").toLowerCase()}.pdf`);
}

export async function getQuittanceBlob(data: QuittanceData): Promise<Blob> {
  const doc = await buildQuittancePDF(data);
  return doc.output("blob");
}

export async function getQuittanceDataUrl(data: QuittanceData): Promise<string> {
  const doc = await buildQuittancePDF(data);
  return doc.output("datauristring");
}
