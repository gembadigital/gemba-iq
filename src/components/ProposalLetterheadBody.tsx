import React, { useLayoutEffect, useState } from "react";
import { Proposal } from "../types/proposal";
import { buildProposalDocument } from "../lib/proposalDocument";

export default function ProposalLetterheadBody({ doc }: {
  doc: Proposal;
  t: (s: string) => string;
  formatSystemNumber: (n: number) => string;
}) {
  const [html, setHtml] = useState("");
  useLayoutEffect(() => { setHtml(buildProposalDocument(doc)); }, [doc]);
  return <div data-proposal-document dangerouslySetInnerHTML={{ __html: html }} />;
}
