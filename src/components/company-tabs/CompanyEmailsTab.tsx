import React, { useEffect, useRef, useState } from "react";
import { CrmDb, CrmEmail, CrmDocument } from "../../lib/CrmDb";
import { Mail, Send, Trash2, Plus, Sparkles, Paperclip, ChevronRight, User, X, Loader2, AlertTriangle, Upload, FileText } from "lucide-react";
import { useLanguage } from "../../lib/LanguageContext";
import { useOrganization } from "../../lib/OrganizationContext";
import { fetchOrganizationMailbox } from "../../lib/organizationMailbox";
import { fetchPersonalMailbox } from "../../lib/personalMailbox";
import { fetchOrganizationDirectory } from "../../lib/invitationService";
import type { OrganizationDirectoryMember } from "../../types/organization";
import { getSupabase } from "../../lib/supabaseClient";

// Reads a browser File into the {name, contentType, contentBytes} shape the
// mail API (Microsoft Graph fileAttachment) expects — contentBytes is raw
// base64, no "data:...;base64," prefix.
function readFileAsAttachment(file: File): Promise<{ name: string; contentType: string; contentBytes: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || "");
      const base64 = result.split(",")[1] || "";
      resolve({ name: file.name, contentType: file.type || "application/octet-stream", contentBytes: base64 });
    };
    reader.onerror = () => reject(reader.error || new Error("File read failed."));
    reader.readAsDataURL(file);
  });
}

interface CompanyEmailsTabProps {
  companyId: string;
  lang: "TR" | "EN";
  companyName: string;
  contactPersonName?: string;
  contactEmail?: string;
  onLogTimelineEvent?: (title: string, desc: string, type: string) => void;
}

interface SenderOption {
  source: "organization" | "personal";
  label: string;
  email: string;
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
  const { actorName } = useOrganization();
  const [emails, setEmails] = useState<CrmEmail[]>(() => CrmDb.getEmailsByCompany(companyId));
  const [documents] = useState<CrmDocument[]>(() => CrmDb.getDocumentsByCompany(companyId));
  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [senderOptions, setSenderOptions] = useState<SenderOption[]>([]);
  const [isLoadingSenders, setIsLoadingSenders] = useState(true);
  const [selectedSender, setSelectedSender] = useState<"organization" | "personal" | "">("");
  const [isSending, setIsSending] = useState(false);
  // "muhakkak bcc olarak sistem e-posta adresine gönderilmeli" — every email
  // sent from this composer is always BCC'd to the connected Organization
  // Mailbox address, regardless of which mailbox (Organization or Personal)
  // was actually chosen to send from. This is not user-editable; it's a
  // fixed audit/record-keeping copy.
  const [systemBccEmail, setSystemBccEmail] = useState("");
  const [orgMembers, setOrgMembers] = useState<OrganizationDirectoryMember[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setIsLoadingSenders(true);
      const [orgResult, personalResult] = await Promise.allSettled([
        fetchOrganizationMailbox(),
        fetchPersonalMailbox(),
      ]);
      if (cancelled) return;

      const options: SenderOption[] = [];
      if (orgResult.status === "fulfilled" && orgResult.value.mailbox.status === "Connected") {
        const orgEmail = orgResult.value.mailbox.mailbox_email || orgResult.value.mailbox.organizationMailbox || "";
        options.push({
          source: "organization",
          label: t("Organization Mailbox"),
          email: orgEmail,
        });
        setSystemBccEmail(orgEmail);
      }
      if (personalResult.status === "fulfilled" && personalResult.value.status === "Connected") {
        options.push({
          source: "personal",
          label: t("My Personal Mailbox"),
          email: personalResult.value.mailbox_address || "",
        });
      }
      setSenderOptions(options);
      setSelectedSender(options[0]?.source || "");
      setIsLoadingSenders(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [t]);

  useEffect(() => {
    let cancelled = false;
    fetchOrganizationDirectory()
      .then((dir) => {
        if (!cancelled) setOrgMembers(dir.members || []);
      })
      .catch(() => {
        // Non-fatal: CC quick-add list just stays empty.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Composer Form State
  const [formState, setFormState] = useState({
    recipient: contactEmail || `info@${companyName.toLowerCase().replace(/[^a-z0-9]/g, "")}.com`,
    cc: "",
    subject: "",
    body: "",
    attachmentName: ""
  });
  const [uploadedFiles, setUploadedFiles] = useState<{ name: string; contentType: string; contentBytes: string }[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFilesSelected = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    const files = Array.from(fileList);
    try {
      const read = await Promise.all(files.map(readFileAsAttachment));
      setUploadedFiles((prev) => [...prev, ...read]);
    } catch (err) {
      alert(err instanceof Error ? err.message : t("File could not be read."));
    }
  };

  const handleRemoveUploadedFile = (index: number) => {
    setUploadedFiles((prev) => prev.filter((_, i) => i !== index));
  };

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

  const handleSendEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formState.recipient || !formState.subject || !formState.body) {
      alert(t("Please fill out all required fields!"));
      return;
    }
    if (!selectedSender) {
      alert(t("Connect an Organization or Personal mailbox in Settings before sending email."));
      return;
    }

    setIsSending(true);
    try {
      const supabase = getSupabase();
      const {
        data: { session },
      } = supabase ? await supabase.auth.getSession() : { data: { session: null } };

      const response = await fetch("/api/mail/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({
          source: selectedSender,
          recipient: formState.recipient,
          cc: formState.cc.trim() || undefined,
          bcc: systemBccEmail || undefined,
          subject: formState.subject,
          body: formState.body.replace(/\n/g, "<br />"),
          attachments: uploadedFiles,
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        alert(payload.error || t("Email could not be sent."));
        return;
      }

      const senderOption = senderOptions.find(opt => opt.source === selectedSender);
      const attachmentLabels = [
        ...uploadedFiles.map((f) => f.name),
        ...(formState.attachmentName ? [formState.attachmentName] : []),
      ];
      CrmDb.createEmail({
        companyId,
        recipient: formState.recipient,
        sender: payload.sender || senderOption?.email || actorName,
        subject: formState.subject,
        body: formState.body,
        isIncoming: false,
        date: new Date().toISOString(),
        attachments: attachmentLabels.length > 0 ? attachmentLabels : undefined
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
        cc: "",
        subject: "",
        body: "",
        attachmentName: ""
      });
      setUploadedFiles([]);
      setSelectedTemplate("");
      setIsComposerOpen(false);
      reloadEmails();
    } catch (error) {
      alert(error instanceof Error ? error.message : t("Email could not be sent."));
    } finally {
      setIsSending(false);
    }
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

          {!isLoadingSenders && senderOptions.length === 0 && (
            <div className="flex items-start gap-2 p-2.5 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 rounded-lg text-amber-700 dark:text-amber-400">
              <AlertTriangle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
              <span className="text-[11px] leading-relaxed">
                {t("No mailbox is connected. Connect an Organization or Personal mailbox in Settings to send email from here.")}
              </span>
            </div>
          )}

          <div>
            <label className="block text-[9px] uppercase font-bold text-slate-400 mb-1">{t("Send From *")}</label>
            <select
              required
              value={selectedSender}
              onChange={(e) => setSelectedSender(e.target.value as "organization" | "personal" | "")}
              disabled={isLoadingSenders || senderOptions.length === 0}
              className="w-full bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded p-1.5 text-xs text-slate-800 dark:text-zinc-200 focus:outline-none focus:border-indigo-500 disabled:opacity-50"
            >
              {isLoadingSenders && <option value="">{t("Loading mailboxes...")}</option>}
              {!isLoadingSenders && senderOptions.length === 0 && <option value="">{t("No mailbox connected")}</option>}
              {senderOptions.map(opt => (
                <option key={opt.source} value={opt.source}>{opt.label} ({opt.email})</option>
              ))}
            </select>
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
            <label className="block text-[9px] uppercase font-bold text-slate-400 mb-1">{t("CC (Optional)")}</label>
            <input
              type="text"
              placeholder={t("name@company.com, another@company.com")}
              value={formState.cc}
              onChange={(e) => setFormState({ ...formState, cc: e.target.value })}
              className="w-full bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded p-1.5 text-xs text-slate-800 dark:text-zinc-200 focus:outline-none focus:border-indigo-500"
            />
            {orgMembers.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-1.5">
                {orgMembers
                  .filter((m) => m.email)
                  .map((m) => (
                    <button
                      key={m.user_id}
                      type="button"
                      onClick={() => {
                        const existing = formState.cc.split(",").map((s) => s.trim()).filter(Boolean);
                        if (existing.includes(m.email)) return;
                        const next = [...existing, m.email].join(", ");
                        setFormState({ ...formState, cc: next });
                      }}
                      className="px-2 py-0.5 bg-slate-100 dark:bg-zinc-800 hover:bg-indigo-100 dark:hover:bg-indigo-950/30 border border-slate-200 dark:border-zinc-700 rounded-full text-[10px] text-slate-600 dark:text-zinc-300 cursor-pointer transition-colors"
                      title={m.email}
                    >
                      + {m.full_name?.trim() || m.email}
                    </button>
                  ))}
              </div>
            )}
            {systemBccEmail && (
              <p className="text-[9px] text-slate-400 mt-1.5">
                {t("A record copy (BCC) will automatically be sent to the system mailbox: {email}").replace("{email}", systemBccEmail)}
              </p>
            )}
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
              <Upload className="w-3 h-3" />
              <span>{t("Attach File")}</span>
            </label>
            <div
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragOver(true);
              }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragOver(false);
                handleFilesSelected(e.dataTransfer.files);
              }}
              className={`w-full border-2 border-dashed rounded-lg p-3 text-center cursor-pointer transition-colors ${
                isDragOver
                  ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-950/20"
                  : "border-slate-200 dark:border-zinc-700 hover:border-indigo-300 dark:hover:border-indigo-800"
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={(e) => {
                  handleFilesSelected(e.target.files);
                  e.target.value = "";
                }}
              />
              <span className="text-[11px] text-slate-500 dark:text-zinc-400">
                {t("Click to browse or drag & drop files here")}
              </span>
            </div>

            {uploadedFiles.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {uploadedFiles.map((f, i) => (
                  <span
                    key={`${f.name}-${i}`}
                    className="inline-flex items-center gap-1 px-2 py-0.5 bg-indigo-50 dark:bg-indigo-950/20 border border-indigo-150 dark:border-indigo-900/40 text-[10px] font-bold text-indigo-700 dark:text-indigo-300 rounded"
                  >
                    <FileText className="w-3 h-3" />
                    {f.name}
                    <button
                      type="button"
                      onClick={() => handleRemoveUploadedFile(i)}
                      className="ml-0.5 hover:text-rose-500"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}

            {documents.length > 0 && (
              <div className="mt-2">
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
                <p className="text-[9px] text-slate-400 mt-1">
                  {t("Note: this is a reference note only and is not attached as a real file — use the upload area above to send an actual attachment.")}
                </p>
              </div>
            )}
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
              disabled={isSending || isLoadingSenders || senderOptions.length === 0}
              className="px-4.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded font-bold flex items-center gap-1.5 cursor-pointer shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSending ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Send className="w-3.5 h-3.5" />
              )}
              <span>{isSending ? t("Sending...") : t("Send Email")}</span>
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
