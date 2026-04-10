import jsPDF from "jspdf";

export interface ContratBailData {
  // Bailleur
  organizationName: string;
  organizationAddress?: string;
  organizationPhone?: string;
  organizationEmail?: string;
  legalName?: string;
  legalId?: string;
  legalAddress?: string;
  // Locataire
  tenantName: string;
  tenantPhone: string;
  tenantEmail?: string;
  tenantIdNumber?: string;
  tenantType: string;
  companyName?: string;
  contactPerson?: string;
  rccm?: string;
  // Bien
  propertyName: string;
  propertyAddress: string;
  cityName: string;
  unitName: string;
  // Bail
  leaseStart: string;
  leaseDuration: number;
  rent: number;
  deposit: number;
  rentDueDay: number;
  // Options
  lateFeeEnabled?: boolean;
  lateFeeType?: string;
  lateFeeValue?: number;
  lateFeeGraceDays?: number;
}

const formatNumber = (num: number) =>
  num.toLocaleString("fr-FR").replace(/[\u00A0\u202F\u2009]/g, " ");

const formatDate = (d: string) =>
  new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });

function addWrappedText(doc: jsPDF, text: string, x: number, y: number, maxWidth: number, lineHeight: number): number {
  const lines = doc.splitTextToSize(text, maxWidth);
  doc.text(lines, x, y);
  return y + lines.length * lineHeight;
}

function buildContratBailPDF(data: ContratBailData): jsPDF {
  const doc = new jsPDF();
  const marginLeft = 20;
  const marginRight = 20;
  const pageWidth = 210;
  const contentWidth = pageWidth - marginLeft - marginRight;
  const lineHeight = 5;
  let y = 20;

  const leaseEnd = new Date(data.leaseStart);
  leaseEnd.setMonth(leaseEnd.getMonth() + data.leaseDuration);
  const today = new Date().toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });

  // --- HEADER ---
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text(data.organizationName, marginLeft, y);
  y += 5;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(100);
  if (data.organizationAddress) { doc.text(data.organizationAddress, marginLeft, y); y += 4; }
  if (data.organizationPhone) { doc.text(`Tel : ${data.organizationPhone}`, marginLeft, y); y += 4; }
  doc.setTextColor(0);
  y += 4;

  // --- TITLE ---
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("CONTRAT DE BAIL", pageWidth / 2, y, { align: "center" });
  y += 4;
  doc.setDrawColor(0, 100, 60);
  doc.setLineWidth(0.8);
  doc.line(marginLeft + 30, y, pageWidth - marginLeft - 30, y);
  doc.setTextColor(0);
  y += 10;

  // --- ENTRE LES SOUSSIGNES ---
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("ENTRE LES SOUSSIGNES", marginLeft, y);
  y += 8;

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");

  const bailleurName = data.legalName || data.organizationName;
  let bailleurText = `Le bailleur : ${bailleurName}`;
  if (data.legalId) bailleurText += `, immatriculee sous le numero ${data.legalId}`;
  if (data.legalAddress || data.organizationAddress) bailleurText += `, sise a ${data.legalAddress || data.organizationAddress}`;
  bailleurText += `, ci-apres denomme "LE BAILLEUR",`;
  y = addWrappedText(doc, bailleurText, marginLeft, y, contentWidth, lineHeight);
  y += 4;

  doc.setFont("helvetica", "bold");
  doc.text("ET", marginLeft, y);
  y += 6;
  doc.setFont("helvetica", "normal");

  let locataireText = "";
  if (data.tenantType === "company") {
    locataireText = `La societe ${data.companyName || data.tenantName}`;
    if (data.rccm) locataireText += `, RCCM : ${data.rccm}`;
    if (data.contactPerson) locataireText += `, representee par ${data.contactPerson}`;
  } else {
    locataireText = `${data.tenantName}`;
    if (data.tenantIdNumber) locataireText += `, piece d'identite N° ${data.tenantIdNumber}`;
  }
  locataireText += `, telephone : ${data.tenantPhone}`;
  if (data.tenantEmail) locataireText += `, email : ${data.tenantEmail}`;
  locataireText += `, ci-apres denomme "LE LOCATAIRE",`;
  y = addWrappedText(doc, locataireText, marginLeft, y, contentWidth, lineHeight);
  y += 6;

  y = addWrappedText(doc, "IL A ETE CONVENU ET ARRETE CE QUI SUIT :", marginLeft, y, contentWidth, lineHeight);
  y += 8;

  // --- ARTICLES ---
  const addArticle = (title: string, content: string) => {
    if (y > 260) { doc.addPage(); y = 20; }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text(title, marginLeft, y);
    y += 6;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    y = addWrappedText(doc, content, marginLeft, y, contentWidth, lineHeight);
    y += 6;
  };

  // Article 1 - Objet
  addArticle("Article 1 — Objet du bail",
    `Le bailleur donne en location au locataire le bien designe : ${data.unitName}, situe dans l'immeuble/la propriete "${data.propertyName}", sis a ${data.propertyAddress}, ${data.cityName}. Le bien est loue a usage d'habitation (ou professionnel selon accord).`
  );

  // Article 2 - Duree
  addArticle("Article 2 — Duree du bail",
    `Le present bail est consenti pour une duree de ${data.leaseDuration} mois, prenant effet le ${formatDate(data.leaseStart)} et se terminant le ${formatDate(leaseEnd.toISOString())}. A l'expiration de cette duree, le bail sera renouvele par tacite reconduction pour une duree identique, sauf conge donne par l'une des parties.`
  );

  // Article 3 - Loyer
  addArticle("Article 3 — Loyer",
    `Le loyer mensuel est fixe a la somme de ${formatNumber(data.rent)} FCFA (${numberToWordsFr(data.rent)}). Le loyer est payable d'avance le ${data.rentDueDay} de chaque mois, par tout moyen de paiement accepte par le bailleur.`
  );

  // Article 4 - Caution
  addArticle("Article 4 — Depot de garantie (caution)",
    `Le locataire verse au bailleur un depot de garantie de ${formatNumber(data.deposit)} FCFA (${numberToWordsFr(data.deposit)}). Ce depot sera restitue au locataire en fin de bail, deduction faite des sommes eventuellement dues au titre de loyers impayes, degradations ou charges.`
  );

  // Article 5 - Penalites
  if (data.lateFeeEnabled) {
    const penaltyDesc = data.lateFeeType === "percentage"
      ? `${data.lateFeeValue}% du loyer mensuel`
      : `${formatNumber(data.lateFeeValue || 0)} FCFA`;
    const graceText = data.lateFeeGraceDays
      ? `apres un delai de grace de ${data.lateFeeGraceDays} jour(s)`
      : "des le premier jour de retard";
    addArticle("Article 5 — Penalites de retard",
      `En cas de retard de paiement du loyer, une penalite de ${penaltyDesc} sera appliquee ${graceText}. Cette penalite sera due de plein droit, sans mise en demeure prealable.`
    );
  } else {
    addArticle("Article 5 — Penalites de retard",
      "En cas de retard de paiement du loyer, le bailleur se reserve le droit d'appliquer des penalites conformement a la reglementation en vigueur."
    );
  }

  // Article 6 - Obligations du locataire
  addArticle("Article 6 — Obligations du locataire",
    "Le locataire s'engage a : (a) payer le loyer et les charges aux termes convenus ; (b) user des lieux loues en bon pere de famille ; (c) ne pas sous-louer tout ou partie des lieux sans l'accord ecrit du bailleur ; (d) repondre des degradations et pertes survenues pendant la duree du bail ; (e) signaler au bailleur toute degradation ou sinistre dans les meilleurs delais."
  );

  // Article 7 - Obligations du bailleur
  addArticle("Article 7 — Obligations du bailleur",
    "Le bailleur s'engage a : (a) delivrer au locataire les lieux en bon etat d'usage ; (b) assurer au locataire une jouissance paisible des lieux ; (c) entretenir les lieux et effectuer les reparations necessaires a la structure du batiment ; (d) ne pas modifier la forme ou la destination des lieux loues."
  );

  // Article 8 - Resiliation
  addArticle("Article 8 — Resiliation",
    "Le present bail pourra etre resilie de plein droit et sans formalite judiciaire en cas de non-paiement du loyer ou des charges, un mois apres une mise en demeure restee infructueuse. En cas de depart volontaire, le locataire devra respecter un preavis minimum d'un mois, sauf accord contraire. Un etat des lieux de sortie sera dresse contradictoirement."
  );

  // Article 9 - Etat des lieux
  addArticle("Article 9 — Etat des lieux",
    "Un etat des lieux d'entree sera etabli contradictoirement lors de la remise des cles. Un etat des lieux de sortie sera dresse lors de la restitution des lieux. Toute difference entre les deux etats des lieux, hors usure normale, donnera lieu a une retenue sur le depot de garantie."
  );

  // Article 10 - Clauses finales
  addArticle("Article 10 — Litiges",
    "En cas de litige entre les parties, celles-ci s'engagent a rechercher une solution amiable. A defaut d'accord amiable, le litige sera soumis aux tribunaux competents."
  );

  // --- SIGNATURES ---
  if (y > 230) { doc.addPage(); y = 20; }
  y += 10;
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(`Fait a ${data.cityName}, le ${today}`, marginLeft, y);
  y += 5;
  doc.text("En deux exemplaires originaux.", marginLeft, y);
  y += 15;

  // Two columns
  doc.setFont("helvetica", "bold");
  doc.text("LE BAILLEUR", marginLeft, y);
  doc.text("LE LOCATAIRE", pageWidth - marginRight, y, { align: "right" });
  y += 6;
  doc.setFont("helvetica", "normal");
  doc.text(bailleurName, marginLeft, y);
  const locName = data.tenantType === "company" ? (data.companyName || data.tenantName) : data.tenantName;
  doc.text(locName, pageWidth - marginRight, y, { align: "right" });
  y += 5;
  doc.text("Signature :", marginLeft, y);
  doc.text("Signature :", pageWidth - marginRight - 30, y);

  // Footer on each page
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setFont("helvetica", "italic");
    doc.setTextColor(150);
    doc.text("Document genere automatiquement — SCI Binieba", pageWidth / 2, 287, { align: "center" });
    doc.text(`Page ${i}/${pageCount}`, pageWidth - marginRight, 287, { align: "right" });
    doc.setTextColor(0);
  }

  return doc;
}

function numberToWordsFr(n: number): string {
  if (n === 0) return "zero";
  const units = ["", "un", "deux", "trois", "quatre", "cinq", "six", "sept", "huit", "neuf",
    "dix", "onze", "douze", "treize", "quatorze", "quinze", "seize", "dix-sept", "dix-huit", "dix-neuf"];
  const tens = ["", "", "vingt", "trente", "quarante", "cinquante", "soixante", "soixante", "quatre-vingt", "quatre-vingt"];

  const convert = (num: number): string => {
    if (num === 0) return "";
    if (num < 20) return units[num];
    if (num < 100) {
      const t = Math.floor(num / 10);
      const u = num % 10;
      if (t === 7 || t === 9) return tens[t] + "-" + units[10 + u];
      if (u === 0) return tens[t] + (t === 8 ? "s" : "");
      if (u === 1 && t !== 8) return tens[t] + " et un";
      return tens[t] + "-" + units[u];
    }
    if (num < 1000) {
      const h = Math.floor(num / 100);
      const r = num % 100;
      const prefix = h === 1 ? "cent" : units[h] + " cent" + (r === 0 && h > 1 ? "s" : "");
      return r === 0 ? prefix : prefix + " " + convert(r);
    }
    if (num < 1000000) {
      const k = Math.floor(num / 1000);
      const r = num % 1000;
      const prefix = k === 1 ? "mille" : convert(k) + " mille";
      return r === 0 ? prefix : prefix + " " + convert(r);
    }
    const m = Math.floor(num / 1000000);
    const r = num % 1000000;
    const prefix = m === 1 ? "un million" : convert(m) + " millions";
    return r === 0 ? prefix : prefix + " " + convert(r);
  };

  return convert(Math.abs(Math.floor(n))) + " francs CFA";
}

export function downloadContratBail(data: ContratBailData) {
  const doc = buildContratBailPDF(data);
  const tenantSlug = data.tenantName.replace(/\s+/g, "-").toLowerCase();
  doc.save(`contrat-bail-${tenantSlug}.pdf`);
}

export function getContratBailBlob(data: ContratBailData): Blob {
  const doc = buildContratBailPDF(data);
  return doc.output("blob");
}
