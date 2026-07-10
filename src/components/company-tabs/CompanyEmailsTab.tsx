import React, { useState } from "react";
import { CrmDb, CrmEmail, CrmDocument } from "../../lib/CrmDb";
import { Mail, Send, Trash2, Plus, Sparkles, Paperclip, ChevronRight, User, X } from "lucide-react";
import { useLanguage } from "../../lib/LanguageContext";

interface CompanyEmailsTabProps {
  companyId: string;
  lang: "TR" | "EN";
  companyName: string;
  contactPersonName?: string;
  contactEmail?: string;
  onLogTimelineEvent?: (title: string, desc: string, type: string) => void;
}

export default function CompanyEmailsTab({
  companyId,
  lang: _langProp,
  companyName,
  contactPersonName = "Yetkili",
  contactEmail = "",
  onLogTimelineEvent
}: CompanyEmailsTabProps) {
  const { t, lang } = useLanguage();
  const [emails, setEmails] = useState<CrmEmail[]>(() => CrmDb.getEmailsByCompany(companyId));
  const [documents] = useState<CrmDocument[]>(() => CrmDb.getDocumentsByCompany(companyId));
  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState("");

  // Composer Form State
  const [formState, setFormState] = useState({
    recipient: contactEmail || `info@${companyName.toLowerCase().replace(/[^a-z0-9]/g, "")}.com`,
    subject: "",
    body: "",
    attachmentName: ""
  });

  const reloadEmails = () => {
    setEmails(CrmDb.getEmailsByCompany(companyId));
  };

  const templates = [
    {
      id: "followup",
      name: t("Lean Diagnostic Follow-Up"),
      subject: `Gemba Partner: ${companyName} Yalın Üretim Değerlendirmesi`,
      body: `Sayın ${contactPersonName},\n\nGeçtiğimiz günlerde gerçekleştirdiğimiz ön teşhis çalışmasında bahsettiğimiz SMED ve Değer Akış Haritalama projelerimizin üzerinden geçmek istedik. Tesisinizdeki Muda (israf) noktalarını en aza indirmek ve OEE verimlilik puanınızı artırmak adına gerçekleştireceğimiz danışmanlık programıyla ilgili detaylı teklifimiz ekte yer almaktadır.\n\nSüreç hakkında sormak istediğiniz her türlü teknik ve ticari hususta yardımcı olmaktan memnuniyet duyarız. Değerli geri dönüşlerinizi bekler, iyi çalışmalar dileriz.\n\nSaygılarımızla,\nAtakan Zehir\nGemba Partner Kıdemli Danışman`
    },
    {
      id: "intro",
      name: t("Consulting Service & Methodology Intro"),
      subject: `Gemba Partner: Sürekli İyileştirme ve Hücresel Üretim Ortaklığı`,
      body: `Sayın Yetkili,\n\nGemba Partner olarak, ${companyName} bünyesinde operasyonel mükemmelliği tesis etmek ve israfları elimine etmek adına yürüttüğümüz çalışmaların bir özetini sunmak istiyoruz. \n\nSüreçlerinizi analiz ederek katma değersiz adımları (Muda) ortadan kaldırıyor, 5S, Kanban ve Standart İş Talimatları ile sürdürülebilir bir sistem kuruyoruz. Ekiplerinizin eğitimi ve sahada aktif Gemba yürüyüşleriyle dönüşüm sürecinizi destekliyoruz.\n\nSizinle kısa bir tanışma toplantısı organize ederek tesisinize özel yol haritasını değerlendirmek isteriz.\n\nSaygılarımızla,\nGemba Partner Danışmanlık Ekibi`
    },
    {
      id: "invoice",
      name: t("Invoice & Outstanding Payments"),
      subject: `Gemba Partner: Fatura Ödeme Süreç Takibi`,
      body: `Sayın ${contactPersonName},\n\n${companyName} adına tamamladığımız Yalın Dönüşüm Saha Teşhis çalışmamıza ait faturamız ekte yer almaktadır. Ödeme vademiz gereği faturanın kapatılması hususunda muhasebe biriminizle koordinasyon sağlamanızı rica eder, destekleriniz için teşekkür ederiz.\n\nYeni dönem projelerimizde de birlikte çalışmak dileğiyle.\n\nSaygılarımızla,\nGemba Partner Finans Birimi`
    }
  ];

  const handleTemplateChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const templateId = e.target.value;
    setSelectedTemplate(templateId);
    
    if (templateId) {
      const found = templates.find(t => t.id === templateId);
      if (found) {
        setFormState(prev => ({
          ...prev,
          subject: found.subject,
          body: found.body
        }));
      }
    } else {
      setFormState(prev => ({
        ...prev,
        subject: "",
        body: ""
      }));
    }
  };

  const handleSendEmail = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formState.recipient || !formState.subject || !formState.body) {
      alert(t("Please fill out all required fields!"));
      return;
    }

    CrmDb.createEmail({
      companyId,
      recipient: formState.recipient,
      sender: "atakan@gembapartner.com",
      subject: formState.subject,
      body: formState.body,
      isIncoming: false,
      date: new Date().toISOString(),
      attachments: formState.attachmentName ? [formState.attachmentName] : undefined
    });

    if (onLogTimelineEvent) {
      onLogTimelineEvent(
        t("Email Sent"),
        `Alıcı: ${formState.recipient} • Konu: ${formState.subject}`,
        "email"
      );
    }

    // Reset composer
    setFormState({
      recipient: contactEmail || `info@${companyName.toLowerCase().replace(/[^a-z0-9]/g, "")}.com`,
      subject: "",
      body: "",
      attachmentName: ""
    });
    setSelectedTemplate("");
    setIsComposerOpen(false);
    reloadEmails();
  };

  return (
    <div className="space-y-4 font-sans text-xs">
      
      {/* Top action block */}
      <div className="flex items-center justify-between bg-white dark:bg-[#151515] p-3.5 rounded-xl border border-slate-100 dark:border-zinc-800/80 shadow-[0_1px_2px_rgba(0,0,0,0.01)]">
        <h4 className="text-xs font-bold uppercase text-slate-800 dark:text-zinc-200 tracking-wider">
          {t("Client Email Communications")}
        </h4>
        <button
          type="button"
          onClick={() => setIsComposerOpen(!isComposerOpen)}
          className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold flex items-center gap-1.5 cursor-pointer transition-all text-xs"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>{t("Compose Email")}</span>
        </button>
      </div>

      {/* Composer Container */}
      {isComposerOpen && (
        <form
          onSubmit={handleSendEmail}
          className="p-4 bg-slate-50 dark:bg-zinc-900 border border-slate-205 dark:border-zinc-800 rounded-xl space-y-3.5 animate-fadeIn"
        >
          <div className="flex items-center justify-between border-b border-dashed border-slate-200 dark:border-zinc-800 pb-2">
            <span className="font-bold text-slate-700 dark:text-zinc-200 flex items-center gap-1.5">
              <Mail className="w-4 h-4 text-indigo-500 animate-pulse" />
              {t("SaaS Core Mail Composer")}
            </span>
            <button
              type="button"
              onClick={() => setIsComposerOpen(false)}
              className="p-1 hover:bg-slate-200 dark:hover:bg-zinc-800 rounded text-slate-400"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-[9px] uppercase font-bold text-slate-400 mb-1">{t("Recipient Email *")}</label>
              <input
                type="email"
                required
                value={formState.recipient}
                onChange={(e) => setFormState({ ...formState, recipient: e.target.value })}
                className="w-full bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded p-1.5 text-xs text-slate-800 dark:text-zinc-200 focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-[9px] uppercase font-bold text-slate-400 mb-1">{t("Select CRM Template")}</label>
              <select
                value={selectedTemplate}
                onChange={handleTemplateChange}
                className="w-full bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded p-1.5 text-xs text-slate-800 dark:text-zinc-200 focus:outline-none"
              >
                <option value="">{t("-- Blank Template --")}</option>
                {templates.map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[9px] uppercase font-bold text-slate-400 mb-1">{t("Subject *")}</label>
            <input
              type="text"
              required
              placeholder={t("e.g. Diagnostic diagnostic schedule follow-up")}
              value={formState.subject}
              onChange={(e) => setFormState({ ...formState, subject: e.target.value })}
              className="w-full bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded p-1.5 text-xs text-slate-800 dark:text-zinc-200 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-[9px] uppercase font-bold text-slate-400 mb-1">{t("Email Body *")}</label>
            <textarea
              required
              value={formState.body}
              onChange={(e) => setFormState({ ...formState, body: e.target.value })}
              className="w-full bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded p-2 text-xs text-slate-800 dark:text-zinc-200 focus:outline-none min-h-[140px] font-sans leading-relaxed"
            />
          </div>

          <div>
            <label className="block text-[9px] uppercase font-bold text-slate-400 mb-1 flex items-center gap-1">
              <Paperclip className="w-3 h-3" />
              <span>{t("Attach Company Document Reference")}</span>
            </label>
            <select
              value={formState.attachmentName}
              onChange={(e) => setFormState({ ...formState, attachmentName: e.target.value })}
              className="w-full bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded p-1.5 text-xs text-slate-800 dark:text-zinc-200 focus:outline-none"
            >
              <option value="">{t("-- No Attachment --")}</option>
              {documents.map(doc => (
                <option key={doc.id} value={doc.name}>{doc.name} ({doc.size})</option>
              ))}
            </select>
          </div>

          <div className="flex justify-end gap-2 border-t border-dashed border-slate-200 dark:border-zinc-800 pt-3">
            <button
              type="button"
              onClick={() => setIsComposerOpen(false)}
              className="px-3.5 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded font-semibold cursor-pointer"
            >
              {t("Cancel")}
            </button>
            <button
              type="submit"
              className="px-4.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded font-bold flex items-center gap-1.5 cursor-pointer shadow-sm"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{t("Send Email")}</span>
            </button>
          </div>
        </form>
      )}

      {/* Email Inbox/Outbox List */}
      <div className="space-y-3">
        {emails.length === 0 ? (
          <div className="p-12 text-center bg-white dark:bg-[#151515] border border-dashed border-slate-200 dark:border-zinc-800 rounded-xl">
            <Mail className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <span className="text-slate-400 block">
              {t("No emails exchanged with this client record yet.")}
            </span>
          </div>
        ) : (
          emails.map((email) => (
            <div
              key={email.id}
              className="p-4 bg-white dark:bg-[#151515] border border-slate-100 dark:border-zinc-800/80 rounded-xl hover:border-[#0078D4]/40 transition-colors space-y-2 text-xs font-sans"
            >
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-1 border-b border-slate-50 dark:border-zinc-850 pb-2">
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-mono font-bold uppercase ${
                    email.isIncoming 
                      ? "bg-teal-50 text-teal-600 dark:bg-teal-950/20 dark:text-teal-400" 
                      : "bg-indigo-50 text-indigo-600 dark:bg-indigo-950/20 dark:text-indigo-400"
                  }`}>
                    {email.isIncoming ? t("Inbox") : t("Sent")}
                  </span>
                  <span className="font-bold text-slate-750 dark:text-zinc-200">
                    {email.isIncoming 
                      ? `${t("From:")} ${email.sender}` 
                      : `${t("To:")} ${email.recipient}`}
                  </span>
                </div>
                <span className="text-[10px] text-slate-400 font-mono">
                  {new Date(email.date).toLocaleString(lang === "TR" ? "tr-TR" : "en-US")}
                </span>
              </div>

              <div>
                <h5 className="font-extrabold text-slate-800 dark:text-zinc-150 text-xs">
                  {email.subject}
                </h5>
                <p className="text-slate-600 dark:text-zinc-300 leading-relaxed whitespace-pre-wrap mt-1.5 text-xs">
                  {email.body}
                </p>
              </div>

              {email.attachments && email.attachments.length > 0 && (
                <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-dashed border-slate-50 dark:border-zinc-850">
                  <span className="text-[9px] uppercase font-bold text-slate-400 font-mono flex items-center gap-1">
                    <Paperclip className="w-3.5 h-3.5" />
                    {t("Attachments:")}
                  </span>
                  {email.attachments.map((att, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-slate-50 dark:bg-zinc-900 border border-slate-150 dark:border-zinc-800 text-[10px] font-bold text-slate-650 dark:text-zinc-300 rounded"
                    >
                      {att}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>

    </div>
  );
}
