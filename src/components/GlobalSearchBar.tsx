import React, { useState, useEffect, useRef } from "react";
import { Search, Building, Briefcase, FileText, Users, Layers, Mail, Paperclip, X } from "lucide-react";
import { CrmDb } from "../lib/CrmDb";
import { useLanguage } from "../lib/LanguageContext";
import { formatSystemNumber } from "../lib/currencyHelper";

interface SearchResult {
  id: string;
  title: string;
  subtitle: string;
  type: "company" | "deal" | "proposal" | "contact" | "project" | "email" | "document";
  tab: string;
  targetId: string;
}

export default function GlobalSearchBar() {
  const { t } = useLanguage();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close search dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Run the search
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    const cleanQuery = query.toLowerCase().trim();
    const matches: SearchResult[] = [];

    // 1. Search Companies
    const companies = CrmDb.getCompanies();
    companies.forEach(c => {
      if (
        c.name.toLowerCase().includes(cleanQuery) ||
        (c.industry && c.industry.toLowerCase().includes(cleanQuery)) ||
        (c.billingCity && c.billingCity.toLowerCase().includes(cleanQuery))
      ) {
        matches.push({
          id: `comp-${c.id}`,
          title: c.name,
          subtitle: `${c.industry ? t(c.industry) : t("General")} • ${c.billingCity || ""}`,
          type: "company",
          tab: "companies-registry",
          targetId: c.id
        });
      }
    });

    // 2. Search Deals
    const deals = CrmDb.getDeals();
    deals.forEach(d => {
      if (
        (d.dealName && d.dealName.toLowerCase().includes(cleanQuery)) ||
        d.companyName.toLowerCase().includes(cleanQuery) ||
        d.contactPerson.toLowerCase().includes(cleanQuery)
      ) {
        matches.push({
          id: `deal-${d.id}`,
          title: d.dealName || `${d.companyName} ${t("Deal")}`,
          subtitle: `${t("Deal")} • ${d.companyName} • ${formatSystemNumber((d.opportunityValue || 0))} TL • ${d.stage}`,
          type: "deal",
          tab: "deal-management",
          targetId: d.id
        });
      }
    });

    // 3. Search Proposals
    const proposals = CrmDb.getProposals();
    proposals.forEach(p => {
      if (
        p.proposalNumber.toLowerCase().includes(cleanQuery) ||
        p.companyName.toLowerCase().includes(cleanQuery) ||
        p.proposalSubject.toLowerCase().includes(cleanQuery)
      ) {
        matches.push({
          id: `prop-${p.id}`,
          title: `${t("Proposal")} ${p.proposalNumber}`,
          subtitle: `${p.companyName} • ${p.proposalSubject} • ${p.status}`,
          type: "proposal",
          tab: "proposal-management",
          targetId: p.id
        });
      }
    });

    // 4. Search Contacts
    const contacts = CrmDb.getContacts();
    contacts.forEach(cnt => {
      const company = companies.find(c => c.id === cnt.companyId);
      if (
        cnt.firstName.toLowerCase().includes(cleanQuery) ||
        cnt.lastName.toLowerCase().includes(cleanQuery) ||
        cnt.email.toLowerCase().includes(cleanQuery)
      ) {
        matches.push({
          id: `cnt-${cnt.id}`,
          title: `${cnt.firstName} ${cnt.lastName}`,
          subtitle: `${t("Contact")} • ${company?.name || t("Independent")} • ${cnt.email}`,
          type: "contact",
          tab: "lead-profiles", // Falls back to Lead Profiles view
          targetId: cnt.id
        });
      }
    });

    // 5. Search Projects
    const projects = CrmDb.getProjects();
    projects.forEach(p => {
      if (
        p.companyName.toLowerCase().includes(cleanQuery) ||
        p.poNumber.toLowerCase().includes(cleanQuery)
      ) {
        matches.push({
          id: `proj-${p.id}`,
          title: `${p.companyName} ${t("Project")}`,
          subtitle: `${t("Project")} • ${t("PO:")} ${p.poNumber} • ${p.status}`,
          type: "project",
          tab: "deal-management", // Projects tab is inside deal-management
          targetId: p.id
        });
      }
    });

    // 6. Search Emails
    const emails = CrmDb.getEmails();
    emails.forEach(e => {
      if (
        e.subject.toLowerCase().includes(cleanQuery) ||
        e.body.toLowerCase().includes(cleanQuery) ||
        e.sender.toLowerCase().includes(cleanQuery)
      ) {
        matches.push({
          id: `mail-${e.id}`,
          title: e.subject,
          subtitle: `${t("Email")} • ${t("From:")} ${e.sender} • ${new Date(e.date).toLocaleDateString()}`,
          type: "email",
          tab: "companies-registry", // Opens Company history tab where Emails exist
          targetId: e.companyId
        });
      }
    });

    // 7. Search Documents
    const documents = CrmDb.getDocuments();
    documents.forEach(doc => {
      if (
        doc.name.toLowerCase().includes(cleanQuery) ||
        doc.type.toLowerCase().includes(cleanQuery)
      ) {
        matches.push({
          id: `doc-${doc.id}`,
          title: doc.name,
          subtitle: `${t("Document")} • ${doc.type} • ${doc.size}`,
          type: "document",
          tab: "companies-registry", // Available via central doc lists in companies
          targetId: doc.companyId
        });
      }
    });

    setResults(matches.slice(0, 10)); // Limit to top 10 results
    setIsOpen(true);
  }, [query]);

  const handleResultClick = (result: SearchResult) => {
    setQuery("");
    setIsOpen(false);

    // Save target ID to CrmDb so the target tab can automatically select/open it
    CrmDb.setKv("crm_active_target_id", result.targetId);
    if (result.type === "project") {
      CrmDb.setKv("crm_deal_management_subtab", "projects");
    } else {
      CrmDb.setKv("crm_deal_management_subtab", "board");
    }

    // Trigger global navigation event
    const event = new CustomEvent("crm-navigate", {
      detail: { tab: result.tab, id: result.targetId, type: result.type }
    });
    window.dispatchEvent(event);
  };

  const getIcon = (type: string) => {
    switch (type) {
      case "company":
        return <Building className="w-4 h-4 text-indigo-500" />;
      case "deal":
        return <Briefcase className="w-4 h-4 text-emerald-500" />;
      case "proposal":
        return <FileText className="w-4 h-4 text-amber-500" />;
      case "contact":
        return <Users className="w-4 h-4 text-teal-500" />;
      case "project":
        return <Layers className="w-4 h-4 text-sky-500" />;
      case "email":
        return <Mail className="w-4 h-4 text-rose-500" />;
      case "document":
        return <Paperclip className="w-4 h-4 text-slate-500" />;
      default:
        return <Search className="w-4 h-4 text-slate-400" />;
    }
  };

  const getLabel = (type: string) => {
    switch (type) {
      case "company": return t("Company");
      case "deal": return t("Deal");
      case "proposal": return t("Proposal");
      case "contact": return t("Contact");
      case "project": return t("Project");
      case "email": return t("Email");
      case "document": return t("Document");
      default: return type;
    }
  };

  return (
    <div className="relative w-full max-w-xs md:max-w-md" ref={containerRef}>
      <div className="relative flex items-center">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
        <input
          type="text"
          placeholder={t("Global search (Company, Deal, Proposal, Contact...)")}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          className="w-full pl-9 pr-8 py-1.5 bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-xs rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-slate-800 dark:text-zinc-100"
        />
        {query && (
          <button
            onClick={() => setQuery("")}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-slate-200 dark:hover:bg-zinc-800 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
          >
            <X className="w-3 h-3" />
          </button>
        )}
      </div>

      {isOpen && results.length > 0 && (
        <div className="absolute left-0 right-0 mt-2 bg-white dark:bg-[#141414] border border-slate-200 dark:border-zinc-800 rounded-xl shadow-lg max-h-96 overflow-y-auto z-50 animate-in fade-in slide-in-from-top-1 duration-150 p-1.5">
          <div className="px-2 py-1.5 text-[9px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest border-b border-slate-100 dark:border-zinc-800/60 mb-1">
            {t("Search Results")}
          </div>
          <div className="space-y-0.5">
            {results.map((r) => (
              <button
                key={r.id}
                onClick={() => handleResultClick(r)}
                className="w-full flex items-start gap-3 p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-zinc-800/50 text-left transition-colors cursor-pointer"
              >
                <div className="p-1.5 rounded-lg bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-350 mt-0.5">
                  {getIcon(r.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-slate-800 dark:text-zinc-200 truncate">{r.title}</span>
                    <span className="text-[8px] font-extrabold uppercase px-1.5 py-0.5 bg-slate-100 dark:bg-zinc-800 text-slate-500 dark:text-zinc-400 rounded-md font-mono shrink-0">
                      {getLabel(r.type)}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-450 dark:text-zinc-500 truncate mt-0.5">{r.subtitle}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {isOpen && query.trim() && results.length === 0 && (
        <div className="absolute left-0 right-0 mt-2 bg-white dark:bg-[#141414] border border-slate-200 dark:border-zinc-800 rounded-xl shadow-lg p-4 text-center z-50 animate-in fade-in slide-in-from-top-1 duration-150">
          <span className="text-xs text-slate-400 dark:text-zinc-500">
            {t("No matching records found.")}
          </span>
        </div>
      )}
    </div>
  );
}
