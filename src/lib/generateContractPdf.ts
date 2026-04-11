import jsPDF from "jspdf";

interface ContractPdfOptions {
  content: string;
  contractId: string;
  agencyName?: string;
  tenantName?: string;
}

export function generateContractPdf({ content, contractId, agencyName, tenantName }: ContractPdfOptions) {
  const doc = new jsPDF();
  const marginLeft = 20;
  const marginRight = 20;
  const contentWidth = 210 - marginLeft - marginRight;
  const pageHeight = 297;
  const marginTop = 25;
  const marginBottom = 25;
  let y = marginTop;

  function addHeader(pageNum: number) {
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(150);
    if (agencyName) {
      doc.text(agencyName, marginLeft, 12);
    }
    doc.text(`Page ${pageNum}`, 210 - marginRight, 12, { align: "right" });
    doc.setDrawColor(220);
    doc.line(marginLeft, 15, 210 - marginRight, 15);
    doc.setTextColor(0);
  }

  function addFooter(pageNum: number) {
    doc.setFontSize(7);
    doc.setFont("helvetica", "italic");
    doc.setTextColor(150);
    doc.setDrawColor(220);
    doc.line(marginLeft, pageHeight - 18, 210 - marginRight, pageHeight - 18);
    const date = new Date().toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
    doc.text(`Document généré le ${date}`, marginLeft, pageHeight - 12);
    if (tenantName) {
      doc.text(`Locataire : ${tenantName}`, 210 - marginRight, pageHeight - 12, { align: "right" });
    }
    doc.setTextColor(0);
  }

  let pageNum = 1;
  addHeader(pageNum);

  function checkPageBreak(needed: number) {
    if (y + needed > pageHeight - marginBottom) {
      addFooter(pageNum);
      doc.addPage();
      pageNum++;
      y = marginTop;
      addHeader(pageNum);
    }
  }

  // Parse HTML content
  const tempDiv = document.createElement("div");
  tempDiv.innerHTML = content;

  const elements = tempDiv.querySelectorAll("h1, h2, h3, p, li, hr, br");
  elements.forEach((el) => {
    const tag = el.tagName.toLowerCase();
    const text = el.textContent?.trim() || "";

    if (tag === "hr") {
      checkPageBreak(8);
      doc.setDrawColor(180);
      doc.line(marginLeft, y, marginLeft + contentWidth, y);
      y += 8;
    } else if (tag === "br") {
      y += 4;
    } else if (tag === "h1") {
      checkPageBreak(14);
      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      const lines = doc.splitTextToSize(text, contentWidth);
      doc.text(lines, 105, y, { align: "center" });
      y += lines.length * 8 + 6;
    } else if (tag === "h2") {
      checkPageBreak(12);
      y += 4;
      doc.setFontSize(13);
      doc.setFont("helvetica", "bold");
      const lines = doc.splitTextToSize(text, contentWidth);
      doc.text(lines, marginLeft, y);
      y += lines.length * 6.5 + 4;
      doc.setDrawColor(200);
      doc.line(marginLeft, y - 2, marginLeft + 40, y - 2);
    } else if (tag === "h3") {
      checkPageBreak(10);
      y += 2;
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      const lines = doc.splitTextToSize(text, contentWidth);
      doc.text(lines, marginLeft, y);
      y += lines.length * 5.5 + 3;
    } else if (tag === "li") {
      if (!text) return;
      checkPageBreak(8);
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      const lines = doc.splitTextToSize(text, contentWidth - 8);
      doc.text("•", marginLeft + 2, y);
      doc.text(lines, marginLeft + 8, y);
      y += lines.length * 5 + 2;
    } else if (text) {
      checkPageBreak(8);
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");

      // Handle bold segments within paragraph
      const hasStrong = el.querySelector("strong");
      if (hasStrong && el.childNodes.length > 0) {
        // Simple approach: render full text, bold parts won't be styled individually in jsPDF basic
        // But we can detect if entire text is bold
        const strongText = Array.from(el.querySelectorAll("strong")).map(s => s.textContent).join("");
        if (strongText === text) {
          doc.setFont("helvetica", "bold");
        }
      }

      const lines = doc.splitTextToSize(text, contentWidth);
      doc.text(lines, marginLeft, y);
      y += lines.length * 5 + 3;
      doc.setFont("helvetica", "normal");
    }
  });

  addFooter(pageNum);
  doc.save(`contrat-${contractId.slice(0, 8)}.pdf`);
}
