import { Company } from "../components/CompaniesView";
import { Deal, ProjectRecord } from "../components/DealManagementView";
import { Proposal } from "../types/proposal";

// Unified CRM interfaces
export interface Contact {
  id: string;
  companyId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  department: string;
  leadStatus: string;
  leadSegment: string;
  isSelected?: boolean;
}

export interface CrmEmail {
  id: string;
  companyId: string;
  dealId?: string;
  proposalId?: string;
  projectId?: string;
  sender: string;
  recipient: string;
  date: string;
  subject: string;
  body: string;
  attachments?: string[];
  isIncoming?: boolean;
}

export interface CrmDocument {
  id: string;
  companyId: string;
  dealId?: string;
  proposalId?: string;
  projectId?: string;
  name: string;
  type: string; // "Proposal", "Contract", "Attachment", "Report", "Invoice"
  size: string;
  date: string;
  link?: string;
  content?: string;
}

export interface CrmActivity {
  id: string;
  companyId: string;
  dealId?: string;
  proposalId?: string;
  projectId?: string;
  type: "meeting" | "call" | "email" | "task" | "note" | "system";
  title: string;
  description: string;
  date: string;
  user: string;
  result?: string;
}

// Default initial companies matching CompaniesView.tsx
export const INITIAL_COMPANIES: Company[] = [
  {
    id: "company-1",
    accountOwner: "GP Admin",
    name: "ABC Automotive",
    phone: "+90 (532) 111 2233",
    website: "abcauto.com",
    customerStatus: "Active Customer",
    description: "Highly automated Tier-1 automotive glass manufacturer.",
    billingAddress: "Organize Sanayi Bolgesi, 4. Cadde No: 12",
    billingCity: "Bursa",
    billingDistrict: "Nilüfer",
    billingCountry: "Türkiye",
    billingPostalCode: "16140",
    industry: "Automotive",
    employeeCount: 450,
    subIndustry: "Glass Components",
    shift: "3 Shifts",
    managementTeam: "John Smith (COO), Ahmet Can (MD)",
    annualRevenue: "15,000,000",
    annualRevenueCurrency: "€",
    productionType: "Continuous Flow Assembly",
    squareMeter: "25,000",
    digitalInfrastructure: "ERP Cloud, OEE Monitoring",
    customFields: {}
  },
  {
    id: "company-2",
    accountOwner: "GP Admin",
    name: "Kordsa Tekstil",
    phone: "+90 (262) 444 5566",
    website: "kordsa.com",
    customerStatus: "Implementation",
    description: "Multi-national industrial nylon and polyester yarn producer.",
    billingAddress: "Alikahya Fatih Mahallesi, Sanayi Bulvari No: 90",
    billingCity: "Kocaeli",
    billingDistrict: "İzmit",
    billingCountry: "Türkiye",
    billingPostalCode: "41310",
    industry: "Textiles",
    employeeCount: 1200,
    subIndustry: "Industrial Yarn",
    shift: "4 Shifts (Continuous)",
    managementTeam: "Bülent Ersoy (Plant Director)",
    annualRevenue: "120,500,000",
    annualRevenueCurrency: "$",
    productionType: "Spinning & Weaving",
    squareMeter: "85,005",
    digitalInfrastructure: "SAP Hana, SCADA, Custom Andon",
    customFields: {}
  }
];

// Helper to seed the database
export const CrmDb = {
  // -------------------------------------------------------------
  // COMPANIES CRUD
  // -------------------------------------------------------------
  getCompanies(): Company[] {
    const saved = localStorage.getItem("crm_won_companies");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return parsed.map((c: Company) => ({
          ...c,
          customFields: c.customFields || {}
        }));
      } catch (e) {
        console.error("Error parsing crm_won_companies, resetting", e);
      }
    }
    // Seed default if not found
    localStorage.setItem("crm_won_companies", JSON.stringify(INITIAL_COMPANIES));
    return INITIAL_COMPANIES;
  },

  saveCompanies(companies: Company[]) {
    localStorage.setItem("crm_won_companies", JSON.stringify(companies));
    // Propagate changes to all related modules (Deals, Proposals, Projects)
    this.propagateCompanyChanges(companies);
  },

  getCompanyById(companyId: string): Company | undefined {
    return this.getCompanies().find(c => c.id === companyId);
  },

  createCompany(companyData: Partial<Company>): Company {
    const companies = this.getCompanies();
    
    // Check if duplicate name exists
    const existing = companies.find(c => c.name && c.name.toLowerCase().trim() === (companyData.name || "").toLowerCase().trim());
    if (existing) {
      return existing;
    }

    const newCompany: Company = {
      id: companyData.id || `company-${Date.now()}`,
      accountOwner: companyData.accountOwner || "GP Admin",
      name: companyData.name || "Yeni Şirket",
      phone: companyData.phone || "",
      website: companyData.website || "",
      customerStatus: companyData.customerStatus || "Lead",
      description: companyData.description || "",
      billingAddress: companyData.billingAddress || "",
      billingCity: companyData.billingCity || "",
      billingDistrict: companyData.billingDistrict || "",
      billingCountry: companyData.billingCountry || "Türkiye",
      billingPostalCode: companyData.billingPostalCode || "",
      taxOffice: companyData.taxOffice || "",
      taxNo: companyData.taxNo || "",
      industry: companyData.industry || "General Manufacturing",
      employeeCount: companyData.employeeCount || 0,
      subIndustry: companyData.subIndustry || "",
      shift: companyData.shift || "1 Shift",
      managementTeam: companyData.managementTeam || "",
      annualRevenue: companyData.annualRevenue || "0",
      annualRevenueCurrency: companyData.annualRevenueCurrency || "₺",
      productionType: companyData.productionType || "",
      squareMeter: companyData.squareMeter || "",
      digitalInfrastructure: companyData.digitalInfrastructure || "",
      customFields: companyData.customFields || {}
    };

    companies.push(newCompany);
    this.saveCompanies(companies);

    // Also automatically create an initial contact for this company
    if (companyData.managementTeam) {
      const parts = companyData.managementTeam.split(",");
      parts.forEach((p, idx) => {
        const namePart = p.split("(")[0].trim();
        if (namePart) {
          const nameWords = namePart.split(" ");
          const firstName = nameWords[0] || "Yetkili";
          const lastName = nameWords.slice(1).join(" ") || "";
          this.createContact({
            companyId: newCompany.id,
            firstName,
            lastName,
            email: `${firstName.toLowerCase()}@${newCompany.website || "company.com"}`,
            phone: newCompany.phone,
            department: "Management",
            leadStatus: "Active"
          });
        }
      });
    }

    return newCompany;
  },

  // -------------------------------------------------------------
  // CONTACTS CRUD
  // -------------------------------------------------------------
  getContacts(): Contact[] {
    const saved = localStorage.getItem("crm_contacts");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error("Error parsing crm_contacts, resetting", e);
      }
    }
    // Seed initial contacts from Lead Profiles & Companies
    const initialContacts: Contact[] = [
      {
        id: "contact-1",
        companyId: "company-1",
        firstName: "John",
        lastName: "Smith",
        email: "john.smith@abcauto.com",
        phone: "+90 (532) 111 2233",
        department: "Operations",
        leadStatus: "Contacted",
        leadSegment: "Tier 1"
      },
      {
        id: "contact-2",
        companyId: "company-1",
        firstName: "Ahmet",
        lastName: "Can",
        email: "ahmet.can@abcauto.com",
        phone: "+90 (532) 111 2233",
        department: "Management",
        leadStatus: "Contacted",
        leadSegment: "Tier 1"
      },
      {
        id: "contact-3",
        companyId: "company-2",
        firstName: "Bülent",
        lastName: "Ersoy",
        email: "b.ersoy@kordsa.com",
        phone: "+90 (262) 444 5566",
        department: "Plant Management",
        leadStatus: "Proposal Phase",
        leadSegment: "Enterprise"
      }
    ];
    localStorage.setItem("crm_contacts", JSON.stringify(initialContacts));
    return initialContacts;
  },

  saveContacts(contacts: Contact[]) {
    localStorage.setItem("crm_contacts", JSON.stringify(contacts));
  },

  getContactsByCompany(companyId: string): Contact[] {
    return this.getContacts().filter(c => c.companyId === companyId);
  },

  createContact(contactData: Partial<Contact>): Contact {
    const contacts = this.getContacts();
    const newContact: Contact = {
      id: contactData.id || `contact-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      companyId: contactData.companyId || "company-1",
      firstName: contactData.firstName || "Yeni",
      lastName: contactData.lastName || "Kişi",
      email: contactData.email || "",
      phone: contactData.phone || "",
      department: contactData.department || "Operations",
      leadStatus: contactData.leadStatus || "New",
      leadSegment: contactData.leadSegment || "Standard"
    };
    contacts.push(newContact);
    this.saveContacts(contacts);
    return newContact;
  },

  // -------------------------------------------------------------
  // DEALS CRUD (Uses master companies relational model)
  // -------------------------------------------------------------
  getDeals(): Deal[] {
    const saved = localStorage.getItem("smart_mailmerge_deals");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Clean and auto-map company ID and data to ensure perfect relational joins
        const companies = this.getCompanies();
        return parsed.map((d: Deal) => {
          // If deal does not have companyId, find or create company
          let companyId = d.companyId;
          if (!companyId && d.companyName) {
            const comp = companies.find(c => c.name.toLowerCase().trim() === d.companyName.toLowerCase().trim());
            if (comp) {
              companyId = comp.id;
            } else {
              // Auto-create company to enforce single source of truth
              const newComp = this.createCompany({
                name: d.companyName,
                phone: d.contactPhone,
                website: d.contactEmail ? d.contactEmail.split("@")[1] : "",
                industry: d.industry
              });
              companyId = newComp.id;
            }
            d.companyId = companyId;
          }

          // Enforce relational join updates (changes in company propagate instantly)
          if (companyId) {
            const comp = companies.find(c => c.id === companyId);
            if (comp) {
              d.companyName = comp.name;
              d.industry = comp.industry;
            }
          }
          return d;
        });
      } catch (e) {
        console.error("Error parsing deals, resetting", e);
      }
    }
    return [];
  },

  saveDeals(deals: Deal[]) {
    // Before saving, ensure all deals are linked with valid companyIds and synced
    const companies = this.getCompanies();
    const processed = deals.map(d => {
      let companyId = d.companyId;
      if (!companyId && d.companyName) {
        const comp = companies.find(c => (c.name ?? "").toLowerCase().trim() === (d.companyName ?? "").toLowerCase().trim());
        companyId = comp ? comp.id : this.createCompany({ name: d.companyName }).id;
        d.companyId = companyId;
      }
      return d;
    });
    localStorage.setItem("smart_mailmerge_deals", JSON.stringify(processed));
  },

  getDealsByCompany(companyId: string): Deal[] {
    return this.getDeals().filter(d => d.companyId === companyId);
  },

  // -------------------------------------------------------------
  // PROPOSALS CRUD
  // -------------------------------------------------------------
  getProposals(): Proposal[] {
    const saved = localStorage.getItem("crm_proposals");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        const companies = this.getCompanies();
        return parsed.map((p: Proposal) => {
          let companyId = p.companyId;
          if (!companyId && p.companyName) {
            const comp = companies.find(c => c.name.toLowerCase().trim() === p.companyName.toLowerCase().trim());
            companyId = comp ? comp.id : "company-1";
            p.companyId = companyId;
          }
          if (companyId) {
            const comp = companies.find(c => c.id === companyId);
            if (comp) {
              p.companyName = comp.name;
            }
          }
          return p;
        });
      } catch (e) {
        console.error("Error parsing proposals", e);
      }
    }
    return [];
  },

  saveProposals(proposals: Proposal[]) {
    localStorage.setItem("crm_proposals", JSON.stringify(proposals));
  },

  getProposalsByCompany(companyId: string): Proposal[] {
    return this.getProposals().filter(p => p.companyId === companyId);
  },

  // -------------------------------------------------------------
  // PROJECTS CRUD
  // -------------------------------------------------------------
  getProjects(): ProjectRecord[] {
    const saved = localStorage.getItem("smart_mailmerge_projects");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        const companies = this.getCompanies();
        return parsed.map((p: any) => {
          // Relational resolve companyName from companyId
          if (p.companyId) {
            const comp = companies.find(c => c.id === p.companyId);
            if (comp) {
              p.companyName = comp.name;
            }
          }
          return p;
        });
      } catch (e) {
        console.error("Error parsing projects", e);
      }
    }
    return [];
  },

  saveProjects(projects: ProjectRecord[]) {
    localStorage.setItem("smart_mailmerge_projects", JSON.stringify(projects));
  },

  getProjectsByCompany(companyId: string): ProjectRecord[] {
    return this.getProjects().filter(p => (p as any).companyId === companyId);
  },

  // -------------------------------------------------------------
  // EMAILS CRUD (Unifies deal emails & campaigns)
  // -------------------------------------------------------------
  getEmails(): CrmEmail[] {
    const saved = localStorage.getItem("crm_emails");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error("Error parsing crm_emails", e);
      }
    }
    
    // Seed initial emails from current database
    const initialEmails: CrmEmail[] = [
      {
        id: "email-1",
        companyId: "company-1",
        dealId: "deal-1",
        sender: "john.smith@abcauto.com",
        recipient: "info@gembapartner.com",
        date: "2026-06-20T10:00:00.000Z",
        subject: "RE: Shopfloor Diagnostic VSM Workshop schedule confirmation",
        body: "Hi Team,\n\nWe would love to finalize the diagnostic date for Nilüfer plant. Monday looks great. Let's send the meeting invite.\n\nBest,\nJohn Smith",
        isIncoming: true
      },
      {
        id: "email-2",
        companyId: "company-1",
        dealId: "deal-1",
        sender: "info@gembapartner.com",
        recipient: "john.smith@abcauto.com",
        date: "2026-06-19T14:30:00.000Z",
        subject: "Shopfloor Diagnostic VSM Workshop schedule confirmation",
        body: "Dear John,\n\nWe have prepared the diagnostic agenda. Please find attached the list of required data points before Monday's Gemba Walk.\n\nBest regards,\nGemba Partner Consultant",
        isIncoming: false
      }
    ];
    localStorage.setItem("crm_emails", JSON.stringify(initialEmails));
    return initialEmails;
  },

  saveEmails(emails: CrmEmail[]) {
    localStorage.setItem("crm_emails", JSON.stringify(emails));
  },

  getEmailsByCompany(companyId: string): CrmEmail[] {
    return this.getEmails().filter(e => e.companyId === companyId);
  },

  getEmailsByDeal(dealId: string): CrmEmail[] {
    return this.getEmails().filter(e => e.dealId === dealId);
  },

  getEmailsByProject(projectId: string): CrmEmail[] {
    return this.getEmails().filter(e => e.projectId === projectId);
  },

  createEmail(emailData: Partial<CrmEmail>): CrmEmail {
    const emails = this.getEmails();
    const newEmail: CrmEmail = {
      id: emailData.id || `email-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      companyId: emailData.companyId || "company-1",
      dealId: emailData.dealId,
      proposalId: emailData.proposalId,
      projectId: emailData.projectId,
      sender: emailData.sender || "info@gembapartner.com",
      recipient: emailData.recipient || "",
      date: emailData.date || new Date().toISOString(),
      subject: emailData.subject || "No Subject",
      body: emailData.body || "",
      attachments: emailData.attachments,
      isIncoming: emailData.isIncoming || false
    };
    emails.unshift(newEmail);
    this.saveEmails(emails);
    return newEmail;
  },

  // -------------------------------------------------------------
  // DOCUMENTS CRUD (Proposal PDFs, contracts, attachments, reports)
  // -------------------------------------------------------------
  getDocuments(): CrmDocument[] {
    const saved = localStorage.getItem("crm_documents");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error("Error parsing crm_documents", e);
      }
    }

    const initialDocs: CrmDocument[] = [
      {
        id: "doc-1",
        companyId: "company-1",
        dealId: "deal-1",
        proposalId: "prop-1",
        name: "Shopfloor_VSM_Diagnostic_Offer_v1.pdf",
        type: "Proposal",
        size: "2.4 MB",
        date: "2026-06-14"
      },
      {
        id: "doc-2",
        companyId: "company-1",
        name: "Ocak_Faturasi_Kurumsal_Egitim.pdf",
        type: "Invoice",
        size: "1.1 MB",
        date: "2026-06-18"
      }
    ];
    localStorage.setItem("crm_documents", JSON.stringify(initialDocs));
    return initialDocs;
  },

  saveDocuments(docs: CrmDocument[]) {
    localStorage.setItem("crm_documents", JSON.stringify(docs));
  },

  getDocumentsByCompany(companyId: string): CrmDocument[] {
    return this.getDocuments().filter(d => d.companyId === companyId);
  },

  createDocument(docData: Partial<CrmDocument>): CrmDocument {
    const docs = this.getDocuments();
    const newDoc: CrmDocument = {
      id: docData.id || `doc-${Date.now()}`,
      companyId: docData.companyId || "company-1",
      dealId: docData.dealId,
      proposalId: docData.proposalId,
      projectId: docData.projectId,
      name: docData.name || "Unnamed Document",
      type: docData.type || "Attachment",
      size: docData.size || "100 KB",
      date: docData.date || new Date().toISOString().split("T")[0],
      link: docData.link,
      content: docData.content
    };
    docs.unshift(newDoc);
    this.saveDocuments(docs);
    return newDoc;
  },

  // -------------------------------------------------------------
  // ACTIVITIES / TIMELINE CRUD
  // -------------------------------------------------------------
  getActivities(): CrmActivity[] {
    const saved = localStorage.getItem("crm_activities");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error("Error parsing crm_activities", e);
      }
    }

    const initialActivities: CrmActivity[] = [
      {
        id: "act-1",
        companyId: "company-1",
        dealId: "deal-1",
        type: "meeting",
        title: "Discovery Meeting Completed",
        description: "Diagnosed shopfloor waste in manufacturing plant in Bursa. COO John Smith attended.",
        date: "2026-06-14T11:00:00.000Z",
        user: "Atakan Zehir",
        result: "Positive. Proposal requested."
      },
      {
        id: "act-2",
        companyId: "company-1",
        dealId: "deal-1",
        type: "call",
        title: "Follow-up phone call regarding rates",
        description: "Discussed the daily consultant rates. Approved 1200 USD option.",
        date: "2026-06-15T15:30:00.000Z",
        user: "Atakan Zehir"
      }
    ];
    localStorage.setItem("crm_activities", JSON.stringify(initialActivities));
    return initialActivities;
  },

  saveActivities(activities: CrmActivity[]) {
    localStorage.setItem("crm_activities", JSON.stringify(activities));
  },

  getActivitiesByCompany(companyId: string): CrmActivity[] {
    return this.getActivities().filter(a => a.companyId === companyId);
  },

  getActivitiesByDeal(dealId: string): CrmActivity[] {
    return this.getActivities().filter(a => a.dealId === dealId);
  },

  createActivity(activityData: Partial<CrmActivity>): CrmActivity {
    const activities = this.getActivities();
    const newActivity: CrmActivity = {
      id: activityData.id || `act-${Date.now()}`,
      companyId: activityData.companyId || "company-1",
      dealId: activityData.dealId,
      proposalId: activityData.proposalId,
      projectId: activityData.projectId,
      type: activityData.type || "system",
      title: activityData.title || "Activity logged",
      description: activityData.description || "",
      date: activityData.date || new Date().toISOString(),
      user: activityData.user || "Atakan Zehir",
      result: activityData.result
    };
    activities.unshift(newActivity);
    this.saveActivities(activities);
    return newActivity;
  },

  // -------------------------------------------------------------
  // CASCADE PROPAGATION (CHANGES IN COMPANY AUTOMATICALLY UPDATE OTHER ENTITIES)
  // -------------------------------------------------------------
  propagateCompanyChanges(companies: Company[]) {
    // 1. Update Deals
    const savedDeals = localStorage.getItem("smart_mailmerge_deals");
    if (savedDeals) {
      try {
        const deals = JSON.parse(savedDeals) as Deal[];
        let updated = false;
        const nextDeals = deals.map(d => {
          if (d.companyId) {
            const company = companies.find(c => c.id === d.companyId);
            if (company && (d.companyName !== company.name || d.industry !== company.industry)) {
              d.companyName = company.name;
              d.industry = company.industry;
              updated = true;
            }
          }
          return d;
        });
        if (updated) {
          localStorage.setItem("smart_mailmerge_deals", JSON.stringify(nextDeals));
        }
      } catch (e) {
        console.error("Error cascading company changes to deals", e);
      }
    }

    // 2. Update Proposals
    const savedProps = localStorage.getItem("crm_proposals");
    if (savedProps) {
      try {
        const props = JSON.parse(savedProps) as Proposal[];
        let updated = false;
        const nextProps = props.map(p => {
          if (p.companyId) {
            const company = companies.find(c => c.id === p.companyId);
            if (company && p.companyName !== company.name) {
              p.companyName = company.name;
              updated = true;
            }
          }
          return p;
        });
        if (updated) {
          localStorage.setItem("crm_proposals", JSON.stringify(nextProps));
        }
      } catch (e) {
        console.error("Error cascading company changes to proposals", e);
      }
    }

    // 3. Update Projects
    const savedProjects = localStorage.getItem("smart_mailmerge_projects");
    if (savedProjects) {
      try {
        const projects = JSON.parse(savedProjects) as any[];
        let updated = false;
        const nextProjects = projects.map(p => {
          if (p.companyId) {
            const company = companies.find(c => c.id === p.companyId);
            if (company && p.companyName !== company.name) {
              p.companyName = company.name;
              updated = true;
            }
          }
          return p;
        });
        if (updated) {
          localStorage.setItem("smart_mailmerge_projects", JSON.stringify(nextProjects));
        }
      } catch (e) {
        console.error("Error cascading company changes to projects", e);
      }
    }
  },

  // -------------------------------------------------------------
  // AUTOCOMPLETE SEARCH UTILITY
  // -------------------------------------------------------------
  autocompleteCompanies(query: string): Company[] {
    if (!query) return [];
    const companies = this.getCompanies();
    const cleanQuery = query.toLowerCase().trim();
    return companies.filter(c => 
      c.name.toLowerCase().includes(cleanQuery) || 
      (c.website && c.website.toLowerCase().includes(cleanQuery))
    );
  }
};
