import { jsPDF } from "jspdf";
import type { Proposal } from "../types/proposal";
import { formatSystemNumber } from "./currencyHelper";

function buildProposalPdf(prop: Proposal, lang: string): jsPDF {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const isTR = lang === "TR";
  const safeStr = (txt: string) => {
    if (!txt) return "";
    return txt
      .replace(/ğ/g, "g").replace(/Ğ/g, "G")
      .replace(/ü/g, "u").replace(/Ü/g, "U")
      .replace(/ş/g, "s").replace(/Ş/g, "S")
      .replace(/ı/g, "i").replace(/İ/g, "I")
      .replace(/ö/g, "o").replace(/Ö/g, "O")
      .replace(/ç/g, "c").replace(/Ç/g, "C");
  };

  const primaryColor = [15, 23, 42];
  const accentColor = [16, 185, 129];
  const textDark = [30, 41, 59];
  const textLight = [100, 116, 139];
  const bgLight = [248, 250, 252];
  const marginX = 15;
  let y = 15;

  doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.rect(0, 0, 210, 12, "F");

  y = 24;
  doc.setFont("Helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(accentColor[0], accentColor[1], accentColor[2]);
  doc.text("GEMBA PARTNER", marginX, y);

  doc.setFont("Helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(textLight[0], textLight[1], textLight[2]);
  doc.text(
    safeStr(
      isTR
        ? "Yalin Operasyonlar & Stratejik Yonetim Danismanligi"
        : "Lean Operations & Strategic Management Consultancy"
    ),
    marginX,
    y + 5
  );

  doc.setFont("Helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text(`${isTR ? "TARIH" : "DATE"}: ${prop.date}`, 195, y, { align: "right" });
  doc.setFont("Helvetica", "normal");
  doc.text(`REF: PROP-${prop.proposalNumber}`, 195, y + 4, { align: "right" });
  doc.text(`${isTR ? "SURUM" : "VERSION"}: ${prop.currentVersion}`, 195, y + 8, { align: "right" });

  doc.setDrawColor(226, 232, 240);
  doc.line(marginX, y + 11, 195, y + 11);

  y = y + 20;
  doc.setFillColor(bgLight[0], bgLight[1], bgLight[2]);
  doc.rect(marginX, y, 180, 24, "F");
  doc.setDrawColor(241, 245, 249);
  doc.rect(marginX, y, 180, 24, "S");

  doc.setFont("Helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text(safeStr(prop.proposalSubject.toUpperCase()), marginX + 5, y + 8);

  doc.setFont("Helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(textLight[0], textLight[1], textLight[2]);
  doc.text(
    safeStr(
      `${isTR ? "Musteri" : "Client"}: ${prop.companyName}  |  ${isTR ? "Ilgili Kisi" : "Attn"}: ${prop.contactPerson}`
    ),
    marginX + 5,
    y + 15
  );
  doc.text(
    safeStr(
      `${isTR ? "Sorumlu Danisman" : "Partner"}: ${prop.owner}  |  ${isTR ? "Durum" : "Status"}: ${prop.status}`
    ),
    marginX + 5,
    y + 20
  );

  y = y + 34;
  doc.setFont("Helvetica", "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text(safeStr(isTR ? "1. YALIN DONUSUM HEDEFLERI & OZET" : "1. OPERATIONAL FOCUS STATEMENT"), marginX, y);
  doc.setFillColor(accentColor[0], accentColor[1], accentColor[2]);
  doc.rect(marginX, y + 3, 1.5, 15, "F");

  doc.setFont("Helvetica", "italic");
  doc.setFontSize(8.5);
  doc.setTextColor(textDark[0], textDark[1], textDark[2]);
  const descText =
    prop.description ||
    (isTR
      ? "Musteri sahasindaki israflarin tespiti, VSM analizi ve deger akisi optimizasyonu surec tasarimi."
      : "Continuous improvement workshop focused on shopfloor wastes reduction.");
  const splitDesc = doc.splitTextToSize(safeStr(descText), 172);
  doc.text(splitDesc, marginX + 4, y + 7);
  y = y + 7 + splitDesc.length * 4.5 + 5;

  doc.setFont("Helvetica", "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text(safeStr(isTR ? "2. TEKLIF KAPSAMINDAKİ YALIN HIZMETLER" : "2. PROPOSAL CORE PILLARS & SERVICES"), marginX, y);
  doc.setFont("Helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(textDark[0], textDark[1], textDark[2]);
  y = y + 4;

  const servicesList = prop.services || [];
  if (servicesList.length === 0) {
    doc.text("- Standard Gemba Operational Review & Audit Services", marginX + 4, y);
    y += 5;
  } else {
    servicesList.forEach((service) => {
      doc.text(`[x] ${safeStr(service)}`, marginX + 4, y);
      y += 4.5;
    });
  }

  y = y + 4;
  doc.setFont("Helvetica", "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text(safeStr(isTR ? "3. BUTCE VE SECENEK DETAYLARI" : "3. PRICING PACKAGES DETAILS"), marginX, y);
  y = y + 4;

  doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.rect(marginX, y, 180, 7, "F");
  doc.setFont("Helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(255, 255, 255);
  doc.text(safeStr(isTR ? "Paket Secenegi" : "Package Option"), marginX + 3, y + 4.5);
  doc.text(safeStr(isTR ? "Sure (Adam-Gun)" : "Duration"), marginX + 45, y + 4.5);
  doc.text(safeStr(isTR ? "Birim Gun Ucreti" : "Daily Rate"), marginX + 85, y + 4.5);
  doc.text(safeStr(isTR ? "Masraf Odenegi" : "Expenses"), marginX + 125, y + 4.5);
  doc.text(safeStr(isTR ? "Toplam Tutar" : "Est. Total"), marginX + 155, y + 4.5);

  y = y + 7;
  doc.setFont("Helvetica", "normal");
  doc.setTextColor(textDark[0], textDark[1], textDark[2]);

  const optionsList = Object.entries(prop.options || {});
  if (optionsList.length === 0) {
    doc.rect(marginX, y, 180, 8, "S");
    doc.text(safeStr(isTR ? "Standart Paket Detaylari" : "Standard Package Details"), marginX + 3, y + 5.5);
    doc.text("-", marginX + 45, y + 5.5);
    doc.text("-", marginX + 85, y + 5.5);
    doc.text("-", marginX + 125, y + 5.5);
    doc.text(`${prop.currency} ${formatSystemNumber(prop.totalBudget)}`, marginX + 155, y + 5.5);
    y = y + 8;
  } else {
    optionsList.forEach(([key, opt], idx) => {
      if (idx % 2 === 1) {
        doc.setFillColor(bgLight[0], bgLight[1], bgLight[2]);
        doc.rect(marginX, y, 180, 7.5, "F");
      }
      doc.setDrawColor(241, 245, 249);
      doc.rect(marginX, y, 180, 7.5, "S");
      const optCost = opt.manDays * opt.dailyRate + opt.expenses;
      doc.setFont("Helvetica", "bold");
      doc.text(safeStr(key), marginX + 3, y + 5);
      doc.setFont("Helvetica", "normal");
      doc.text(`${opt.manDays} ${isTR ? "Gun" : "Days"}`, marginX + 45, y + 5);
      doc.text(`${prop.currency} ${formatSystemNumber(opt.dailyRate)}`, marginX + 85, y + 5);
      doc.text(`${prop.currency} ${formatSystemNumber(opt.expenses)}`, marginX + 125, y + 5);
      doc.setFont("Helvetica", "bold");
      doc.text(`${prop.currency} ${formatSystemNumber(optCost)}`, marginX + 155, y + 5);
      y = y + 7.5;
    });
  }

  y = y + 3;
  doc.setFillColor(bgLight[0], bgLight[1], bgLight[2]);
  doc.rect(marginX + 100, y, 80, 20, "F");
  doc.setDrawColor(226, 232, 240);
  doc.rect(marginX + 100, y, 80, 20, "S");
  doc.setFont("Helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(textLight[0], textLight[1], textLight[2]);
  doc.text(`${isTR ? "Ara Toplam" : "Subtotal Net"}:`, marginX + 103, y + 5.5);
  doc.text(`${prop.currency} ${formatSystemNumber(prop.totalBudget)}`, marginX + 175, y + 5.5, { align: "right" });
  doc.text(`${isTR ? "KDV (%20)" : "VAT Surcharge (20%)"}:`, marginX + 103, y + 10.5);
  doc.text(`${prop.currency} ${formatSystemNumber(prop.taxes)}`, marginX + 175, y + 10.5, { align: "right" });
  doc.setFont("Helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(accentColor[0], accentColor[1], accentColor[2]);
  doc.text(`${isTR ? "GENEL TOPLAM" : "GRAND TOTAL OFFER"}:`, marginX + 103, y + 16);
  doc.text(`${prop.currency} ${formatSystemNumber(prop.grandTotal)}`, marginX + 175, y + 16, { align: "right" });

  y = y + 26;
  doc.setFont("Helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text(safeStr(isTR ? "KABUL VE RESMI ONAY PROTOKOLU:" : "AUTHORIZATION & BASELINE AGREEMENT:"), marginX, y);
  doc.setFont("Helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(textLight[0], textLight[1], textLight[2]);
  doc.text(
    safeStr(
      isTR
        ? "Isbu teklif belgesi, kagit uzerinde mutabik kalinan hizmet kalemlerini ve butceleri dogrular."
        : "This electronic baseline document confirms mutual agreement on lean services scope and financial parameters."
    ),
    marginX,
    y + 3.5
  );

  y = y + 16;
  doc.setDrawColor(203, 213, 225);
  doc.line(marginX, y, marginX + 65, y);
  doc.line(marginX + 115, y, marginX + 180, y);
  doc.setFont("Helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text(safeStr(isTR ? "Gemba Partner Sorumlu Danismani" : "Authorized Gemba Partner Representative"), marginX, y + 4);
  doc.text(
    safeStr(isTR ? `${prop.companyName} Yetkili Temsilcisi` : `Authorized ${prop.companyName} Representative`),
    marginX + 115,
    y + 4
  );

  doc.setFont("Helvetica", "italic");
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  doc.text("Strictly Confidential - Generated Electronically via B2B CRM Suite", 105, 285, { align: "center" });

  return doc;
}

export function generateProposalPdfBlob(prop: Proposal, lang: string): Blob {
  return buildProposalPdf(prop, lang).output("blob");
}

export function generateProposalPdfBlobUrl(prop: Proposal, lang: string): string {
  try {
    const out = buildProposalPdf(prop, lang).output("bloburl");
    return typeof out === "string" ? out : String(out);
  } catch (err) {
    console.error("PDF generation error:", err);
    return "";
  }
}

// Returns just the base64 payload (no "data:application/pdf;filename=...;base64,"
// prefix) so it can be sent straight to Microsoft Graph as a fileAttachment's
// contentBytes — used to actually attach a real PDF to outbound proposal
// e-mails instead of only offering a manual local download.
export function generateProposalPdfBase64(prop: Proposal, lang: string): string {
  const dataUri = buildProposalPdf(prop, lang).output("datauristring");
  const commaIdx = dataUri.indexOf(",");
  return commaIdx === -1 ? dataUri : dataUri.slice(commaIdx + 1);
}
