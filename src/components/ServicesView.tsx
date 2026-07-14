import React, { useState, useEffect, useRef } from "react";
const logoImage = "https://lh3.googleusercontent.com/d/13bNnthJU4LIICB4iiF1a4GH1PEn05MBx";
import { 
  FileText, 
  FileSignature, 
  Download, 
  Maximize2, 
  Minimize2, 
  Edit3, 
  CheckCircle2, 
  Plus, 
  RotateCcw, 
  Settings, 
  UserCheck, 
  Building, 
  Calendar as CalendarIcon, 
  Tag, 
  HelpCircle,
  FileCheck,
  Briefcase,
  SpellCheck,
  Award,
  BookOpen,
  ChevronRight,
  ChevronLeft,
  Layers,
  Sparkles,
  Clipboard,
  Trash2,
  Table,
  Check,
  Save,
  Type,
  AlignLeft,
  List,
  Eye,
  Info,
  Filter,
  Search,
  Mail,
  Send,
  Copy,
  Paperclip,
  ArrowRight
} from "lucide-react";
import { convertCurrencyToTurkishWords, convertNumberToTurkishWords } from "./ContractManagerView";
import { jsPDF } from "jspdf";
import Docxtemplater from "docxtemplater";
import PizZip from "pizzip";
import { CrmDb } from "../lib/CrmDb";
import { useLanguage } from "../lib/LanguageContext";

// --- CORE INTERFACES ---
interface ServiceCard {
  id: string;
  name: string;
  category: "PROJE" | "ANALİZ" | "KOÇLUK" | "GEMBA TEKNİK" | "EĞİTİM";
  code: string;
  defaultCoverPage: string;
  activityTableHtml: string;
  defaultTermsAndConditions?: string;
  docxTemplateName?: string;
  option1Active?: boolean;
  option1Name?: string;
  option1Desc?: string;
  option1Duration?: string;
  option1Rows?: PricingRow[];
  option2Active?: boolean;
  option2Name?: string;
  option2Desc?: string;
  option2Duration?: string;
  option2Rows?: PricingRow[];
  option3Active?: boolean;
  option3Name?: string;
  option3Desc?: string;
  option3Duration?: string;
  option3Rows?: PricingRow[];
}

// Predefined 10 Services
const DEFAULT_SERVICE_CARDS: ServiceCard[] = [
  {
    id: "yalin-uretim",
    name: "YALIN ÜRETİM DÖNÜŞÜM PROJESİ",
    category: "PROJE",
    code: "201",
    defaultCoverPage: `
      <h1 style="font-size: 28px; font-weight: 800; color: #1e293b; margin-bottom: 12px; line-height: 1.2; text-transform: uppercase;">YALIN ÜRETİM DÖNÜŞÜM PROJESİ</h1>
      <h3 style="font-size: 16px; font-weight: 600; color: #0078D4; margin-bottom: 24px;">Gemba Operasyonel Mükemmellik & İşbirlikçi Dönüşüm Programı</h3>
      <p style="font-size: 12px; color: #64748b; line-height: 1.6; margin-bottom: 16px;">Bu çalışma, firma süreçlerindeki israfları tespit etmek, değer akışını optimize etmek ve sürekli iyileştirme kültürü (Kaizen) yerleştirmek amacıyla tasarlanmıştır.</p>
    `,
    activityTableHtml: `
      <table style="border-collapse: collapse; width: 100%; border: 1px solid #cbd5e1; font-family: sans-serif; font-size: 11px;">
        <thead>
          <tr style="background-color: #f1f5f9; border-bottom: 2px solid #cbd5e1;">
            <th style="border: 1px solid #cbd5e1; padding: 10px; text-align: left; font-weight: bold; width: 20%;">Fazlar / Milestones</th>
            <th style="border: 1px solid #cbd5e1; padding: 10px; text-align: left; font-weight: bold; width: 45%;">Faaliyet Detayları ve Çalışma Başlıkları</th>
            <th style="border: 1px solid #cbd5e1; padding: 10px; text-align: left; font-weight: bold; width: 15%;">Sorumlu</th>
            <th style="border: 1px solid #cbd5e1; padding: 10px; text-align: center; font-weight: bold; width: 20%;">Efor (Adam/Gün)</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td rowspan="2" style="border: 1px solid #cbd5e1; padding: 8px; font-weight: bold; background-color: #fafafa; vertical-align: middle;">Faz 1: Teşhis & Hazırlık</td>
            <td style="border: 1px solid #cbd5e1; padding: 8px; vertical-align: top;">Görsel yönetim analizi, mevcut durum 5S denetimi ve israf tespit saha yürüyüşleri.</td>
            <td style="border: 1px solid #cbd5e1; padding: 8px; vertical-align: top;">Gemba Danışmanı</td>
            <td style="border: 1px solid #cbd5e1; padding: 8px; text-align: center; font-weight: bold; vertical-align: middle;">12 Adam/Gün</td>
          </tr>
          <tr>
            <td style="border: 1px solid #cbd5e1; padding: 8px; vertical-align: top;">Üst Yönetim Hizalaması ve Dönüşüm Yol Haritası (VSM) hazırlanması.</td>
            <td style="border: 1px solid #cbd5e1; padding: 8px; vertical-align: top;">Kıdemli Danışman</td>
            <td style="border: 1px solid #cbd5e1; padding: 8px; text-align: center; font-weight: bold; vertical-align: middle;">8 Adam/Gün</td>
          </tr>
          <tr>
            <td rowspan="2" style="border: 1px solid #cbd5e1; padding: 8px; font-weight: bold; background-color: #fafafa; vertical-align: middle;">Faz 2: Kaizen & Uygulama</td>
            <td style="border: 1px solid #cbd5e1; padding: 8px; vertical-align: top;">Süreç Hızlandırma Kaizen Atölyesi (Saha içi 5 günlük yoğun iyileştirme).</td>
            <td style="border: 1px solid #cbd5e1; padding: 8px; vertical-align: top;">Proje Ekibi & Koç</td>
            <td style="border: 1px solid #cbd5e1; padding: 8px; text-align: center; font-weight: bold; vertical-align: middle;">15 Adam/Gün</td>
          </tr>
          <tr>
            <td style="border: 1px solid #cbd5e1; padding: 8px; vertical-align: top;">Standart iş talimatları (Yamazumi) ve yeni hat dengeleme uygulamaları.</td>
            <td style="border: 1px solid #cbd5e1; padding: 8px; vertical-align: top;">Yalın Uzmanı</td>
            <td style="border: 1px solid #cbd5e1; padding: 8px; text-align: center; font-weight: bold; vertical-align: middle;">10 Adam/Gün</td>
          </tr>
        </tbody>
      </table>
    `,
    defaultTermsAndConditions: `1. İşbu çalışma teklifi kapsamındaki ödemeler %50 sipariş onayı ile birlikte fatura karşılığında nakden, bakiye %50 ise nihai teslimat raporunun onaylanmasını müteakip 15 gün içerisinde banka havalesi ile ödenecektir.
2. İşbu teklifteki bütçe bedellerine %20 KDV dahil değildir. Faturalandırma tarihindeki yasal KDV oranı uygulanacaktır.
3. Çalışmanın gerçekleştirileceği tesisler dışındaki seyahat, konaklama ve yemek masrafları, belge asılları üzerinden müşteriye aynen yansıtılır.`
  },
  {
    id: "opex-assessment",
    name: "OPEX ASSESSMENT (OPERASYONEL MÜKEMMELLİK)",
    category: "ANALİZ",
    code: "101",
    defaultCoverPage: `
      <h1 style="font-size: 28px; font-weight: 800; color: #107C41; margin-bottom: 12px; line-height: 1.2; text-transform: uppercase;">OPEX ASSESSMENT</h1>
      <h3 style="font-size: 16px; font-weight: 600; color: #107C41; margin-bottom: 24px;">Operasyonel Olgunluk Seviyesi Belirleme Raporu</h3>
      <p style="font-size: 12px; color: #64748b; line-height: 1.6; margin-bottom: 16px;">İşletmenizin yalın yönetim, verimlilik ve kalite parametreleri altında global iyi uygulamalara göre kıyaslama (benchmarking) ve analiz çalışması teklifidir.</p>
    `,
    activityTableHtml: `
      <table style="border-collapse: collapse; width: 100%; border: 1px solid #cbd5e1; font-family: sans-serif; font-size: 11px;">
        <thead>
          <tr style="background-color: #e2f0d9; border-bottom: 2px solid #a9d18e;">
            <th style="border: 1px solid #cbd5e1; padding: 10px; text-align: left; font-weight: bold; width: 30%;">Analiz Alanı (Silo)</th>
            <th style="border: 1px solid #cbd5e1; padding: 10px; text-align: left; font-weight: bold; width: 50%;">Değerlendirme Kriterleri / Metot</th>
            <th style="border: 1px solid #cbd5e1; padding: 10px; text-align: center; font-weight: bold; width: 20%;">Adam/Gün</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="border: 1px solid #cbd5e1; padding: 8px; font-weight: bold;">Liderlik ve Kültür</td>
            <td style="border: 1px solid #cbd5e1; padding: 8px;">Takım yapısı, öneri sistemleri, yönetim anayasası ve Gemba gelişim takipleri anketi.</td>
            <td style="border: 1px solid #cbd5e1; padding: 8px; text-align: center; font-weight: bold;">3 Adam/Gün</td>
          </tr>
          <tr>
            <td style="border: 1px solid #cbd5e1; padding: 8px; font-weight: bold;">Saha Yönetim Standartları</td>
            <td style="border: 1px solid #cbd5e1; padding: 8px;">5S, görsel göstergeler, otonom bakım ve yerinde kalite kontrol altyapı denetimleri.</td>
            <td style="border: 1px solid #cbd5e1; padding: 8px; text-align: center; font-weight: bold;">5 Adam/Gün</td>
          </tr>
        </tbody>
      </table>
    `,
    defaultTermsAndConditions: `1. Analiz çalışması bedeli, raporun teslim edildiği gün peşin olarak fatura edilir. Ödeme vadesi fatura tarihinden itibaren 5 takvim günüdür.
2. Belirtilen fiyatlara %20 KDV dâhil değildir.
3. Analiz boyunca edinilen veriler ve ticari sırlar Gemba Partner gizlilik taahhüdü altındadır.`
  },
  {
    id: "lean-logistics",
    name: "LEAN LOGISTICS ASSESSMENT",
    category: "ANALİZ",
    code: "102",
    defaultCoverPage: `
      <h1 style="font-size: 28px; font-weight: 800; color: #1e293b; margin-bottom: 12px; text-transform: uppercase;">LEAN LOGISTICS ASSESSMENT</h1>
      <h3 style="font-size: 16px; font-weight: 600; color: #b45309; margin-bottom: 24px;">Lojistik Depolama ve İç Akış Süreçleri Tasarımı</h3>
    `,
    activityTableHtml: `
      <table style="border-collapse: collapse; width: 100%; border: 1px solid #cbd5e1; font-family: sans-serif; font-size: 11px;">
        <thead>
          <tr style="background-color: #fef3c7; border-bottom: 2px solid #f59e0b;">
            <th style="border: 1px solid #cbd5e1; padding: 8px; text-align: left;">Süreç</th>
            <th style="border: 1px solid #cbd5e1; padding: 8px; text-align: left;">Detaylar</th>
            <th style="border: 1px solid #cbd5e1; padding: 8px; text-align: center;">Efor</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="border: 1px solid #cbd5e1; padding: 8px; font-weight: bold;">Depo Yerleşim Analizi</td>
            <td style="border: 1px solid #cbd5e1; padding: 8px;">Mal kabul, adresleme ve FIFO kurallarına uygun depolama alanı israf haritalama.</td>
            <td style="border: 1px solid #cbd5e1; padding: 8px; text-align: center;">4 Adam/Gün</td>
          </tr>
        </tbody>
      </table>
    `,
    defaultTermsAndConditions: `1. Ödeme Şartı: %100 çalışma tamamlandığında teslim edilen raporla birlikte fatura edilir, vadesi 7 gündür.
2. Detaylı bütçeler net tutarlar olup KDV ayrıca ilave edilir.`
  },
  {
    id: "ofis-opex",
    name: "OFIS OPEX ASSESSMENT",
    category: "ANALİZ",
    code: "103",
    defaultCoverPage: "<h1>OFİS OPERASYONEL MÜKEMMELLİK DEĞERLENDİRMESİ</h1>",
    activityTableHtml: "<table><tr><td>Ofis süreçlerinde israf ve dijital olgunluk endeksi ölçümü.</td></tr></table>",
    defaultTermsAndConditions: "1. Peşin ödemeli çalışmadır. KDV dahil değildir."
  },
  {
    id: "tpm-uygulama",
    name: "TPM UYGULAMA (TOPLAM VERİMLİ BAKIM)",
    category: "PROJE",
    code: "202",
    defaultCoverPage: "<h1>OPEX VE TPM (TOPLAM VERİMLİ BAKIM) PROJESİ</h1>",
    activityTableHtml: "<table><tr><td>Otonom bakım ve arıza giderme yöntemleri kurulumu.</td></tr></table>",
    defaultTermsAndConditions: "1. Aylık hakediş usulü fatura edilir. Net vadeli ödeme alınır."
  },
  {
    id: "yalin-tedarik",
    name: "YALIN TEDARİK ZİNCİRİ YÖNETİMİ",
    category: "PROJE",
    code: "203",
    defaultCoverPage: "<h1>YALIN TEDARİK ZİNCİRİ VE KANBAN ENTEGRASYONU</h1>",
    activityTableHtml: "<table><tr><td>Çekme sistemi altyapısı ve süpermarket süreç tasarımı.</td></tr></table>",
    defaultTermsAndConditions: "1. Proje başlangıcında %50, kalanı kapanışta havale ile ödenir."
  },
  {
    id: "layout-planlama",
    name: "YERLEŞİM PLANLAMA / LAYOUT TASARIMI",
    category: "PROJE",
    code: "204",
    defaultCoverPage: "<h1>YERLEŞİM PLANLAMA & FABRİKA YOL HARİTASI</h1>",
    activityTableHtml: "<table><tr><td>Spagetti diyagramı analizi ve tesis içi malzeme akış simülasyonu.</td></tr></table>",
    defaultTermsAndConditions: "1. Tasarım onayı sonrası %100 tahsilat ile tamamlanır."
  },
  {
    id: "problem-cozme",
    name: "PROBLEM ÇÖZME ÇALIŞMALARI (A3 & 8D)",
    category: "KOÇLUK",
    code: "301",
    defaultCoverPage: "<h1>PROBLEM ÇÖZME VE KÖK NEDEN ANALİZ KOÇLUĞU</h1>",
    activityTableHtml: "<table><tr><td>Saha ekiplerine yönelik 5 Neden ve Balık Kılçığı mentörlüğü.</td></tr></table>",
    defaultTermsAndConditions: "1. Eğitim kiti teslimiyle havale vadeli faturalandırılır."
  },
  {
    id: "liderlik-calismalari",
    name: "LİDERLİK ÇALIŞMALARI VE SAHA YÖNETİMİ",
    category: "KOÇLUK",
    code: "302",
    defaultCoverPage: "<h1>LİDERLİK GELİŞİM PROGRAMI VE MENTÖRLÜK</h1>",
    activityTableHtml: "<table><tr><td>Mavi ve beyaz yaka liderleri için günlük yönetim sistemleri.</td></tr></table>",
    defaultTermsAndConditions: "1. Aylık periyotlar halinde fatura edilir. KDV hariçtir."
  },
  {
    id: "ofis-kaizen",
    name: "OFİS KAIZEN DESTEKLERİ",
    category: "PROJE",
    code: "205",
    defaultCoverPage: "<h1>HİZMET VE OFİS SÜREÇLERİNDE KAIZEN DESTEKLERİ</h1>",
    activityTableHtml: "<table><tr><td>Bilgi akış haritalama (makro-mikro) ve onay darboğazları tespiti.</td></tr></table>",
    defaultTermsAndConditions: "1. Sipariş kaydında %50, kalanı atölye bitiminde ödenir."
  }
];

const LETTERHEADS = [
  {
    id: "classic_blue",
    name: "Blue Corporate (Classic)",
    primaryColor: "#0078D4",
    accentColor: "#DEECF9",
    tagline: "GEMBA OPERASYONEL MÜKEMMELLİK DANIŞMANLIK A.Ş.",
    details: "Maslak Mah. Büyükdere Cad. No:125, Sarıyer/İstanbul | info@gembaopex.com | +90 (212) 365 44 00"
  },
  {
    id: "emerald_lean",
    name: "Emerald Green (Lean Industrial)",
    primaryColor: "#107C41",
    accentColor: "#DFF6DD",
    tagline: "GEMBA OPERASYONEL MÜKEMMELLİK & YALIN DÖNÜŞÜM",
    details: "İTÜ Teknokent, Sarıyer/İstanbul | www.gembaopex.com | opex@gembaopex.com"
  },
  {
    id: "classic_slate",
    name: "Dark Theme (Tech Slate)",
    primaryColor: "#334155",
    accentColor: "#F1F5F9",
    tagline: "GEMBA PARTNERS / MANAGEMENT CONSULTING GROUP",
    details: "Maslak Plaza Kat:12, İstanbul | global@gembapartners.com | Mersis No: 038804562400001"
  }
];

// Interface for custom pricing structures per option
export interface PricingRow {
  id: string;
  item: string;
  dailyRate: number;
  manDays: number;
}

import { Plus as PlusEditor, Trash2 as TrashEditor, ArrowUp as ArrowUpEditor, ArrowDown as ArrowDownEditor } from "lucide-react";

interface OptionRowEditorProps {
  rows: PricingRow[];
  onChange: (updated: PricingRow[]) => void;
  optionLabel: string;
}

export const OptionRowEditor: React.FC<OptionRowEditorProps> = ({ rows, onChange, optionLabel }) => {
  const { t } = useLanguage();
  const handleAddRow = () => {
    const nextId = `${optionLabel.toLowerCase().replace(/\s/g, "")}-row-${Date.now()}`;
    onChange([
      ...rows,
      { id: nextId, item: "Yeni Hizmet Efor Kalemi", dailyRate: 15000, manDays: 1 }
    ]);
  };

  const handleUpdateRow = (id: string, field: keyof PricingRow, value: any) => {
    onChange(rows.map(r => r.id === id ? { ...r, [field]: value } : r));
  };

  const handleRemoveRow = (id: string) => {
    onChange(rows.filter(r => r.id !== id));
  };

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const copy = [...rows];
    const temp = copy[index];
    copy[index] = copy[index - 1];
    copy[index - 1] = temp;
    onChange(copy);
  };

  const handleMoveDown = (index: number) => {
    if (index === rows.length - 1) return;
    const copy = [...rows];
    const temp = copy[index];
    copy[index] = copy[index + 1];
    copy[index + 1] = temp;
    onChange(copy);
  };

  return (
    <div className="space-y-3 pt-3 border-t border-slate-200 dark:border-zinc-800">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider">
          {optionLabel} Teklif Tablosu Kalemleri ({"{{Teklif" + optionLabel.slice(-1) + "Tablo}}"})
        </span>
        <button
          type="button"
          onClick={handleAddRow}
          className="bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/20 text-[#0078D4] dark:text-blue-300 text-[10px] font-extrabold px-2.5 py-1 rounded flex items-center gap-1 cursor-pointer transition-all"
        >
          <PlusEditor className="w-3 h-3" /> Satır Ekle
        </button>
      </div>

      <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
        {rows.map((row, index) => (
          <div key={row.id} className="grid grid-cols-12 gap-2 bg-slate-50/70 dark:bg-zinc-800/20 p-2 rounded border border-slate-150 dark:border-zinc-800/80 items-center">
            {/* Item description */}
            <div className="col-span-12 sm:col-span-5">
              <input
                type="text"
                value={row.item}
                onChange={(e) => handleUpdateRow(row.id, "item", e.target.value)}
                placeholder="Hizmet efor başlığı..."
                className="w-full bg-white dark:bg-[#1b1a19] border border-slate-200 dark:border-[#323130] rounded px-2 py-1 text-xs text-slate-900 dark:text-white"
              />
            </div>

            {/* Daily rate */}
            <div className="col-span-5 sm:col-span-3">
              <div className="relative">
                <input
                  type="number"
                  value={row.dailyRate}
                  onChange={(e) => handleUpdateRow(row.id, "dailyRate", parseFloat(e.target.value) || 0)}
                  placeholder="Birim Gün Ücreti"
                  className="w-full bg-white dark:bg-[#1b1a19] border border-slate-200 dark:border-[#323130] rounded pl-2 pr-5 py-1 text-xs text-slate-900 dark:text-white text-right"
                />
                <span className="absolute right-1 text-[9px] text-slate-400 font-bold top-1.5 select-none">TL</span>
              </div>
            </div>

            {/* Man days */}
            <div className="col-span-3 sm:col-span-2">
              <input
                type="number"
                value={row.manDays}
                onChange={(e) => handleUpdateRow(row.id, "manDays", parseFloat(e.target.value) || 0)}
                placeholder="A/G"
                className="w-full bg-white dark:bg-[#1b1a19] border border-slate-200 dark:border-[#323130] rounded p-1 text-xs text-slate-900 dark:text-white text-center"
              />
            </div>

            {/* Total Budget & Controls */}
            <div className="col-span-4 sm:col-span-2 flex items-center justify-between gap-1">
              <div className="text-[10px] font-black text-slate-800 dark:text-slate-200 truncate pr-0.5">
                {new Intl.NumberFormat("tr-TR").format(row.dailyRate * row.manDays)}
              </div>
              <div className="flex items-center gap-0.5">
                <button
                  type="button"
                  disabled={index === 0}
                  onClick={() => handleMoveUp(index)}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 disabled:opacity-30 p-0.5 rounded cursor-pointer transition-colors"
                  title="Yukarı Taşı"
                >
                  <ArrowUpEditor className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  disabled={index === rows.length - 1}
                  onClick={() => handleMoveDown(index)}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 disabled:opacity-30 p-0.5 rounded cursor-pointer transition-colors"
                  title="Aşağı Taşı"
                >
                  <ArrowDownEditor className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => handleRemoveRow(row.id)}
                  className="text-rose-500 hover:text-rose-600 hover:bg-rose-100/40 p-0.5 rounded cursor-pointer transition-colors"
                  title="Satırı Sil"
                >
                  <TrashEditor className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        ))}

        {rows.length === 0 && (
          <p className="text-[10px] italic text-slate-400 text-center py-2 bg-slate-50 dark:bg-zinc-800/10 rounded">Tabloda henüz efor kalemi eklenmedi. Satır Ekle ile bütçelendirebilirsiniz.</p>
        )}
      </div>
    </div>
  );
};

export default function ServicesView({ 
  defaultTab = "cards", 
  showSwitcher = false 
}: { 
  defaultTab?: "cards" | "wizard"; 
  showSwitcher?: boolean; 
}) {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<"cards" | "wizard">(defaultTab);

  useEffect(() => {
    setActiveTab(defaultTab);
  }, [defaultTab]);

  const [serviceCards, setServiceCards] = useState<ServiceCard[]>(() => {
    const saved = CrmDb.getKv<ServiceCard[] | null>("crm_service_cards", null);
    return saved && saved.length > 0 ? saved : DEFAULT_SERVICE_CARDS;
  });

  // Save Service Cards
  useEffect(() => {
    CrmDb.setKv("crm_service_cards", serviceCards);
  }, [serviceCards]);

  // --- STATE FOR EDITING SERVICE CARDS ---
  const [selectedEditCardId, setSelectedEditCardId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editCategory, setEditCategory] = useState<ServiceCard["category"]>("PROJE");
  const [editCode, setEditCode] = useState("");
  const [editCoverPage, setEditCoverPage] = useState("");
  const [editTableHtml, setEditTableHtml] = useState("");
  const [editTerms, setEditTerms] = useState("");
  const [pastePrompt, setPastePrompt] = useState(false);
  const [isTableCollapsed, setIsTableCollapsed] = useState(false);
  const [rawPastedHtml, setRawPastedHtml] = useState("");
  const [isAiConverting, setIsAiConverting] = useState(false);

  // Custom stylish delete confirmation state
  const [confirmDeleteModal, setConfirmDeleteModal] = useState<{
    isOpen: boolean;
    onConfirm: () => void;
    title?: string;
    message?: string;
  }>({ isOpen: false, onConfirm: () => {} });

  // Store custom uploaded PNG template (cover.png) info per service Id
  const [uploadedCoverTemplates, setUploadedCoverTemplates] = useState<{[key: string]: {name: string, size: string, uploadedAt: string}}>(() => {
    return CrmDb.getKv("crm_uploaded_cover_templates", {});
  });

  // Store custom uploaded PNG template (page.png) info per service Id
  const [uploadedPageTemplates, setUploadedPageTemplates] = useState<{[key: string]: {name: string, size: string, uploadedAt: string}}>(() => {
    return CrmDb.getKv("crm_uploaded_page_templates", {});
  });

  const [inMemoryCoverTemplates, setInMemoryCoverTemplates] = useState<{[key: string]: string}>(() => {
    const loaded: {[key: string]: string} = {};
    const parsed = CrmDb.getKv<Record<string, unknown>>("crm_uploaded_cover_templates", {});
    Object.keys(parsed).forEach(sid => {
      const content = CrmDb.getKv<string | null>(`crm_png_template_cover_${sid}`, null);
      if (content) {
        loaded[sid] = content;
      }
    });
    return loaded;
  });

  const [inMemoryPageTemplates, setInMemoryPageTemplates] = useState<{[key: string]: string}>(() => {
    const loaded: {[key: string]: string} = {};
    const parsed = CrmDb.getKv<Record<string, unknown>>("crm_uploaded_page_templates", {});
    Object.keys(parsed).forEach(sid => {
      const content = CrmDb.getKv<string | null>(`crm_png_template_page_${sid}`, null);
      if (content) {
        loaded[sid] = content;
      }
    });
    return loaded;
  });

  const activeEditCard = serviceCards.find(c => c.id === selectedEditCardId);

  useEffect(() => {
    // Sync templates with server-side persistent files on mount
    fetch("/api/templates/list")
      .then(res => {
        if (!res.ok) throw new Error("Template sync error");
        return res.json();
      })
      .then(data => {
        if (data.covers && data.pages) {
          const serverCovers: {[key: string]: string} = {};
          const serverCoverMeta: {[key: string]: any} = {};
          Object.keys(data.covers).forEach(sid => {
            serverCovers[sid] = data.covers[sid].url;
            serverCoverMeta[sid] = {
              name: data.covers[sid].name,
              size: data.covers[sid].size,
              uploadedAt: data.covers[sid].uploadedAt
            };
          });

          const serverPages: {[key: string]: string} = {};
          const serverPageMeta: {[key: string]: any} = {};
          Object.keys(data.pages).forEach(sid => {
            serverPages[sid] = data.pages[sid].url;
            serverPageMeta[sid] = {
              name: data.pages[sid].name,
              size: data.pages[sid].size,
              uploadedAt: data.pages[sid].uploadedAt
            };
          });

          setInMemoryCoverTemplates(prev => ({ ...serverCovers, ...prev }));
          setUploadedCoverTemplates(prev => ({ ...serverCoverMeta, ...prev }));
          setInMemoryPageTemplates(prev => ({ ...serverPages, ...prev }));
          setUploadedPageTemplates(prev => ({ ...serverPageMeta, ...prev }));
        }
      })
      .catch(err => {
        console.warn("Failed to synchronize templates from server:", err);
      });
  }, []);

  useEffect(() => {
    if (activeEditCard) {
      setEditName(activeEditCard.name);
      setEditCategory(activeEditCard.category);
      setEditCode(activeEditCard.code);
      setEditCoverPage(activeEditCard.defaultCoverPage);
      setEditTableHtml(activeEditCard.activityTableHtml);
      setEditTerms(activeEditCard.defaultTermsAndConditions || "");
    }
  }, [selectedEditCardId, activeEditCard]);

  // --- WIZARD FORM STATE ---
  const [wizardStep, setWizardStep] = useState<1 | 2 | 3 | 4 | 5 | 6>(1);
  const [clientTitle, setClientTitle] = useState("Vakko Tekstil ve Hazır Giyim A.Ş.");
  const [clientShortName, setClientShortName] = useState("VakkoTekstil");
  const [isShortNameManuallyEdited, setIsShortNameManuallyEdited] = useState(false);
  const [clientAddress, setClientAddress] = useState("Koza Mahallesi, Sanayi Caddesi No:116, Esenyurt/İstanbul");
  const [proposalDate, setProposalDate] = useState(new Date().toISOString().split('T')[0]);
  const [assignedPm, setAssignedPm] = useState("Ahmet Kutsi");

  // Sync clientShortName from clientTitle unless manually edited
  useEffect(() => {
    if (!isShortNameManuallyEdited && clientTitle) {
      // Extract first 1 or 2 words, delete common extensions like Sanayi, Ticaret, Ltd, Şti, A.Ş. 
      // concatenate them, and strip any non-alphanumeric characters
      const cleanParts = clientTitle
        .replace(/a\.ş\.|ltd\.|şti\.|ticaret|sanayi|grup|ve|ve/gi, "")
        .split(/\s+/)
        .filter(p => p.trim().length > 1)
        .slice(0, 2)
        .map(word => {
          // Remove non-alphanumeric Turkish chars
          return word.replace(/[^a-zA-Z0-9çgöşüıÇĞÖŞÜİ]/g, "");
        })
        .join("");
      
      if (cleanParts) {
        setClientShortName(cleanParts);
      }
    }
  }, [clientTitle, isShortNameManuallyEdited]);

  // Client's internal contact info
  const [clientContactPerson, setClientContactPerson] = useState("Atakan Zehir");
  const [clientContactEmail, setClientContactEmail] = useState("atakan.zehir@gmail.com");

  // Integrated Email Draft Templates
  const [emailTemplates, setEmailTemplates] = useState<{ id: string; name: string; subject: string; body: string }[]>(() => {
    const saved = CrmDb.getKv<{ id: string; name: string; subject: string; body: string }[] | null>("crm_email_templates", null);
    if (saved && saved.length > 0) {
      return saved;
    }
    return [
      {
        id: "temp-1",
        name: "Standart Teklif Sunum Taslağı",
        subject: "Gemba Partner: {{FirmaAdı}} - {{Projeİçeriği}} İş Birliği Teklifi",
        body: "Sayın {{İlgiliKişi}},\n\nFirmamız bünyesinde hazırlanan \"{{Projeİçeriği}}\" konulu ticari ve teknik teklif dökümanımız ekte bilgilerinize sunulmuştur.\n\nSüreçlerinizi yalınlaştırmak ve operasyonel mükemmellik seviyenizi artırmak adına yapacağımız bu iş birliğinin hayırlı olmasını dileriz.\n\nHerhangi bir sorunuz olursa bizimle dilediğiniz zaman iletişime geçebilirsiniz.\n\nSaygılarımızla,\n{{Yönetici}}\nGemba Partner"
      },
      {
        id: "temp-2",
        name: "Kısa ve Net Hatırlatma Taslağı",
        subject: "Gemba Partner / {{FirmaAdı}} Proje Teklifi",
        body: "Merhaba {{İlgiliKişi}} Bey/Hanım,\n\n{{Projeİçeriği}} kapsamında hazırladığımız çok alternatifli güncel teklifimizi ekte paylaşıyorum.\n\nDeğerlendirmenizi müteakip detayları netleştirmek üzere bir araya gelmekten memnuniyet duyarız.\n\nİyi çalışmalar dilerim,\nGemba Partner Ekibi"
      },
      {
        id: "temp-3",
        name: "Yalın Danışmanlık ve Analiz Taslağı",
        subject: "Yalın Dönüşüm & Analiz Teklifi - {{FirmaAdı}}",
        body: "Sayın {{İlgiliKişi}},\n\nGerçekleştireceğimiz \"{{Projeİçeriği}}\" çalışmasına dair hazırlamış olduğumuz detaylı analiz ve efor planımız ekteki dökümanda yer almaktadır.\n\nYalın felsefe çerçevesinde israfları yok etmek ve verimliliğinizi maksimize etmek için heyecan duyuyoruz.\n\nİletişimde kalmak dileğiyle,\n{{Yönetici}}\nGemba Partner"
      }
    ];
  });

  const [selectedEmailTemplateId, setSelectedEmailTemplateId] = useState<string>("temp-1");
  const [mailClientType, setMailClientType] = useState<"mailto" | "gmail" | "outlook" | "outlook-corp">("mailto");

  // Editable fields for the compiled email template
  const [mailSubject, setMailSubject] = useState("");
  const [mailBody, setMailBody] = useState("");
  
  // Custom Autocomplete for Company Registry auto-detection
  const [registeredCompanies, setRegisteredCompanies] = useState<any[]>([]);
  const [showCompaniesDropdown, setShowCompaniesDropdown] = useState(false);

  // Dynamic proposal number details format "YYMM-SequenceNumber"
  const [seqNumber, setSeqNumber] = useState("44");
  const [proposalNumber, setProposalNumber] = useState("");
  const [isDuplicateNumber, setIsDuplicateNumber] = useState(false);
  const [isNumberManuallyEdited, setIsNumberManuallyEdited] = useState(false);

  // Dynamic proposal sequence calculation from proposal archive
  useEffect(() => {
    const list = CrmDb.getProposals();
    let maxSeq = 43; // Default highest sequence in standard seed demo
    if (list.length > 0) {
      list.forEach((p: any) => {
        if (p.sequenceNo && typeof p.sequenceNo === "number" && p.sequenceNo > maxSeq) {
          maxSeq = p.sequenceNo;
        }
        if (p.proposalNumber) {
          const parts = p.proposalNumber.split("-");
          if (parts.length === 2) {
            const seq = parseInt(parts[1], 10);
            if (!isNaN(seq) && seq > maxSeq) {
              maxSeq = seq;
            }
          }
        }
      });
    }
    const nextSeq = maxSeq + 1;
    setSeqNumber(String(nextSeq));
  }, [proposalDate, wizardStep]);

  // Sync proposal number reactively based on date and seqNumber (if not manually overridden)
  useEffect(() => {
    if (proposalDate && !isNumberManuallyEdited) {
      const parts = proposalDate.split("-");
      if (parts.length === 3) {
        const yy = parts[0].slice(-2);
        const mm = parts[1];
        setProposalNumber(`${yy}${mm}-${seqNumber}`);
      }
    }
  }, [proposalDate, seqNumber, isNumberManuallyEdited]);

  // wizard cover page editable rich text content
  const [wizardCoverPage, setWizardCoverPage] = useState("");
  const [wizardTableHtml, setWizardTableHtml] = useState("");
  const [wizardTableCollapsed, setWizardTableCollapsed] = useState(false);
  const [wizardPastePrompt, setWizardPastePrompt] = useState(false);
  const [wizardRawPastedHtml, setWizardRawPastedHtml] = useState("");
  const [isWizardAiConverting, setIsWizardAiConverting] = useState(false);

  // Duplicate proposal number warning checker
  useEffect(() => {
    if (proposalNumber) {
      const list = CrmDb.getProposals();
      const duplicate = list.some((p: any) => p.proposalNumber === proposalNumber);
      setIsDuplicateNumber(duplicate);
    } else {
      setIsDuplicateNumber(false);
    }
  }, [proposalNumber]);

  useEffect(() => {
    const companies = CrmDb.getCompanies();
    if (companies.length > 0) {
      setRegisteredCompanies(companies);
    } else {
      // Fallback
      setRegisteredCompanies([
        {
          id: "company-1",
          name: "ABC Automotive",
          billingAddress: "Organize Sanayi Bolgesi, 4. Cadde No: 12",
          billingDistrict: "Nilüfer",
          billingCity: "Bursa",
          billingCountry: "Türkiye"
        },
        {
          id: "company-2",
          name: "Kordsa Tekstil",
          billingAddress: "Alikahya Fatih Mahallesi, Sanayi Bulvari No: 90",
          billingDistrict: "İzmit",
          billingCity: "Kocaeli",
          billingCountry: "Türkiye"
        }
      ]);
    }
  }, [wizardStep]);

  const matchingCompanies = registeredCompanies.filter(comp => 
    comp.name && comp.name.toLowerCase().includes((clientTitle || "").toLowerCase())
  );
  
  const [selectedCardId, setSelectedCardId] = useState<string>(serviceCards[0]?.id || "yalin-uretim");
  const [showAttachmentHelper, setShowAttachmentHelper] = useState(false);
  const [serviceFilterQuery, setServiceFilterQuery] = useState("");
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const handleSaveServiceDefaults = () => {
    if (!selectedService) return;
    setServiceCards(prev => prev.map(c => {
      if (c.id === selectedService.id) {
        return {
          ...c,
          defaultCoverPage: wizardCoverPage,
          defaultTermsAndConditions: wizardTermsAndConditions,
          activityTableHtml: wizardTableHtml,
          option1Active,
          option1Name,
          option1Desc,
          option1Duration,
          option1Rows,
          option2Active,
          option2Name,
          option2Desc,
          option2Duration,
          option2Rows,
          option3Active,
          option3Name,
          option3Desc,
          option3Duration,
          option3Rows
        };
      }
      return c;
    }));
    setToastMessage(t("Default template saved successfully!"));
    alert(t("Service defaults saved as template for future proposals."));
  };
  
  const filteredServiceCards = serviceCards.filter(c =>
    (c.name || "").toLowerCase().includes(serviceFilterQuery.toLowerCase()) ||
    (c.code || "").toLowerCase().includes(serviceFilterQuery.toLowerCase()) ||
    (c.category || "").toLowerCase().includes(serviceFilterQuery.toLowerCase())
  );
  
  // Terms and conditions for the active wizard document
  const [wizardTermsAndConditions, setWizardTermsAndConditions] = useState(() => {
    return CrmDb.getKv("crm_persistent_general_terms", "");
  });

  // Load persistent general terms across all templates, or fall back to service default if empty
  useEffect(() => {
    const savedGlobalTerms = CrmDb.getKv("crm_persistent_general_terms", "");
    if (savedGlobalTerms) {
      setWizardTermsAndConditions(savedGlobalTerms);
    } else if (selectedService) {
      setWizardTermsAndConditions(selectedService.defaultTermsAndConditions || "");
    }
  }, [selectedCardId]);

  // Save selected service name for auto-filling the contract scope
  useEffect(() => {
    const activeService = serviceCards.find(c => c.id === selectedCardId) || serviceCards[0];
    if (activeService) {
      CrmDb.setKv("crm_contract_selected_service_name", activeService.name || "");
    }
  }, [selectedCardId, serviceCards]);

  // Option Alternatives Configuration (Option 1, 2, 3)
  const [option1Active, setOption1Active] = useState(true);
  const [option1Name, setOption1Name] = useState("Opsiyon 1: Standart Teşhis & Temel Dönüşüm");
  const [option1Desc, setOption1Desc] = useState("Mevcut saha analizleri, israf taraması ve 2 adet Kaizen atölyesini içeren standart dönüşüm paketidir.");
  const [option1Duration, setOption1Duration] = useState("2 Ay (Müşteri saha ziyareti haftalık 2 gün)");

  const [option2Active, setOption2Active] = useState(true);
  const [option2Name, setOption2Name] = useState("Opsiyon 2: Genişletilmiş Yalın Entegrasyon");
  const [option2Desc, setOption2Desc] = useState("Opsiyon 1'e ek olarak Lojistik Depolama Analizi, Çekme Sistemleri (Kanban) tasarımı ve 4 adet ek Kaizen atölyesi dahildir.");
  const [option2Duration, setOption2Duration] = useState("4 Ay (Mevcut ek saha mentorlüğü entegrasyonu)");

  const [option3Active, setOption3Active] = useState(false);
  const [option3Name, setOption3Name] = useState("Opsiyon 3: Executive Uçtan Uca Dijital Yalın Dönüşüm");
  const [option3Desc, setOption3Desc] = useState("Opex Assessment dahil tüm süreçler, 5S denetim yazılım kurulumu ve özel Üst Yönetim koçluk seanslarını içerir.");
  const [option3Duration, setOption3Duration] = useState("6 Ay (Sınırsız operasyonel destek ve dijital panel kurulumu)");

  // Pre-populate each option pricing table
  const [option1Rows, setOption1Rows] = useState<PricingRow[]>([
    { id: "o1-r1", item: "Saha Değerlendirme Analizi", dailyRate: 16000, manDays: 4 },
    { id: "o1-r2", item: "Yalın Kaizen Yol Haritası Kurulumu", dailyRate: 16000, manDays: 10 },
  ]);

  const [option2Rows, setOption2Rows] = useState<PricingRow[]>([
    { id: "o2-r1", item: "Saha Değerlendirme Analizi", dailyRate: 15000, manDays: 4 },
    { id: "o2-r2", item: "Yalın Kaizen Yol Haritası Kurulumu", dailyRate: 15000, manDays: 12 },
    { id: "o2-r3", item: "Kanban & Süpermarket Süreç Tasarımı", dailyRate: 15000, manDays: 15 },
  ]);

  const [option3Rows, setOption3Rows] = useState<PricingRow[]>([
    { id: "o3-r1", item: "Saha Değerlendirme Analizi", dailyRate: 14000, manDays: 4 },
    { id: "o3-r2", item: "Yalın Kaizen Yol Haritası Kurulumu", dailyRate: 14000, manDays: 15 },
    { id: "o3-r3", item: "Kanban & Süpermarket Tasarım Entegrasyonu", dailyRate: 14000, manDays: 15 },
    { id: "o3-r4", item: "Yönetici Mentorluğu ve Dijital 5S Yazılım Kurulumu", dailyRate: 14000, manDays: 20 },
  ]);

  // Derived Pricing values
  const option1Price = option1Rows.reduce((acc, row) => acc + (row.dailyRate * row.manDays), 0);
  const option2Price = option2Rows.reduce((acc, row) => acc + (row.dailyRate * row.manDays), 0);
  const option3Price = option3Rows.reduce((acc, row) => acc + (row.dailyRate * row.manDays), 0);

  const setOption1Price = (val: number) => {
    setOption1Rows(prev => {
      const copy = [...prev];
      if (copy.length === 0) return [{ id: "o1-r1", item: "Genel Hizmet Kalemi", dailyRate: val, manDays: 1 }];
      const sumDays = copy.reduce((acc, r) => acc + r.manDays, 0);
      const rate = sumDays > 0 ? Math.round(val / sumDays) : val;
      return copy.map(r => ({ ...r, dailyRate: rate }));
    });
  };

  const setOption2Price = (val: number) => {
    setOption2Rows(prev => {
      const copy = [...prev];
      if (copy.length === 0) return [{ id: "o2-r1", item: "Genel Hizmet Kalemi", dailyRate: val, manDays: 1 }];
      const sumDays = copy.reduce((acc, r) => acc + r.manDays, 0);
      const rate = sumDays > 0 ? Math.round(val / sumDays) : val;
      return copy.map(r => ({ ...r, dailyRate: rate }));
    });
  };

  const setOption3Price = (val: number) => {
    setOption3Rows(prev => {
      const copy = [...prev];
      if (copy.length === 0) return [{ id: "o3-r1", item: "Genel Hizmet Kalemi", dailyRate: val, manDays: 1 }];
      const sumDays = copy.reduce((acc, r) => acc + r.manDays, 0);
      const rate = sumDays > 0 ? Math.round(val / sumDays) : val;
      return copy.map(r => ({ ...r, dailyRate: rate }));
    });
  };

  const [activeOptionTab, setActiveOptionTab] = useState<1 | 2 | 3>(1);
  const [letterheadId, setLetterheadId] = useState("classic_blue");

  // Live Fine-Tuning state (HTML Editor in Preview phase)
  const [liveAssemblyHtml, setLiveAssemblyHtml] = useState("");
  const [isAssemblyEditable, setIsAssemblyEditable] = useState(false);
  const assemblyPaperRef = useRef<HTMLDivElement>(null);

  // Helper to handle clipboard tables and clean MS Word HTML structure
  const cleanWordHTML = (html: string): string => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");

    // Grab all tables, clean them
    const tables = doc.body.querySelectorAll("table");
    if (tables.length === 0) {
      // Just keep normal body clean
      return doc.body.innerHTML;
    }

    tables.forEach((table) => {
      // Apply clean CSS styles
      table.style.borderCollapse = "collapse";
      table.style.width = "100%";
      table.style.maxWidth = "100%";
      table.style.border = "1px solid #cbd5e1";
      table.style.margin = "0 0 16px 0";
      table.style.fontSize = "11px";
      table.style.fontFamily = "sans-serif";

      // Clean rows and cells
      const cells = table.querySelectorAll("td, th");
      cells.forEach((cell: any) => {
        // preserve rowspan / colspan / background shading / vertical align
        const rowspan = cell.getAttribute("rowspan");
        const colspan = cell.getAttribute("colspan");
        const valign = cell.getAttribute("valign") || cell.style.verticalAlign || "top";
        
        let bgColor = "";
        if (cell.style.backgroundColor) {
          bgColor = cell.style.backgroundColor;
        } else if (cell.style.background) {
          bgColor = cell.style.background;
        } else if (cell.getAttribute("bgcolor")) {
          bgColor = cell.getAttribute("bgcolor");
        }

        // Clean cell styles recursively
        cell.removeAttribute("style");
        cell.removeAttribute("class");
        
        // Re-inject pristine styles
        cell.style.border = "1px solid #cbd5e1";
        cell.style.padding = "8px";
        cell.style.fontSize = "11px";
        cell.style.textAlign = "left";
        cell.style.verticalAlign = valign;
        if (bgColor) {
          cell.style.backgroundColor = bgColor;
        }

        // Restore attributes
        if (rowspan) cell.setAttribute("rowspan", rowspan);
        if (colspan) cell.setAttribute("colspan", colspan);
      });

      // Style headers if matching standard tags
      const ths = table.querySelectorAll("th");
      ths.forEach((th: any) => {
        th.style.backgroundColor = "#f1f5f9";
        th.style.fontWeight = "bold";
      });
    });

    return doc.body.innerHTML;
  };

  // Paste Interceptor on Rich Text Editors
  const handleEditorPaste = (e: React.ClipboardEvent, targetSetter: (val: string) => void) => {
    const htmlText = e.clipboardData.getData("text/html");
    if (htmlText && htmlText.includes("<table")) {
      e.preventDefault();
      const cleaned = cleanWordHTML(htmlText);
      targetSetter(cleaned);
      // Give feedback
      alert(t("Word table detected and pasted cleanly!"));
    }
  };

  const handleManualWordPaste = () => {
    if (rawPastedHtml) {
      const cleaned = cleanWordHTML(rawPastedHtml);
      setEditTableHtml(cleaned);
      setPastePrompt(false);
      setRawPastedHtml("");
      alert(t("Table pasted through copy-paste filter!"));
    }
  };

  const handleAiTableConvert = async () => {
    if (!rawPastedHtml.trim()) return;
    setIsAiConverting(true);
    try {
      const response = await fetch("/api/gemini/convert-table", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pastedContent: rawPastedHtml }),
      });
      if (!response.ok) {
        throw new Error("API sunucu hatası oluştu.");
      }
      const data = await response.json();
      if (data.htmlTable) {
        setEditTableHtml(data.htmlTable);
        setPastePrompt(false);
        setRawPastedHtml("");
        alert(t("AI converted pasted table to structured HTML!"));
      } else {
        throw new Error("Yapay zekadan geçerli bir tablo alınamadı.");
      }
    } catch (err: any) {
      console.error(err);
      alert(t("Table conversion error: {error}").replace("{error}", err.message || t("AI service unreachable.")));
    } finally {
      setIsAiConverting(false);
    }
  };

  const handleWizardManualWordPaste = () => {
    if (wizardRawPastedHtml) {
      const cleaned = cleanWordHTML(wizardRawPastedHtml);
      setWizardTableHtml(cleaned);
      setWizardPastePrompt(false);
      setWizardRawPastedHtml("");
      alert(t("Table pasted through copy-paste filter!"));
    }
  };

  const handleWizardAiTableConvert = async () => {
    if (!wizardRawPastedHtml.trim()) return;
    setIsWizardAiConverting(true);
    try {
      const response = await fetch("/api/gemini/convert-table", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pastedContent: wizardRawPastedHtml }),
      });
      if (!response.ok) {
        throw new Error("API sunucu hatası oluştu.");
      }
      const data = await response.json();
      if (data.htmlTable) {
        setWizardTableHtml(data.htmlTable);
        setWizardPastePrompt(false);
        setWizardRawPastedHtml("");
        alert(t("AI converted pasted table to structured HTML!"));
      } else {
        throw new Error("Yapay zekadan geçerli bir tablo alınamadı.");
      }
    } catch (err: any) {
      console.error(err);
      alert(t("Table conversion error: {error}").replace("{error}", err.message || t("AI service unreachable.")));
    } finally {
      setIsWizardAiConverting(false);
    }
  };

  const saveEditedCard = () => {
    if (!selectedEditCardId) return;
    setServiceCards(prev => prev.map(c => {
      if (c.id === selectedEditCardId) {
        return {
          ...c,
          name: editName,
          category: editCategory,
          code: editCode,
          defaultCoverPage: editCoverPage,
          activityTableHtml: editTableHtml,
          defaultTermsAndConditions: editTerms
        };
      }
      return c;
    }));
    // setSelectedEditCardId(null);
    setToastMessage(t("Service card updated successfully!"));
    setTimeout(() => {
      setToastMessage(null);
    }, 3000);
  };

  const createNewCard = () => {
    const newId = "service-" + Date.now();
    const newCard: ServiceCard = {
      id: newId,
      name: "YENİ HİZMET TANIMI",
      category: "PROJE",
      code: "999",
      defaultCoverPage: "<h1>YENİ TEKLİF BAŞLIĞI</h1><p>Giriş içeriği...</p>",
      activityTableHtml: "<table><tr><td>Yeni tablo satırı kopyalayın...</td></tr></table>",
      defaultTermsAndConditions: "1. KDV Dahil Değildir.\n2. Havale vadeli ödenir."
    };
    setServiceCards(prev => [...prev, newCard]);
    setSelectedEditCardId(newId);
  };

  const removeCard = (id: string, name: string) => {
    setConfirmDeleteModal({
      isOpen: true,
      title: t("Service definition will be deleted"),
      message: `${t("\"{name}\" service card will be permanently deleted.").replace("{name}", name)} ${t("Move to recycle bin?")}`,
      onConfirm: () => {
        setServiceCards(prev => prev.filter(c => c.id !== id));
        if (selectedEditCardId === id) {
          setSelectedEditCardId(null);
        }
      }
    });
  };

  // Compile Dynamic Proposal Document
  const selectedService = serviceCards.find(c => c.id === selectedCardId) || serviceCards[0];
  const currentLetterhead = (letterheadId === "uploaded_template" && (uploadedCoverTemplates[selectedCardId] || uploadedPageTemplates[selectedCardId]))
    ? {
        id: "uploaded_template",
        name: `Yüklenen Kurumsal Görsel Şablonu`,
        primaryColor: "#d61a21", // Gemba Red
        accentColor: "#f1f5f9",
        tagline: `ÖZEL ŞABLON AKTİF`,
        details: `Kurumsal arka plan resimleri yüklendi.`
      }
    : (LETTERHEADS.find(lh => lh.id === letterheadId) || LETTERHEADS[0]);

  // Generate pricing tables HTML
  const generatePricingTableHtml = (title: string, desc: string, rows: PricingRow[]) => {
    const subtotal = rows.reduce((acc, r) => acc + (r.dailyRate * r.manDays), 0);
    const rowsHtml = rows.map(r => `
      <tr>
        <td style="border: 1px solid #cbd5e1; padding: 6px 10px; font-size: 11px; text-align: left; color: #334155;">${r.item}</td>
        <td style="border: 1px solid #cbd5e1; padding: 6px 10px; font-size: 11px; text-align: right; color: #334155;">${new Intl.NumberFormat("tr-TR").format(r.dailyRate)} TL</td>
        <td style="border: 1px solid #cbd5e1; padding: 6px 10px; font-size: 11px; text-align: center; color: #334155;">${r.manDays}</td>
        <td style="border: 1px solid #cbd5e1; padding: 6px 10px; font-size: 11px; text-align: right; font-weight: bold; color: #1e293b;">${new Intl.NumberFormat("tr-TR").format(r.dailyRate * r.manDays)} TL</td>
      </tr>
    `).join("");

    return `
      <div style="margin-bottom: 24px; font-family: sans-serif;">
        <h4 style="font-size: 12px; font-weight: 800; color: ${currentLetterhead.primaryColor}; margin-top: 0; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.5px;">${title}</h4>
        <p style="font-size: 11px; color: #475569; margin-top: 0; margin-bottom: 10px; line-height: 1.4;">${desc}</p>
        <table style="border-collapse: collapse; width: 100%; border: 1px solid #cbd5e1; margin-bottom: 12px;">
          <thead>
            <tr style="background-color: #f8fafc; border-bottom: 2px solid #cbd5e1;">
              <th style="border: 1px solid #cbd5e1; padding: 8px 10px; font-size: 11px; text-align: left; font-weight: bold; color: #1e293b; width: 45%;">Hizmet Kalemi</th>
              <th style="border: 1px solid #cbd5e1; padding: 8px 10px; font-size: 11px; text-align: right; font-weight: bold; color: #1e293b; width: 20%;">Günlük Ücret</th>
              <th style="border: 1px solid #cbd5e1; padding: 8px 10px; font-size: 11px; text-align: center; font-weight: bold; color: #1e293b; width: 15%;">Efor (A/G)</th>
              <th style="border: 1px solid #cbd5e1; padding: 8px 10px; font-size: 11px; text-align: right; font-weight: bold; color: #1e293b; width: 20%;">Bütçe</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
            <tr style="background-color: #f1f5f9; font-weight: bold; border-top: 1px solid #94a3b8;">
              <td colspan="3" style="border: 1px solid #cbd5e1; padding: 8px; text-align: right; font-size: 11px; color: #1e293b;">Seçenek Ara Toplamı (KDV Hariç):</td>
              <td style="border: 1px solid #cbd5e1; padding: 8px 10px; text-align: right; font-size: 11px; color: ${currentLetterhead.primaryColor};">${new Intl.NumberFormat("tr-TR").format(subtotal)} TL</td>
            </tr>
          </tbody>
        </table>
      </div>
    `;
  };

  // Auto-sync cover letter whenever chosen card changes
  useEffect(() => {
    if (selectedService) {
      setWizardCoverPage(selectedService.defaultCoverPage);
      setWizardTableHtml(selectedService.activityTableHtml || "");
      
      // Pre-populate service-specific defaults if they have been custom saved
      if (selectedService.option1Active !== undefined) setOption1Active(selectedService.option1Active);
      if (selectedService.option1Name) setOption1Name(selectedService.option1Name);
      if (selectedService.option1Desc) setOption1Desc(selectedService.option1Desc);
      if (selectedService.option1Duration) setOption1Duration(selectedService.option1Duration);
      if (selectedService.option1Rows) setOption1Rows(selectedService.option1Rows);

      if (selectedService.option2Active !== undefined) setOption2Active(selectedService.option2Active);
      if (selectedService.option2Name) setOption2Name(selectedService.option2Name);
      if (selectedService.option2Desc) setOption2Desc(selectedService.option2Desc);
      if (selectedService.option2Duration) setOption2Duration(selectedService.option2Duration);
      if (selectedService.option2Rows) setOption2Rows(selectedService.option2Rows);

      if (selectedService.option3Active !== undefined) setOption3Active(selectedService.option3Active);
      if (selectedService.option3Name) setOption3Name(selectedService.option3Name);
      if (selectedService.option3Desc) setOption3Desc(selectedService.option3Desc);
      if (selectedService.option3Duration) setOption3Duration(selectedService.option3Duration);
      if (selectedService.option3Rows) setOption3Rows(selectedService.option3Rows);
    }
  }, [selectedCardId, selectedService]);

  // Auto-select uploaded template design if available for the chosen service card
  useEffect(() => {
    if (selectedCardId && (uploadedCoverTemplates[selectedCardId] || uploadedPageTemplates[selectedCardId])) {
      setLetterheadId("uploaded_template");
    } else {
      setLetterheadId("classic_blue");
    }
  }, [selectedCardId, uploadedCoverTemplates, uploadedPageTemplates]);

  const assembleDocument = () => {
    if (!selectedService) return "";

    // Count rows in the effort table to decide if it should be placed on its own page
    let effortTableRowsCount = 0;
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(wizardTableHtml || "", "text/html");
      const tbody = doc.querySelector("tbody");
      if (tbody) {
        effortTableRowsCount = tbody.querySelectorAll("tr").length;
      } else {
        effortTableRowsCount = doc.querySelectorAll("tr").length;
      }
    } catch (e) {
      console.error(e);
    }
    const tableIsTooLong = effortTableRowsCount > 4;

    // Calculate total pages dynamically
    let totalPages = 1; // Cover Page
    let coverLetterPages = 1;
    totalPages += coverLetterPages; // Cover Letter Page count

    let effortPages = tableIsTooLong ? 2 : 1;
    totalPages += effortPages; // Effort Table Page count

    const activeOptions: number[] = [];
    if (option1Active) activeOptions.push(1);
    if (option2Active) activeOptions.push(2);
    if (option3Active) activeOptions.push(3);
    const optionPagesCount = activeOptions.length;
    totalPages += optionPagesCount; // Options Pages count (Each option gets its own page!)

    let termsPages = 1;
    totalPages += termsPages; // General terms & signature page block

    let currentCalculatedPageIndex = 1;
    let fullHtmlString = "";

    // Styles block at the very top of compiled HTML
    fullHtmlString += `
      <style>
        .a4-page {
          width: 210mm;
          height: 297mm;
          box-sizing: border-box;
          position: relative;
          background-color: white;
          margin: 0 auto 30px auto;
          box-shadow: 0 4px 15px rgba(0,0,0,0.1);
          font-family: 'Arial', sans-serif;
          color: #1e293b;
          page-break-after: always;
        }
        @media print {
          body {
            background: none !important;
            padding: 0 !important;
            margin: 0 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .a4-page {
            margin: 0 !important;
            box-shadow: none !important;
            border: none !important;
            page-break-after: always !important;
            page-break-inside: avoid !important;
            background-color: #ffffff !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
      </style>
    `;

    // ---------------- PAGE 1 – COVER PAGE ----------------
    // Check if there is an uploaded cover PNG background, or fall back to any other uploaded cover in A4 PNG Engine, or cover.png / default cover
    const customCoverImage = inMemoryCoverTemplates[selectedCardId] || Object.values(inMemoryCoverTemplates)[0];
    const hasCustomCover = !!customCoverImage;
    
    const coverBgStyle = hasCustomCover
      ? `background-image: url(${customCoverImage}); background-size: 100% 100%;`
      : `background-image: url('/cover.png'); background-size: 100% 100%; background-color: #ffffff;`;

    const formattedProposalNo = proposalNumber || `GEM-TEK-${new Date().getFullYear()}-${selectedService.code || "100"}`;
    const formattedProposalDate = proposalDate ? proposalDate.split("-").reverse().join(".") : new Date().toLocaleDateString("tr-TR");

    // We output default cover branding only if neither custom cover nor default cover.png loads successfully.
    // However, our CSS specifies background-image: url('/cover.png') as standard cover.
    const coverPageHtml = `
      <div class="a4-page" style="${coverBgStyle} width: 210mm; height: 297mm; position: relative; font-family: 'Arial', sans-serif; box-sizing: border-box; page-break-after: always; padding: 0; margin: 0 auto; background-color: #ffffff; box-shadow: 0 4px 15px rgba(0,0,0,0.1); overflow: hidden;">
        
        <!-- Default Cover Decorative Elements fallback (Only displayed if no custom image is uploaded and cover.png is missing) -->
        ${!hasCustomCover ? `
          <!-- Top Left curved grey accent -->
          <div style="position: absolute; left: 0; top: 0; width: 33mm; height: 110mm; background-color: #9ea1a2; border-bottom-right-radius: 120% 100%; pointer-events: none; opacity: 0.15;"></div>
          
          <!-- Bottom Left curved red accent -->
          <div style="position: absolute; left: 0; bottom: 0; width: 33mm; height: 160mm; background-color: #d61a21; border-top-right-radius: 120% 100%; pointer-events: none; z-index: 5; opacity: 0.15;"></div>

          <!-- Central Corporate Logo -->
          <div style="position: absolute; top: 110mm; left: 50%; transform: translateX(-50%); text-align: center; width: 100%; pointer-events: none;">
            <div style="display: flex; align-items: center; justify-content: center; gap: 12px; margin-bottom: 5px;">
              <img src="${logoImage}" style="height: 14mm; width: auto; object-fit: contain;" alt="Gemba Logo" referrerPolicy="no-referrer" />
            </div>
          </div>
        ` : ""}

        <!-- Title Zone -->
        <div style="position: absolute; top: 160mm; left: 0; right: 0; text-align: center; font-family: Arial, sans-serif; font-size: 18pt; font-weight: bold; color: #1a202c; letter-spacing: 1.5px; text-transform: uppercase;">
          HİZMET TEKLİFİ
        </div>

        <!-- Metadata Information Zone -->
        <div style="position: absolute; top: 200mm; left: 35mm; right: 25mm; font-family: Arial, sans-serif; font-size: 13pt; color: #1a202c; line-height: 2;">
          <table style="width: 100%; border-collapse: collapse; border: none;">
            <tr style="border: none;">
              <td style="width: 48mm; font-weight: bold; padding: 2px 0; border: none; font-size: 12.5pt; font-family: Arial; color: #475569;">FİRMA ADI</td>
              <td style="width: 5mm; font-weight: bold; padding: 2px 0; border: none; font-size: 12.5pt; font-family: Arial; color: #475569;">:</td>
              <td style="font-weight: normal; padding: 2px 0; border: none; font-size: 12.5pt; font-family: Arial; color: #1e293b;">${(clientTitle || "MÜŞTERİ TANIMI").toUpperCase()}</td>
            </tr>
            <tr style="border: none;">
              <td style="font-weight: bold; padding: 2px 0; border: none; font-size: 12.5pt; font-family: Arial; color: #475569;">TEKLİF KONUSU</td>
              <td style="font-weight: bold; padding: 2px 0; border: none; font-size: 12.5pt; font-family: Arial; color: #475569;">:</td>
              <td style="font-weight: normal; padding: 2px 0; border: none; font-size: 12.5pt; font-family: Arial; color: #1e293b;">${(selectedService?.name || "YALIN DÖNÜŞÜM HİZMETLERİ").toUpperCase()}</td>
            </tr>
            <tr style="border: none;">
              <td style="font-weight: bold; padding: 2px 0; border: none; font-size: 12.5pt; font-family: Arial; color: #475569;">TARİH / TEKLİF NO</td>
              <td style="font-weight: bold; padding: 2px 0; border: none; font-size: 12.5pt; font-family: Arial; color: #475569;">:</td>
              <td style="font-weight: normal; padding: 2px 0; border: none; font-size: 12.5pt; font-family: Arial; color: #1e293b;">${formattedProposalDate} / ${formattedProposalNo}</td>
            </tr>
          </table>
        </div>

      </div>
    `;

    fullHtmlString += coverPageHtml;
    currentCalculatedPageIndex++;

    // Helper to format inner page structured blocks
    const createA4PageContent = (pageIndex: number, maxPages: number, pageTitle: string, contentHtml: string) => {
      const customPageImage = inMemoryPageTemplates[selectedCardId] || Object.values(inMemoryPageTemplates)[0];
      const hasCustomPage = !!customPageImage;
      
      const bgStyle = hasCustomPage
        ? `background-image: url(${customPageImage}); background-size: 100% 100%; background-repeat: no-repeat;`
        : `background-image: url('/page.png'); background-size: 100% 100%; background-repeat: no-repeat; background-color: #ffffff;`;

      return `
        <div class="a4-page" style="${bgStyle} width: 210mm; height: 297mm; position: relative; font-family: 'Arial', sans-serif; box-sizing: border-box; page-break-after: always; padding: 38mm 20mm 30mm 20mm; margin: 0 auto 30px auto; background-color: #ffffff; box-shadow: 0 4px 15px rgba(0,0,0,0.1); overflow: hidden;">
          
          <!-- Default Background Overlay (Only if no custom background has been uploaded) -->
          ${!hasCustomPage ? `
            <!-- Header and Logo -->
            <div style="position: absolute; left: 20mm; top: 13mm; display: flex; align-items: center; justify-content: space-between; right: 20mm; font-family: Arial, sans-serif; pointer-events: none;">
              <div style="display: flex; align-items: center; gap: 6px;">
                <img src="${logoImage}" style="height: 6mm; width: auto; object-fit: contain;" alt="Gemba Logo" referrerPolicy="no-referrer" />
                <div>
                  <span style="font-weight: bold; font-size: 9.5pt; color: #1e293b; letter-spacing: 0.5px;">GEMBA PARTNER</span>
                  <span style="font-size: 6pt; color: #94a3b8; display: block; font-weight: 500; font-family: Arial; letter-spacing: 0.5px; margin-top: -1px;">KAIZEN MANAGEMENT CONSULTING</span>
                </div>
              </div>
              <div style="text-align: right; font-size: 8.5pt; font-weight: bold; color: #64748b; letter-spacing: 0.5px; text-transform: uppercase;">
                ${pageTitle}
              </div>
            </div>
            
            <!-- Header grey/red lines -->
            <div style="position: absolute; left: 20mm; right: 20mm; top: 30mm; height: 1px; background-color: #cbd5e1; pointer-events: none;"></div>
            <div style="position: absolute; left: 20mm; width: 45mm; top: 30mm; height: 1.5px; background-color: #d61a21; pointer-events: none;"></div>

            <!-- Footer horizontal line -->
            <div style="position: absolute; left: 20mm; right: 20mm; bottom: 25mm; height: 1px; background-color: #cbd5e1; pointer-events: none;"></div>
            <div style="position: absolute; left: 20mm; width: 45mm; bottom: 25mm; height: 1.5px; background-color: #d61a21; pointer-events: none;"></div>

            <!-- Footer details -->
            <div style="position: absolute; left: 20mm; right: 20mm; bottom: 12mm; display: flex; justify-content: space-between; font-family: Arial, sans-serif; font-size: 6.5pt; color: #475569; pointer-events: none; line-height: 1.3;">
              <div>
                <span style="font-weight: bold; color: #1e293b; font-size: 7.5pt; font-family: Arial;">GEMBA PARTNER MÜHENDİSLİK VE YAZILIM A.Ş</span><br/>
                <span style="color: #64748b; font-family: Arial;">📍 Esentepe, Milangaz Cd. Monumento Plaza No: 75 / 70, 34870, Kartal İstanbul</span>
              </div>
              <div style="text-align: right; color: #64748b; font-family: Arial;">
                <span>📞 +90 216 2120877 &nbsp; ✉️ info@gembapartner.com</span><br/>
                <span>🌐 www.gembadigital.tr</span>
              </div>
            </div>
          ` : ""}

          <!-- Page Number Overlay (Applied on custom pages too to ensure proper tracking) -->
          <div style="position: absolute; right: 20mm; bottom: 12mm; font-family: Arial, sans-serif; font-size: 7.5pt; color: #475569; font-weight: bold; pointer-events: none;">
            Sayfa ${pageIndex} / ${maxPages}
          </div>

          <!-- Safe Content Zone -->
          <div style="height: 100%; box-sizing: border-box; overflow: hidden; display: flex; flex-direction: column; justify-content: flex-start; line-height: 1.5; font-family: Arial, sans-serif;">
            ${contentHtml}
          </div>

        </div>
      `;
    };

    // ---------------- PAGE 2 – COVER LETTER ----------------
    // Parse cover letter content to apply paragraph blocks & style fully capitalized headers
    const parseCoverLetterBody = (text: string) => {
      if (!text) return "";
      const blocks = text.split(/[\r\n]+/);
      return blocks.map(block => {
        const trimmed = block.trim();
        if (!trimmed) return "";
        
        const alphaOnly = trimmed.replace(/[^a-zA-ZĞÜŞİÖÇIğüşiöçı]/g, "").trim();
        const isUppercase = alphaOnly.length > 3 && alphaOnly.toUpperCase() === alphaOnly;

        if (isUppercase) {
          return `<h3 style="font-family: Arial, sans-serif; font-size: 11pt; font-weight: bold; color: #b91c1c; margin-top: 14px; margin-bottom: 6px; text-transform: uppercase; border-bottom: 1px solid #f1f5f9; padding-bottom: 2px;">${trimmed}</h3>`;
        } else {
          return `<p style="font-family: Arial, sans-serif; font-size: 9.5pt; line-height: 1.5; color: #334155; margin-bottom: 8px; text-align: justify;">${trimmed}</p>`;
        }
      }).join("");
    };

    const coverLetterContent = `
      <div style="font-family: Arial, sans-serif; font-size: 9.5pt; color: #334155; line-height: 1.5;">
        <p style="font-size: 10.5pt; font-weight: bold; color: #1e293b; margin-top: 0; margin-bottom: 12px; font-family: Arial;">SAYIN YETKİLİ,</p>
        ${parseCoverLetterBody(wizardCoverPage || selectedService?.defaultCoverPage || "")}
      </div>
    `;

    fullHtmlString += createA4PageContent(currentCalculatedPageIndex, totalPages, "ÖN KAPAK VE TAKDİM", coverLetterContent);
    currentCalculatedPageIndex++;

    // ---------------- PAGE 3 – EFFORT TABLE ----------------
    const styleTableForA4Print = (rawTableHtml: string) => {
      if (!rawTableHtml) return "<p style='font-style: italic; color: #94a3b8;'>Efor tablosu bulunmamaktadır.</p>";
      const parser = new DOMParser();
      const doc = parser.parseFromString(rawTableHtml, "text/html");
      const table = doc.querySelector("table");
      if (table) {
        table.setAttribute("style", "width: 100%; border-collapse: collapse; font-family: Arial, sans-serif; font-size: 7.5pt; border: 1px solid #cbd5e1; margin-top: 5px;");
        table.querySelectorAll("th, td").forEach(cell => {
          const isHeader = cell.tagName === "TH";
          const cellStyle = cell.getAttribute("style") || "";
          
          cell.setAttribute("style", `border: 1px solid #cbd5e1; padding: 2.5px 4px !important; line-height: 1.15 !important; text-align: left; font-family: Arial, sans-serif; font-size: ${isHeader ? "8pt" : "7.5pt"}; font-weight: ${isHeader ? "bold" : "normal"}; ${isHeader ? "background-color: #f1f5f9; color: #1e293b;" : ""}; ${cellStyle}`);
        });
        return doc.body.innerHTML;
      }
      return rawTableHtml;
    };

    if (tableIsTooLong) {
      // PAGE 3: Section Intro (Pushing actual table to next page to prevent overflow)
      const effortIntroContent = `
        <div style="font-family: Arial, sans-serif;">
          <h3 style="font-family: Arial, sans-serif; font-size: 11pt; font-weight: bold; color: #1e293b; margin-top: 0; margin-bottom: 8px; text-transform: uppercase; border-bottom: 2px solid #cbd5e1; padding-bottom: 4px;">1. FAALİYET PLANLAMASI VE EFOR DAĞILIMI</h3>
          <p style="font-family: Arial, sans-serif; font-size: 10pt; line-height: 1.5; color: #334155; margin-bottom: 16px;">
            Dönüşüm programı kapsamında planlanan saha içi gelişim faaliyetlerinin kilometre taşları (milestone), çalışma başlıkları ve tahmini efor kırılımlarını içeren yol haritası hazırlanmıştır.
          </p>
          <p style="font-family: Arial, sans-serif; font-size: 10pt; line-height: 1.5; color: #475569; margin-bottom: 24px;">
            Öngörülen çalışma başlıkları kapsamında, süreçlerin mevcut durum analizi, israf tespit turları, hedef durum tasarımı ile saha uygulama ve standartlaştırma adımları izlenecektir.
          </p>
          <div style="margin-top: 30px; padding: 16px; border-left: 4px solid #d61a21; background-color: #f8fafc; border-radius: 4px; border: 1px solid #e2e8f0; border-left-width: 4px;">
            <p style="font-family: Arial, sans-serif; font-size: 10pt; font-weight: bold; color: #d61a21; margin: 0 0 6px 0;">SÜREÇ VE FAALİYET DETAYLARI TABLOSU</p>
            <p style="font-family: Arial, sans-serif; font-size: 9.5pt; color: #475569; margin: 0; line-height: 1.45;">
              Belirtilen her bir faz altındaki detaylı faaliyet adımlarını, danışmanlık sorumluluk alanlarını ve adam-gün cinsinden efor kırılımlarını gösteren tablo, sayfa alanının en verimli şekilde kullanılması amacıyla bir sonraki sayfada (Sayfa 4) sunulmuştur.
            </p>
          </div>
        </div>
      `;
      fullHtmlString += createA4PageContent(currentCalculatedPageIndex, totalPages, "EFOR PLANLAMASI VE SÜREÇLER", effortIntroContent);
      currentCalculatedPageIndex++;

      // PAGE 4: Dedicated Table Page
      const effortTableContent = `
        <div style="font-family: Arial, sans-serif;">
          <h3 style="font-family: Arial, sans-serif; font-size: 11pt; font-weight: bold; color: #1e293b; margin-top: 0; margin-bottom: 8px; text-transform: uppercase; border-bottom: 2px solid #cbd5e1; padding-bottom: 4px;">1. DETAYLI FAALİYET VE EFOR TABLOSU</h3>
          ${styleTableForA4Print(wizardTableHtml || "")}
        </div>
      `;
      fullHtmlString += createA4PageContent(currentCalculatedPageIndex, totalPages, "DETAYLI EFOR TABLOSU", effortTableContent);
      currentCalculatedPageIndex++;
    } else {
      // Single Page (fit all on one page)
      const effortContent = `
        <div style="font-family: Arial, sans-serif;">
          <h3 style="font-family: Arial, sans-serif; font-size: 11pt; font-weight: bold; color: #1e293b; margin-top: 0; margin-bottom: 8px; text-transform: uppercase; border-bottom: 2px solid #cbd5e1; padding-bottom: 4px;">1. FAALİYET PLANLAMASI VE EFOR DAĞILIMI</h3>
          <p style="font-family: Arial, sans-serif; font-size: 9.5pt; line-height: 1.4; color: #475569; margin-bottom: 12px;">Planlanan saha içi gelişim faaliyetlerinin kilometre taşları (milestone) ve hedeflenen efor kırılımları aşağıda detaylandırılmıştır:</p>
          ${styleTableForA4Print(wizardTableHtml || "")}
        </div>
      `;
      fullHtmlString += createA4PageContent(currentCalculatedPageIndex, totalPages, "EFOR DAĞILIMI VE SÜREÇLER", effortContent);
      currentCalculatedPageIndex++;
    }

    // ---------------- PAGE 4+ – PROPOSALS ----------------
    activeOptions.forEach((optionIndex) => {
      let optName = "";
      let optDesc = "";
      let optRows: PricingRow[] = [];

      if (optionIndex === 1) {
        optName = option1Name;
        optDesc = option1Desc;
        optRows = option1Rows;
      } else if (optionIndex === 2) {
        optName = option2Name;
        optDesc = option2Desc;
        optRows = option2Rows;
      } else {
        optName = option3Name;
        optDesc = option3Desc;
        optRows = option3Rows;
      }

      // Build Option Pricing view style
      const subtotal = optRows.reduce((acc, r) => acc + (r.dailyRate * r.manDays), 0);
      const kdvAmount = subtotal * 0.20;
      const grandTotal = subtotal + kdvAmount;

      // Helper for number format of Turkish Lira
      const liraFormatter = new Intl.NumberFormat("tr-TR", { minimumFractionDigits: 0 });

      // Word number spelling helper for pricing amount
      const convertNumberToWords = (num: number): string => {
        const units = ["", "Bir", "İki", "Üç", "Dört", "Beş", "Altı", "Yedi", "Sekiz", "Dokuz"];
        const tens = ["", "On", "Yirmi", "Otuz", "Kırk", "Elli", "Altmış", "Yetmiş", "Seksen", "Doksan"];
        const thousands = ["", "Bin", "Milyon", "Milyar"];

        if (num === 0) return "Sıfır";

        let str = "";
        let integerPart = Math.floor(num);

        let groupIdx = 0;
        while (integerPart > 0) {
          let chunk = integerPart % 1000;
          if (chunk > 0) {
            let chunkStr = "";
            let h = Math.floor(chunk / 100);
            let t = Math.floor((chunk % 100) / 10);
            let u = chunk % 10;

            if (h > 0) {
              chunkStr += (h === 1 ? "" : units[h]) + "Yüz";
            }
            if (t > 0) {
              chunkStr += tens[t];
            }
            if (u > 0) {
              // Word 'bir' in singular thousands is omitted e.g. "BirBin" -> "Bin"
              if (groupIdx === 1 && chunk === 1) {
                chunkStr += "";
              } else {
                chunkStr += units[u];
              }
            }
            chunkStr += thousands[groupIdx];
            str = chunkStr + str;
          }
          integerPart = Math.floor(integerPart / 1000);
          groupIdx++;
        }
        return str + " Türk Lirası";
      };

      const rowsHtmlStr = optRows.map(r => `
        <tr style="border-bottom: 1px solid #e2e8f0;">
          <td style="border: 1px solid #cbd5e1; padding: 6px 8px; font-size: 8.5pt; text-align: left; color: #334155; font-family: Arial;">${r.item}</td>
          <td style="border: 1px solid #cbd5e1; padding: 6px 8px; font-size: 8.5pt; text-align: right; color: #334155; font-family: Arial;">${liraFormatter.format(r.dailyRate)} TL</td>
          <td style="border: 1px solid #cbd5e1; padding: 6px 8px; font-size: 8.5pt; text-align: center; color: #334155; font-family: Arial;">${r.manDays}</td>
          <td style="border: 1px solid #cbd5e1; padding: 6px 8px; font-size: 8.5pt; text-align: right; font-weight: bold; color: #1e293b; font-family: Arial;">${liraFormatter.format(r.dailyRate * r.manDays)} TL</td>
        </tr>
      `).join("");

      const proposalOptionPageHtml = `
        <div style="font-family: Arial, sans-serif;">
          <!-- Header Client details -->
          <div style="font-family: Arial, sans-serif; font-size: 9.5pt; line-height: 1.4; color: #1e293b; margin-bottom: 15px; background-color: #f8fafc; border: 1px solid #e2e8f0; padding: 8px 12px; border-radius: 4px;">
            <table style="width: 100%; border-collapse: collapse; border: none;">
              <tr style="border: none;">
                <td style="font-weight: bold; width: 30mm; color: #475569; font-size: 9pt; padding: 2px 0;">FİRMA</td>
                <td style="font-weight: bold; width: 4mm; color: #475569; font-size: 9pt; padding: 2px 0;">:</td>
                <td style="font-weight: normal; color: #1e293b; font-size: 9pt; padding: 2px 0;">${(clientTitle || "Müşteri").toUpperCase()}</td>
              </tr>
              <tr style="border: none;">
                <td style="font-weight: bold; color: #475569; font-size: 9pt; padding: 2px 0;">KİME</td>
                <td style="font-weight: bold; color: #475569; font-size: 9pt; padding: 2px 0;">:</td>
                <td style="font-weight: normal; color: #1e293b; font-size: 9pt; padding: 2px 0;">Sn. ${assignedPm}</td>
              </tr>
              <tr style="border: none;">
                <td style="font-weight: bold; color: #475569; font-size: 9pt; padding: 2px 0;">TARİH VE NO</td>
                <td style="font-weight: bold; color: #475569; font-size: 9pt; padding: 2px 0;">:</td>
                <td style="font-weight: normal; color: #1e293b; font-size: 9pt; padding: 2px 0;">${formattedProposalDate} / ${formattedProposalNo}</td>
              </tr>
            </table>
          </div>

          <!-- Section title -->
          <h3 style="font-family: Arial, sans-serif; font-size: 11pt; font-weight: bold; color: #b91c1c; margin-top: 0; margin-bottom: 6px; text-transform: uppercase;">2. FİNANSAL DEĞERLENDİRME & TEKLİF SEÇENEKLERİ</h3>
          
          <div style="background-color: #fdf2f2; border-left: 3px solid #d61a21; padding: 6px 10px; margin-bottom: 12px;">
            <strong style="font-size: 9pt; color: #b91c1c; text-transform: uppercase; display: block; margin-bottom: 2px;">SEÇENEK ${optionIndex}: ${optName.toUpperCase()}</strong>
            <p style="font-size: 8.5pt; color: #475569; line-height: 1.4; margin: 0;">${optDesc}</p>
          </div>

          <table style="border-collapse: collapse; width: 100%; border: 1px solid #cbd5e1; font-family: Arial, sans-serif; font-size: 8.5pt; margin-bottom: 12px;">
            <thead>
              <tr style="background-color: #f8fafc; border-bottom: 2px solid #cbd5e1;">
                <th style="border: 1px solid #cbd5e1; padding: 6px 8px; font-size: 8.5pt; text-align: left; font-weight: bold; color: #1e293b; font-family: Arial; width: 45%;">Hizmet Kalemi</th>
                <th style="border: 1px solid #cbd5e1; padding: 6px 8px; font-size: 8.5pt; text-align: right; font-weight: bold; color: #1e293b; font-family: Arial; width: 22%;">Günlük Ücret</th>
                <th style="border: 1px solid #cbd5e1; padding: 6px 8px; font-size: 8.5pt; text-align: center; font-weight: bold; color: #1e293b; font-family: Arial; width: 13%;">Efor (A/G)</th>
                <th style="border: 1px solid #cbd5e1; padding: 6px 8px; font-size: 8.5pt; text-align: right; font-weight: bold; color: #1e293b; font-family: Arial; width: 20%;">Bütçe</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtmlStr}
              <tr style="background-color: #f8fafc;">
                <td colspan="3" style="border: 1px solid #cbd5e1; padding: 5px 8px; text-align: right; font-size: 8.5pt; color: #475569; font-family: Arial;">Seçenek Ara Toplamı (KDV Hariç):</td>
                <td style="border: 1px solid #cbd5e1; padding: 5px 8px; text-align: right; font-size: 8.5pt; color: #1e293b; font-weight: bold; font-family: Arial;">${liraFormatter.format(subtotal)} TL</td>
              </tr>
              <tr style="background-color: #f8fafc;">
                <td colspan="3" style="border: 1px solid #cbd5e1; padding: 5px 8px; text-align: right; font-size: 8.5pt; color: #475569; font-family: Arial;">KDV (%20):</td>
                <td style="border: 1px solid #cbd5e1; padding: 5px 8px; text-align: right; font-size: 8.5pt; color: #475569; font-family: Arial;">${liraFormatter.format(kdvAmount)} TL</td>
              </tr>
              <tr style="background-color: #f1f5f9; font-weight: bold; border-top: 1.5px solid #94a3b8;">
                <td colspan="3" style="border: 1px solid #cbd5e1; padding: 6px 8px; text-align: right; font-size: 8.5pt; color: #1e293b; font-family: Arial; text-transform: uppercase;">SEÇENEK TOPLAM BÜTÇESİ (KDV Dahil):</td>
                <td style="border: 1px solid #cbd5e1; padding: 6px 8px; text-align: right; font-size: 9pt; color: #b91c1c; font-family: Arial; font-weight: bold;">${liraFormatter.format(grandTotal)} TL</td>
              </tr>
            </tbody>
          </table>

          <!-- Spelling explanation bar -->
          <div style="background-color: #f8fafc; border: 1px solid #cbd5e1; border-radius: 4px; padding: 6px 10px; font-size: 8.5pt; color: #334155; margin-bottom: 12px; font-family: Arial;">
            <strong>Yazıyla Toplam Tutar:</strong> &nbsp; #${convertNumberToWords(grandTotal).toLocaleUpperCase("tr-TR")}#
          </div>

          ${activeOptions.length > 1 ? `
            <div style="background-color: #f0fdf4; border-left: 3px solid #16a34a; padding: 6px 10px; font-size: 8pt; color: #15803d; font-family: Arial;">
              <strong>TİCARİ ALTERNATİF BİLGİLENDİRMESİ:</strong> Sunulan seçenekler birbirinin tamamlayıcısı değil, alternatifidir. Teklif onayında tercih edilen teklif seçeneği belirtilmelidir.
            </div>
          ` : ""}
        </div>
      `;

      fullHtmlString += createA4PageContent(currentCalculatedPageIndex, totalPages, `FİNANSAL DEĞERLENDİRME – SEÇENEK ${optionIndex}`, proposalOptionPageHtml);
      currentCalculatedPageIndex++;
    });

    // ---------------- PAGE LAST – GENERAL TERMS ----------------
    const parseTermsAndConditions = (textText: string) => {
      if (!textText) return "";
      return textText.split("\n").map(line => {
        const trimmed = line.trim();
        if (!trimmed) return "";
        return `<p style="margin: 0 0 5px 0; font-size: 8.5pt; line-height: 1.4; color: #334155; font-family: Arial; text-align: justify;">${trimmed}</p>`;
      }).join("");
    };

    const signatureBlockHtml = `
      <div style="margin-top: 25px; display: flex; justify-content: space-between; font-family: Arial, sans-serif; pointer-events: auto;">
        <div style="width: 46%; font-size: 8.5pt; box-sizing: border-box;">
          <p style="font-weight: bold; color: #b91c1c; margin: 0 0 3px 0; text-transform: uppercase; border-bottom: 1px solid #cbd5e1; padding-bottom: 2px; font-family: Arial; letter-spacing: 0.5px;">TEKLİF HAZIRLAYAN</p>
          <p style="margin: 2px 0; color: #1e293b; font-weight: bold; font-family: Arial;">Gemba Partner Gelişim Grubu</p>
          <p style="margin: 0 0 6px 0; color: #64748b; font-size: 7.5pt; font-family: Arial;">Kaizen Management Consulting</p>
          <div style="height: 40px; border-bottom: 1px dashed #cbd5e1; margin-top: 5px; position: relative; background-color: #fcfcfc;">
            <span style="position: absolute; bottom: 3px; right: 6px; font-size: 7.5px; color: #94a3b8; font-style: italic; font-weight: bold; font-family: Arial;">İMZA / KAŞE</span>
          </div>
        </div>
        <div style="width: 46%; font-size: 8.5pt; box-sizing: border-box;">
          <p style="font-weight: bold; color: #b91c1c; margin: 0 0 3px 0; text-transform: uppercase; border-bottom: 1px solid #cbd5e1; padding-bottom: 2px; font-family: Arial; letter-spacing: 0.5px;">MÜŞTERİ KABUL & ONAY</p>
          <p style="margin: 2px 0; color: #1e293b; font-weight: bold; font-family: Arial;">${(clientTitle || "Müşteri").toUpperCase()}</p>
          <p style="margin: 0 0 6px 0; color: #64748b; font-size: 7.5pt; font-family: Arial;">Yetkili: Sn. ${assignedPm}</p>
          <div style="height: 40px; border-bottom: 1px dashed #cbd5e1; margin-top: 5px; position: relative; background-color: #fcfcfc;">
            <span style="position: absolute; bottom: 3px; right: 6px; font-size: 7.5px; color: #94a3b8; font-style: italic; font-weight: bold; font-family: Arial;">İMZA / KAŞE</span>
          </div>
        </div>
      </div>
    `;

    const termsAndConditionsPageHtml = `
      <div style="font-family: Arial, sans-serif; display: flex; flex-direction: column; justify-content: space-between; height: 100%;">
        <div>
          <h3 style="font-family: Arial, sans-serif; font-size: 11pt; font-weight: bold; color: #1e293b; margin-top: 0; margin-bottom: 8px; text-transform: uppercase; border-bottom: 2px solid #cbd5e1; padding-bottom: 4px;">3. TİCARİ VE HUKUKİ GENEL ŞARTLAR</h3>
          <div style="max-height: 120mm; overflow-y: hidden;">
            ${parseTermsAndConditions(wizardTermsAndConditions || selectedService?.defaultTermsAndConditions || "")}
          </div>
        </div>
        
        <!-- Signature block placed securely at the bottom of the content zone -->
        ${signatureBlockHtml}
      </div>
    `;

    fullHtmlString += createA4PageContent(currentCalculatedPageIndex, totalPages, "GENEL ŞARTLAR VE ONAY", termsAndConditionsPageHtml);
    currentCalculatedPageIndex++;

    return fullHtmlString;
  };

  // Sync email templates changes to local storage
  useEffect(() => {
    CrmDb.setKv("crm_email_templates", emailTemplates);
  }, [emailTemplates]);

  // Compile mail template variables reactively based on placeholders
  useEffect(() => {
    const template = emailTemplates.find(t => t.id === selectedEmailTemplateId);
    if (template && selectedService) {
      let sub = template.subject;
      let bdy = template.body;

      const replacements: { [key: string]: string } = {
        "{{FirmaAdı}}": clientTitle || "",
        "{{Projeİçeriği}}": selectedService.name || "",
        "{{İlgiliKişi}}": clientContactPerson || "",
        "{{Yönetici}}": assignedPm || "",
        "{{TeklifNo}}": proposalNumber || "",
        "{{TeklifTarihi}}": proposalDate || ""
      };

      Object.entries(replacements).forEach(([key, val]) => {
        sub = sub.replaceAll(key, val);
        bdy = bdy.replaceAll(key, val);
      });

      setMailSubject(sub);
      setMailBody(bdy);
    }
  }, [selectedEmailTemplateId, emailTemplates, clientTitle, selectedService, clientContactPerson, assignedPm, proposalNumber, proposalDate]);

  const handleSaveCurrentEmailTemplate = () => {
    const templateName = prompt(t("Please enter a title/name for this email draft:"), t("Gemba Custom Draft"));
    if (!templateName) return;

    const newTemplate = {
      id: "temp-" + Date.now(),
      name: templateName,
      subject: mailSubject,
      body: mailBody
    };

    const updated = [...emailTemplates, newTemplate];
    setEmailTemplates(updated);
    setSelectedEmailTemplateId(newTemplate.id);
    setToastMessage(t("New email template saved!"));
  };

  const handleDeleteEmailTemplate = (idToDelete: string) => {
    if (emailTemplates.length <= 1) {
      alert(t("At least one email template must remain in the system!"));
      return;
    }
    setConfirmDeleteModal({
      isOpen: true,
      title: t("Email draft will be deleted"),
      message: t("Move to recycle bin?"),
      onConfirm: () => {
        const updated = emailTemplates.filter(t => t.id !== idToDelete);
        setEmailTemplates(updated);
        setSelectedEmailTemplateId(updated[0].id);
        setToastMessage(t("Template deleted successfully."));
      }
    });
  };

  const fallbackCopyText = (text: string) => {
    try {
      const textArea = document.createElement("textarea");
      textArea.value = text;
      textArea.style.position = "fixed";
      textArea.style.top = "0";
      textArea.style.left = "0";
      textArea.style.opacity = "0";
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
    } catch (err) {
      // ignore silently in browser
    }
  };

  const handleCreateAndSaveProposal = (silent = false) => {
    if (!clientTitle.trim()) {
      alert(t("Please fill in the Client Legal Name field!"));
      return;
    }

    const proposalId = "prop-" + Date.now();
    const cleanSeq = parseInt(seqNumber) || 44;

    // Derived totals from active option pricing rows
    const calculatedPrice1 = option1Rows.reduce((acc, row) => acc + (row.dailyRate * row.manDays), 0);
    const calculatedPrice2 = option2Rows.reduce((acc, row) => acc + (row.dailyRate * row.manDays), 0);
    const calculatedPrice3 = option3Rows.reduce((acc, row) => acc + (row.dailyRate * row.manDays), 0);

    const priceList = [
      option1Active ? calculatedPrice1 : 0,
      option2Active ? calculatedPrice2 : 0,
      option3Active ? calculatedPrice3 : 0
    ];
    const totalBudget = Math.max(...priceList, 0);
    const taxes = totalBudget * 0.20;
    const grandTotal = totalBudget + taxes;

    // Create Options definitions mapped for Proposal Management Schema
    const mappedOptions: { [key: string]: any } = {};
    if (option1Active) {
      mappedOptions["Option 1"] = {
        training: true,
        consulting: true,
        expenses: 0,
        workshop: false,
        dailyRate: option1Rows.length ? Math.round(option1Rows.reduce((s, r) => s + (r.dailyRate || 0), 0) / option1Rows.length) : 0,
        manDays: option1Rows.reduce((s, r) => s + (r.manDays || 0), 0)
      };
    }
    if (option2Active) {
      mappedOptions["Option 2"] = {
        training: true,
        consulting: true,
        expenses: 0,
        workshop: false,
        dailyRate: option2Rows.length ? Math.round(option2Rows.reduce((s, r) => s + (r.dailyRate || 0), 0) / option2Rows.length) : 0,
        manDays: option2Rows.reduce((s, r) => s + (r.manDays || 0), 0)
      };
    }
    if (option3Active) {
      mappedOptions["Option 3"] = {
        training: true,
        consulting: true,
        expenses: 0,
        workshop: false,
        dailyRate: option3Rows.length ? Math.round(option3Rows.reduce((s, r) => s + (r.dailyRate || 0), 0) / option3Rows.length) : 0,
        manDays: option3Rows.reduce((s, r) => s + (r.manDays || 0), 0)
      };
    }

    const newProposal = {
      id: proposalId,
      sequenceNo: cleanSeq,
      proposalNumber: proposalNumber,
      companyId: "comp-" + Date.now(),
      companyName: clientTitle,
      contactPerson: clientContactPerson,
      contactEmail: clientContactEmail,
      proposalSubject: selectedService?.name || "Yalın Dönüşüm Hizmet Şablona",
      date: proposalDate,
      currency: "₺" as const,
      owner: assignedPm,
      description: "Sistem tarafından otomatik üretilen teklif",
      status: "Draft",
      services: [selectedService?.name || "Yalın Danışmanlık Projesi"],
      options: mappedOptions,
      totalBudget: totalBudget,
      taxes: taxes,
      grandTotal: grandTotal,
      currentVersion: "v1.0",
      versions: [
        {
          version: "v1.0",
          date: proposalDate,
          reason: "İlk oluşturma",
          changes: "Teklif Sihirbazı (Proposal Wizard) ile otomatik oluşturuldu.",
          owner: assignedPm,
          subject: selectedService?.name || "Yalın Dönüşüm Hizmeti",
          currency: "₺",
          options: mappedOptions,
          services: [selectedService?.name || "Yalın Dönüşüm Hizmeti"],
          totalBudget: totalBudget,
          taxes: taxes,
          grandTotal: grandTotal
        }
      ],
      createdBy: assignedPm,
      lastUpdate: new Date().toISOString()
    };

    // Save/push into Proposal Management list ("crm_proposals")
    let proposalsList = CrmDb.getProposals();
    // Prevent duplicate number rows
    proposalsList = proposalsList.filter((p: any) => p.proposalNumber !== proposalNumber);
    proposalsList.unshift(newProposal);
    CrmDb.saveProposals(proposalsList);

    // Save/push into Deal Management Pipeline list ("smart_mailmerge_deals")
    const newDeal: any = {
      id: "deal-" + Date.now(),
      dealName: `${clientTitle} - ${selectedService?.name || "Yalın Danışmanlık"} Projesi`,
      companyName: clientTitle,
      contactPerson: clientContactPerson,
      contactEmail: clientContactEmail,
      contactPhone: "+90 (532) " + (Math.floor(Math.random() * 900) + 100) + " " + (Math.floor(Math.random() * 9000) + 1000),
      opportunityValue: totalBudget,
      expectedCloseDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0].split('-').reverse().join('.'), // DD.MM.YYYY
      opportunityScore: 80,
      winProbability: 60,
      currentStageDuration: 1,
      priority: totalBudget > 250000 ? "High" : "Medium",
      industry: "Manufacturing",
      opexScore: 70,
      stage: "Proposal Submitted", // Directly add to Proposal Submitted pipeline step as requested
      owner: "GP",
      pipeline: "Sales Pipeline Standard",
      description: `${selectedService?.name || "Hizmet"}: ${newProposal.description}`,
      proposalNumber: proposalNumber,
      manDay: String(option1Active ? option1Rows.reduce((s, r) => s + (r.manDays || 0), 0) : 0),
      contactSubject: selectedService?.name || "Yalın Danışmanlık",
      products: selectedService?.name || "Yalın Eğitim & Coaching",
      dealEmails: [
        {
          id: "m-init-" + Date.now(),
          sender: "Gemba Partner System",
          recipient: clientContactEmail,
          date: new Date().toISOString().replace('T', ' ').slice(0, 16),
          subject: mailSubject,
          body: mailBody
        }
      ]
    };

    let dealsList = CrmDb.getDeals();
    // Avoid double creation of same sequence
    dealsList = dealsList.filter((d: any) => d.proposalNumber !== proposalNumber);
    dealsList.unshift(newDeal);
    CrmDb.saveDeals(dealsList);

    if (!silent) {
      // Step 5 trigger: Save database AND open print PDF immediately!
      setToastMessage(t("Proposal and opportunity saved!"));
      
      // Auto open PDF print/save setup
      handlePrint();

      // Open email drafting in parallel!
      const toEmail = clientContactEmail || "ornek@firma.com";
      const encodedSubject = encodeURIComponent(mailSubject);
      const encodedBody = encodeURIComponent(mailBody);

      let finalLink = "";
      if (mailClientType === "mailto") {
        finalLink = `mailto:${toEmail}?subject=${encodedSubject}&body=${encodedBody}`;
      } else if (mailClientType === "gmail") {
        finalLink = `https://mail.google.com/mail/?view=cm&fs=1&to=${toEmail}&su=${encodedSubject}&body=${encodedBody}`;
      } else if (mailClientType === "outlook") {
        finalLink = `https://outlook.live.com/mail/0/deeplink/compose?to=${toEmail}&subject=${encodedSubject}&body=${encodedBody}`;
      } else if (mailClientType === "outlook-corp") {
        finalLink = `https://outlook.office.com/mail/deeplink/compose?to=${toEmail}&subject=${encodedSubject}&body=${encodedBody}`;
      }

      // Try copying email text
      let doneCopy = false;
      if (typeof navigator !== "undefined" && navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
        navigator.clipboard.writeText(mailBody)
          .then(() => { doneCopy = true; })
          .catch(() => {
            fallbackCopyText(mailBody);
          });
      } else {
        fallbackCopyText(mailBody);
      }

      // Open mail window reliably
      if (mailClientType === "mailto") {
        const anchor = document.createElement("a");
        anchor.href = finalLink;
        anchor.target = "_self";
        document.body.appendChild(anchor);
        anchor.click();
        document.body.removeChild(anchor);
      } else {
        window.open(finalLink, "_blank");
      }

      // Open visual assistant overlay explaining exactly how to attach PDF
      setShowAttachmentHelper(true);
    }
  };

  const handleOpenMailClient = () => {
    // Delegates to high-performance combined action to trigger save + pdf generation + composition!
    handleCreateAndSaveProposal(false);
  };

  // Sync draft assembled proposal text on step completion (Now step 4 is the preview stage)
  useEffect(() => {
    if (wizardStep === 4 && !isAssemblyEditable) {
      setLiveAssemblyHtml(assembleDocument());
    }
  }, [wizardStep, isAssemblyEditable, selectedCardId, clientTitle, clientAddress, assignedPm, proposalDate, wizardTermsAndConditions, option1Active, option1Name, option1Desc, option1Price, option1Duration, option2Active, option2Name, option2Desc, option2Price, option2Duration, option3Active, option3Name, option3Desc, option3Price, option3Duration, letterheadId, option1Rows, option2Rows, option3Rows, wizardCoverPage]);

  // Document Export schemes
  const handlePrint = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>${clientShortName}_${proposalNumber}</title>
          <style>
            @media print {
              @page {
                size: A4 portrait !important;
                margin: 0 !important;
              }
              body {
                margin: 0 !important;
                padding: 0 !important;
                background: none !important;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
              .no-print {
                display: none !important;
              }
            }
            body {
              margin: 0;
              padding: 0;
              background-color: #f8fafc;
            }
          </style>
        </head>
        <body>
          <div>
            ${liveAssemblyHtml}
          </div>
          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 500);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleExportWord = () => {
    const docName = `${clientShortName}_${proposalNumber}.doc`;
    
    const wordStyles = `
      @page {
        size: 21cm 29.7cm;
        margin: 2cm 2cm 2cm 2cm;
      }
      body {
        font-family: Arial, sans-serif;
        font-size: 11pt;
        line-height: 1.5;
        color: #333333;
      }
      .letterhead-table {
        width: 100%;
        border-bottom: 3px solid ${currentLetterhead.primaryColor};
        margin-bottom: 24pt;
        padding-bottom: 8pt;
      }
      .letterhead-title {
        font-size: 12pt;
        font-weight: bold;
        color: ${currentLetterhead.primaryColor};
      }
      .letterhead-details {
        font-size: 8pt;
        color: #777777;
        text-align: right;
      }
      table {
        border-collapse: collapse;
        width: 100%;
        margin-bottom: 12pt;
      }
      th {
        background-color: #f1f5f9;
        font-weight: bold;
        border: 1px solid #cbd5e1;
        padding: 6pt;
        font-size: 10pt;
      }
      td {
        border: 1px solid #cbd5e1;
        padding: 6pt;
        font-size: 9.5pt;
        vertical-align: top;
      }
    `;

    let cleanedHtml = liveAssemblyHtml
      .replace(/position:\s*absolute/gi, "")
      .replace(/position:\s*relative/gi, "")
      .replace(/width:\s*210mm/gi, "width: 100%")
      .replace(/height:\s*297mm/gi, "")
      .replace(/box-shadow:[^;"]+/gi, "")
      .replace(/margin-bottom:[^;"]+/gi, "margin-bottom: 20px");

    const docContent = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office"
            xmlns:w="urn:schemas-microsoft-com:office:word"
            xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta http-equiv="Content-Type" content="text/html; charset=utf-8">
        <style>${wordStyles}</style>
      </head>
      <body>
        <table class="letterhead-table">
          <tr>
            <td style="border: none; padding: 0;">
              <span class="letterhead-title">${currentLetterhead.tagline}</span>
            </td>
            <td style="border: none; padding: 0;" class="letterhead-details">
              ${currentLetterhead.details.replace(/\|/g, "<br/>")}
            </td>
          </tr>
        </table>
        <div>
          ${cleanedHtml}
        </div>
      </body>
      </html>
    `;

    const blob = new Blob(["\ufeff" + docContent], {
      type: "application/msword;charset=utf-8"
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = docName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportPDF = () => {
    handlePrint();
  };

  return (
    <div className="w-full text-slate-700 dark:text-slate-300 antialiased font-sans flex flex-col space-y-6">
      
      {/* HEADER CARD */}
      <div className="bg-white dark:bg-[#1b1a19] p-5 rounded-lg border border-[#EDEBE9] dark:border-[#323130] shadow-sm relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-emerald-500 via-[#0078D4] to-blue-500" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mt-2">
          <div className="flex items-start gap-3.5">
            <div className="p-2.5 bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400 rounded-lg">
              <Layers className="w-6 h-6" />
            </div>
            <div>
              <h1 id="services-page-title" className="text-xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                {activeTab === "cards" ? t("Service Templates & Master Data") : t("New Proposal Wizard")}
                <span className="text-[10px] bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400 font-bold px-2 py-0.5 rounded-full">
                  {activeTab === "cards" ? t("Master Data & Word Layout") : t("Multi-Option Proposal")}
                </span>
              </h1>
              <p className="text-xs text-slate-550 dark:text-slate-400 mt-0.5 leading-relaxed">
                {activeTab === "cards" 
                  ? t("Manage 10 core service cards, copy and clean complex Word tables, and edit proposal templates.")
                  : t("Design professional multi-option (Option 1-2-3) proposal documents for your clients and export PDF/Word output.")}
              </p>
            </div>
          </div>

          {/* MAIN TAB SWITCHER */}
          {showSwitcher && (
            <div className="flex bg-slate-100 dark:bg-[#252423] p-1 rounded-lg border border-[#EDEBE9] dark:border-[#323130]">
              <button
                id="tab-btn-cards"
                type="button"
                onClick={() => setActiveTab("cards")}
                className={`px-3.5 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeTab === "cards" 
                    ? "bg-white dark:bg-[#1b1a19] text-[#0078D4] shadow-xs" 
                    : "text-slate-600 dark:text-slate-450 hover:text-slate-900"
                }`}
              >
                <Settings className="w-3.5 h-3.5" />
                Hizmet Kartları
              </button>
              <button
                id="tab-btn-wizard"
                type="button"
                onClick={() => setActiveTab("wizard")}
                className={`px-3.5 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeTab === "wizard" 
                    ? "bg-white dark:bg-[#1b1a19] text-[#0078D4] shadow-xs" 
                    : "text-slate-600 dark:text-slate-450 hover:text-slate-900"
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                Teklif Sihirbazı
              </button>
            </div>
          )}
        </div>
      </div>

      {/* TAB 1: SERVICE CARDS MANAGEMENT (Master Data) */}
      {activeTab === "cards" && (
        <div id="service-cards-config-tab" className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Services Checklist / Sidebar */}
          <div className="lg:col-span-4 bg-white dark:bg-[#1b1a19] p-4 rounded-lg border border-[#EDEBE9] dark:border-[#323130] shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#EDEBE9] dark:border-[#323130]">
              <span className="text-xs font-black uppercase text-slate-800 dark:text-white tracking-wider flex items-center gap-1.5">
                <Briefcase className="w-4 h-4 text-[#0078D4]" />
                Hizmet Envanteri ({serviceCards.length})
              </span>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-650 dark:text-slate-400">
                  Düzenlemek için Hizmet Seçin:
                </label>
                <label className="text-[10px] font-black text-[#107C41] dark:text-[#52c47c] bg-[#FAF9F8] hover:bg-[#E8F5E9] dark:bg-[#252423] dark:hover:bg-[#1B3A24] border border-[#C8E6C9] dark:border-[#2e7d32] px-2 py-1 rounded cursor-pointer transition-all flex items-center gap-1 shadow-xs selection-none">
                  <Plus className="w-3 h-3" /> + Şablon
                  <input
                    type="file"
                    accept=".doc,.docx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        alert(t("Word template '{name}' uploaded successfully!").replace("{name}", file.name));
                      }
                    }}
                  />
                </label>
              </div>
              <select
                value={selectedEditCardId || ""}
                onChange={(e) => setSelectedEditCardId(e.target.value || null)}
                className="w-full bg-slate-50 dark:bg-[#252423] border border-[#EDEBE9] dark:border-[#323130] rounded p-2.5 text-xs font-bold text-slate-900 dark:text-white focus:ring-1 focus:ring-[#0078D4] focus:outline-hidden cursor-pointer"
              >
                <option value="" className="bg-white dark:bg-[#1b1a19] text-slate-950 dark:text-white font-semibold">-- Bir Hizmet Seçiniz ({serviceCards.length}) --</option>
                {serviceCards.map((c) => (
                  <option key={c.id} value={c.id} className="bg-white dark:bg-[#1b1a19] text-slate-950 dark:text-white font-semibold">
                    [{c.code}] {c.name} ({c.category})
                  </option>
                ))}
              </select>

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={createNewCard}
                  className="flex-1 bg-[#0078D4] hover:bg-blue-600 text-white text-xs font-bold px-3 py-2 rounded flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" /> Yeni Ekle
                </button>
                
                {selectedEditCardId && (
                  <button
                    type="button"
                    onClick={() => {
                      const c = serviceCards.find(item => item.id === selectedEditCardId);
                      if (c) {
                        removeCard(c.id, c.name);
                      }
                    }}
                    className="bg-rose-50 dark:bg-rose-950/20 hover:bg-rose-100 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-450 p-2 rounded border border-rose-200 dark:border-rose-900/30 cursor-pointer transition-colors"
                    title="Seçili Hizmeti Sil"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {selectedEditCardId && (
              <div className="p-3 bg-slate-55/40 dark:bg-zinc-800/20 rounded border border-[#EDEBE9] dark:border-[#323130] text-[11px] space-y-1">
                <div className="text-slate-500 font-bold">Mevcut Seçim Bilgisi:</div>
                {(() => {
                  const curr = serviceCards.find(item => item.id === selectedEditCardId);
                  if (!curr) return null;
                  return (
                    <>
                      <div className="font-bold text-slate-800 dark:text-slate-200">{curr.name}</div>
                      <div className="text-slate-500 font-mono text-[10px]">Eşleşen Kod: {curr.code} | Sınıfı: {curr.category}</div>
                    </>
                  );
                })()}
              </div>
            )}
          </div>

          {/* Service Editor Area */}
          <div className="lg:col-span-8 bg-white dark:bg-[#1b1a19] p-5 rounded-lg border border-[#EDEBE9] dark:border-[#323130] shadow-sm min-h-[500px]">
            {selectedEditCardId ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-[#EDEBE9] dark:border-[#323130]">
                  <div className="flex items-center gap-2">
                    <Edit3 className="w-4 h-4 text-[#0078D4]" />
                    <span className="text-xs font-black uppercase text-slate-900 dark:text-white tracking-wider">Hizmet Kartı Detay Düzenleyici</span>
                  </div>
                  <button
                    type="button"
                    onClick={saveEditedCard}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3 py-1.5 rounded flex items-center gap-1.5 cursor-pointer selection-none"
                  >
                    <Save className="w-3.5 h-3.5" />
                    Kabulleri Kaydet
                  </button>
                </div>

                {/* Grid Title / Code / Category */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400">{t("Service Name (Text)")}</label>
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-[#252423] border border-[#EDEBE9] dark:border-[#323130] rounded p-2 text-xs focus:ring-1 focus:ring-[#0078D4] focus:outline-hidden font-bold"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400">Ürün Kodu *</label>
                    <input
                      type="text"
                      value={editCode}
                      onChange={(e) => setEditCode(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-[#252423] border border-[#EDEBE9] dark:border-[#323130] rounded p-2 text-xs focus:ring-1 focus:ring-[#0078D4] focus:outline-hidden"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400">Kategori</label>
                    <select
                      value={editCategory}
                      onChange={(e) => setEditCategory(e.target.value as any)}
                      className="w-full bg-slate-50 dark:bg-[#252423] border border-[#EDEBE9] dark:border-[#323130] rounded p-2 text-xs text-slate-900 dark:text-white focus:ring-1 focus:ring-[#0078D4] focus:outline-hidden"
                    >
                      <option value="PROJE" className="bg-white dark:bg-[#1b1a19] text-slate-950 dark:text-white font-semibold">PROJE</option>
                      <option value="ANALİZ" className="bg-white dark:bg-[#1b1a19] text-slate-950 dark:text-white font-semibold">ANALİZ</option>
                      <option value="KOÇLUK" className="bg-white dark:bg-[#1b1a19] text-slate-950 dark:text-white font-semibold">KOÇLUK</option>
                      <option value="GEMBA TEKNİK" className="bg-white dark:bg-[#1b1a19] text-slate-950 dark:text-white font-semibold">GEMBA TEKNİK</option>
                      <option value="EĞİTİM" className="bg-white dark:bg-[#1b1a19] text-slate-950 dark:text-white font-semibold">EĞİTİM</option>
                    </select>
                  </div>
                </div>

                {/* Default Cover Text */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1">
                      <Type className="w-3.5 h-3.5" />
                      Varsayılan Giriş & Kapak Taslak Yazısı (Rich Text HTML)
                    </label>
                  </div>
                  <textarea
                    rows={4}
                    value={editCoverPage}
                    onChange={(e) => setEditCoverPage(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-[#252423] border border-[#EDEBE9] dark:border-[#323130] rounded p-2.5 text-xs font-mono focus:ring-1 focus:ring-[#0078D4] focus:outline-hidden"
                  />
                </div>

                {/* Activity & Content Table Rich Editor */}
                <div className="space-y-2">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-slate-50 dark:bg-[#252423] p-3 rounded-lg border border-[#EDEBE9] dark:border-[#323130]">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-white">
                      <Table className="w-4 h-4 text-[#0078D4]" />
                      Süreç, Faaliyet ve Efor Tablosu (Gelişmiş Word Uyumlu)
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setPastePrompt(!pastePrompt)}
                        className="bg-amber-100 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 hover:bg-amber-200 text-[11px] font-bold px-2.5 py-1 rounded flex items-center gap-1 cursor-pointer selection-none"
                      >
                        <Clipboard className="w-3 h-3" /> Word Tablosu Yapıştır
                      </button>
                    </div>
                  </div>

                  {/* Microsoft Word clipboard instructions */}
                  <div className="p-3 bg-blue-50/40 dark:bg-blue-950/20 rounded border border-blue-100 dark:border-blue-900/30 text-[11px] text-blue-800 dark:text-blue-300 leading-relaxed flex items-start gap-2">
                    <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <div>
                      <strong>Word Kopyalama Sistemi:</strong> MS Word üzerinden kopyaladığınız tabloları aşağıdaki editörün içine direkt <strong>CTRL+V</strong> ile yapıştırabilir veya üstteki "Word Tablosu Yapıştır" butonunu kullanarak temizletebilirsiniz. Bulon yapılar (rowspan/colspan), hücre birleştirmeler ve dikey hizalamalar korunacaktır.
                    </div>
                  </div>

                  {/* Show Manual Import Panel */}
                  {pastePrompt && (
                    <div className="p-4 bg-slate-50 dark:bg-[#252423] border border-amber-400 dark:border-amber-800 rounded-lg space-y-4">
                      <div>
                        <h4 className="text-xs font-black text-[#0078D4] dark:text-[#5caff3] uppercase tracking-wide flex items-center gap-1.5 mb-1">
                          <Sparkles className="w-4 h-4" />
                          Word'den Tablo Verisi / Kopyalanmış Metin Yapıştırın
                        </h4>
                        <p className="text-[11px] text-slate-500">
                          Word'den doğrudan kopyaladığınız tabloyu, düz metinleri veya listeleri buraya yapıştırın. Yapay Zeka (AI) bunları otomatik olarak A4 standartlarına uygun şık bir HTML tablo yapısına dönüştürecektir.
                        </p>
                      </div>
                      
                      <textarea
                        rows={6}
                        placeholder="Örn:&#10;Teşhis • Mevcut durum analizleri ve raporlanması (1 Gün)&#10;Tasarım • Proje Master Planının Oluşturulması (3 Gün)&#10;veya doğrudan Word'den kopyalanan satırları buraya CTRL+V ile yapıştırın..."
                        value={rawPastedHtml}
                        onChange={(e) => setRawPastedHtml(e.target.value)}
                        className="w-full bg-white dark:bg-[#1b1a19] border border-[#EDEBE9] dark:border-[#323130] rounded p-2.5 text-xs font-mono placeholder-slate-450 focus:ring-1 focus:ring-[#0078D4] focus:outline-hidden"
                      />
                      
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1 border-t border-[#EDEBE9] dark:border-[#323130]">
                        <span className="text-[10px] text-slate-400 italic">
                          * Yapay zeka ile sütun gruplama ve rowspan hizalamaları otomatik oluşturulur.
                        </span>
                        <div className="flex items-center gap-2 self-end">
                          <button
                            type="button"
                            onClick={() => {
                              setPastePrompt(false);
                              setRawPastedHtml("");
                            }}
                            className="bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-[11px] font-bold px-3 py-1.5 rounded cursor-pointer"
                          >
                            Vazgeç
                          </button>
                          
                          <button
                            type="button"
                            onClick={handleManualWordPaste}
                            disabled={!rawPastedHtml || isAiConverting}
                            className="bg-slate-500 hover:bg-slate-600 text-white text-[11px] font-bold px-3 py-1.5 rounded disabled:opacity-50 cursor-pointer"
                            title="Yalnızca HTML formatında kopyalanan yapıların doğrudan temizlenip aktarılmasında kullanılır."
                          >
                            Düz Kod Temizle
                          </button>

                          <button
                            type="button"
                            onClick={handleAiTableConvert}
                            disabled={!rawPastedHtml || isAiConverting}
                            className="bg-gradient-to-r from-[#0078D4] to-indigo-600 hover:opacity-90 text-white text-[11px] font-black px-4 py-1.5 rounded flex items-center gap-1.5 disabled:opacity-50 cursor-pointer shadow-sm"
                          >
                            {isAiConverting ? (
                              <>
                                <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                AI Dönüştürüyor...
                              </>
                            ) : (
                              <>
                                <Sparkles className="w-3.5 h-3.5" />
                                Yapay Zeka (AI) ile Tabloya Çevir
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* LIVE EDITABLE CONTENT ZONE */}
                  <div className="space-y-1.5 pb-2">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                        Ürün Tablosu Düzenleme Alanı <span className="text-[9px] text-slate-450 dark:text-slate-450 font-mono bg-slate-100 dark:bg-zinc-800 px-1 py-0.5 rounded opacity-75 font-normal">{"{{EforTablosu}}"}</span> {t("(Source HTML)")}
                      </label>
                      <button 
                        type="button" 
                        onClick={() => setIsTableCollapsed(!isTableCollapsed)} 
                        className="text-xs font-black bg-slate-100 hover:bg-slate-200 dark:bg-[#252423] dark:hover:bg-[#323130] text-slate-700 dark:text-slate-200 w-6 h-6 rounded flex items-center justify-center cursor-pointer border border-[#EDEBE9] dark:border-[#323130] transition-colors"
                        title={isTableCollapsed ? "Alanı Genişlet" : "Alanı Küçült / Gizle"}
                      >
                        {isTableCollapsed ? "+" : "-"}
                      </button>
                    </div>
                    
                    {!isTableCollapsed && (
                      <textarea
                        rows={8}
                        value={editTableHtml}
                        onChange={(e) => setEditTableHtml(e.target.value)}
                        onPaste={(e) => handleEditorPaste(e, setEditTableHtml)}
                        style={{ color: '#117ecb' }}
                        className="w-full bg-[#1e1e1e] font-mono text-xs p-3.5 rounded-lg border border-[#323130] focus:ring-1 focus:ring-[#0078D4] focus:outline-hidden leading-relaxed animate-fadeIn"
                      />
                    )}
                  </div>

                  {/* COVET TEXT & TERMS EDITOR */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1">
                      <FileSignature className="w-3.5 h-3.5" />
                      Hizmete Özel Varsayılan Sözleşme Genel Şartları <span className="text-[9px] text-slate-450 dark:text-slate-450 font-mono bg-slate-100 dark:bg-zinc-800 px-1 py-0.5 rounded opacity-75 font-normal">{"{{GenelSartlar}}"}</span> {t("(Text Lines)")}
                    </label>
                    <textarea
                      rows={4}
                      placeholder="Sözleşme genel şartlarını satır satır buraya girin..."
                      value={editTerms}
                      onChange={(e) => setEditTerms(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-[#252423] border border-[#EDEBE9] dark:border-[#323130] rounded p-2.5 text-xs focus:ring-1 focus:ring-[#0078D4] focus:outline-hidden"
                    />
                  </div>

                  {/* HIGH-FIDELITY PNG TEMPLATES DUAL UPLOAD ZONE */}
                  <div className="p-4 bg-slate-50 dark:bg-[#252423] border border-dashed border-[#EDEBE9] dark:border-[#323130] rounded-lg space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <FileCheck className="w-4 h-4 text-[#0078D4]" />
                        <span className="text-xs font-bold text-slate-800 dark:text-white">A4 Kurumsal Görsel Şablon Yükleme Alanı (PNG)</span>
                      </div>
                      <span className="text-[10px] bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-300 font-semibold px-2 py-0.5 rounded uppercase tracking-wider">{t("A4 PNG Engine")}</span>
                    </div>

                    <div className="p-3 bg-blue-50/40 dark:bg-blue-950/20 rounded border border-blue-100 dark:border-blue-900/30 text-[11px] text-blue-800 dark:text-blue-300 leading-relaxed flex items-start gap-2">
                      <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
                      <div>
                        Yüklenen kapak ve iç sayfa şablonları, teklif çıktısında arka plan görseli olarak ölçeklendirilir. Bu hizmete özel yüklenmediğinde, yüklenen diğer kurumsal şablonlar varsayılan olarak kullanılır; eğer hiçbir şablon yüklenmemişse standart <strong>cover.png</strong> ve <strong>page.png</strong> kurumsal görselleri kullanılacaktır.
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* 1. COVER PAGE PNG UPLOAD */}
                      <div className="space-y-2 p-3 bg-white dark:bg-[#1b1a19] rounded-md border border-[#EDEBE9] dark:border-[#323130]">
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block">1. Kapak Sayfa Şablonu (cover.png alternatifi)</span>
                        
                        {uploadedCoverTemplates[selectedEditCardId] ? (
                          <div className="space-y-2">
                            <div className="flex items-center justify-between bg-slate-50 dark:bg-[#252423] p-2 rounded border border-[#EDEBE9] dark:border-[#323130]">
                              <div className="min-w-0 flex-1 mr-2">
                                <div className="text-[11px] font-bold text-slate-800 dark:text-slate-100 truncate">{uploadedCoverTemplates[selectedEditCardId].name}</div>
                                <div className="text-[9px] text-slate-400">{uploadedCoverTemplates[selectedEditCardId].size} • {uploadedCoverTemplates[selectedEditCardId].uploadedAt}</div>
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  const updated = { ...uploadedCoverTemplates };
                                  delete updated[selectedEditCardId];
                                  setUploadedCoverTemplates(updated);
                                  CrmDb.setKv("crm_uploaded_cover_templates", updated);

                                  const updatedMem = { ...inMemoryCoverTemplates };
                                  delete updatedMem[selectedEditCardId];
                                  setInMemoryCoverTemplates(updatedMem);
                                  CrmDb.setKv(`crm_png_template_cover_${selectedEditCardId}`, "");

                                  // Delete from server
                                  fetch(`/api/templates/cover/${selectedEditCardId}`, { method: "DELETE" })
                                    .catch(err => console.warn("Failed to delete cover template from server:", err));
                                }}
                                className="text-red-600 hover:text-red-700 p-1 text-[10px] font-bold cursor-pointer transition-colors"
                              >
                                Kaldır
                              </button>
                            </div>
                            {inMemoryCoverTemplates[selectedEditCardId] && (
                              <div className="border border-slate-150 dark:border-zinc-800 rounded p-1.5 bg-slate-50/50 dark:bg-zinc-900/40 flex items-center justify-center">
                                <img
                                  src={inMemoryCoverTemplates[selectedEditCardId]}
                                  alt="Cover Template Preview"
                                  className="max-h-24 object-contain rounded border border-slate-200 dark:border-zinc-700 shadow-xs"
                                  referrerPolicy="no-referrer"
                                />
                              </div>
                            )}
                          </div>
                        ) : (
                          <label className="group flex flex-col items-center justify-center py-4 border border-dashed border-[#EDEBE9] dark:border-[#323130] rounded cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-900/40">
                            <Download className="w-4 h-4 text-slate-400 group-hover:text-[#0078D4] rotate-180 mb-1" />
                            <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400 group-hover:text-[#0078D4]">PNG Kapak Şablonu Seç</span>
                            <span className="text-[8px] text-slate-400">Yalnızca .png (Kapak Sayfası)</span>
                            <input
                              type="file"
                              accept="image/png"
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  if (!file.type.includes("png")) {
                                    alert(t("Please upload PNG image files only."));
                                    return;
                                  }
                                  const reader = new FileReader();
                                  reader.onload = (event) => {
                                    const base64 = event.target?.result as string;
                                    const nextInfo = {
                                      name: file.name,
                                      size: `${(file.size / 1024).toFixed(1)} KB`,
                                      uploadedAt: new Date().toLocaleDateString("tr-TR")
                                    };

                                    // Upload to server
                                    fetch(`/api/templates/cover/${selectedEditCardId}`, {
                                      method: "POST",
                                      headers: { "Content-Type": "application/json" },
                                      body: JSON.stringify({
                                        name: nextInfo.name,
                                        size: nextInfo.size,
                                        data: base64
                                      })
                                    })
                                    .then(() => {
                                      setInMemoryCoverTemplates(prev => ({
                                        ...prev,
                                        [selectedEditCardId]: `/templates/cover_${selectedEditCardId}.png`
                                      }));
                                      const updated = {
                                        ...uploadedCoverTemplates,
                                        [selectedEditCardId]: nextInfo
                                      };
                                      setUploadedCoverTemplates(updated);
                                      CrmDb.setKv("crm_uploaded_cover_templates", updated);
                                      CrmDb.setKv(`crm_png_template_cover_${selectedEditCardId}`, `/templates/cover_${selectedEditCardId}.png`);
                                      alert(t("Cover template saved to server!"));
                                    })
                                    .catch(err => {
                                      console.error("Failed to upload cover template to server:", err);
                                      // Fallback to local storage
                                      setInMemoryCoverTemplates(prev => ({
                                        ...prev,
                                        [selectedEditCardId]: base64
                                      }));
                                      const updated = {
                                        ...uploadedCoverTemplates,
                                        [selectedEditCardId]: nextInfo
                                      };
                                      setUploadedCoverTemplates(updated);
                                      CrmDb.setKv("crm_uploaded_cover_templates", updated);
                                      CrmDb.setKv(`crm_png_template_cover_${selectedEditCardId}`, base64);
                                      alert(t("Cover template saved locally (server error)."));
                                    });
                                  };
                                  reader.readAsDataURL(file);
                                }
                              }}
                            />
                          </label>
                        )}
                      </div>

                      {/* 2. INNER PAGE PNG UPLOAD */}
                      <div className="space-y-2 p-3 bg-white dark:bg-[#1b1a19] rounded-md border border-[#EDEBE9] dark:border-[#323130]">
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block">2. Standart İç Sayfa Şablonu (page.png alternatifi)</span>
                        
                        {uploadedPageTemplates[selectedEditCardId] ? (
                          <div className="space-y-2">
                            <div className="flex items-center justify-between bg-slate-50 dark:bg-[#252423] p-2 rounded border border-[#EDEBE9] dark:border-[#323130]">
                              <div className="min-w-0 flex-1 mr-2">
                                <div className="text-[11px] font-bold text-slate-800 dark:text-slate-100 truncate">{uploadedPageTemplates[selectedEditCardId].name}</div>
                                <div className="text-[9px] text-slate-400">{uploadedPageTemplates[selectedEditCardId].size} • {uploadedPageTemplates[selectedEditCardId].uploadedAt}</div>
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  const updated = { ...uploadedPageTemplates };
                                  delete updated[selectedEditCardId];
                                  setUploadedPageTemplates(updated);
                                  CrmDb.setKv("crm_uploaded_page_templates", updated);

                                  const updatedMem = { ...inMemoryPageTemplates };
                                  delete updatedMem[selectedEditCardId];
                                  setInMemoryPageTemplates(updatedMem);
                                  CrmDb.setKv(`crm_png_template_page_${selectedEditCardId}`, "");

                                  // Delete from server
                                  fetch(`/api/templates/page/${selectedEditCardId}`, { method: "DELETE" })
                                    .catch(err => console.warn("Failed to delete page template from server:", err));
                                }}
                                className="text-red-600 hover:text-red-700 p-1 text-[10px] font-bold cursor-pointer transition-colors"
                              >
                                Kaldır
                              </button>
                            </div>
                            {inMemoryPageTemplates[selectedEditCardId] && (
                              <div className="border border-slate-150 dark:border-zinc-800 rounded p-1.5 bg-slate-50/50 dark:bg-zinc-900/40 flex items-center justify-center">
                                <img
                                  src={inMemoryPageTemplates[selectedEditCardId]}
                                  alt="Page Template Preview"
                                  className="max-h-24 object-contain rounded border border-slate-200 dark:border-zinc-700 shadow-xs"
                                  referrerPolicy="no-referrer"
                                />
                              </div>
                            )}
                          </div>
                        ) : (
                          <label className="group flex flex-col items-center justify-center py-4 border border-dashed border-[#EDEBE9] dark:border-[#323130] rounded cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-900/40">
                            <Download className="w-4 h-4 text-slate-400 group-hover:text-[#0078D4] rotate-180 mb-1" />
                            <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400 group-hover:text-[#0078D4]">PNG İç Sayfa Şablonu Seç</span>
                            <span className="text-[8px] text-slate-400">Yalnızca .png (Sayfa Gövdesi)</span>
                            <input
                              type="file"
                              accept="image/png"
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  if (!file.type.includes("png")) {
                                    alert(t("Please upload PNG image files only."));
                                    return;
                                  }
                                  const reader = new FileReader();
                                  reader.onload = (event) => {
                                    const base64 = event.target?.result as string;
                                    const nextInfo = {
                                      name: file.name,
                                      size: `${(file.size / 1024).toFixed(1)} KB`,
                                      uploadedAt: new Date().toLocaleDateString("tr-TR")
                                    };

                                    // Upload to server
                                    fetch(`/api/templates/page/${selectedEditCardId}`, {
                                      method: "POST",
                                      headers: { "Content-Type": "application/json" },
                                      body: JSON.stringify({
                                        name: nextInfo.name,
                                        size: nextInfo.size,
                                        data: base64
                                      })
                                    })
                                    .then(() => {
                                      setInMemoryPageTemplates(prev => ({
                                        ...prev,
                                        [selectedEditCardId]: `/templates/page_${selectedEditCardId}.png`
                                      }));
                                      const updated = {
                                        ...uploadedPageTemplates,
                                        [selectedEditCardId]: nextInfo
                                      };
                                      setUploadedPageTemplates(updated);
                                      CrmDb.setKv("crm_uploaded_page_templates", updated);
                                      CrmDb.setKv(`crm_png_template_page_${selectedEditCardId}`, `/templates/page_${selectedEditCardId}.png`);
                                      alert(t("Inner page template saved to server!"));
                                    })
                                    .catch(err => {
                                      console.error("Failed to upload page template to server:", err);
                                      // Fallback to local storage
                                      setInMemoryPageTemplates(prev => ({
                                        ...prev,
                                        [selectedEditCardId]: base64
                                      }));
                                      const updated = {
                                        ...uploadedPageTemplates,
                                        [selectedEditCardId]: nextInfo
                                      };
                                      setUploadedPageTemplates(updated);
                                      CrmDb.setKv("crm_uploaded_page_templates", updated);
                                      CrmDb.setKv(`crm_png_template_page_${selectedEditCardId}`, base64);
                                      alert(t("Inner page template saved locally (server error)."));
                                    });
                                  };
                                  reader.readAsDataURL(file);
                                }
                              }}
                            />
                          </label>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* TABLE INTEGRATION PREVIEW */}
                  <div className="space-y-1.5 pt-2">
                    <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1">
                      <Eye className="w-3.5 h-3.5" />
                      Mevcut Hiyerarşik Tablo Canlı Görünümü
                    </span>
                    <div className="p-4 bg-white dark:bg-slate-900 rounded-lg border border-[#EDEBE9] dark:border-[#323130] overflow-x-auto">
                      <div dangerouslySetInnerHTML={{ __html: editTableHtml || "<p class='text-xs italic text-slate-400'>Tablo boş</p>" }} />
                    </div>
                  </div>

                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full py-16 text-center space-y-3.5">
                <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-full text-slate-400">
                  <Settings className="w-8 h-8 animate-spin-slow" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">Seçilmiş Hizmet Kartı Bulunmuyor</h3>
                  <p className="text-xs text-slate-400 mt-1 max-w-xs leading-relaxed">
                    Düzenleme yapmak, Word tablolarını kopyalayıp temizlemek ve taslak girişleri güncellemek için sol sütundan bir hizmet seçin.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: PROPOSAL WIZARD FLOW */}
      {activeTab === "wizard" && (
        <div id="proposal-wizard-flow-wrapper" className="space-y-6">
          
          {/* STEPPER HEADER PROGRESS */}
          <div className="bg-white dark:bg-[#1b1a19] p-4 rounded-lg border border-[#EDEBE9] dark:border-[#323130] shadow-sm">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold text-slate-400">Aşamalar:</span>
                <div className="flex items-center gap-1">
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black ${wizardStep === 1 ? "bg-[#0078D4] text-white" : "bg-slate-100 dark:bg-slate-850 text-slate-600"}`}>1</span>
                  <span className="text-[10px] font-bold text-slate-500">Müşteri</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
                <div className="flex items-center gap-1">
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black ${wizardStep === 2 ? "bg-[#0078D4] text-white" : "bg-slate-100 dark:bg-slate-850 text-slate-600"}`}>2</span>
                  <span className="text-[10px] font-bold text-slate-500">Hizmet Seçi</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
                <div className="flex items-center gap-1">
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black ${wizardStep === 3 ? "bg-[#0078D4] text-white" : "bg-slate-100 dark:bg-slate-850 text-slate-600"}`}>3</span>
                  <span className="text-[10px] font-bold text-slate-500">Genel Şartlar</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
                <div className="flex items-center gap-1">
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black ${wizardStep === 4 ? "bg-[#0078D4] text-white" : "bg-slate-100 dark:bg-slate-850 text-slate-600"}`}>4</span>
                  <span className="text-[10px] font-bold text-slate-500">Önizle & Ver</span>
                </div>
              </div>

              {/* Step Navigation Hooks */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setWizardStep(prev => Math.max(1, prev - 1) as any)}
                  disabled={wizardStep === 1}
                  className="px-3 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-[#252423] dark:hover:bg-[#323130] text-slate-700 dark:text-slate-200 rounded text-xs font-bold disabled:opacity-50 cursor-pointer flex items-center gap-1"
                >
                  <ChevronLeft className="w-3.5 h-3.5" /> Geri
                </button>
                <button
                  type="button"
                  onClick={() => setWizardStep(prev => Math.min(4, prev + 1) as any)}
                  disabled={wizardStep === 4}
                  className="px-3.5 py-1.5 bg-[#2876e2] hover:bg-[#1a5cb8] text-white rounded text-xs font-bold disabled:opacity-50 cursor-pointer flex items-center gap-1"
                >
                  İleri <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            
            {/* LEFT COLUMN: WIZARD CONFIG FORM */}
            <div className={`${wizardStep === 4 ? "lg:col-span-4" : "lg:col-span-12 max-w-5xl mx-auto w-full"} space-y-6`}>

              {/* STEP 1: CLIENT & CARD DESCRIPTION FORM */}
              {wizardStep === 1 && (
                <div id="wizard-step-1-card" className="bg-white dark:bg-[#1b1a19] p-6 rounded-lg border border-[#EDEBE9] dark:border-[#323130] shadow-sm space-y-5">
                  <div className="flex items-center gap-1.5 pb-2.5 border-b border-[#EDEBE9] dark:border-[#323130]">
                    <Building className="w-5 h-5 text-[#0078D4]" />
                    <span className="text-sm font-black uppercase text-slate-900 dark:text-white tracking-wider">Aşama 1: Müşteri & Hizmet Şablon Bilgileri</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {/* Left: Client Fields */}
                    <div className="space-y-4">
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Müşteri Ticari Unvanı * <span className="text-[9px] text-slate-450 dark:text-slate-450 font-mono bg-slate-100 dark:bg-zinc-800 px-1 py-0.5 rounded opacity-75 font-normal">{"{{FirmaAdı}}"}</span></label>
                          {registeredCompanies.length > 0 && (
                            <span className="text-[10px] text-[#0078D4] dark:text-[#5caff3] font-bold flex items-center gap-1 bg-blue-50 dark:bg-blue-950/20 px-1.5 py-0.5 rounded">
                              <Building className="w-3 h-3" />
                              {registeredCompanies.length} Kayıtlı Unvan
                            </span>
                          )}
                        </div>
                        <div className="relative">
                          <input
                            type="text"
                            value={clientTitle}
                            onChange={(e) => {
                              setClientTitle(e.target.value);
                              setShowCompaniesDropdown(true);
                            }}
                            onFocus={() => setShowCompaniesDropdown(true)}
                            onBlur={() => {
                              setTimeout(() => setShowCompaniesDropdown(false), 200);
                            }}
                            placeholder="Müşteri firma unvanını girin..."
                            className="w-full bg-slate-50 dark:bg-[#252423] border border-[#EDEBE9] dark:border-[#323130] rounded p-2.5 text-xs focus:ring-1 focus:ring-[#0078D4] pr-8 text-slate-900 dark:text-white"
                          />
                          <button
                            type="button"
                            onClick={() => setShowCompaniesDropdown(!showCompaniesDropdown)}
                            className="absolute right-2.5 top-2.5 text-slate-400 hover:text-[#0078D4] cursor-pointer"
                          >
                            <Building className="w-4 h-4" />
                          </button>

                          {showCompaniesDropdown && matchingCompanies.length > 0 && (
                            <div className="absolute left-0 right-0 mt-1 bg-white dark:bg-[#1b1a19] border border-[#0078D4] dark:border-blue-500 rounded-md shadow-lg max-h-48 overflow-y-auto z-50 divide-y divide-[#EDEBE9] dark:divide-[#323130] scrollbar-thin">
                              {matchingCompanies.map((c) => (
                                <button
                                  key={c.id}
                                  type="button"
                                  onMouseDown={() => {
                                    setClientTitle(c.name);
                                    const parts = [c.billingAddress, c.billingDistrict, c.billingCity, c.billingCountry].filter(Boolean);
                                    setClientAddress(parts.join(", "));
                                    if (c.contactName || c.contactPerson) {
                                      setClientContactPerson(c.contactName || c.contactPerson);
                                    } else {
                                      setClientContactPerson("Atakan Zehir");
                                    }
                                    if (c.contactEmail) {
                                      setClientContactEmail(c.contactEmail);
                                    } else {
                                      setClientContactEmail("atakan.zehir@gmail.com");
                                    }
                                    setShowCompaniesDropdown(false);
                                  }}
                                  className="w-full text-left px-3 py-2 text-xs hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-800 dark:text-slate-200 block"
                                >
                                  <strong>{c.name}</strong>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Firma Kısa Adı * (PDF Dosya Adı Kısaltması)</label>
                          {isShortNameManuallyEdited && (
                            <button
                              type="button"
                              onClick={() => setIsShortNameManuallyEdited(false)}
                              className="text-[9px] text-[#0078D4] dark:text-[#5caff3] font-black hover:underline"
                            >
                              Otomatiğe Dön
                            </button>
                          )}
                        </div>
                        <input
                          type="text"
                          value={clientShortName}
                          onChange={(e) => {
                            setClientShortName(e.target.value);
                            setIsShortNameManuallyEdited(true);
                          }}
                          placeholder="Örn: VakkoTekstil"
                          className="w-full bg-slate-50 dark:bg-[#252423] border border-[#EDEBE9] dark:border-[#323130] rounded p-2.5 text-xs focus:ring-1 focus:ring-[#0078D4] text-slate-900 dark:text-white font-semibold"
                        />
                        <div className="text-[10px] text-slate-500 font-medium pt-0.5">
                          Dosya Adı: <span className="font-mono bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-slate-300 px-1 py-0.5 rounded font-black">{clientShortName || "FirmaKisa"}_{proposalNumber || "2606-91"}.pdf</span> (FirmaKısaAdı_QTeklifNo)
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Tebligat & Fatura Adresi</label>
                        <textarea
                          rows={2}
                          value={clientAddress}
                          onChange={(e) => setClientAddress(e.target.value)}
                          placeholder="Fatura adresi..."
                          className="w-full bg-slate-50 dark:bg-[#252423] border border-[#EDEBE9] dark:border-[#323130] rounded p-2.5 text-xs focus:ring-1 focus:ring-[#0078D4] resize-none"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Sorumlu Kişi <span className="text-[9px] text-slate-450 dark:text-slate-450 font-mono bg-slate-100 dark:bg-zinc-800 px-1 py-0.5 rounded opacity-75 font-normal">{"{{Yönetici}}"}</span></label>
                          <input
                            type="text"
                            value={assignedPm}
                            onChange={(e) => setAssignedPm(e.target.value)}
                            className="w-full bg-slate-50 dark:bg-[#252423] border border-[#EDEBE9] dark:border-[#323130] rounded p-2.5 text-xs focus:ring-1 focus:ring-[#0078D4]"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Teklif Tarihi <span className="text-[9px] text-slate-450 dark:text-slate-450 font-mono bg-slate-100 dark:bg-zinc-800 px-1 py-0.5 rounded opacity-75 font-normal">{"{{TeklifTarihi}}"}</span></label>
                          <input
                            type="date"
                            value={proposalDate}
                            onChange={(e) => setProposalDate(e.target.value)}
                            className="w-full bg-slate-50 dark:bg-[#252423] border border-[#EDEBE9] dark:border-[#323130] rounded p-2.5 text-xs focus:ring-1 focus:ring-[#0078D4]"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Müşteri İlgili Kişi <span className="text-[9px] text-slate-450 dark:text-slate-450 font-mono bg-slate-100 dark:bg-zinc-800 px-1 py-0.5 rounded opacity-75 font-normal">{"{{İlgiliKişi}}"}</span></label>
                          <input
                            type="text"
                            value={clientContactPerson}
                            onChange={(e) => setClientContactPerson(e.target.value)}
                            placeholder="Müşteri tarafındaki yetkili..."
                            className="w-full bg-slate-50 dark:bg-[#252423] border border-[#EDEBE9] dark:border-[#323130] rounded p-2.5 text-xs focus:ring-1 focus:ring-[#0078D4]"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Müşteri E-posta Adresi</label>
                          <input
                            type="email"
                            value={clientContactEmail}
                            onChange={(e) => setClientContactEmail(e.target.value)}
                            placeholder="to: yetkili@firma.com"
                            className="w-full bg-slate-50 dark:bg-[#252423] border border-[#EDEBE9] dark:border-[#323130] rounded p-2.5 text-xs focus:ring-1 focus:ring-[#0078D4]"
                          />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Teklif Numarası <span className="text-[9px] text-slate-450 dark:text-slate-450 font-mono bg-slate-100 dark:bg-zinc-800 px-1 py-0.5 rounded opacity-75 font-normal">{"{{TeklifNo}}"}</span></label>
                          {isNumberManuallyEdited && (
                            <button
                              type="button"
                              onClick={() => {
                                setIsNumberManuallyEdited(false);
                                if (proposalDate) {
                                  const parts = proposalDate.split("-");
                                  if (parts.length === 3) {
                                    setProposalNumber(`${parts[0].slice(-2)}${parts[1]}-${seqNumber}`);
                                  }
                                }
                              }}
                              className="text-[9px] text-[#0078D4] dark:text-[#5caff3] font-black hover:underline"
                            >
                              Otomatiğe Dön
                            </button>
                          )}
                        </div>
                        <div className="relative">
                          <input
                            type="text"
                            value={proposalNumber}
                            onChange={(e) => {
                              setProposalNumber(e.target.value);
                              setIsNumberManuallyEdited(true);
                            }}
                            className={`w-full border rounded p-2.5 text-xs focus:ring-1 focus:ring-[#0078D4] font-black tracking-wide ${
                              isDuplicateNumber
                                ? "bg-red-50 dark:bg-red-950/20 border-red-300 text-red-700 dark:text-red-350"
                                : "bg-slate-50 dark:bg-[#252423] border-[#EDEBE9] dark:border-[#323130] text-[#0078D4]"
                            }`}
                          />
                          {isDuplicateNumber && (
                            <p className="text-[10px] text-rose-500 font-bold mt-1">Sistemde bu teklif numarası zaten kayıtlı!</p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right: Service Select & Cover Letter Editor! */}
                    <div className="space-y-4">
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Hizmet Seçici Dropdown <span className="text-[9px] text-slate-450 dark:text-slate-450 font-mono bg-slate-100 dark:bg-zinc-800 px-1 py-0.5 rounded opacity-75 font-normal">{"{{HizmetAdı}}"}</span> *</label>
                        
                        {/* Interactive Filter Field */}
                        <div className="relative mb-2">
                          <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Filter className="h-3.5 w-3.5 text-slate-400 dark:text-zinc-500" />
                          </span>
                          <input
                            type="text"
                            placeholder="Hizmetlerde interaktif ara... (örn: 'Yalın', 'SMED')"
                            value={serviceFilterQuery}
                            onChange={(e) => setServiceFilterQuery(e.target.value)}
                            className="w-full pl-9 pr-14 bg-slate-50 dark:bg-[#252423] border border-[#EDEBE9] dark:border-[#323130] rounded p-2 text-xs focus:ring-1 focus:ring-[#0078D4] text-slate-900 dark:text-white"
                          />
                          {serviceFilterQuery && (
                            <button
                              type="button"
                              onClick={() => setServiceFilterQuery("")}
                              className="absolute inset-y-0 right-0 pr-3 flex items-center text-[#0078D4] dark:text-zinc-400 hover:underline text-[10px] font-bold"
                            >
                              Temizle
                            </button>
                          )}
                        </div>

                        <select
                          value={selectedCardId}
                          onChange={(e) => setSelectedCardId(e.target.value)}
                          className="w-full bg-slate-50 dark:bg-[#252423] border border-[#EDEBE9] dark:border-[#323130] rounded p-2.5 text-xs font-bold text-slate-900 dark:text-white focus:ring-1 focus:ring-[#0078D4] focus:outline-hidden cursor-pointer"
                        >
                          {filteredServiceCards.map(c => (
                            <option key={c.id} value={c.id} className="bg-white dark:bg-[#1b1a19] text-slate-950 dark:text-white font-semibold">
                              [{c.code}] {c.name}
                            </option>
                          ))}
                          {filteredServiceCards.length === 0 && (
                            <option value="" disabled className="bg-white dark:bg-[#1b1a19] text-slate-400 dark:text-zinc-500 font-semibold">
                              Eşleşen hizmet bulunamadı
                            </option>
                          )}
                        </select>
                        
                        <div className="flex pt-1.5">
                          <button
                            type="button"
                            onClick={handleSaveServiceDefaults}
                            className="w-full px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-black rounded flex items-center justify-center gap-1 shadow-sm transition-all cursor-pointer"
                            title="Mevcut düzenlemeleri (kapak, bütçe tablosu, genel şartlar vs.) bu hizmet kartı için varsayılan yap"
                          >
                            <Save className="w-3.5 h-3.5" /> {t("Save as Default Template")}
                          </button>
                        </div>
                      </div>

                      {/* Removed Kapak Taslak Yazısı as it is now loaded automatically from the service catalog */}
                    </div>
                  </div>

                  {/* Active Table Editor & AI Table Wizard for Stage 1 removed */}
                  <div className="hidden space-y-4 pt-5 border-t border-[#EDEBE9] dark:border-[#323130]">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-slate-50 dark:bg-[#252423] p-3 rounded-lg border border-[#EDEBE9] dark:border-[#323130]">
                      <div className="flex items-center gap-1.5 text-xs font-black text-slate-800 dark:text-white uppercase tracking-wider">
                        <Table className="w-4 h-4 text-[#0078D4]" />
                        <span>Süreç, Faaliyet ve Efor Tablosu Editörü <span className="text-[9px] text-slate-450 dark:text-slate-450 font-mono bg-slate-100 dark:bg-zinc-800 px-1 py-0.5 rounded opacity-75 font-normal">{"{{EforTablosu}}"}</span></span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setWizardPastePrompt(!wizardPastePrompt)}
                          className="bg-purple-100 dark:bg-purple-950/40 text-purple-800 dark:text-purple-300 hover:bg-purple-200 text-[11px] font-black px-2.5 py-1.5 rounded flex items-center gap-1 cursor-pointer transition-colors"
                        >
                          <Sparkles className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" /> Yapay Zeka (AI) Tablo Oluşturucu Sihirbazı
                        </button>
                      </div>
                    </div>

                    {/* Microsoft Word & AI instructions */}
                    <div className="p-3 bg-blue-50/40 dark:bg-blue-950/20 rounded border border-blue-100 dark:border-blue-900/30 text-[11px] text-blue-800 dark:text-blue-300 leading-relaxed flex items-start gap-2">
                      <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
                      <div>
                        <strong>Yapay Zeka Sihirbazı & Word Kopyalama:</strong> Kopyaladığınız düzensiz tabloları, maddeli planları veya Excel verilerini otomatik olarak A4 standartlarına uygun şık bir HTML tabloya dönüştürebebilirsiniz. Doğrudan MS Word üzerinden kopyaladığınız tabloları aşağıdaki kod editörünün içine de <strong>CTRL+V</strong> ile yapıştırabilirsiniz.
                      </div>
                    </div>

                    {/* Show AI Word/Excel Import Panel */}
                    {wizardPastePrompt && (
                      <div className="p-4 bg-purple-50/30 dark:bg-purple-950/5 border border-purple-200 dark:border-purple-900/50 rounded-lg space-y-4 animate-fadeIn">
                        <div>
                          <h4 className="text-xs font-black text-purple-700 dark:text-purple-400 uppercase tracking-wide flex items-center gap-1.5 mb-1">
                            <Sparkles className="w-4 h-4" />
                            Düz Metin, Madde Listesi veya Excel Tablosunu Yapıştırın
                          </h4>
                          <p className="text-[11px] text-slate-500">
                            Aşağıdaki kutuya metin yapıştırın. Yapay Zeka (AI) bunları otomatik olarak A4 standartlarına uygun, kolon gruplamaları yapılmış mükemmel bir HTML süreç/efor tablosuna dönüştürecektir.
                          </p>
                        </div>
                        
                        <textarea
                          rows={6}
                          placeholder="Örn:&#10;Faz 1: Teşhis (1 Gün) - Mevcut Durum Analizleri&#10;Faz 2: Tasarım (3 Gün) - Proje Master Planı&#10;veya Excel tablonuzdan kopyalanan satırları buraya CTRL+V ile yapıştırın..."
                          value={wizardRawPastedHtml}
                          onChange={(e) => setWizardRawPastedHtml(e.target.value)}
                          className="w-full bg-white dark:bg-[#1b1a19] border border-[#EDEBE9] dark:border-[#323130] rounded p-2.5 text-xs font-mono placeholder-slate-400 focus:ring-1 focus:ring-[#0078D4] focus:outline-hidden"
                        />
                        
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1 border-t border-[#EDEBE9] dark:border-[#323130]">
                          <span className="text-[10px] text-slate-400 italic">
                            * Yapay zeka ile A4 sayfa yapısına uygun sütun birleştirmeleri ve rowspan hizalamaları otomatik oluşturulur.
                          </span>
                          <div className="flex items-center gap-2 self-end">
                            <button
                              type="button"
                              onClick={() => {
                                setWizardPastePrompt(false);
                                setWizardRawPastedHtml("");
                              }}
                              className="bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-[11px] font-bold px-3 py-1.5 rounded cursor-pointer"
                            >
                              Vazgeç
                            </button>
                            
                            <button
                              type="button"
                              onClick={handleWizardManualWordPaste}
                              disabled={!wizardRawPastedHtml || isWizardAiConverting}
                              className="bg-slate-500 hover:bg-slate-600 text-white text-[11px] font-bold px-3 py-1.5 rounded disabled:opacity-50 cursor-pointer"
                              title="Yalnızca HTML formatında kopyalanan yapıların doğrudan temizlenip aktarılmasında kullanılır."
                            >
                              Düz Kod Temizle
                            </button>

                            <button
                              type="button"
                              onClick={handleWizardAiTableConvert}
                              disabled={!wizardRawPastedHtml || isWizardAiConverting}
                              className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:opacity-90 text-white text-[11px] font-black px-4 py-1.5 rounded flex items-center gap-1.5 disabled:opacity-50 cursor-pointer shadow-sm"
                            >
                              {isWizardAiConverting ? (
                                <>
                                  <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                  Dönüştürülüyor...
                                </>
                              ) : (
                                <>
                                  <Sparkles className="w-3.5 h-3.5" />
                                  Yapay Zeka (AI) ile Tabloya Çevir
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* LIVE EDITABLE CONTENT ZONE */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                          Efor Tablosu Kaynak Kodu (HTML Canlı Düzenleme)
                        </label>
                        <button 
                          type="button" 
                          onClick={() => setWizardTableCollapsed(!wizardTableCollapsed)} 
                          className="text-xs font-black bg-slate-100 hover:bg-slate-200 dark:bg-[#252423] dark:hover:bg-[#323130] text-slate-700 dark:text-slate-200 w-6 h-6 rounded flex items-center justify-center cursor-pointer border border-[#EDEBE9] dark:border-[#323130] transition-colors"
                          title={wizardTableCollapsed ? "Alanı Genişlet" : "Alanı Küçült / Gizle"}
                        >
                          {wizardTableCollapsed ? "+" : "-"}
                        </button>
                      </div>
                      
                      {!wizardTableCollapsed && (
                        <textarea
                          rows={8}
                          value={wizardTableHtml}
                          onChange={(e) => setWizardTableHtml(e.target.value)}
                          onPaste={(e) => handleEditorPaste(e, setWizardTableHtml)}
                          style={{ color: '#117ecb' }}
                          className="w-full bg-[#1e1e1e] font-mono text-xs p-3.5 rounded-lg border border-[#323130] focus:ring-1 focus:ring-[#0078D4] focus:outline-hidden leading-relaxed animate-fadeIn"
                        />
                      )}
                    </div>
                  </div>

                </div>
              )}

              {/* STEP 2: MULTI-OPTION PRICING FLOW CONFIG */}
              {wizardStep === 2 && (
                <div id="wizard-step-2-card" className="bg-white dark:bg-[#1b1a19] p-6 rounded-lg border border-[#EDEBE9] dark:border-[#323130] shadow-sm space-y-5">
                  <div className="flex items-center justify-between pb-2.5 border-b border-[#EDEBE9] dark:border-[#323130]">
                    <div className="flex items-center gap-1.5">
                      <Tag className="w-5 h-5 text-[#0078D4]" />
                      <span className="text-sm font-black uppercase text-slate-900 dark:text-white tracking-wider">Aşama 2: Ticari Opsiyon Alternatifleri (1-2-3)</span>
                    </div>
                    <div className="text-[10.5px] text-[#0078D4] dark:text-blue-300 font-bold bg-blue-50 dark:bg-blue-950/20 px-2.5 py-1 rounded">
                      Seçili olan opsiyonlar otomatik teklife eklenir
                    </div>
                  </div>

                  {/* Multi-Option Tab Selector */}
                  <div className="flex bg-slate-50 dark:bg-zinc-800/20 p-1.5 rounded-lg border border-slate-150 dark:border-zinc-800">
                    {[1, 2, 3].map((optNum) => {
                      const isActive = optNum === 1 ? option1Active : optNum === 2 ? option2Active : option3Active;
                      return (
                        <button
                          key={optNum}
                          type="button"
                          onClick={() => setActiveOptionTab(optNum as any)}
                          className={`flex-1 py-2 text-xs font-black tracking-wide rounded-md transition-all cursor-pointer ${
                            activeOptionTab === optNum
                              ? "bg-[#0078D4] text-white shadow"
                              : "text-slate-500 hover:text-slate-800"
                          }`}
                        >
                          Opsiyon {optNum} {isActive ? "🟢" : "⚫"}
                        </button>
                      );
                    })}
                  </div>

                  {/* Options Input Panels */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-1">
                    {/* Left Panel: Common properties */}
                    <div className="space-y-4 bg-slate-50/40 dark:bg-zinc-800/5 p-4 rounded-lg border border-slate-200/50 dark:border-zinc-800/50">
                      {activeOptionTab === 1 && (
                        <div className="space-y-4">
                          <div className="flex items-center justify-between p-2 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/35 rounded">
                            <label className="text-xs font-black text-emerald-800 dark:text-emerald-350 uppercase tracking-wide flex items-center gap-1">
                              🟢 Opsiyon 1 Teklifte Gösterilsin
                            </label>
                            <input
                              type="checkbox"
                              checked={option1Active}
                              onChange={(e) => setOption1Active(e.target.checked)}
                              className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 font-bold"
                            />
                          </div>
                          
                          <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Opsiyon Başlığı <span className="text-[9px] text-slate-450 dark:text-slate-450 font-mono bg-slate-100 dark:bg-zinc-800 px-1 py-0.5 rounded opacity-75 font-normal">{"{{Teklif1}}"}</span></label>
                            <input
                              type="text"
                              value={option1Name}
                              onChange={(e) => setOption1Name(e.target.value)}
                              className="w-full bg-white dark:bg-[#1b1a19] border border-slate-200 dark:border-[#323130] rounded px-3 py-2 text-xs"
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Kapsam Özeti & Açıklaması <span className="text-[9px] text-slate-450 dark:text-slate-450 font-mono bg-slate-100 dark:bg-zinc-800 px-1 py-0.5 rounded opacity-75 font-normal">{"{{Teklif1Açıklama}}"}</span></label>
                            <textarea
                              rows={3}
                              value={option1Desc}
                              onChange={(e) => setOption1Desc(e.target.value)}
                              className="w-full bg-white dark:bg-[#1b1a19] border border-slate-200 dark:border-[#323130] rounded px-3 py-2 text-xs resize-none"
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Zaman Çizelgesi / Süre</label>
                            <input
                              type="text"
                              value={option1Duration}
                              onChange={(e) => setOption1Duration(e.target.value)}
                              className="w-full bg-white dark:bg-[#1b1a19] border border-slate-200 dark:border-[#323130] rounded px-3 py-2 text-xs"
                            />
                          </div>
                        </div>
                      )}

                      {activeOptionTab === 2 && (
                        <div className="space-y-4">
                          <div className="flex items-center justify-between p-2 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/35 rounded">
                            <label className="text-xs font-black text-emerald-800 dark:text-emerald-350 uppercase tracking-wide flex items-center gap-1">
                              🟢 Opsiyon 2 Teklifte Gösterilsin
                            </label>
                            <input
                              type="checkbox"
                              checked={option2Active}
                              onChange={(e) => setOption2Active(e.target.checked)}
                              className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 font-bold"
                            />
                          </div>
                          
                          <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Opsiyon Başlığı <span className="text-[9px] text-slate-450 dark:text-slate-450 font-mono bg-slate-100 dark:bg-zinc-800 px-1 py-0.5 rounded opacity-75 font-normal">{"{{Teklif2}}"}</span></label>
                            <input
                              type="text"
                              value={option2Name}
                              onChange={(e) => setOption2Name(e.target.value)}
                              className="w-full bg-white dark:bg-[#1b1a19] border border-slate-200 dark:border-[#323130] rounded px-3 py-2 text-xs"
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Kapsam Özeti & Açıklaması <span className="text-[9px] text-slate-450 dark:text-slate-450 font-mono bg-slate-100 dark:bg-zinc-800 px-1 py-0.5 rounded opacity-75 font-normal">{"{{Teklif2Açıklama}}"}</span></label>
                            <textarea
                              rows={3}
                              value={option2Desc}
                              onChange={(e) => setOption2Desc(e.target.value)}
                              className="w-full bg-white dark:bg-[#1b1a19] border border-slate-200 dark:border-[#323130] rounded px-3 py-2 text-xs resize-none"
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Zaman Çizelgesi / Süre</label>
                            <input
                              type="text"
                              value={option2Duration}
                              onChange={(e) => setOption2Duration(e.target.value)}
                              className="w-full bg-white dark:bg-[#1b1a19] border border-slate-200 dark:border-[#323130] rounded px-3 py-2 text-xs"
                            />
                          </div>
                        </div>
                      )}

                      {activeOptionTab === 3 && (
                        <div className="space-y-4">
                          <div className="flex items-center justify-between p-2 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/35 rounded">
                            <label className="text-xs font-black text-emerald-800 dark:text-emerald-350 uppercase tracking-wide flex items-center gap-1">
                              🟢 Opsiyon 3 Teklifte Gösterilsin
                            </label>
                            <input
                              type="checkbox"
                              checked={option3Active}
                              onChange={(e) => setOption3Active(e.target.checked)}
                              className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 font-bold"
                            />
                          </div>
                          
                          <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Opsiyon Başlığı <span className="text-[9px] text-slate-450 dark:text-slate-450 font-mono bg-slate-100 dark:bg-zinc-800 px-1 py-0.5 rounded opacity-75 font-normal">{"{{Teklif3}}"}</span></label>
                            <input
                              type="text"
                              value={option3Name}
                              onChange={(e) => setOption3Name(e.target.value)}
                              className="w-full bg-white dark:bg-[#1b1a19] border border-slate-200 dark:border-[#323130] rounded px-3 py-2 text-xs"
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Kapsam Özeti & Açıklaması <span className="text-[9px] text-slate-450 dark:text-slate-450 font-mono bg-slate-100 dark:bg-zinc-800 px-1 py-0.5 rounded opacity-75 font-normal">{"{{Teklif3Açıklama}}"}</span></label>
                            <textarea
                              rows={3}
                              value={option3Desc}
                              onChange={(e) => setOption3Desc(e.target.value)}
                              className="w-full bg-white dark:bg-[#1b1a19] border border-slate-200 dark:border-[#323130] rounded px-3 py-2 text-xs resize-none"
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Zaman Çizelgesi / Süre</label>
                            <input
                              type="text"
                              value={option3Duration}
                              onChange={(e) => setOption3Duration(e.target.value)}
                              className="w-full bg-white dark:bg-[#1b1a19] border border-slate-200 dark:border-[#323130] rounded px-3 py-2 text-xs"
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Right Panel: Itemized pricing rows list with auto calculation summaries */}
                    <div className="space-y-4">
                      {activeOptionTab === 1 && (
                        <>
                          <OptionRowEditor
                            rows={option1Rows}
                            onChange={setOption1Rows}
                            optionLabel="Opsiyon 1"
                          />
                          <div className="p-3 bg-[#fdf2f2] dark:bg-red-950/10 border border-[#fecaca] dark:border-red-900/30 rounded-lg">
                            <div className="flex justify-between items-center text-xs font-extrabold text-[#b91c1c] dark:text-red-400">
                              <span>Opsiyon 1 Toplam Bedel (KDV Hariç) :</span>
                              <span className="text-sm font-black">{new Intl.NumberFormat("tr-TR").format(option1Price)} TL</span>
                            </div>
                            <div className="text-[10px] text-red-700 dark:text-red-350 italic mt-1 font-bold">
                              Yazıyla: {convertCurrencyToTurkishWords(option1Price, "TRY")}
                            </div>
                          </div>
                        </>
                      )}

                      {activeOptionTab === 2 && (
                        <>
                          <OptionRowEditor
                            rows={option2Rows}
                            onChange={setOption2Rows}
                            optionLabel="Opsiyon 2"
                          />
                          <div className="p-3 bg-[#fdf2f2] dark:bg-red-950/10 border border-[#fecaca] dark:border-red-900/30 rounded-lg">
                            <div className="flex justify-between items-center text-xs font-extrabold text-[#b91c1c] dark:text-red-400">
                              <span>Opsiyon 2 Toplam Bedel (KDV Hariç) :</span>
                              <span className="text-sm font-black">{new Intl.NumberFormat("tr-TR").format(option2Price)} TL</span>
                            </div>
                            <div className="text-[10px] text-red-700 dark:text-red-350 italic mt-1 font-bold">
                              Yazıyla: {convertCurrencyToTurkishWords(option2Price, "TRY")}
                            </div>
                          </div>
                        </>
                      )}

                      {activeOptionTab === 3 && (
                        <>
                          <OptionRowEditor
                            rows={option3Rows}
                            onChange={setOption3Rows}
                            optionLabel="Opsiyon 3"
                          />
                          <div className="p-3 bg-[#fdf2f2] dark:bg-red-950/10 border border-[#fecaca] dark:border-red-900/30 rounded-lg">
                            <div className="flex justify-between items-center text-xs font-extrabold text-[#b91c1c] dark:text-red-400">
                              <span>Opsiyon 3 Toplam Bedel (KDV Hariç) :</span>
                              <span className="text-sm font-black">{new Intl.NumberFormat("tr-TR").format(option3Price)} TL</span>
                            </div>
                            <div className="text-[10px] text-red-700 dark:text-red-350 italic mt-1 font-bold">
                              Yazıyla: {convertCurrencyToTurkishWords(option3Price, "TRY")}
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 3: GENERAL CONDITIONS */}
              {wizardStep === 3 && (
                <div id="wizard-step-3-card" className="bg-white dark:bg-[#1b1a19] p-6 rounded-lg border border-[#EDEBE9] dark:border-[#323130] shadow-sm space-y-4">
                  <div className="flex items-center gap-1.5 pb-2.5 border-b border-[#EDEBE9] dark:border-[#323130]">
                    <FileText className="w-5 h-5 text-[#0078D4]" />
                    <span className="text-sm font-black uppercase text-slate-900 dark:text-white tracking-wider flex items-center gap-1.5">Aşama 3: Genel Ticari Şartlar <span className="text-[10px] text-slate-450 font-mono bg-slate-150/45 dark:bg-zinc-850 px-1.5 py-0.5 rounded font-normal normal-case opacity-75">{"{{GenelSartlar}}"}</span></span>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Sözleşme Maddeleri / Genel Şartname Hükümleri:</label>
                      <button
                        type="button"
                        onClick={() => {
                          CrmDb.setKv("crm_persistent_general_terms", wizardTermsAndConditions);
                          alert(t("Terms saved permanently for all new proposals!"));
                          setToastMessage(t("Terms saved!"));
                        }}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-black rounded flex items-center gap-1 shadow-xs transition-all cursor-pointer"
                      >
                        <Save className="w-3.5 h-3.5" /> Genel Şartları Varsayılan Yap (Kaydet)
                      </button>
                    </div>
                    <textarea
                      rows={12}
                      value={wizardTermsAndConditions}
                      onChange={(e) => setWizardTermsAndConditions(e.target.value)}
                      placeholder="Buraya teklif ile ilgili genel şartname maddelerini ekleyin..."
                      className="w-full bg-slate-50 dark:bg-[#252423] border border-[#EDEBE9] dark:border-[#323130] rounded p-3 text-xs leading-relaxed font-mono focus:ring-1 focus:ring-[#0078D4]"
                    />
                    <div className="text-[10px] leading-relaxed text-slate-400 font-bold p-2.5 bg-slate-50 dark:bg-zinc-800/10 rounded border border-slate-200/50">
                      ℹ️ Satır başlarına girdiğiniz numaralar Word çıktısında ve PDF'te dikey liste hiyerarşisinde aslına uygun olarak listelenecektir.
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 4: SECTOR FINETUNINGS & EXPORTS GENERAL STYLER */}
              {wizardStep === 4 && (
                <div id="wizard-step-4-card" className="bg-white dark:bg-[#1b1a19] p-6 rounded-lg border border-[#EDEBE9] dark:border-[#323130] shadow-sm space-y-4">
                  <div className="flex items-center gap-1.5 pb-2.5 border-b border-[#EDEBE9] dark:border-[#323130]">
                    <Settings className="w-4 h-4 text-[#0078D4]" />
                    <span className="text-sm font-semibold text-slate-900 dark:text-white uppercase tracking-wider">Aşama 4: Antetli & İndirme</span>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-[13px] font-semibold text-slate-700 dark:text-slate-300 block">Resmi Antetli Seçimi</label>
                      <select
                        value={letterheadId}
                        onChange={(e) => setLetterheadId(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-[#252423] border border-[#EDEBE9] dark:border-[#323130] rounded-md px-3 py-2 text-[14px] font-normal text-slate-900 dark:text-white cursor-pointer focus:ring-1 focus:ring-[#0078D4] focus:border-[#0078D4] outline-none"
                      >
                        {LETTERHEADS.map(lh => (
                          <option key={lh.id} value={lh.id} className="bg-white dark:bg-[#1b1a19] text-slate-950 dark:text-white font-semibold">
                            {t(lh.name)}
                          </option>
                        ))}
                        {(uploadedCoverTemplates[selectedCardId] || uploadedPageTemplates[selectedCardId]) && (
                          <option value="uploaded_template" className="bg-white dark:bg-[#1b1a19] text-slate-950 dark:text-white font-semibold">
                            📁 Yüklenen Kurumsal Görsel Şablonu ({uploadedCoverTemplates[selectedCardId]?.name || uploadedPageTemplates[selectedCardId]?.name})
                          </option>
                        )}
                      </select>
                    </div>

                    {(uploadedCoverTemplates[selectedCardId] || uploadedPageTemplates[selectedCardId]) && (
                      <div className="p-3 bg-emerald-50 dark:bg-emerald-950/25 border border-emerald-200 dark:border-emerald-900/40 rounded-lg text-emerald-800 dark:text-emerald-300 text-[12px] leading-relaxed flex items-start gap-2">
                        <span className="text-emerald-550 dark:text-emerald-400 font-extrabold mt-0.5 text-xs">✓</span>
                        <div>
                          <p className="font-extrabold text-xs uppercase text-emerald-900 dark:text-emerald-400">YÜKLENEN KURUMSAL GÖRSEL ŞABLON ETKİN</p>
                          <p className="mt-1 font-semibold">
                            Bu hizmet için karşıya yüklediğiniz kurumsal PNG şablonları (Kapak: {uploadedCoverTemplates[selectedCardId]?.name || "Varsayılan"}, Sayfa: {uploadedPageTemplates[selectedCardId]?.name || "Varsayılan"}) algılandı. Çıktıda arka plan görseli olarak kullanılacaklar.
                          </p>
                        </div>
                      </div>
                    )}

                    <div className="p-3 bg-blue-50/40 dark:bg-blue-950/20 rounded text-[12px] font-normal text-slate-500 dark:text-slate-400 leading-relaxed">
                      Lütfen sağ sütundaki sürekli A4 sayfa önizlemesini inceleyin. Editör kalemi ile taslağı doğrudan önizleme kağıdı üzerindeyken düzenleyebilirsiniz.
                    </div>
                  </div>
                </div>
              )}

              {/* CRM & OUTREACH CARD BLOCK ON STEP 4 */}
              {wizardStep === 4 && (
                <div id="wizard-step-4-crm-card" className="bg-white dark:bg-[#1b1a19] p-6 rounded-lg border border-[#EDEBE9] dark:border-[#323130] shadow-sm space-y-4">
                  <div className="flex items-center gap-1.5 pb-2.5 border-b border-[#EDEBE9] dark:border-[#323130]">
                    <CheckCircle2 className="w-4 h-4 text-[#0078D4]" />
                    <span className="text-sm font-semibold text-slate-900 dark:text-white uppercase tracking-wider">Aşama 5: Sistem & Fırsat Kaydı</span>
                  </div>

                  <p className="text-[12px] font-normal text-slate-500 dark:text-slate-400 leading-relaxed">
                    Mevcut teklif parametrelerini (müşteri, tarih, kalem fiyatları ve versiyon) arşive kaydeder ve <strong>{t("Deal Management (B2B CRM Pipeline)")}</strong> sürecinde otomatik olarak <em className="text-blue-600 dark:text-blue-400 font-bold">{t("Proposal Submitted (Quote Sent)")}</em> aşamasına yeni bir kart ekler.
                  </p>

                  <button
                    type="button"
                    onClick={() => handleCreateAndSaveProposal(false)}
                    className="w-full h-[52px] px-6 py-3.5 bg-[#0078D4] hover:bg-[#106ebe] text-white font-semibold rounded-md flex items-center justify-center gap-2 transition-colors border border-[#005a9e] cursor-pointer text-[14px]"
                  >
                    <Save className="w-4 h-4 text-blue-100" /> {t("Create Proposal & Save to CRM")}
                  </button>
                </div>
              )}

              {/* EMAIL OUTREACH CARD BLOCK ON STEP 4 */}
              {wizardStep === 4 && (
                <div id="wizard-step-4-email-card" className="bg-white dark:bg-[#1b1a19] p-6 rounded-lg border border-[#EDEBE9] dark:border-[#323130] shadow-sm space-y-5">
                  <div className="flex items-center justify-between pb-2.5 border-b border-[#EDEBE9] dark:border-[#323130]">
                    <div className="flex items-center gap-1.5">
                      <Mail className="w-4 h-4 text-[#0078D4]" />
                      <span className="text-[20px] font-semibold text-slate-900 dark:text-white leading-normal">E-Posta Hazırlama & Gönderimi</span>
                    </div>
                  </div>

                  {/* Mail Template Dropdown */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-[13px] font-semibold text-slate-700 dark:text-slate-300">E-Posta Taslağı Şablonu</label>
                      <button
                        type="button"
                        onClick={() => handleDeleteEmailTemplate(selectedEmailTemplateId)}
                        className="text-[12px] text-red-650 dark:text-red-400 hover:underline font-semibold"
                      >
                        Taslağı Sil
                      </button>
                    </div>
                    <select
                      value={selectedEmailTemplateId}
                      onChange={(e) => setSelectedEmailTemplateId(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-[#252423] border border-[#EDEBE9] dark:border-[#323130] rounded-md px-3 py-2 text-[14px] font-normal text-slate-950 dark:text-white cursor-pointer focus:ring-1 focus:ring-[#0078D4] focus:border-[#0078D4] outline-none"
                    >
                      {emailTemplates.map(t => (
                        <option key={t.id} value={t.id} className="bg-white dark:bg-[#1b1a19] text-slate-950 dark:text-white">
                          {t.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Subject editor */}
                  <div className="space-y-1.5">
                    <label className="text-[13px] font-semibold text-slate-700 dark:text-slate-300 block">{t("Subject")}</label>
                    <input
                      type="text"
                      value={mailSubject}
                      onChange={(e) => setMailSubject(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-[#252423] border border-[#EDEBE9] dark:border-[#323130] rounded-md px-3 py-2 text-[14px] font-normal text-slate-950 dark:text-white focus:ring-1 focus:ring-[#0078D4] focus:border-[#0078D4] outline-none"
                    />
                  </div>

                  {/* Editor text area */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-[13px] font-semibold text-slate-700 dark:text-slate-300">İçerik (Mektup Gövdesi)</label>
                      <button
                        type="button"
                        onClick={handleSaveCurrentEmailTemplate}
                        className="text-[12px] text-[#0078D4] hover:underline font-semibold"
                      >
                        Yeni Şablon Kaydet
                      </button>
                    </div>
                    <textarea
                      rows={10}
                      value={mailBody}
                      onChange={(e) => setMailBody(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-[#252423] border border-[#EDEBE9] dark:border-[#323130] rounded-md px-3 py-2 text-[14px] font-normal text-slate-950 dark:text-white focus:ring-1 focus:ring-[#0078D4] focus:border-[#0078D4] outline-none leading-relaxed min-h-[220px] max-h-[500px] resize-y"
                    />
                  </div>

                  {/* Mail Client Options */}
                  <div className="space-y-2">
                    <label className="text-[13px] font-semibold text-slate-700 dark:text-slate-300 block">E-Posta Gönderme Yöntemi</label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full">
                      <button
                        type="button"
                        onClick={() => setMailClientType("mailto")}
                        className={`min-w-[140px] min-h-[56px] px-4 py-3 border rounded-md flex flex-col items-center justify-center text-center gap-1.5 transition-all text-[14px] font-semibold cursor-pointer ${
                          mailClientType === "mailto" 
                            ? "border-[#0078D4] bg-blue-50/50 dark:bg-blue-950/20 text-[#0078D4] dark:text-blue-400 font-semibold ring-1 ring-[#0078D4]" 
                            : "border-[#EDEBE9] dark:border-[#323130] bg-white dark:bg-[#1b1a19] text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-zinc-800/40"
                        }`}
                      >
                        <span className="text-base">💻</span>
                        <span className="tracking-tight leading-none">Outlook (Masaüstü)</span>
                      </button>
                      
                      <button
                        type="button"
                        onClick={() => setMailClientType("outlook-corp")}
                        className={`min-w-[140px] min-h-[56px] px-4 py-3 border rounded-md flex flex-col items-center justify-center text-center gap-1.5 transition-all text-[14px] font-semibold cursor-pointer ${
                          mailClientType === "outlook-corp" 
                            ? "border-[#0078D4] bg-blue-50/50 dark:bg-blue-950/20 text-[#0078D4] dark:text-blue-400 font-semibold ring-1 ring-[#0078D4]" 
                            : "border-[#EDEBE9] dark:border-[#323130] bg-white dark:bg-[#1b1a19] text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-zinc-800/40"
                        }`}
                      >
                        <span className="text-base">🌐</span>
                        <span className="tracking-tight leading-none">{t("Office 365")}</span>
                      </button>
                      
                      <button
                        type="button"
                        onClick={() => setMailClientType("outlook")}
                        className={`min-w-[140px] min-h-[56px] px-4 py-3 border rounded-md flex flex-col items-center justify-center text-center gap-1.5 transition-all text-[14px] font-semibold cursor-pointer ${
                          mailClientType === "outlook" 
                            ? "border-sky-600 bg-sky-50/50 dark:bg-sky-950/20 text-sky-700 dark:text-sky-400 font-semibold ring-1 ring-sky-600" 
                            : "border-[#EDEBE9] dark:border-[#323130] bg-white dark:bg-[#1b1a19] text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-zinc-800/40"
                        }`}
                      >
                        <span className="text-base">🌐</span>
                        <span className="tracking-tight leading-none">{t("Outlook Live")}</span>
                      </button>
                      
                      <button
                        type="button"
                        onClick={() => setMailClientType("gmail")}
                        className={`min-w-[140px] min-h-[56px] px-4 py-3 border rounded-md flex flex-col items-center justify-center text-center gap-1.5 transition-all text-[14px] font-semibold cursor-pointer ${
                          mailClientType === "gmail" 
                            ? "border-orange-500 bg-orange-50/50 dark:bg-orange-950/20 text-orange-700 dark:text-orange-400 font-semibold ring-1 ring-orange-500" 
                            : "border-[#EDEBE9] dark:border-[#323130] bg-white dark:bg-[#1b1a19] text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-zinc-800/40"
                        }`}
                      >
                        <span className="text-base">🌐</span>
                        <span className="tracking-tight leading-none">{t("Web Gmail")}</span>
                      </button>
                    </div>
                  </div>

                  {/* Mail Action Trigger */}
                  <button
                    type="button"
                    onClick={handleOpenMailClient}
                    className="w-full h-[52px] px-6 py-3.5 bg-[#0078D4] hover:bg-[#106ebe] text-white font-semibold rounded-md flex items-center justify-center gap-2 transition-colors cursor-pointer border border-[#005a9e] text-[14px]"
                  >
                    <Send className="w-4 h-4 text-blue-100" /> Müşteriye Gönder (Posta Kutunu Aç)
                  </button>
                </div>
              )}

            </div>

            {/* RIGHT COLUMN: INTERACTIVE CONTINUOUS PAPER PREVIEW */}
            {wizardStep === 4 && (
              <div className="lg:col-span-8 lg:sticky lg:top-6 lg:max-h-[calc(100vh-120px)] lg:overflow-y-auto pr-1 flex flex-col space-y-4">
                
                <div className="bg-white dark:bg-[#1b1a19] p-4 rounded-lg border border-[#EDEBE9] dark:border-[#323130] shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-xs font-bold text-slate-950 dark:text-white">A4 Antetli Sürekli Çıktı Önizleme Alanı</span>
                  </div>

                  {/* Exporters and fine tuners */}
                  {wizardStep === 4 && (
                    <div className="flex items-center flex-wrap gap-2">
                    {/* IN PLACE EDIT SWITCHER */}
                    <button
                      type="button"
                      onClick={() => setIsAssemblyEditable(!isAssemblyEditable)}
                      className={`px-3 py-1.5 rounded text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                        isAssemblyEditable
                          ? "bg-amber-500 text-white hover:bg-amber-600"
                          : "bg-slate-100 hover:bg-slate-200 dark:bg-[#252423] dark:hover:bg-[#323130] text-slate-700 dark:text-slate-200 border border-[#EDEBE9] dark:border-[#323130]"
                      }`}
                      title="Değişiklikleri şablonun üzerine doğrudan yazıp düzeltin"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>{isAssemblyEditable ? "Metni Kilitle / Sabitle" : "Metni Elle Düzenle"}</span>
                    </button>

                    {/* PRINT ACTION */}
                    <button
                      type="button"
                      onClick={handlePrint}
                      className="bg-[#2876e2] hover:bg-[#1a5cb8] text-white border border-[#EDEBE9] dark:border-[#323130] px-3 py-1.5 rounded text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-xs"
                    >
                      <Download className="w-3.5 h-3.5" /> Yazdır (A4)
                    </button>

                    {/* WORD DOC EXPORT */}
                    <button
                      type="button"
                      onClick={handleExportWord}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
                      title="Süreç ve dikey hizalanmış tabloları içeren Word belgesi indirir"
                    >
                      <FileCheck className="w-3.5 h-3.5" /> Word İndir (.doc)
                    </button>

                    {/* PDF EXPORT */}
                    <button
                      type="button"
                      onClick={handleExportPDF}
                      className="bg-[#107C41] hover:bg-emerald-700 text-white px-3 py-1.5 rounded text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
                      title="Sayfa sınırlarına sığdırılmış A4 PDF çıktısı hazırlar"
                    >
                      <FileText className="w-3.5 h-3.5" /> PDF İndir (.pdf)
                    </button>
                  </div>
                )}
              </div>

              {/* A4 PAGES CONTAINER CARD */}
              <div 
                id="assembly-paper-view"
                ref={assemblyPaperRef}
                className="bg-white dark:bg-slate-900 text-slate-950 dark:text-slate-100 p-8 sm:p-12 rounded-lg border border-[#EDEBE9] dark:border-[#323130] shadow-md min-h-[700px] transition-all relative"
              >
                
                {/* Embedded dynamic letterhead border */}
                <div 
                  className="absolute top-0 left-0 right-0 h-2.5 transition-colors duration-300"
                  style={{ backgroundColor: currentLetterhead.primaryColor }}
                />

                {/* Printable Letterhead Graphic */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-4 border-b border-slate-250 dark:border-slate-800 mb-6 gap-2">
                  <div className="flex items-center gap-3">
                    <div 
                      className="p-1 px-3 text-white font-black rounded-sm text-sm"
                      style={{ backgroundColor: currentLetterhead.primaryColor }}
                    >
                      G
                    </div>
                    <div>
                      <h4 className="text-xs font-black tracking-tight" style={{ color: currentLetterhead.primaryColor }}>
                        {currentLetterhead.tagline}
                      </h4>
                      <span className="text-[9px] text-slate-400 font-bold uppercase select-none tracking-widest">RESMİ ORTAK TEKLİF KAĞIDI</span>
                    </div>
                  </div>
                  <div className="text-[9px] text-slate-500 dark:text-slate-400 max-w-xs text-left sm:text-right leading-relaxed font-semibold">
                    {currentLetterhead.details}
                  </div>
                </div>

                {/* DYNAMIC DOCUMENT CONTENT BODY */}
                {isAssemblyEditable ? (
                  <div className="space-y-3">
                    <label className="text-[10px] font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1.5 bg-amber-50 dark:bg-amber-950/20 p-2 rounded border border-amber-200 dark:border-amber-900/40">
                      <Edit3 className="w-4 h-4 text-amber-500 animate-pulse" />
                      YAZIM ODASI AKTİF: Şablondaki tüm metin ve tablo hüclerini serbestçe değiştirin veya yeni kısımlar ilave edip Metni Kilitle'ye tıklatın.
                    </label>
                    <textarea
                      rows={24}
                      value={liveAssemblyHtml}
                      onChange={(e) => setLiveAssemblyHtml(e.target.value)}
                      className="w-full bg-[#1e1e1e] text-emerald-300 font-mono text-xs p-4 rounded-lg border border-[#323130] tracking-wide"
                    />
                  </div>
                ) : (
                  <div 
                    className="prose prose-sm max-w-none dark:prose-invert text-xs leading-relaxed"
                    dangerouslySetInnerHTML={{ __html: liveAssemblyHtml || "<p class='italic text-slate-400 text-center py-10'>Düzenlemeler yükleniyor...</p>" }}
                  />
                )}

                {/* Footnotes spacer */}
                <div className="border-t border-slate-200 dark:border-slate-800 mt-12 pt-3 flex items-center justify-between text-[9px] text-slate-400 font-semibold select-none">
                  <span>Proje Ref: GEM-TEK-{new Date().getFullYear()}-{selectedService?.code || "100"}</span>
                  <span>Sayfa 1 / 1 (Otomatik Arşivlenmiştir)</span>
                </div>

              </div>

            </div>
            )}

          </div>
        </div>
      )}

      {showAttachmentHelper && (
        <div className="fixed inset-0 z-[250] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-white dark:bg-[#1b1a19] rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 p-6 text-white">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/10 rounded-xl">
                  <Paperclip className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-black tracking-tight text-white select-none">
                     {t("Email Attachment Helper")}
                  </h3>
                  <p className="text-xs opacity-90 select-none">
                    Teklif PDF'inizi e-postanızla eşleştirme yönergesi
                  </p>
                </div>
              </div>
            </div>

            {/* Steps Body */}
            <div className="p-6 space-y-6">
              <div className="p-4 bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200/50 dark:border-blue-900/30 rounded-xl">
                <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-semibold">
                  ℹ️ **Neden Bu Ekranı Görüyorsunuz?** Güvenlik protokolleri sebebiyle, web siteleri sizin rızanız olmadan yerel bilgisayarınızdaki bir dosyayı e-posta istemcilerine otomatik ekleyemez (attach yapamaz). Bu yüzden, size en hızlı ve pratik iş akışını sunuyoruz:
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Step 1 */}
                <div className="p-4 rounded-xl border border-slate-100 dark:border-zinc-800/80 bg-slate-50/50 dark:bg-zinc-900/30 flex flex-col space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-blue-600 text-white font-mono text-xs font-black flex items-center justify-center">1</span>
                    <h4 className="text-xs font-black text-slate-800 dark:text-slate-100">Yazdır & İndir</h4>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                    Yazdırma paneli otomatik açılmıştır. <strong>Hedef</strong> kısmından <strong>PDF Olarak Kaydet</strong> seçerek bilgisayarınıza indirin.
                  </p>
                </div>

                {/* Step 2 */}
                <div className="p-4 rounded-xl border border-slate-100 dark:border-zinc-800/80 bg-slate-50/50 dark:bg-zinc-900/30 flex flex-col space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-blue-600 text-white font-mono text-xs font-black flex items-center justify-center">2</span>
                    <h4 className="text-xs font-black text-slate-800 dark:text-slate-100">Posta Kutusu Kontrolü</h4>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                    Arka planda seçtiğiniz e-posta istemcisi ({mailClientType === "mailto" ? t("Desktop Outlook") : mailClientType === "gmail" ? t("Web Gmail") : mailClientType === "outlook-corp" ? t("Office 365 Corporate Web") : t("Personal Web Outlook")}) {t("Your selected email client opened in the background with recipient, subject, and body.")}
                  </p>
                </div>

                {/* Step 3 */}
                <div className="p-4 rounded-xl border border-teal-100 dark:border-teal-900/30 bg-teal-50/20 dark:bg-teal-950/10 flex flex-col space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-teal-600 text-white font-mono text-xs font-black flex items-center justify-center">3</span>
                    <h4 className="text-xs font-black text-teal-800 dark:text-teal-200">Sürükle & Bırak (Ek)</h4>
                  </div>
                  <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
                    Bilgisayarınıza inen <strong>{clientShortName}_{proposalNumber}.pdf</strong> dosyasını fareyle tutup açılan e-posta gövdesine sürükleyip bırakarak (drag-and-drop) ekleyin ve gönderin.
                  </p>
                </div>
              </div>

              {/* Clipboard highlight info */}
              <div className="flex items-center gap-2 text-xs font-bold text-slate-500 dark:text-slate-400 border-t border-slate-100 dark:border-zinc-800/80 pt-4">
                <span className="p-1.5 bg-slate-100 dark:bg-zinc-800 rounded">💡 Bilgi</span>
                <span>E-posta metni kolaylık olması açısından bilgisayar pano hafızanıza (Ctrl+V) da yedeklendi!</span>
              </div>
            </div>

            {/* Footer buttons */}
            <div className="bg-slate-50 dark:bg-zinc-900/40 px-6 py-4 border-t border-slate-100 dark:border-zinc-800/80 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => handlePrint()}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-lg transition-all"
              >
                PDF Tekrar Yazdır
              </button>
              <button
                type="button"
                onClick={() => setShowAttachmentHelper(false)}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-black rounded-lg shadow-sm transition-all flex items-center gap-1.5"
              >
                Anladım, Kapat <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-[200] max-w-sm bg-slate-900 border border-slate-800 text-white px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          <span className="text-xs font-bold">{toastMessage}</span>
        </div>
      )}

      {/* Custom Global Confirmation Dialog */}
      {confirmDeleteModal.isOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-[9999] p-4 font-sans antialiased animate-fade-in text-slate-800 dark:text-zinc-200">
          <div className="bg-white dark:bg-[#181818] w-full max-w-sm rounded-xl border border-slate-205 dark:border-zinc-855 shadow-2xl p-6 text-center animate-in zoom-in-95 duration-100">
            <div className="mx-auto w-12 h-12 bg-rose-50 dark:bg-rose-950/25 rounded-full flex items-center justify-center text-rose-500 mb-4">
              <Trash2 className="w-6 h-6 animate-pulse" />
            </div>
            <h3 className="font-extrabold text-slate-800 dark:text-zinc-100 text-sm mb-2">
              {confirmDeleteModal.title || t("Record will be deleted")}
            </h3>
            <p className="text-slate-500 dark:text-zinc-400 text-xs mb-6 font-semibold animate-pulse">
              {confirmDeleteModal.message || t("Move to recycle bin?")}
            </p>
            <div className="flex gap-3 justify-center select-none font-bold">
              <button
                type="button"
                onClick={() => setConfirmDeleteModal({ isOpen: false, onConfirm: () => {} })}
                className="border border-slate-200 dark:border-zinc-800 text-slate-600 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-900 px-4 py-2 text-xs rounded-lg transition-colors cursor-pointer w-24"
              >
                {t("Cancel")}
              </button>
              <button
                type="button"
                onClick={() => {
                  confirmDeleteModal.onConfirm();
                  setConfirmDeleteModal({ isOpen: false, onConfirm: () => {} });
                }}
                className="bg-rose-600 hover:bg-rose-700 text-white px-4 py-2 text-xs rounded-lg transition-colors cursor-pointer shadow-sm w-24 active:scale-95 transition-transform"
              >
                {t("Delete")}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
