import React, { useRef, useState } from "react";
import { Proposal } from "../types/proposal";
import ProposalLetterheadBody from "../components/ProposalLetterheadBody";
import { renderElementToPdfBase64, base64ToBlob } from "./htmlToPdf";

// Reusable off-screen "real letterhead → real PDF" capture, extracted from
// ProposalManagementView.tsx's captureProposalPdf/pdfCaptureProposal pattern
// so any screen that needs to generate a proposal's branded PDF (matching
// what "Yazdır" shows) can do it the same, correct way — instead of each
// screen growing its own separate, disconnected PDF renderer. First reuse:
// OpportunityDrawerExtension.tsx's ProposalContractSection (the Fırsat
// drawer's embedded proposal panel), which previously used a hand-drawn
// jsPDF renderer with no knowledge of the proposal's real content or
// uploaded cover/page images.
export function useProposalPdfCapture(
  t: (s: string) => string,
  formatSystemNumber: (n: number) => string
) {
  const [captureProposal, setCaptureProposal] = useState<Proposal | null>(null);
  const captureRef = useRef<HTMLDivElement>(null);

  const capture = async (
    proposal: Proposal
  ): Promise<{ base64: string; blob: Blob; filename: string } | null> => {
    setCaptureProposal(proposal);
    // Two rAFs: first lets React commit the DOM update, second waits for the
    // browser to actually paint it before html2canvas reads the layout.
    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
    });
    try {
      const el = captureRef.current;
      if (!el) return null;
      const filename = `Proposal_${proposal.proposalNumber}_${proposal.currentVersion}.pdf`;
      const result = await renderElementToPdfBase64(el, filename);
      if (!result) return null;
      const blob = base64ToBlob(result.base64, "application/pdf");
      return { base64: result.base64, blob, filename: result.filename };
    } finally {
      setCaptureProposal(null);
    }
  };

  // Render this anywhere in the calling component's JSX tree (position
  // doesn't matter — it's positioned off-screen via fixed + negative left).
  const captureNode = (
    <div
      style={{ position: "fixed", left: "-9999px", top: 0, width: "820px", zIndex: -1, pointerEvents: "none" }}
      aria-hidden="true"
    >
      {captureProposal && (
        <div ref={captureRef} className="bg-white p-2 font-serif" style={{ width: "820px" }}>
          <ProposalLetterheadBody doc={captureProposal} t={t} formatSystemNumber={formatSystemNumber} />
        </div>
      )}
    </div>
  );

  return { capture, captureNode };
}
