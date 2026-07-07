import { jsPDF } from "jspdf";
import { Campaign, MailboxSession } from "../types";

/**
 * Generates an elegant executive PDF report for a finished Mail Merge campaign
 */
export function generateCampaignReport(campaign: Campaign, session: MailboxSession | null): jsPDF {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4"
  });

  const primaryColor = [0, 120, 212]; // Microsoft theme blue
  const slateDark = [15, 23, 42];    // Slate colors
  const successGreen = [16, 185, 129];
  const dangerRed = [239, 68, 68];
  
  // PAGE SETUP: 210mm x 297mm (A4 size)
  let y = 15;

  // Header Banner
  doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.rect(0, 0, 210, 40, "F");

  // Title inside banner
  doc.setTextColor(255, 255, 255);
  doc.setFont("Helvetica", "bold");
  doc.setFontSize(22);
  doc.text("SMART MAIL MERGE FOR OUTLOOK", 15, 18);
  
  doc.setFont("Helvetica", "normal");
  doc.setFontSize(10);
  doc.text("Campaign Executive Performance & Audit Report", 15, 25);
  doc.text(`Generated on: ${new Date().toLocaleString()}`, 15, 31);

  // Body content starting offset from banner
  y = 52;

  // Metadata Card Block
  doc.setFillColor(248, 250, 252); // Off-white Card Background
  doc.rect(15, y, 180, 36, "F");
  doc.setDrawColor(226, 232, 240);
  doc.rect(15, y, 180, 36, "S");

  doc.setTextColor(slateDark[0], slateDark[1], slateDark[2]);
  doc.setFont("Helvetica", "bold");
  doc.setFontSize(11);
  doc.text("CAMPAIGN INFORMATION", 20, y + 6);
  
  doc.setFont("Helvetica", "normal");
  doc.setFontSize(9.5);
  doc.text(`Sender Mailbox: ${session?.mail || (session?.isSandbox ? "Sandbox (Local Simulator)" : "Unconnected / Offline")}`, 20, y + 14);
  doc.text(`Subject Title:  ${campaign.subject || "No Subject Specified"}`, 20, y + 20);
  doc.text(`Attachments Used:  ${campaign.attachments.length > 0 ? campaign.attachments.map(a => a.name).join(", ") : "None"}`, 20, y + 26);
  doc.text(`Campaign Status:  ${campaign.status.toUpperCase()}`, 20, y + 31);
  
  y += 44;

  // KPI Performance grid (Three simple columns: Success rate, Open Rate, Total sent)
  // Box 1: Total Recipients
  doc.setFillColor(241, 245, 249);
  doc.rect(15, y, 56, 24, "F");
  doc.rect(15, y, 56, 24, "S");
  doc.setTextColor(slateDark[0], slateDark[1], slateDark[2]);
  doc.setFont("Helvetica", "normal");
  doc.setFontSize(8.5);
  doc.text("RECIPIENTS COUNT", 20, y + 7);
  doc.setFont("Helvetica", "bold");
  doc.setFontSize(14);
  doc.text(`${campaign.recipients.length}`, 20, y + 16);

  // Box 2: Successful deliveries
  doc.setFillColor(241, 245, 249);
  doc.rect(77, y, 56, 24, "F");
  doc.rect(77, y, 56, 24, "S");
  doc.setTextColor(successGreen[0], successGreen[1], successGreen[2]);
  doc.setFont("Helvetica", "normal");
  doc.setFontSize(8.5);
  doc.text("SUCCESSFUL EMAILS", 82, y + 7);
  doc.setFont("Helvetica", "bold");
  doc.setFontSize(14);
  doc.text(`${campaign.successCount}`, 82, y + 16);

  // Box 3: Failures
  doc.setFillColor(241, 245, 249);
  doc.rect(139, y, 56, 24, "F");
  doc.rect(139, y, 56, 24, "S");
  doc.setTextColor(campaign.failedCount > 0 ? dangerRed[0] : slateDark[0], campaign.failedCount > 0 ? dangerRed[1] : slateDark[1], campaign.failedCount > 0 ? dangerRed[2] : slateDark[2]);
  doc.setFont("Helvetica", "normal");
  doc.setFontSize(8.5);
  doc.text("FAILED TRANSACTIONS", 144, y + 7);
  doc.setFont("Helvetica", "bold");
  doc.setFontSize(14);
  doc.text(`${campaign.failedCount}`, 144, y + 16);

  y += 32;

  // Email template content card
  doc.setFillColor(255, 255, 255);
  doc.rect(15, y, 180, 36, "F");
  doc.setDrawColor(226, 232, 240);
  doc.rect(15, y, 180, 36, "S");
  doc.setTextColor(slateDark[0], slateDark[1], slateDark[2]);
  doc.setFont("Helvetica", "bold");
  doc.setFontSize(10);
  doc.text("EMAIL TEMPLATE SUMMARY", 20, y + 6);
  doc.setFont("Helvetica", "normal");
  doc.setFontSize(8.5);

  // Parse draft plaintext view
  const cleanBodyText = campaign.templateBody
    .replace(/<[^>]*>/g, " ") // Strip HTML tags
    .replace(/\s+/g, " ")
    .substring(0, 240) + "...";

  const splitText = doc.splitTextToSize(cleanBodyText, 170);
  doc.text(splitText, 20, y + 14);

  y += 44;

  // Recipient list sheet table
  doc.setFont("Helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(slateDark[0], slateDark[1], slateDark[2]);
  doc.text("RECIPIENT MERGE EXECUTION DETAILS", 15, y);

  y += 4;

  // Table header
  doc.setFillColor(226, 232, 240);
  doc.rect(15, y, 180, 8, "F");
  doc.setTextColor(slateDark[0], slateDark[1], slateDark[2]);
  doc.setFont("Helvetica", "bold");
  doc.setFontSize(8.5);
  doc.text("Recipient Reciever / Company", 18, y + 5.5);
  doc.text("Department", 95, y + 5.5);
  doc.text("Status", 140, y + 5.5);
  doc.text("Tracking / Remarks", 168, y + 5.5);

  y += 8;

  // Set standard styling for table content
  doc.setFont("Helvetica", "normal");
  doc.setFontSize(8);

  campaign.recipients.forEach((rec, idx) => {
    // If table overflows page size, append a new section page automatically
    if (y > 270) {
      doc.addPage();
      y = 15;

      // Draw table header on new page
      doc.setFillColor(226, 232, 240);
      doc.rect(15, y, 180, 8, "F");
      doc.setTextColor(slateDark[0], slateDark[1], slateDark[2]);
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(8.5);
      doc.text("Recipient Reciever / Company", 18, y + 5.5);
      doc.text("Department", 95, y + 5.5);
      doc.text("Status", 140, y + 5.5);
      doc.text("Tracking / Remarks", 168, y + 5.5);
      y += 8;
      doc.setFont("Helvetica", "normal");
      doc.setFontSize(8);
    }

    // Row styles toggle
    if (idx % 2 === 0) {
      doc.setFillColor(248, 250, 252);
      doc.rect(15, y, 180, 7.5, "F");
    }

    doc.setTextColor(slateDark[0], slateDark[1], slateDark[2]);
    const nameStr = `${rec.FirstName} ${rec.LastName}`.trim() || "N/A";
    const titleAndCo = `${nameStr} (${rec.Email}) - ${rec.Company || "N/A"}`;
    const truncatedCo = titleAndCo.length > 50 ? titleAndCo.substring(0, 48) + "..." : titleAndCo;
    doc.text(truncatedCo, 18, y + 5);

    doc.text(rec.Department || "N/A", 95, y + 5);

    // Color code delivery status
    if (rec.status === "success") {
      doc.setTextColor(successGreen[0], successGreen[1], successGreen[2]);
      doc.text("Success", 140, y + 5);
      
      doc.setTextColor(slateDark[0], slateDark[1], slateDark[2]);
      doc.text(campaign.trackingConnected ? `Opened (${rec.openCount})` : "Delivered", 168, y + 5);
    } else if (rec.status === "failed") {
      doc.setTextColor(dangerRed[0], dangerRed[1], dangerRed[2]);
      doc.text("Failed", 140, y + 5);
      doc.text(rec.errorMessage ? rec.errorMessage.substring(0, 20) : "Check errors", 168, y + 5);
    } else {
      doc.setTextColor(100, 116, 139);
      doc.text("Not Sent (Idle)", 140, y + 5);
      doc.text("-", 168, y + 5);
    }

    y += 7.5;
  });

  // Footer stamp
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont("Helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184);
    doc.text(`Page ${i} of ${totalPages}`, 95, 290);
    doc.text("PWA MailMerge - Smart Outlook Executive Suite. Strictly Private and Confidential.", 15, 290);
  }

  return doc;
}
