import { jsPDF } from "jspdf";
import html2canvas from "html2canvas-pro";

// Shared A4 HTML-to-PDF capture helper — extracted from ServicesView.tsx's
// battle-tested generateProposalPdfBase64() (same html2canvas-pro options,
// same page-slicing math, same 25s hard timeout) so that other screens
// (e.g. ProposalManagementView.tsx's "Teklif Yönetimi" list) can produce a
// PDF that visually matches the real on-screen HTML/CSS document — instead
// of a separate, disconnected, hand-drawn jsPDF renderer that doesn't know
// about the proposal's real content, letterhead colors, or uploaded
// cover/page images.
export async function renderElementToPdfBase64(
  sourceEl: HTMLElement,
  filename: string
): Promise<{ base64: string; filename: string } | null> {
  const renderPdf = async (): Promise<{ base64: string; filename: string }> => {
    const canvas = await html2canvas(sourceEl, {
      scale: 1.5,
      useCORS: true,
      backgroundColor: "#ffffff",
      logging: false,
      // Bounds any single slow/CORS-blocked image so it can never hang the
      // whole capture indefinitely (html2canvas's own default is no timeout).
      imageTimeout: 8000,
      // Without explicit width/height/windowWidth/windowHeight, html2canvas
      // sizes its capture viewport to the current browser window instead of
      // the full (often much taller) document — cutting off multi-page
      // content instead of capturing all of it.
      width: sourceEl.scrollWidth,
      height: sourceEl.scrollHeight,
      windowWidth: sourceEl.scrollWidth,
      windowHeight: sourceEl.scrollHeight,
    });

    const pdf = new jsPDF({ unit: "pt", format: "a4" });
    const pageWidthPt = pdf.internal.pageSize.getWidth();
    const pageHeightPt = pdf.internal.pageSize.getHeight();

    const pxPerPt = canvas.width / pageWidthPt;
    const pageHeightPx = Math.max(1, Math.floor(pageHeightPt * pxPerPt));

    const pageCanvas = document.createElement("canvas");
    pageCanvas.width = canvas.width;
    const pageCtx = pageCanvas.getContext("2d");

    let renderedPx = 0;
    let pageIndex = 0;
    while (renderedPx < canvas.height) {
      const sliceHeightPx = Math.min(pageHeightPx, canvas.height - renderedPx);
      pageCanvas.height = sliceHeightPx;
      pageCtx?.clearRect(0, 0, pageCanvas.width, sliceHeightPx);
      pageCtx?.drawImage(
        canvas,
        0, renderedPx, canvas.width, sliceHeightPx,
        0, 0, canvas.width, sliceHeightPx
      );
      const sliceDataUrl = pageCanvas.toDataURL("image/jpeg", 0.92);
      const sliceHeightPt = sliceHeightPx / pxPerPt;
      if (pageIndex > 0) pdf.addPage();
      pdf.addImage(sliceDataUrl, "JPEG", 0, 0, pageWidthPt, sliceHeightPt);
      renderedPx += sliceHeightPx;
      pageIndex++;
    }

    const dataUri = pdf.output("datauristring");
    const base64 = dataUri.split(",")[1] || "";
    return { base64, filename };
  };

  try {
    const timeout = new Promise<null>((resolve) => {
      setTimeout(() => resolve(null), 25000);
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
