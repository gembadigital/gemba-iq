import { jsPDF } from "jspdf";
import html2canvas from "html2canvas-pro";

// Capture each actual A4 page separately so preview spacing never becomes
// extra PDF pages, and letterhead images repeat at the correct position.
export async function renderElementToPdfBase64(
  sourceEl: HTMLElement,
  filename: string
): Promise<{ base64: string; filename: string } | null> {
  const renderPdf = async (): Promise<{ base64: string; filename: string }> => {
    await document.fonts.ready;
    const pages = Array.from(sourceEl.querySelectorAll<HTMLElement>(".a4-page"));
    if (!pages.length) throw new Error("Teklif sayfaları henüz hazır değil.");
    await Promise.all(Array.from(sourceEl.querySelectorAll("img")).map(img => img.decode().catch(() => undefined)));
    const pdf = new jsPDF({ unit: "pt", format: "a4" });
    for (let i = 0; i < pages.length; i++) {
      const page = pages[i];
      const canvas = await html2canvas(page, {
        scale: 1.5, useCORS: true, backgroundColor: "#ffffff", logging: false,
        imageTimeout: 8000, width: page.offsetWidth, height: page.offsetHeight,
        windowWidth: Math.max(1024, page.offsetWidth), windowHeight: page.offsetHeight,
      });
      if (i) pdf.addPage();
      pdf.addImage(canvas.toDataURL("image/jpeg", .92), "JPEG", 0, 0,
        pdf.internal.pageSize.getWidth(), pdf.internal.pageSize.getHeight());
    }

    const dataUri = pdf.output("datauristring");
    const base64 = dataUri.split(",")[1] || "";
    return { base64, filename };
  };

  try {
    const timeout = new Promise<null>((resolve) => {
      setTimeout(() => resolve(null), 60000);
    });
    return await Promise.race([renderPdf(), timeout]);
  } catch (err) {
    console.error("PDF render failed:", err);
    return null;
  }
}

export function base64ToBlob(base64: string, mimeType: string): Blob {
  const byteChars = atob(base64);
  const byteNumbers = new Array(byteChars.length);
  for (let i = 0; i < byteChars.length; i++) byteNumbers[i] = byteChars.charCodeAt(i);
  const byteArray = new Uint8Array(byteNumbers);
  return new Blob([byteArray], { type: mimeType });
}
