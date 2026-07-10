import React from "react";
import DocumentExplorer from "../documents/DocumentExplorer";
import { useLanguage } from "../../lib/LanguageContext";

interface CompanyDocumentsTabProps {
  companyId: string;
  lang: "TR" | "EN";
  companyName: string;
  onLogTimelineEvent?: (title: string, desc: string, type: string) => void;
}

export default function CompanyDocumentsTab({
  companyId,
  companyName,
}: CompanyDocumentsTabProps) {
  useLanguage();
  return (
    <DocumentExplorer
      companyId={companyId}
      companyName={companyName}
      initialFolder="companies"
      compact
    />
  );
}
