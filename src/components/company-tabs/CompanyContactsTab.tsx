import React, { useState } from "react";
import { CrmDb, Contact } from "../../lib/CrmDb";
import { Plus, Trash2, Edit2, Mail, Phone, Users, X, Check, Search, User } from "lucide-react";
import { useLanguage } from "../../lib/LanguageContext";

interface CompanyContactsTabProps {
  companyId: string;
  lang: "TR" | "EN";
  onLogTimelineEvent?: (title: string, desc: string, type: string) => void;
}

export default function CompanyContactsTab({
  companyId,
  lang,
  onLogTimelineEvent
}: CompanyContactsTabProps) {
  const { t } = useLanguage();
  const [contacts, setContacts] = useState<Contact[]>(() => CrmDb.getContactsByCompany(companyId));
  const [searchQuery, setSearchQuery] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingContactId, setEditingContactId] = useState<string | null>(null);

  // Form state
  const [formState, setFormState] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    department: "",
    leadStatus: "Active",
    leadSegment: "B2B client"
  });

  const reloadContacts = () => {
    setContacts(CrmDb.getContactsByCompany(companyId));
  };

  const handleOpenAdd = () => {
    setEditingContactId(null);
    setFormState({
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      department: "",
      leadStatus: "Active",
      leadSegment: "B2B client"
    });
    setIsFormOpen(true);
  };

  const handleOpenEdit = (contact: Contact) => {
    setEditingContactId(contact.id);
    setFormState({
      firstName: contact.firstName,
      lastName: contact.lastName,
      email: contact.email,
      phone: contact.phone,
      department: contact.department,
      leadStatus: contact.leadStatus || "Active",
      leadSegment: contact.leadSegment || "B2B client"
    });
    setIsFormOpen(true);
  };

  const handleSaveContact = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formState.firstName || !formState.lastName) {
      alert(t("Please fill out first name and last name!"));
      return;
    }

    // Şirket kartındaki sorumlu/personel kaydı, kişi rehberi olarak
    // kullanılan Aday Profilleri listesine de otomatik senkronize edilir
    // (ekleme ve düzenleme her ikisinde de) — email varsa dedupe edip
    // eksik alanları tamamlar, yoksa yeni kayıt açar.
    try {
      const companyInfo = CrmDb.getCompanyById(companyId);
      CrmDb.upsertLeadProfile({
        firstName: formState.firstName,
        lastName: formState.lastName,
        email: formState.email,
        company: companyInfo?.name || "",
        department: formState.department,
        industry: companyInfo?.industry || "",
        address: companyInfo
          ? `${companyInfo.billingAddress || ""}, ${companyInfo.billingCity || ""}, ${companyInfo.billingCountry || ""}`.replace(/^,\s*|,\s*$/g, "")
          : "",
      });
    } catch (err) {
      console.error("Auto sync to Lead database failed:", err);
    }

    if (editingContactId) {
      // Edit in CrmDb
      const list = CrmDb.getContacts();
      const updated = list.map(c =>
        c.id === editingContactId
          ? { ...c, ...formState }
          : c
      );
      CrmDb.saveContacts(updated);

      if (onLogTimelineEvent) {
        onLogTimelineEvent(
          t("Contact Updated"),
          `${formState.firstName} ${formState.lastName} (${formState.department})`,
          "system"
        );
      }
    } else {
      // Add in CrmDb
      CrmDb.createContact({
        companyId,
        firstName: formState.firstName,
        lastName: formState.lastName,
        email: formState.email,
        phone: formState.phone,
        department: formState.department,
        leadStatus: formState.leadStatus,
        leadSegment: formState.leadSegment
      });

      if (onLogTimelineEvent) {
        onLogTimelineEvent(
          t("New Contact Added"),
          `${formState.firstName} ${formState.lastName} (${formState.department})`,
          "system"
        );
      }
    }

    setIsFormOpen(false);
    reloadContacts();
  };

  const handleDeleteContact = (id: string, name: string) => {
    if (confirm(t("Are you sure you want to delete {name}?").replace("{name}", name))) {
      const list = CrmDb.getContacts();
      const filtered = list.filter(c => c.id !== id);
      CrmDb.saveContacts(filtered);
      
      if (onLogTimelineEvent) {
        onLogTimelineEvent(
          t("Contact Deleted"),
          name,
          "system"
        );
      }
      reloadContacts();
    }
  };

  const filteredContacts = contacts.filter(c => {
    const term = searchQuery.toLowerCase();
    return (
      c.firstName.toLowerCase().includes(term) ||
      c.lastName.toLowerCase().includes(term) ||
      c.email.toLowerCase().includes(term) ||
      (c.phone && c.phone.includes(term)) ||
      (c.department && c.department.toLowerCase().includes(term))
    );
  });

  return (
    <div className="space-y-4 font-sans text-xs">
      
      {/* Search & Actions Toolbar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white dark:bg-[#151515] p-3.5 rounded-xl border border-slate-100 dark:border-zinc-800/80 shadow-[0_1px_2px_rgba(0,0,0,0.01)]">
        <div className="relative w-full sm:w-72">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
          <input
            type="text"
            placeholder={t("Search contacts...")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-50 dark:bg-zinc-800/60 border border-slate-200 dark:border-zinc-700 rounded-lg pl-8.5 pr-3.5 py-1.5 text-xs focus:outline-none focus:border-indigo-500"
          />
        </div>

        <button
          type="button"
          onClick={handleOpenAdd}
          className="w-full sm:w-auto px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold flex items-center justify-center gap-1.5 cursor-pointer shadow-sm transition-all text-xs"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>{t("Add New Contact")}</span>
        </button>
      </div>

      {/* Adding / Editing Modal Form */}
      {isFormOpen && (
        <form
          onSubmit={handleSaveContact}
          className="p-4 bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl space-y-3.5 animate-fadeIn"
        >
          <div className="flex items-center justify-between border-b border-dashed border-slate-200 dark:border-zinc-800 pb-2">
            <span className="font-bold text-slate-700 dark:text-zinc-200 text-xs flex items-center gap-1.5">
              <User className="w-4 h-4 text-[#0078D4]" />
              {editingContactId 
                ? t("Edit Contact Information")
                : t("Add New Contact Reference")}
            </span>
            <button
              type="button"
              onClick={() => setIsFormOpen(false)}
              className="p-1 hover:bg-slate-200 dark:hover:bg-zinc-800 rounded text-slate-400 hover:text-slate-600"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-[9px] uppercase font-bold text-slate-400 mb-1">{t("First Name *")}</label>
              <input
                type="text"
                required
                value={formState.firstName}
                onChange={(e) => setFormState({ ...formState, firstName: e.target.value })}
                className="w-full bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded p-1.5 text-xs text-slate-800 dark:text-zinc-200 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[9px] uppercase font-bold text-slate-400 mb-1">{t("Last Name *")}</label>
              <input
                type="text"
                required
                value={formState.lastName}
                onChange={(e) => setFormState({ ...formState, lastName: e.target.value })}
                className="w-full bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded p-1.5 text-xs text-slate-800 dark:text-zinc-200 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[9px] uppercase font-bold text-slate-400 mb-1">{t("E-posta")}</label>
              <input
                type="email"
                placeholder="client@company.com"
                value={formState.email}
                onChange={(e) => setFormState({ ...formState, email: e.target.value })}
                className="w-full bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded p-1.5 text-xs text-slate-800 dark:text-zinc-200 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[9px] uppercase font-bold text-slate-400 mb-1">{t("Phone")}</label>
              <input
                type="text"
                placeholder="+90 (532) 123 4567"
                value={formState.phone}
                onChange={(e) => setFormState({ ...formState, phone: e.target.value })}
                className="w-full bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded p-1.5 text-xs text-slate-800 dark:text-zinc-200 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[9px] uppercase font-bold text-slate-400 mb-1">{t("Department / Title")}</label>
              <input
                type="text"
                placeholder={t("e.g. Purchase Manager, COO, General Manager")}
                value={formState.department}
                onChange={(e) => setFormState({ ...formState, department: e.target.value })}
                className="w-full bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded p-1.5 text-xs text-slate-800 dark:text-zinc-200 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[9px] uppercase font-bold text-slate-400 mb-1">{t("Customer Segment")}</label>
              <input
                type="text"
                value={formState.leadSegment}
                onChange={(e) => setFormState({ ...formState, leadSegment: e.target.value })}
                className="w-full bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded p-1.5 text-xs text-slate-800 dark:text-zinc-200 focus:outline-none"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 border-t border-dashed border-slate-200 dark:border-zinc-800 pt-3">
            <button
              type="button"
              onClick={() => setIsFormOpen(false)}
              className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded font-semibold cursor-pointer"
            >
              {t("Cancel")}
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded font-bold cursor-pointer"
            >
              {t("Save Changes")}
            </button>
          </div>
        </form>
      )}

      {/* Contacts Cards Grid */}
      {filteredContacts.length === 0 ? (
        <div className="p-12 text-center bg-white dark:bg-[#151515] border border-dashed border-slate-200 dark:border-zinc-800 rounded-xl">
          <Users className="w-8 h-8 text-slate-300 mx-auto mb-2" />
          <span className="text-slate-400">
            {t("No contacts registered for this company yet.")}
          </span>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredContacts.map((contact) => (
            <div
              key={contact.id}
              className="p-4 bg-white dark:bg-[#151515] border border-slate-100 dark:border-zinc-800/80 rounded-xl hover:shadow-md transition-all flex justify-between items-start"
            >
              <div className="space-y-2 min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-indigo-50 dark:bg-zinc-800 text-indigo-600 dark:text-indigo-400 font-bold flex items-center justify-center font-display shrink-0 text-xs">
                    {contact.firstName[0]}{contact.lastName[0]}
                  </div>
                  <div className="truncate">
                    <h5 className="font-bold text-slate-800 dark:text-zinc-200 text-xs truncate">
                      {contact.firstName} {contact.lastName}
                    </h5>
                    <span className="text-[10px] text-slate-400 block truncate">{contact.department || t("No Title Specified")}</span>
                  </div>
                </div>

                <div className="space-y-1.5 text-[10px] text-slate-500 dark:text-zinc-400 pt-1 font-sans">
                  {contact.email && (
                    <a
                      href={`mailto:${contact.email}`}
                      className="flex items-center gap-1.5 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors truncate"
                    >
                      <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>{contact.email}</span>
                    </a>
                  )}
                  {contact.phone && (
                    <a
                      href={`tel:${contact.phone}`}
                      className="flex items-center gap-1.5 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                    >
                      <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>{contact.phone}</span>
                    </a>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0 ml-2">
                <button
                  type="button"
                  onClick={() => handleOpenEdit(contact)}
                  className="p-1.5 bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-slate-500 hover:text-indigo-600 dark:text-zinc-400 dark:hover:text-indigo-400 rounded transition-colors cursor-pointer"
                  title={t("Edit")}
                >
                  <Edit2 className="w-3 h-3" />
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteContact(contact.id, `${contact.firstName} ${contact.lastName}`)}
                  className="p-1.5 bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/45 text-rose-600 hover:bg-rose-100 dark:text-rose-400 rounded transition-colors cursor-pointer"
                  title={t("Delete")}
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

    </div>
  );
}
