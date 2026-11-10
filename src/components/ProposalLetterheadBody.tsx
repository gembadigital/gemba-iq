import React, { useLayoutEffect, useState } from "react";
import { Proposal } from "../types/proposal";
import { CrmDb } from "../lib/CrmDb";
import { useOrganization } from "../lib/OrganizationContext";
import { resolveCustomerContactName } from "../lib/proposalContacts";
import { buildProposalDocument } from "../lib/proposalDocument";

export default function ProposalLetterheadBody({ doc }: {
  doc: Proposal;
  t: (s: string) => string;
  formatSystemNumber: (n: number) => string;
}) {
  const { actorName } = useOrganization();
  const [html, setHtml] = useState("");
  useLayoutEffect(() => {
    const company = CrmDb.getCompanies().find(c => c.id === doc.companyId) || CrmDb.getCompanies().find(c => c.name.trim().toLocaleLowerCase("tr-TR") === (doc.companyName || "").trim().toLocaleLowerCase("tr-TR"));
    const registered = company ? CrmDb.getPrimaryContact(company.id) : undefined;
    const registeredName = registered ? `${registered.firstName} ${registered.lastName}`.trim() : "";
    const contactPerson = resolveCustomerContactName(doc.contactPerson || "", [actorName, company?.accountOwner || ""], registeredName);
    setHtml(buildProposalDocument({ ...doc, contactPerson }));
  }, [doc, actorName]);
  return <div data-proposal-document dangerouslySetInnerHTML={{ __html: html }} />;
}
