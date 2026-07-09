import React, { useState, useEffect, useRef } from "react";
import { 
  FileText, 
  FileSignature, 
  Download, 
  Maximize2, 
  Minimize2, 
  Edit3, 
  CheckCircle, 
  Plus, 
  RotateCcw, 
  Settings, 
  UserCheck, 
  Building, 
  Calendar as CalendarIcon, 
  Tag, 
  Hash,
  HelpCircle,
  FileCheck,
  Briefcase,
  SpellCheck,
  Award,
  BookOpen,
  Upload,
  Sparkles,
  Search,
  Check
} from "lucide-react";
import { jsPDF } from "jspdf";
import mammoth from "mammoth";
import { CrmDb } from "../lib/CrmDb";
import { useLanguage } from "../lib/LanguageContext";
import { WysiwygEditor } from "./WysiwygEditor";

const PROJECT_MANAGERS = [
  { name: "Ahmet Yılmaz", tc: "12345678901" },
  { name: "Mehmet Demir", tc: "23456789012" },
  { name: "Ayşe Kaya", tc: "34567890123" },
  { name: "Fatma Şahin", tc: "45678901234" },
  { name: "Ali Öztürk", tc: "56789012345" },
  { name: "Elif Yıldız", tc: "67890123456" }
];

// Turkish Number-to-Words Conversion Engine
export function convertNumberToTurkishWords(num: number): string {
  if (isNaN(num) || num === null) return "";
  if (num === 0) return "Sıfır";
  
  const birler = ["", "Bir", "İki", "Üç", "Dört", "Beş", "Altı", "Yedi", "Sekiz", "Dokuz"];
  const onlar = ["", "On", "Yirmi", "Otuz", "Kırk", "Elli", "Altmış", "Yetmiş", "Seksen", "Doksan"];
  const binler = ["", "Bin", "Milyon", "Milyar", "Trilyon"];
  
  let count = 0;
  let wordResult = "";
  
  let tempNum = Math.floor(Math.abs(num));
  
  while (tempNum > 0) {
    let subNum = tempNum % 1000;
    if (subNum > 0) {
      let subWord = "";
      
      let y = Math.floor(subNum / 100);
      let o = Math.floor((subNum % 100) / 10);
      let b = subNum % 10;
      
      if (y > 0) {
        if (y === 1) {
          subWord += "Yüz ";
        } else {
          subWord += birler[y] + " Yüz ";
        }
      }
      
      if (o > 0) {
        subWord += onlar[o] + " ";
      }
      
      if (b > 0) {
        if (count === 1 && subNum === 1) {
          // Skip "Bir Bin", just write "Bin"
        } else {
          subWord += birler[b] + " ";
        }
      }
      
      wordResult = subWord + binler[count] + " " + wordResult;
    }
    
    tempNum = Math.floor(tempNum / 1000);
    count++;
  }
  
  return wordResult.trim();
}

export function convertCurrencyToTurkishWords(value: number, currency: string = "TRY"): string {
  if (isNaN(value) || value === null || value <= 0) return "";
  const lira = Math.floor(value);
  const kurus = Math.round((value - lira) * 100);
  
  let currencyUnit = "TürkLirası";
  let subUnit = "Kuruş";
  
  if (currency === "USD") {
    currencyUnit = "Amerikan Doları";
    subUnit = "Sent";
  } else if (currency === "EUR") {
    currencyUnit = "Euro";
    subUnit = "Sent";
  } else if (currency === "GBP") {
    currencyUnit = "İngiliz Sterlini";
    subUnit = "Pence";
  }

  let text = "Yalnız " + convertNumberToTurkishWords(lira) + " " + currencyUnit;
  if (kurus > 0) {
    text += " " + convertNumberToTurkishWords(kurus) + " " + subUnit;
  }
  
  return text + " Adır.";
}

interface ContractTemplate {
  id: string;
  name: string;
  category: string;
  rawTemplate: string;
}

const TEMPLATES: ContractTemplate[] = [
  {
    id: "consulting_agreement",
    name: "Yalın Danışmanlık ve Operasyonel Mükemmellik Sözleşmesi",
    category: "Consulting",
    rawTemplate: `
<h2 style="text-align: center; font-size: 18px; font-weight: bold; margin-bottom: 24px; color: #1e293b; text-transform: uppercase;">DANIŞMANLIK HİZMET SÖZLEŞMESİ</h2>

<p style="margin-bottom: 12px; line-height: 1.6;"><strong>1. TARAFLAR</strong></p>
<p style="margin-bottom: 16px; line-height: 1.6;">İşbu sözleşme (bundan böyle "Sözleşme" olarak anılacaktır), bir tarafta <strong>{{COMPANY_TITLE}}</strong> (Müşteri Adresi: {{COMPANY_ADDRESS}} - bundan böyle <strong>"MÜŞTERİ"</strong> olarak anılacaktır) ile diğer tarafta Sarıyer, İstanbul adresinde mukim <strong>Gemba Operasyonel Mükemmellik Danışmanlık A.Ş.</strong> (bundan böyle <strong>"YÜKLENİCİ"</strong> olarak anılacaktır) arasında aşağıdaki kayıt ve şartlarla akdedilmiştir.</p>

<p style="margin-bottom: 12px; line-height: 1.6;"><strong>2. SÖZLEŞMENİN KONUSU VE KAPSAMI</strong></p>
<p style="margin-bottom: 16px; line-height: 1.6;">İşbu Sözleşmenin konusu, YÜKLENİCİ tarafından MÜŞTERİ tesis ve departmanlarında yürütülecek olan <strong>"{{SUBJECT}}"</strong> kapsamındaki operasyonel gelişim, Gemba analizi, Değer Akışı Haritalama (VSM), Kaizen atölyeleri, israf azaltma ve verimlilik arttırma odaklı yönetim danışmanlığı ile saha koordinasyon faaliyetleridir.</p>

<p style="margin-bottom: 12px; line-height: 1.6;"><strong>3. PROJE YÖNETİMİ VE KOORDİNASYON</strong></p>
<p style="margin-bottom: 16px; line-height: 1.6;">İşbu sözleşmeye konu projenin takibi, koordinasyonu, kilometre taşlarının onayı ve raporlaması MÜŞTERİ adına <strong>T.C. Kimlik No: {{TC_NO}}</strong> olan Proje Yöneticisi <strong>Sayın {{PROJECT_MANAGER}}</strong> tarafından yürütülecek ve denetlenecektir. Projenin operasyonel hedeflere ulaşmasında iki tarafın ekipleri iş birliği içerisinde çalışacaktır.</p>

<p style="margin-bottom: 12px; line-height: 1.6;"><strong>4. YÜKÜMLÜLÜKLER VE PROJE SÜRESİ</strong></p>
<p style="margin-bottom: 16px; line-height: 1.6;">YÜKLENİCİ, sözleşme konusu işleri operasyonel mükemmellik standartlarına ve genel kabul görmüş yalın üretim kurallarına uygun olarak sadakatle ifa etmeyi kabul eder. Proje başlama tarihi <strong>{{DATE}}</strong> olarak belirlenmiş olup, tüm analiz ve dönüşüm fazları kararlaştırılan süreler içerisinde tamamlanmalıdır.</p>

<p style="margin-bottom: 12px; line-height: 1.6;"><strong>5. SÖZLEŞME BEDELİ VE ÖDEME YAPISI</strong></p>
<p style="margin-bottom: 16px; line-height: 1.6;">MÜŞTERİ, Sözleşme kapsamında icra edilen hizmetlere karşılık olarak YÜKLENİCİ'ye net <strong>{{VALUE}} Türk Lirası</strong> ödemeyi taahhüt eder. Söz konusu bu sözleşme bedeli yazı ile <strong>"{{VALUE_WORDS}}"</strong> olarak ödenmekle mükelleftir. Ödemeler, YÜKLENİCİ tarafından düzenlenen faturanın ibrazını müteakip 7 (yedi) iş günü içerisinde Sözleşme'de belirtilen banka hesabına havale veya EFT yoluyla yapılacaktır.</p>

<p style="margin-bottom: 12px; line-height: 1.6;"><strong>6. GİZLİLİK VE VERİ GÜVENLİĞİ</strong></p>
<p style="margin-bottom: 16px; line-height: 1.6;">YÜKLENİCİ, proje süresince MÜŞTERİ firmasından elde ettiği her türlü operasyonel, finansal ve ticari bilgiyi gizli bilgi olarak saklamayı ve üçüncü şahıslara açıklamamakla yükümlü olduğunu kabul eder. Bu gizlilik mükellefiyeti sözleşmenin sona ermesinden sonra da 5 (beş) yıl süreyle devam edecektir.</p>

<p style="margin-bottom: 12px; line-height: 1.6;"><strong>7. UYUŞMAZLIKLARIN ÇÖZÜMÜ</strong></p>
<p style="margin-bottom: 16px; line-height: 1.6;">İşbu Sözleşme'den doğacak her türlü anlaşmazlıkların çözümünde İstanbul (Çağlayan) Mahkemeleri ve İcra Daireleri yetkilidir. 7 (yedi) maddeden oluşan bu akit <strong>{{DATE}}</strong> tarihinde iki orijinal nüsha olarak tanzim edilerek taraflarca tam rıza ile imza edilmiştir.</p>
`
  },
  {
    id: "nda_agreement",
    name: "Karşılıklı Gizlilik Sözleşmesi (Non-Disclosure Agreement)",
    category: "Legal",
    rawTemplate: `
<h2 style="text-align: center; font-size: 18px; font-weight: bold; margin-bottom: 24px; color: #1e293b; text-transform: uppercase;">KARŞILIKLI GİZLİLİK SÖZLEŞMESİ</h2>

<p style="margin-bottom: 12px; line-height: 1.6;"><strong>1. TARAFLAR</strong></p>
<p style="margin-bottom: 16px; line-height: 1.6;">İşbu Karşılıklı Gizlilik Sözleşmesi, <strong>{{DATE}}</strong> tarihinde, bir tarafta <strong>{{COMPANY_TITLE}}</strong> (Adres: {{COMPANY_ADDRESS}} - bundan böyle <strong>"BİRİNCİ TARAF"</strong> olarak anılacaktır) ile diğer tarafta Maslak, İstanbul adresinde mukim <strong>Gemba Operasyonel Mükemmellik Danışmanlık A.Ş.</strong> (bundan böyle <strong>"İKİNCİ TARAF"</strong> olarak anılacaktır) arasında imzalanmıştır.</p>

<p style="margin-bottom: 12px; line-height: 1.6;"><strong>2. SÖZLEŞMENİN AMACI</strong></p>
<p style="margin-bottom: 16px; line-height: 1.6;">İşbu sözleşmenin amacı, tarafların <strong>"{{SUBJECT}}"</strong> hususunda yürütmeyi planladıkları potansiyel iş birliği / iş geliştirme projesi kapsamında birbirlerine açıklayacakları gizli bilgilerin korunmasını sağlamaktır.</p>

<p style="margin-bottom: 12px; line-height: 1.6;"><strong>3. YETKİLİ PROJE SORUMLUSU</strong></p>
<p style="margin-bottom: 16px; line-height: 1.6;">Bilgi akışının güvenliğinden, teslim alınan dokümanların kontrolünden ve gizli verilere erişim izinlerinden taraflar adına Proje Yöneticisi olan <strong>Sayın {{PROJECT_MANAGER}}</strong> (T.C. No: {{TC_NO}}) öncelikli derecede sorumlu olacak ve yetkili kişi olarak tarafları temsil edecektir.</p>

<p style="margin-bottom: 12px; line-height: 1.6;"><strong>4. SÖZLEŞME BEDELİ VE CEZAİ ŞART</strong></p>
<p style="margin-bottom: 16px; line-height: 1.6;">İşbu sözleşmenin özü itibarıyla gizliliğin ihlali durumunda ihlal eden taraf, diğer tarafın bu ihlalden dolayı uğrayacağı doğrudan ve dolaylı tüm zararları gidermekle mükelleftir. İhlal halinde uygulanacak asgari cezai şart tutarı <strong>{{VALUE}} Türk Lirası</strong> olup, yazı ile <strong>"{{VALUE_WORDS}}"</strong> cezai tazminat miktarı olarak belirlenmiştir.</p>

<p style="margin-bottom: 12px; line-height: 1.6;"><strong>5. GİZLİ BİLGİNİN TANIMI</strong></p>
<p style="margin-bottom: 16px; line-height: 1.6;">Süreçler esnasında ifşa edilen yazılı, sözlü, elektronik ortamdaki her türlü üretim metodu, israf analiz raporu, finansal tablolar, yazılımlar, ticari listeler gizli bilgi kapsamındadır. Taraflar bu bilgileri personeline ancak "bilmesi gerektiği ölçüde" ve her aşamada sıkı gizlilik taahhüdü altında aktaracaktır.</p>

<p style="margin-bottom: 12px; line-height: 1.6;"><strong>6. YÜRÜRLÜK SÜRESİ</strong></p>
<p style="margin-bottom: 16px; line-height: 1.6;">İşbu sözleşme imza tarihinden itibaren yürürlüğe girer ve taraflar arasındaki ticari ilişki sona erse dahi 5 (beş) yıl boyunca hüküm ifade eder. Anlaşmazlıkların çözümünde İstanbul Anadolu Adliyeleri ve İcra Müdürlükleri münhasıran yetkilidir.</p>
`
  },
  {
    id: "digitalization_service",
    name: "Yazılım ve Dijital Dönüşüm Hizmet Sözleşmesi",
    category: "Technology",
    rawTemplate: `
<h2 style="text-align: center; font-size: 18px; font-weight: bold; margin-bottom: 24px; color: #1e293b; text-transform: uppercase;">YAZILIM VE DİJİTAL DÖNÜŞÜM SÖZLEŞMESİ</h2>

<p style="margin-bottom: 12px; line-height: 1.6;"><strong>1. TARAFLAR VE TEBLİGAT</strong></p>
<p style="margin-bottom: 16px; line-height: 1.6;">Bir yanda <strong>{{COMPANY_TITLE}}</strong> (Adres: {{COMPANY_ADDRESS}} - bundan böyle <strong>"MÜŞTERİ"</strong> olarak anılacaktır) ile diğer yanda Sarıyer, İstanbul adresinde mukim <strong>Gemba Operasyonel Mükemmellik Danışmanlık A.Ş.</strong> (bundan böyle <strong>"DANIŞMAN"</strong>) arasında aşağıdaki maddeler uyarınca işbu hizmet akdi akdedilmiştir.</p>

<p style="margin-bottom: 12px; line-height: 1.6;"><strong>2. SÖZLEŞMENİN MAKSADI VE TEKNİK DETAYLAR</strong></p>
<p style="margin-bottom: 16px; line-height: 1.6;">MÜŞTERİ sistemlerinin modernizasyonu, veri analiz entegrasyonu ve dijital yalın araç modellerinin kurulumuna ilişkin <strong>"{{SUBJECT}}"</strong> projesinin teknik entegrasyonu ve kod modüllerinin geliştirilmesi DANIŞMAN tarafından yerine getirilecektir.</p>

<p style="margin-bottom: 12px; line-height: 1.6;"><strong>3. PROJE TAKVİMİ VE KOORDİNATÖR TANIMI</strong></p>
<p style="margin-bottom: 16px; line-height: 1.6;">Entegrasyon fazlarının, yazılım kabul kriterleri onay süreçlerinin ve ekipler arası köprünün takibi MÜŞTERİ adına Proje Lideri <strong>Sayın {{PROJECT_MANAGER}}</strong> (T.C Kimlik No: {{TC_NO}}) tarafından imzalanacak kabul formlarıyla test edilecektir. Proje başlangıç tarihi <strong>{{DATE}}</strong> olarak kararlaştırılmıştır.</p>

<p style="margin-bottom: 12px; line-height: 1.6;"><strong>4. HİZMET BEDELİ VE FATURALANDIRMA</strong></p>
<p style="margin-bottom: 16px; line-height: 1.6;">Müşteri, söz konusu geliştirme, entegrasyon ve dijitalleşme paketi kapsamında Danışman'a toplam net <strong>{{VALUE}} Türk Lirası</strong> (+KDV) ödeme gerçekleştirecektir. Söz konusu bedel yazı ile tam olarak <strong>"{{VALUE_WORDS}}"</strong> şeklinde ödenecektir. Ödemelerin faturayı takip eden 15 (on beş) takvim günü içerisinde yapılması zorunludur.</p>

<p style="margin-bottom: 12px; line-height: 1.6;"><strong>5. FİKRİ MÜLKİYET HAKLARI</strong></p>
<p style="margin-bottom: 16px; line-height: 1.6;">Müşteri için özel olarak geliştirilecek olan yazılım modülleri, veri panoları ve analitik algoritmaların kullanım ve sahiplik hakları ödemenin tam yapılmasıyla birlikte tescil edilerek MÜŞTERİ'ye devrolacaktır. Prototip aşamasındaki kütüphane altyapıları ise DANIŞMAN telif mülkiyetinde kalır.</p>

<p style="margin-bottom: 12px; line-height: 1.6;"><strong>6. YÜRÜRLÜK</strong></p>
<p style="margin-bottom: 16px; line-height: 1.6;">İşbu sözleşme <strong>{{DATE}}</strong> itibarıyla yürürlüğe girmiş olup tarafların karşılıklı ıslak veya güvenli e-imzası ile hukuken geçerlilik kazanacaktır. İhtilafların hallinde İstanbul Çağlayan Mahkemeleri yetkilidir.</p>
`
  }
];

const LETTERHEADS = [
  {
    id: "page_png_letterhead",
    name: "Yüklenmiş Kurumsal Şablon (page.png)",
    primaryColor: "#0F172A",
    accentColor: "#F1F5F9",
    tagline: "GEMBA OPERASYONEL MÜKEMMELLİK DANIŞMANLIK A.Ş.",
    details: "Maslak Mah. Büyükdere Cad. No:125, Sarıyer/İstanbul | info@gembaopex.com | +90 (212) 365 44 00",
    usePageBg: true
  },
  {
    id: "classic_blue",
    name: "Mavi Kurumsal (Classic)",
    primaryColor: "#0078D4",
    accentColor: "#DEECF9",
    tagline: "GEMBA OPERASYONEL MÜKEMMELLİK DANIŞMANLIK A.Ş.",
    details: "Maslak Mah. Büyükdere Cad. No:125, Sarıyer/İstanbul | info@gembaopex.com | +90 (212) 365 44 00"
  },
  {
    id: "emerald_lean",
    name: "Zümrüt Yeşili (Lean Industrial)",
    primaryColor: "#107C41",
    accentColor: "#DFF6DD",
    tagline: "GEMBA OPERASYONEL MÜKEMMELLİK & YALIN DÖNÜŞÜM",
    details: "İTÜ Teknokent, Sarıyer/İstanbul | www.gembaopex.com | opex@gembaopex.com"
  },
  {
    id: "royal_burgundy",
    name: "Yönetici Bordosu (Executive)",
    primaryColor: "#800020",
    accentColor: "#F3E5E8",
    tagline: "GEMBA PARTNERS / MANAGEMENT CONSULTING GROUP",
    details: "Maslak Plaza Kat:12, İstanbul | global@gembapartners.com | Mersis No: 038804562400001"
  }
];

// Helper to split HTML string into block level elements (p, h2, h3, etc.) safely
const parseHtmlToBlocks = (html: string): string[] => {
  if (!html) return [];
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  const blocks: string[] = [];
  doc.body.childNodes.forEach((node) => {
    if (node.nodeType === Node.ELEMENT_NODE) {
      blocks.push((node as HTMLElement).outerHTML);
    } else if (node.nodeType === Node.TEXT_NODE && node.textContent?.trim()) {
      blocks.push(`<p style="margin-bottom: 12px; line-height: 1.6;">${node.textContent}</p>`);
    }
  });
  return blocks;
};

const incrementSequenceNumber = (val: string): string => {
  const match = val.match(/\d+$/);
  if (!match) return val;
  const numStr = match[0];
  const incremented = (parseInt(numStr, 10) + 1).toString();
  if (incremented.length < numStr.length) {
    return val.substring(0, val.length - numStr.length) + incremented.padStart(numStr.length, "0");
  }
  return val.substring(0, val.length - numStr.length) + incremented;
};

const MAX_LINES_PER_PAGE = 31;
const SIGNATURE_BLOCK_LINES = 10;

// Estimator function for line capacity of each HTML block element
const estimateLineCount = (html: string): number => {
  const temp = document.createElement("div");
  temp.innerHTML = html;
  
  // Replace <br> and other line breaks with \n to count lines accurately
  temp.querySelectorAll("br").forEach(br => br.replaceWith("\n"));
  
  const text = temp.textContent || "";
  const lines = text.split("\n");
  
  const isHeader = temp.querySelector("h1, h2, h3, h4, h5, h6") !== null;
  
  let totalLines = 0;
  // A standard page line fits ~95 characters at 9pt Arial on 166-170mm content width
  const charsPerLine = 95;
  
  lines.forEach(line => {
    const trimmed = line.trim();
    if (trimmed.length === 0) {
      totalLines += 0.5;
    } else {
      totalLines += Math.ceil(trimmed.length / charsPerLine);
    }
  });
  
  if (totalLines === 0) totalLines = 1;
  
  // Headings get an extra 2.2 lines of spacing (margin + font size)
  // Paragraphs get an extra 0.8 lines of spacing (margin-bottom: 12px)
  return isHeader ? totalLines + 2.2 : totalLines + 0.8;
};

// Segments a list of HTML blocks into array-of-arrays representing discrete pages
const paginateBlocks = (blocks: string[]): string[][] => {
  const pages: string[][] = [];
  let currentPage: string[] = [];
  let currentLines = 0;

  blocks.forEach((block) => {
    const lines = estimateLineCount(block);
    if (currentPage.length > 0 && currentLines + lines > MAX_LINES_PER_PAGE) {
      pages.push(currentPage);
      currentPage = [block];
      currentLines = lines;
    } else {
      currentPage.push(block);
      currentLines += lines;
    }
  });

  if (currentPage.length > 0) {
    pages.push(currentPage);
  }

  if (pages.length === 0) {
    pages.push([]);
  }

  return pages;
};

export default function ContractManagerView() {
  const { lang } = useLanguage();

  // --- STATE FOR VARIABLES FORM ---
  const [contractNo, setContractNo] = useState(() => CrmDb.getKv("crm_contract_no", "1001"));
  const [companyTitle, setCompanyTitle] = useState(() => CrmDb.getKv("crm_contract_company_title", "Acme Endüstriyel Çözümler San. ve Tic. Ltd. Şti."));
  const [companyAddress, setCompanyAddress] = useState(() => CrmDb.getKv("crm_contract_company_address", "Hadımköy Organize Sanayi Bölgesi, 3. Cadde No:14, Arnavutköy/İstanbul"));
  const [taxOffice, setTaxOffice] = useState(() => CrmDb.getKv("crm_contract_tax_office", ""));
  const [taxNo, setTaxNo] = useState(() => CrmDb.getKv("crm_contract_tax_no", ""));
  
  const [subject, setSubject] = useState(() => CrmDb.getKv("crm_contract_subject", "Yalın Üretim Hattı Kurulumu ve Operasyonel İsraf Analizi projesi"));
  const [contractDate, setContractDate] = useState(() => {
    const today = new Date();
    const offset = today.getTimezoneOffset();
    const localToday = new Date(today.getTime() - (offset * 60 * 1000));
    return localToday.toISOString().split('T')[0];
  });
  const [validityMonths, setValidityMonths] = useState<number>(() => {
    const saved = CrmDb.getKv("crm_contract_validity_months", "");
    return saved ? parseInt(saved) : 12;
  });

  const [projectManager, setProjectManager] = useState(() => CrmDb.getKv("crm_contract_pm", "Ahmet Yılmaz"));
  const [projectManagerTC, setProjectManagerTC] = useState(() => CrmDb.getKv("crm_contract_pm_tc", "12345678901"));
  const [contractValue, setContractValue] = useState<number>(() => {
    const saved = CrmDb.getKv("crm_contract_value", "");
    return saved ? parseFloat(saved) : 250000;
  });
  
  const [currency, setCurrency] = useState("TRY");
  const [contractValueWords, setContractValueWords] = useState("");

  const [customTemplateText, setCustomTemplateText] = useState(() => CrmDb.getKv("crm_contract_custom_template", ""));
  const [customTemplateName, setCustomTemplateName] = useState(() => CrmDb.getKv("crm_contract_custom_template_name", "Yüklenmiş Word Şablonu"));
  const [isUploading, setIsUploading] = useState(false);

  // Load companies from CrmDb
  const [companies, setCompanies] = useState<any[]>(() => {
    return CrmDb.getCompanies();
  });

  const [companyDropdownOpen, setCompanyDropdownOpen] = useState(false);

  // Initial setup: refresh companies, set date to local today, and auto-sync proposal service to contract subject
  useEffect(() => {
    setCompanies(CrmDb.getCompanies());
    
    // Default contract date to today's date
    const today = new Date();
    const offset = today.getTimezoneOffset();
    const localToday = new Date(today.getTime() - (offset * 60 * 1000));
    setContractDate(localToday.toISOString().split('T')[0]);

    // Automatically fill contract subject with selected proposal service if it changed
    const activeService = CrmDb.getKv("crm_contract_selected_service_name", "");
    if (activeService) {
      const lastService = CrmDb.getKv("crm_contract_last_synced_service", "");
      if (activeService !== lastService) {
        setSubject(`${activeService} Hizmeti`);
        CrmDb.setKv("crm_contract_last_synced_service", activeService);
      }
    }
  }, []);

  // Update words on value change
  useEffect(() => {
    setContractValueWords(convertCurrencyToTurkishWords(contractValue, currency));
  }, [contractValue, currency]);

  // Persist form inputs local storage
  useEffect(() => {
    CrmDb.setKv("crm_contract_no", contractNo);
    CrmDb.setKv("crm_contract_company_title", companyTitle);
    CrmDb.setKv("crm_contract_company_address", companyAddress);
    CrmDb.setKv("crm_contract_tax_office", taxOffice);
    CrmDb.setKv("crm_contract_tax_no", taxNo);
    CrmDb.setKv("crm_contract_subject", subject);
    CrmDb.setKv("crm_contract_date", contractDate);
    CrmDb.setKv("crm_contract_validity_months", validityMonths.toString());
    CrmDb.setKv("crm_contract_pm", projectManager);
    CrmDb.setKv("crm_contract_pm_tc", projectManagerTC);
    CrmDb.setKv("crm_contract_value", contractValue.toString());
    CrmDb.setKv("crm_contract_custom_template", customTemplateText);
    CrmDb.setKv("crm_contract_custom_template_name", customTemplateName);
  }, [contractNo, companyTitle, companyAddress, taxOffice, taxNo, subject, contractDate, validityMonths, projectManager, projectManagerTC, contractValue, customTemplateText, customTemplateName]);

  // --- TEMPLATE & LETTERHEAD SELECTORS ---
  const [selectedTemplateId, setSelectedTemplateId] = useState(() => {
    return CrmDb.getKv("crm_contract_template_id", "consulting_agreement");
  });
  const [selectedLetterheadId, setSelectedLetterheadId] = useState("page_png_letterhead");

  useEffect(() => {
    CrmDb.setKv("crm_contract_template_id", selectedTemplateId);
  }, [selectedTemplateId]);

  // Helper to dynamically get the corporate page template background image
  const getCompanyPageTemplate = () => {
    const templateMeta = CrmDb.getKv<Record<string, unknown>>("crm_uploaded_page_templates", {});
    for (const sid of Object.keys(templateMeta)) {
      const val = CrmDb.getKv<string | null>(`crm_png_template_page_${sid}`, null);
      if (val) return val;
    }
    return "/page.png"; // Fallback to standard page.png
  };

  const activeBgImage = getCompanyPageTemplate();

  // --- EDIT & PREVIEW MODE STATE ---
  const [isEditMode, setIsEditMode] = useState(false);
  
  const [hasManualEdits, setHasManualEdits] = useState(() => {
    return CrmDb.getKv<string>("crm_contract_has_manual_edits", "false") === "true";
  });

  const [editedBody, setEditedBody] = useState(() => {
    const hasManual = CrmDb.getKv<string>("crm_contract_has_manual_edits", "false") === "true";
    if (hasManual) {
      const saved = CrmDb.getKv("crm_contract_edited_body_autosave", "");
      if (saved) return saved;
    }
    return "";
  });

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isExportingPDF, setIsExportingPDF] = useState(false);
  
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [autoSaveStatus, setAutoSaveStatus] = useState<"idle" | "saving" | "saved">("idle");

  const lastSavedRef = useRef(editedBody);

  // Sync manual edit flag to CrmDb
  useEffect(() => {
    CrmDb.setKv("crm_contract_has_manual_edits", hasManualEdits ? "true" : "false");
  }, [hasManualEdits]);

  // Track if content has changed since last save
  useEffect(() => {
    if (isEditMode && editedBody) {
      if (editedBody !== lastSavedRef.current) {
        setHasUnsavedChanges(true);
      }
    }
  }, [editedBody, isEditMode]);

  // Autosave interval every 30 seconds
  useEffect(() => {
    if (!isEditMode) return;

    const interval = setInterval(() => {
      if (editedBody && editedBody !== lastSavedRef.current) {
        setAutoSaveStatus("saving");
        CrmDb.setKv("crm_contract_edited_body_autosave", editedBody);
        CrmDb.setKv("crm_contract_has_manual_edits", "true");
        setHasManualEdits(true);
        lastSavedRef.current = editedBody;
        setHasUnsavedChanges(false);
        setTimeout(() => setAutoSaveStatus("saved"), 1000);
        setTimeout(() => setAutoSaveStatus("idle"), 3000);
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [editedBody, isEditMode]);

  // Warn before leaving the page if there are unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = "Sözleşmede kaydedilmemiş değişiklikler var. Ayrılmak istediğinizden emin misiniz?";
        return e.returnValue;
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasUnsavedChanges]);

  const handleSaveAndLock = () => {
    if (isEditMode) {
      // Manual Save action when locking
      setAutoSaveStatus("saving");
      CrmDb.setKv("crm_contract_edited_body_autosave", editedBody);
      CrmDb.setKv("crm_contract_has_manual_edits", "true");
      setHasManualEdits(true);
      lastSavedRef.current = editedBody;
      setHasUnsavedChanges(false);
      setTimeout(() => setAutoSaveStatus("saved"), 1000);
      setTimeout(() => setAutoSaveStatus("idle"), 3000);
    }
    setIsEditMode(!isEditMode);
  };

  const handleResetToTemplate = () => {
    if (window.confirm("Manuel olarak yaptığınız tüm değişiklikler silinecektir. Şablona dönmek istediğinizden emin misiniz?")) {
      setHasManualEdits(false);
      CrmDb.setKv("crm_contract_edited_body_autosave", "");
      CrmDb.setKv("crm_contract_has_manual_edits", "false");
      const baseText = generatePopulatedText();
      setEditedBody(baseText);
      lastSavedRef.current = baseText;
      setHasUnsavedChanges(false);
    }
  };

  // Ref for the content area to copy/export
  const paperRef = useRef<HTMLDivElement>(null);

  // Helper to format currency values to localize string
  const formatAsCurrency = (val: number) => {
    return new Intl.NumberFormat("tr-TR", { style: "decimal", minimumFractionDigits: 0 }).format(val);
  };

  // Dynamic list of templates including custom uploaded ones
  const dynamicTemplates = [
    ...TEMPLATES,
    ...(customTemplateText ? [{
      id: "uploaded_word",
      name: `📄 ${customTemplateName}`,
      category: "Uploaded",
      rawTemplate: customTemplateText
    }] : [])
  ];

  const currentTemplate = dynamicTemplates.find(t => t.id === selectedTemplateId) || dynamicTemplates[0];
  const currentLetterhead = LETTERHEADS.find(lh => lh.id === selectedLetterheadId) || LETTERHEADS[0];

  // Expiration Date calculation
  const calculateExpirationDate = (dateStr: string, months: number) => {
    if (!dateStr) return "[Geçerlilik Tarihi]";
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return "[Geçerlilik Tarihi]";
      d.setMonth(d.getMonth() + months);
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      return `${day}.${month}.${year}`;
    } catch (e) {
      return "[Geçerlilik Tarihi]";
    }
  };

  // Automate Replacement Function
  const generatePopulatedText = () => {
    let text = currentTemplate.rawTemplate;
    if (!text) return "";
    
    // Semicolon and bracket cleaning helper
    const cleanVal = (val: string) => {
      if (!val) return "";
      let clean = val;
      if (clean.includes(";")) {
        const parts = clean.split(";").map(p => p.trim()).filter(Boolean);
        if (parts.length > 0) {
          clean = parts[0];
        }
      }
      return clean.replace(/^[\{\[\("'\s]+|[\}\]\)"'\s]+$/g, "").trim();
    };

    const cleanSemicolonAddress = (val: string) => {
      if (!val) return "";
      let clean = val;
      if (clean.includes(";")) {
        const parts = clean.split(";").map(p => p.trim()).filter(Boolean);
        clean = parts.join(", ");
      }
      return clean.replace(/^[\{\[\("'\s]+|[\}\]\)"'\s]+$/g, "").trim();
    };

    const rawTitle = companyTitle || "[Firma Unvanı]";
    const rawAddr = companyAddress || "[Firma Adresi]";
    const rawOffice = taxOffice || "[Vergi Dairesi]";
    const rawNo = taxNo || "[Vergi Numarası]";
    const rawPmName = projectManager || "[Proje Yöneticisi]";
    const rawPmTC = projectManagerTC || "[T.C. Kimlik No]";

    const comTitle = cleanVal(rawTitle);
    const comAddr = cleanSemicolonAddress(rawAddr);
    const tOffice = cleanVal(rawOffice);
    const tNo = cleanVal(rawNo);
    const pmName = cleanVal(rawPmName);
    const pmTC = cleanVal(rawPmTC);

    const formattedPrice = formatAsCurrency(contractValue);
    const cleanWords = contractValueWords
      ? contractValueWords.replace(/^Yalnız\s+/, "").replace(/\s+Adır\.$/, "")
      : "";
    const formattedExpDate = calculateExpirationDate(contractDate, validityMonths);
    const sub = subject || "[Sözleşme Konusu]";
    const dStr = contractDate ? contractDate.split("-").reverse().join(".") : "[Sözleşme Tarihi]";

    // Robust token replacement helper that handles any brace/bracket variations
    const replaceTokenRobustly = (sourceText: string, tokenName: string, replacementValue: string) => {
      let result = sourceText;
      
      // Safely escape any special characters in tokenName for RegExp
      const escapedTokenName = tokenName.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
      
      // 1. Match {* {* TOKEN_NAME }* }* or [* [* TOKEN_NAME ]* ]* optionally with spaces
      const regexBraces = new RegExp(`[\\{\\[]+\\s*${escapedTokenName}\\s*[\\}\\]]+`, "gi");
      result = result.replace(regexBraces, replacementValue);
      
      // 2. Just in case there is a single brace/bracket at start/end or mismatched: e.g. {TOKEN_NAME}} or {{TOKEN_NAME}
      const regexLeftMismatched = new RegExp(`[\\{\\[]+\\s*${escapedTokenName}`, "gi");
      result = result.replace(regexLeftMismatched, replacementValue);
      const regexRightMismatched = new RegExp(`${escapedTokenName}\\s*[\\}\\]]+`, "gi");
      result = result.replace(regexRightMismatched, replacementValue);

      // 3. Exact literal splits/joins to capture simple raw text
      result = result.split(tokenName).join(replacementValue);

      return result;
    };

    // Replace robustly
    text = replaceTokenRobustly(text, "COMPANY_TITLE", comTitle);
    text = replaceTokenRobustly(text, "COMPANY_ADDRESS", comAddr);
    text = replaceTokenRobustly(text, "COMPANY_ADRESS", comAddr);
    text = replaceTokenRobustly(text, "Firma Adresi", comAddr);
    text = replaceTokenRobustly(text, "Firma Tebligat Adresi", comAddr);
    
    text = replaceTokenRobustly(text, "TAX_OFFICE", tOffice);
    text = replaceTokenRobustly(text, "Vergi Dairesi", tOffice);
    
    text = replaceTokenRobustly(text, "TAX_NO", tNo);
    text = replaceTokenRobustly(text, "TAX_No", tNo);
    text = replaceTokenRobustly(text, "Vergi Numarası", tNo);
    
    text = replaceTokenRobustly(text, "PROJECT_MANAGER", pmName);
    text = replaceTokenRobustly(text, "Proje Yöneticisi", pmName);
    
    text = replaceTokenRobustly(text, "TC_NO", pmTC);
    
    text = replaceTokenRobustly(text, "EXP_DATE", formattedExpDate);
    
    text = replaceTokenRobustly(text, "SUBJECT", sub);
    text = replaceTokenRobustly(text, "Sözleşme Konusu", sub);
    
    text = replaceTokenRobustly(text, "DATE", dStr);
    text = replaceTokenRobustly(text, "Sözleşme Tarihi", dStr);
    
    text = replaceTokenRobustly(text, "UNIT_PRICE", formattedPrice);
    text = replaceTokenRobustly(text, "VALUE", formattedPrice);
    text = replaceTokenRobustly(text, "Sözleşme Bedeli", formattedPrice);
    
    text = replaceTokenRobustly(text, "UNIT_PRICE_EXP", cleanWords);
    text = replaceTokenRobustly(text, "VALUE_WORDS", contractValueWords);
    text = replaceTokenRobustly(text, "Sözleşme Bedeli Okunuşu", contractValueWords);

    // Replace any custom number EXP patterns like {{35.000_EXP}} or 35.000_EXP}} or [35.000_EXP] with cleanWords
    text = text.replace(/[\{\[]*\s*\d+(?:[\.,]\d+)*_EXP\s*[\}\]]*/gi, cleanWords);

    return text;
  };

  // Sync edited body with changes when not manually overriding in edit mode
  useEffect(() => {
    if (!isEditMode && !hasManualEdits) {
      setEditedBody(generatePopulatedText());
    }
  }, [companyTitle, companyAddress, taxOffice, taxNo, subject, contractDate, validityMonths, projectManager, projectManagerTC, contractValue, contractValueWords, selectedTemplateId, isEditMode, customTemplateText, hasManualEdits]);

  // Keyboard shortcut listener to exit fullscreen with Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsFullscreen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // --- DOCUMENT EXPORT ENGINES ---
  
  // Custom High-Fidelity A4 Browser Print Option with dynamic multi-page letterhead flow
  const handlePrintDocument = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const blocksList = parseHtmlToBlocks(editedBody);
    const printedPages = paginateBlocks(blocksList);
    // Sig block adds about 10 lines of height. If it overflows raw lines, put it on dedicated final page
    if (printedPages[printedPages.length - 1].reduce((sum, b) => sum + estimateLineCount(b), 0) + 10 > 34) {
      printedPages.push([]);
    }

    const pagesHtml = printedPages.map((pageBlocks, pageIndex) => {
      const isLastPage = pageIndex === printedPages.length - 1;
      const pageInnerHtml = pageBlocks.join("\n");
      
      const headerHtml = selectedLetterheadId !== "page_png_letterhead" ? `
        <div class="letterhead">
          <div style="display: flex; align-items: center; gap: 10px;">
            <div class="logo-placeholder">G</div>
            <div style="text-align: left;">
              <div class="letterhead-title">${currentLetterhead.tagline}</div>
              <div style="font-size: 8px; color: #94a3b8; text-transform: uppercase; margin-top: 2px; font-weight: bold;">RESMİ DEGELE ANTETLİ KAĞIT SÜRECİ</div>
            </div>
          </div>
          <div class="letterhead-details">
            ${currentLetterhead.details.split("|").map(line => `<div>${line.trim()}</div>`).join("")}
          </div>
        </div>
      ` : "";

      const signatureHtml = isLastPage ? `
        <div class="signatures-block">
          <div class="signature-col">
            <p style="font-weight: bold; margin-bottom: 4px; font-size: 11px;">MÜŞTERİ (HİZMET ALAN)</p>
            <p style="font-size: 11px; font-weight: 600; color: #1e293b; margin-bottom: 24px;">${companyTitle || '[Firma Unvanı]'}</p>
            <p style="font-size: 11px; color: #64748b; margin-bottom: 2px;">Proje Yöneticisi: ${projectManager}</p>
            <div style="height: 60px; border-bottom: 1px border-slate-200; border-bottom-style: dashed; margin-bottom: 6px;">İmza / Kaşe</div>
          </div>
          <div class="signature-col">
            <p style="font-weight: bold; margin-bottom: 4px; font-size: 11px;">YÜKLENİCİ (HİZMET VEREN)</p>
            <p style="font-size: 11px; font-weight: 600; color: #1e293b; margin-bottom: 24px;">Gemba Operasyonel Mükemmellik Danışmanlık A.Ş.</p>
            <p style="font-size: 11px; color: #64748b; margin-bottom: 2px;">Temsilen: Genel Müdür & GP</p>
            <div style="height: 60px; border-bottom: 1px border-slate-200; border-bottom-style: dashed; margin-bottom: 6px;">İmza / Kaşe</div>
          </div>
        </div>
      ` : "";

      const footerHtml = `
        <div class="footer-strip">
          <div style="display: flex; justify-content: space-between; width: 100%;">
            <span>Sayfa ${pageIndex + 1} / ${printedPages.length}</span>
            <span>PROJE RESMİ REFERANS: GEM-CON-${new Date().getFullYear()}-${contractNo}</span>
            <span>İşbu akit fiziki çıktı alındığında tam hukuki koruma sağlar.</span>
          </div>
        </div>
      `;

      return `
        <div class="page">
          ${headerHtml}
          <div class="contract-content">
            ${pageInnerHtml}
          </div>
          ${signatureHtml}
          ${footerHtml}
        </div>
      `;
    }).join("\n");

    printWindow.document.write(`
      <html>
        <head>
          <title>Sözleşme - ${companyTitle}</title>
          <style>
            @media print {
              html, body {
                margin: 0 !important;
                padding: 0 !important;
                width: 210mm !important;
                height: 297mm !important;
                background-color: #ffffff !important;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
              .page {
                width: 210mm !important;
                height: 297mm !important;
                page-break-after: always !important;
                page-break-inside: avoid !important;
                box-sizing: border-box !important;
                padding: ${selectedLetterheadId === "page_png_letterhead" ? "46mm 22mm 35mm 22mm" : "38mm 20mm 30mm 20mm"} !important;
                background-image: url('${activeBgImage}') !important;
                background-size: 100% 100% !important;
                background-repeat: no-repeat !important;
                display: flex !important;
                flex-direction: column !important;
                position: relative !important;
                background-color: #ffffff !important;
              }
              .page:last-child {
                page-break-after: avoid !important;
              }
            }
            body {
              font-family: Arial, sans-serif;
              color: #1e293b;
              margin: 0;
              padding: 0;
              background-color: #f1f5f9;
            }
            .page {
              background-color: #ffffff;
              box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
              width: 210mm;
              height: 297mm;
              margin: 20px auto;
              box-sizing: border-box;
              padding: ${selectedLetterheadId === "page_png_letterhead" ? "46mm 22mm 35mm 22mm" : "38mm 20mm 30mm 20mm"};
              display: flex;
              flex-direction: column;
              position: relative;
              background-image: url('${activeBgImage}');
              background-size: 100% 100%;
              background-repeat: no-repeat;
            }
            .letterhead { 
              border-bottom: 2px solid ${currentLetterhead.primaryColor}; 
              padding-bottom: 12px; 
              margin-bottom: 24px; 
              display: flex; 
              justify-content: space-between; 
              align-items: center; 
              font-family: Arial, sans-serif;
            }
            .letterhead-title { font-weight: 800; font-size: 13px; color: ${currentLetterhead.primaryColor}; letter-spacing: 0.5px; }
            .letterhead-details { font-size: 8px; color: #64748b; text-align: right; line-height: 1.4; font-family: Arial, sans-serif; }
            .logo-placeholder { font-weight: 900; color: #ffffff; background: ${currentLetterhead.primaryColor}; padding: 6px 10px; border-radius: 4px; font-size: 14px; }
            .contract-content { font-family: Arial, sans-serif; font-size: 9pt; line-height: 1.6; text-align: justify; flex: 1; }
            .contract-content h1, .contract-content h2, .contract-content h3, .contract-content h4, .contract-content h5, .contract-content h6 { text-align: center; font-size: 11pt !important; font-weight: bold; margin-bottom: 18px; color: #1e293b; text-transform: uppercase; font-family: Arial, sans-serif; }
            .contract-content p { margin-bottom: 12px; line-height: 1.6; font-size: 9pt; }
            .signatures-block { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-top: auto; padding-top: 15px; border-top: 1.5px dashed #cbd5e1; font-family: Arial, sans-serif; }
            .signature-col { }
            .footer-strip { font-size: 8px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 8px; margin-top: auto; font-family: Arial, sans-serif; }
          </style>
        </head>
        <body>
          ${pagesHtml}
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

  // Modern Export to Word (.doc) using HTML wrapping scheme
  const handleExportToWord = () => {
    const documentName = `Sozlesme_${companyTitle.replace(/[^a-zA-Z0-9]/g, "_")}.doc`;
    
    const wordStyles = `
      v\\:* {behavior:url(#default#VML);}
      o\\:* {behavior:url(#default#VML);}
      w\\:* {behavior:url(#default#VML);}
      .shape {behavior:url(#default#VML);}
      
      @page {
        size: 21cm 29.7cm;
        margin: 2.5cm 2.5cm 2.5cm 2.5cm;
      }
      body {
        font-family: Arial, sans-serif;
        font-size: 11pt;
        line-height: 1.5;
        color: #333333;
      }
      h2 {
        text-align: center;
        font-size: 14pt;
        font-weight: bold;
        margin-bottom: 18pt;
        color: #1a1a1a;
      }
      p {
        margin-bottom: 10pt;
        text-align: justify;
      }
      .letterhead-table {
        width: 100%;
        border-bottom: 2px solid ${currentLetterhead.primaryColor};
        margin-bottom: 24pt;
        padding-bottom: 8pt;
      }
      .letterhead-title {
        font-size: 12pt;
        font-weight: bold;
        color: ${currentLetterhead.primaryColor};
      }
      .letterhead-sub {
        font-size: 8pt;
        color: #777777;
      }
      .signatures-table {
        width: 100%;
        margin-top: 40pt;
        border-collapse: collapse;
      }
      .signature-cell {
        width: 50%;
        vertical-align: top;
        border-top: 1px dashed #aaaaaa;
        padding-top: 10pt;
        padding-right: 20pt;
      }
    `;

    const htmlContent = `
      <html xmlns:v="urn:schemas-microsoft-com:vml"
            xmlns:o="urn:schemas-microsoft-com:office:office"
            xmlns:w="urn:schemas-microsoft-com:office:word"
            xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta http-equiv="Content-Type" content="text/html; charset=utf-8">
        <style>${wordStyles}</style>
      </head>
      <body>
        <!-- ANTETLİ KAĞIT HEADER TABLE -->
        <table class="letterhead-table">
          <tr>
            <td align="left">
              <span class="letterhead-title">${currentLetterhead.tagline}</span><br/>
              <span class="letterhead-sub">ANTETLİ KAĞIT SÖZLEŞME ÖRNEĞİ</span>
            </td>
            <td align="right" class="letterhead-sub" style="font-size: 8pt;">
              ${currentLetterhead.details.replace(/\|/g, "<br/>")}
            </td>
          </tr>
        </table>

        <!-- CONTRACT BODY -->
        <div class="contract-body">
          ${editedBody}
        </div>

        <!-- SIGNATURES BLOCK -->
        <table class="signatures-table">
          <tr>
            <td class="signature-cell">
              <p><strong>MÜŞTERİ (HİZMET ALAN)</strong></p>
              <p style="font-size: 9.5pt; color: #555555; font-weight: bold;">${companyTitle || '[Firma Unvanı]'}</p>
              <br/><br/><br/>
              <p>Yetkili: ${projectManager}</p>
              <p style="font-size: 8.5pt; color: #888888;">İmza / Kaşe</p>
            </td>
            <td class="signature-cell">
              <p><strong>YÜKLENİCİ (HİZMET VEREN)</strong></p>
              <p style="font-size: 9.5pt; color: #555555; font-weight: bold;">Gemba Operasyonel Mükemmellik A.Ş.</p>
              <br/><br/><br/>
              <p>Yetkili: GP (Kurucu Genel Müdür)</p>
              <p style="font-size: 8.5pt; color: #888888;">İmza / Kaşe</p>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;

    const blob = new Blob(["\ufeff" + htmlContent], {
      type: "application/msword;charset=utf-8"
    });

    const url = URL.createObjectURL(blob);
    const downloadLink = document.createElement("a");
    downloadLink.href = url;
    downloadLink.download = documentName;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
  };

  // Helper to fetch custom TTF font and add it to jsPDF for full Turkish unicode support
  const loadTurkishFont = async (doc: any) => {
    try {
      const regularUrl = "https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.1.66/fonts/Roboto/Roboto-Regular.ttf";
      const resReg = await fetch(regularUrl);
      if (!resReg.ok) throw new Error("Regular font failed to fetch");
      const bufferReg = await resReg.arrayBuffer();
      
      let binaryReg = "";
      const bytesReg = new Uint8Array(bufferReg);
      for (let i = 0; i < bytesReg.byteLength; i++) {
        binaryReg += String.fromCharCode(bytesReg[i]);
      }
      const base64Reg = btoa(binaryReg);
      doc.addFileToVFS("Roboto-Regular.ttf", base64Reg);
      doc.addFont("Roboto-Regular.ttf", "Roboto", "normal");

      try {
        const boldUrl = "https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.1.66/fonts/Roboto/Roboto-Medium.ttf";
        const resBold = await fetch(boldUrl);
        if (resBold.ok) {
          const bufferBold = await resBold.arrayBuffer();
          let binaryBold = "";
          const bytesBold = new Uint8Array(bufferBold);
          for (let i = 0; i < bytesBold.byteLength; i++) {
            binaryBold += String.fromCharCode(bytesBold[i]);
          }
          const base64Bold = btoa(binaryBold);
          doc.addFileToVFS("Roboto-Bold.ttf", base64Bold);
          doc.addFont("Roboto-Bold.ttf", "Roboto", "bold");
        }
      } catch (e) {
        console.warn("Could not load bold font, using regular: ", e);
      }
      return true;
    } catch (err) {
      console.warn("Could not load Turkish fonts from CDN: ", err);
      return false;
    }
  };

  // Client-Side PDF Export using jsPDF with proper alignments
  const handleExportToPDF = async () => {
    if (isExportingPDF) return;
    setIsExportingPDF(true);
    
    try {
      const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4"
      });

      const isPagePng = currentLetterhead.id === "page_png_letterhead";
      const hasFont = await loadTurkishFont(doc);
      const fontName = hasFont ? "Roboto" : "Helvetica";

      const blocksList = parseHtmlToBlocks(editedBody);
      const pdfPages = paginateBlocks(blocksList);
      // Sig block adds about 10 lines. If it overflows the last page, push it to a new page
      if (pdfPages[pdfPages.length - 1].reduce((sum, b) => sum + estimateLineCount(b), 0) + SIGNATURE_BLOCK_LINES > MAX_LINES_PER_PAGE) {
        pdfPages.push([]);
      }

      pdfPages.forEach((pageBlocks, pageIndex) => {
        if (pageIndex > 0) {
          doc.addPage();
        }

        // Add corporate page.png background image if available
        try {
          if (activeBgImage) {
            doc.addImage(activeBgImage, "PNG", 0, 0, 210, 297);
          }
        } catch (e) {
          console.warn("Could not add background image to PDF page: ", e);
        }

        if (!isPagePng) {
          // Add letterhead header design in vector
          // Draw top thick bar
          doc.setFillColor(currentLetterhead.primaryColor);
          doc.rect(0, 0, 210, 8, "F");

          // Company logo box
          doc.setFillColor(currentLetterhead.primaryColor);
          doc.roundedRect(15, 12, 10, 10, 2, 2, "F");
          doc.setTextColor("#ffffff");
          doc.setFont(fontName, "bold");
          doc.setFontSize(14);
          doc.text("G", 18.5, 19);

          // Dynamic brand line
          doc.setTextColor(currentLetterhead.primaryColor);
          doc.setFont(fontName, "bold");
          doc.setFontSize(10);
          doc.text(currentLetterhead.tagline.substring(0, 52), 28, 17);

          doc.setFont(fontName, "normal");
          doc.setFontSize(7.5);
          doc.setTextColor("#7f8c8d");
          doc.text("KOORDİNASYON VE SÖZLEŞME ANTETLİ KAĞIT PORTALI", 28, 21);

          // Letterhead Details right aligned
          doc.setFontSize(6.5);
          doc.setTextColor("#555555");
          const rightDetails = currentLetterhead.details.split("|");
          if (rightDetails[0]) doc.text(rightDetails[0].trim(), 195, 15, { align: "right" });
          if (rightDetails[1]) doc.text(rightDetails[1].trim(), 195, 18.5, { align: "right" });
          if (rightDetails[2]) doc.text(rightDetails[2].trim(), 195, 22, { align: "right" });

          // Thin grey spacer line
          doc.setDrawColor("#e2e8f0");
          doc.line(15, 25, 195, 25);
        }

        // Start position for the text on each page
        // Using 46mm for page.png template and 38mm for standard letterheads
        const startY = isPagePng ? 46 : 38;
        let yOffset = startY;

        pageBlocks.forEach((blockHtml) => {
          const temp = document.createElement("div");
          temp.innerHTML = blockHtml;
          const text = temp.textContent || "";
          const isHeader = temp.querySelector("h1, h2, h3, h4, h5, h6") !== null;

          if (isHeader) {
            yOffset += 4;
            doc.setFont(fontName, "bold");
            doc.setFontSize(11);
            doc.setTextColor("#1e293b");
          } else if (text.match(/^[0-9]\.\s[A-ZÇĞİÖŞÜ\s]+$/)) { // Header clauses e.g. "1. TARAFLAR"
            yOffset += 4;
            doc.setFont(fontName, "bold");
            doc.setFontSize(11);
            doc.setTextColor("#1e293b");
          } else {
            doc.setFont(fontName, "normal");
            doc.setFontSize(9);
            doc.setTextColor("#2c3e50");
          }

          // Align text neatly with 22mm margins on both sides for page.png or 20mm for standard
          const marginX = isPagePng ? 22 : 20;
          const textWidth = isPagePng ? 166 : 170;

          const splitText = doc.splitTextToSize(text, textWidth);
          splitText.forEach((line: string) => {
            doc.text(line, marginX, yOffset);
            yOffset += 4.8;
          });

          yOffset += 3.0; // paragraph spacing
        });

        const isLastPage = pageIndex === pdfPages.length - 1;

        // Draw standard signature block at the bottom area of the very last page
        if (isLastPage) {
          // Signatures must occupy custom safe area
          const sigY = 240; 
          doc.setDrawColor("#cbd5e1");
          doc.setLineDashPattern([1, 1], 0);
          // Draw columns division lines
          doc.line(15, sigY, 95, sigY);
          doc.line(115, sigY, 195, sigY);

          doc.setTextColor("#475569");
          doc.setFont(fontName, "bold");
          doc.setFontSize(8.5);
          doc.text("MÜŞTERİ (HİZMET ALAN)", 15, sigY + 5);
          doc.text("YÜKLENİCİ (HİZMET VEREN)", 115, sigY + 5);

          doc.setFont(fontName, "normal");
          doc.setFontSize(7.5);
          doc.text(companyTitle.substring(0, 45) || "[Firma Unvanı]", 15, sigY + 10);
          doc.text("Gemba Operasyonel Mükemmellik Şti.", 115, sigY + 10);

          doc.setFontSize(7);
          doc.setTextColor("#64748b");
          doc.text(`Yetkili: S. ${projectManager}`, 15, sigY + 15);
          doc.text("Temsilen: GP & Genel Koordinatör", 115, sigY + 15);

          // Draw box sign outlines
          doc.setDrawColor("#e2e8f0");
          doc.rect(15, sigY + 18, 75, 18);
          doc.rect(115, sigY + 18, 75, 18);
          
          doc.setFontSize(6.5);
          doc.text("İmza & Kaşe Alanı", 22, sigY + 28);
          doc.text("Islak / Güvenli E-İmza", 122, sigY + 28);
        }

        // Draw bottom official footer on every page
        doc.setDrawColor("#e2e8f0");
        doc.setLineDashPattern([], 0);
        doc.line(15, 278, 195, 278);

        doc.setFont(fontName, "normal");
        doc.setFontSize(6.5);
        doc.setTextColor("#94a3b8");
        doc.text(`Sayfa ${pageIndex + 1} / ${pdfPages.length}`, 15, 283);
        doc.text(`PROJE RESMİ REFERANS: GEM-CON-${new Date().getFullYear()}-${contractNo}`, 105, 283, { align: "center" });
        doc.text(`Sözleşme portalı güvenli veri transferi ile üretilmiştir. Tarih: ${contractDate.split("-").reverse().join(".")}`, 195, 283, { align: "right" });
      });

      doc.save(`Sözleşme No#${contractNo}.pdf`);
      setContractNo(prev => incrementSequenceNumber(prev));
    } catch (e) {
      console.error("Error exporting to PDF:", e);
    } finally {
      setIsExportingPDF(false);
    }
  };

  // --- HELPER WRITER TEXT ---
  const handleCopyText = () => {
    // Standard text fallback copy
    const tempDiv = document.createElement("div");
    tempDiv.innerHTML = editedBody;
    const plainText = tempDiv.textContent || tempDiv.innerText || "";
    
    let done = false;
    if (typeof navigator !== "undefined" && navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
      navigator.clipboard.writeText(plainText)
        .then(() => {
          alert("Sözleşme metni panoya kaydedildi!");
        })
        .catch(() => {
          fallbackCopyText(plainText);
        });
      done = true;
    }
    if (!done) {
      fallbackCopyText(plainText);
    }
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
      const success = document.execCommand("copy");
      document.body.removeChild(textArea);
      if (success) {
        alert("Sözleşme metni panoya kaydedildi (Klavye Taklit Modu)!");
      } else {
        alert("Kopyalama başarısız oldu. Lütfen metni seçip manuel kopyalayın.");
      }
    } catch (err) {
      alert("Kopyalama hatası.");
    }
  };

  // --- TEMPLATE PARSING & UPLOAD HANDLERS ---
  const handleTemplateFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const fileExtension = file.name.split('.').pop()?.toLowerCase();

    if (fileExtension === "docx") {
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const arrayBuffer = event.target?.result as ArrayBuffer;
          const result = await mammoth.convertToHtml({ arrayBuffer });
          const htmlContent = result.value;

          if (!htmlContent || htmlContent.trim() === "") {
            throw new Error("Sözleşme metni ayrıştırılamadı. Dosya içi metin bulunamadı.");
          }

          setCustomTemplateText(htmlContent);
          setCustomTemplateName(file.name);
          setSelectedTemplateId("uploaded_word");
          alert(`"${file.name}" Word şablonu başarıyla yüklendi, ayrıştırıldı ve seçilen şablon olarak etkinleştirildi!`);
        } catch (err: any) {
          console.error("docx error", err);
          alert(`Word okuma hatası: ${err?.message || err}`);
        } finally {
          setIsUploading(false);
          // Reset file input value so exact same file can be selected again
          e.target.value = "";
        }
      };
      reader.readAsArrayBuffer(file);
    } else if (fileExtension === "txt" || fileExtension === "html" || fileExtension === "htm") {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const text = event.target?.result as string;
          if (!text) throw new Error("Dosya boş.");
          setCustomTemplateText(text);
          setCustomTemplateName(file.name);
          setSelectedTemplateId("uploaded_word");
          alert(`"${file.name}" şablon metni başarıyla yüklendi!`);
        } catch (err: any) {
          alert(`Dosya okuma hatası: ${err?.message || err}`);
        } finally {
          setIsUploading(false);
          e.target.value = "";
        }
      };
      reader.readAsText(file);
    } else {
      alert("Yalnızca .docx, .html, veya .txt formatındaki şablon dosyaları yüklenebilir.");
      setIsUploading(false);
      e.target.value = "";
    }
  };

  // --- COMPANY AUTOCOMPLETION & QUICK CREATION HANDLERS ---
  const handleSelectCompany = (comp: any) => {
    setCompanyTitle(comp.name);
    setCompanyAddress(comp.billingAddress || `${comp.billingDistrict || ""}${(comp.billingDistrict && comp.billingCity) ? ", " : ""}${comp.billingCity || ""}`);
    setTaxOffice(comp.taxOffice || "");
    setTaxNo(comp.taxNo || "");
    setCompanyDropdownOpen(false);
  };

  const handleAddNewCompanyFromForm = () => {
    if (!companyTitle.trim()) {
      alert("Müşteriler kartına eklemek için önce Firma Unvanı girmelisiniz!");
      return;
    }

    const cleanedName = companyTitle.trim();
    // Case-insensitive search
    const exists = companies.some(c => c.name.toLowerCase() === cleanedName.toLowerCase());
    
    if (exists) {
      alert(`"${cleanedName}" unvanına sahip şirket zaten müşteri listesinde kayıtlı!`);
      return;
    }

    const newCompanyId = `comp-${Date.now()}`;
    const newCompany = {
      id: newCompanyId,
      accountOwner: "GP Admin",
      name: cleanedName,
      customerStatus: "Active Customer",
      phone: "",
      website: "",
      description: "Sözleşme formundan otomatik unvan kaydı ile oluşturuldu.",
      billingAddress: companyAddress.trim(),
      billingCity: "",
      billingDistrict: "",
      billingCountry: "Türkiye",
      billingPostalCode: "",
      taxOffice: taxOffice.trim(),
      taxNo: taxNo.trim(),
      industry: "Manufacturing",
      employeeCount: 100,
      subIndustry: "",
      shift: "3 Shifts",
      managementTeam: "",
      annualRevenue: "",
      annualRevenueCurrency: "₺" as const,
      productionType: "",
      squareMeter: "",
      digitalInfrastructure: "",
      customFields: {}
    };

    const updatedCompanies = [...companies, newCompany];
    setCompanies(updatedCompanies);
    CrmDb.saveCompanies(updatedCompanies);
    alert(`"${cleanedName}" unvanı ve girilen adres/vergi verileriyle birlikte yeni şirket kaydı başarıyla oluşturuldu!`);
  };

  return (
    <div id="contract-manager-module-wrapper" className="flex flex-col xl:flex-row gap-6 w-full text-slate-700 dark:text-slate-350 antialiased font-sans">
      
      {/* LEFT SECTION: CONTRACT VARIABLES FORM & TEMPLATE OPTIONS */}
      <div className="flex-1 max-w-xl flex flex-col space-y-5">
        
        {/* Module Header card */}
        <div className="bg-white dark:bg-[#1b1a19] p-5 rounded-lg border border-[#EDEBE9] dark:border-[#323130] shadow-sm relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-emerald-500 via-[#0078D4] to-blue-500" />
          <div className="flex items-start gap-3.5 mt-1">
            <div className="p-2.5 bg-[#0078D4]/10 rounded-lg text-[#0078D4] dark:bg-blue-950/40">
              <FileSignature className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-1.5 tracking-tight">
                Sözleşme Yöneticisi
                <span className="text-[10px] font-bold px-2 py-0.5 bg-blue-50 text-blue-650 dark:bg-blue-950/50 dark:text-blue-400 rounded-full select-none">
                  Beta v1.5
                </span>
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                Antetli kağıt şablonları üzerinden sözleşme üretimini otomatikleştirin, kelimelerle tutarları senkronize edin ve anında indirin.
              </p>
            </div>
          </div>
        </div>

        {/* Template & Letterhead Choices */}
        <div className="bg-white dark:bg-[#1b1a19] p-5 rounded-lg border border-[#EDEBE9] dark:border-[#323130] shadow-sm space-y-4">
          <div className="flex items-center gap-1.5 pb-2.5 border-b border-[#EDEBE9] dark:border-[#323130]">
            <Settings className="w-4 h-4 text-[#0078D4]" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-white">Şablon ve Tasarım Ayarları</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Template Selection */}
            <div className="space-y-1.5 font-sans">
              <label className="text-[11px] font-black uppercase text-slate-500 tracking-wider flex items-center gap-1">
                <BookOpen className="w-3.5 h-3.5 text-blue-500" />
                Sözleşme Şablon Tipi
              </label>
              <select
                value={selectedTemplateId}
                onChange={(e) => setSelectedTemplateId(e.target.value)}
                className="w-full bg-slate-50 dark:bg-[#252423] border border-[#EDEBE9] dark:border-[#323130] rounded p-2 text-xs focus:ring-1 focus:ring-[#0078D4] focus:outline-hidden font-bold"
              >
                {dynamicTemplates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Letterhead selector */}
            <div className="space-y-1.5 font-sans">
              <label className="text-[11px] font-black uppercase text-slate-500 tracking-wider flex items-center gap-1">
                <Award className="w-3.5 h-3.5 text-blue-500" />
                Antetli Kağıt Modeli
              </label>
              <select
                value={selectedLetterheadId}
                onChange={(e) => setSelectedLetterheadId(e.target.value)}
                className="w-full bg-slate-50 dark:bg-[#252423] border border-[#EDEBE9] dark:border-[#323130] rounded p-2 text-xs focus:ring-1 focus:ring-[#0078D4] focus:outline-hidden font-bold"
              >
                {LETTERHEADS.map((lh) => (
                  <option key={lh.id} value={lh.id}>
                    {lh.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Word Template File Uploader */}
            <div className="sm:col-span-2 pt-3 border-t border-[#EDEBE9] dark:border-[#323130] flex flex-col md:flex-row items-start md:items-center justify-between gap-3 font-sans">
              <div className="space-y-1">
                <span className="text-[11px] font-black uppercase text-slate-500 tracking-wider flex items-center gap-1">
                  <Upload className="w-3.5 h-3.5 text-[#0078D4]" />
                  Özel Word / Şablon Yükleme (Mevcut Sözleşme Düzeltme)
                </span>
                <p className="text-[10px] text-slate-400">
                  Dosyadaki <code>{"{{TAG}}"}</code> alanları form verileriyle otomatik değiştirilerek sözleşmeye akıtılacaktır. (.docx, .html, .txt)
                </p>
              </div>
              <div className="flex items-center gap-2 w-full md:w-auto justify-end">
                <label className="cursor-pointer bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/20 dark:hover:bg-blue-950/40 border border-blue-200 dark:border-blue-900/35 rounded px-3 py-1.5 text-xs font-bold text-[#0078D4] dark:text-blue-300 flex items-center gap-2 transition duration-150 select-none">
                  <FileText className="w-3.5 h-3.5" />
                  {isUploading ? "Ayrıştırılıyor..." : "Şablon Seç / Yükle"}
                  <input
                    type="file"
                    accept=".docx,.html,.htm,.txt"
                    className="hidden"
                    onChange={handleTemplateFileUpload}
                    disabled={isUploading}
                  />
                </label>
                {customTemplateText && (
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm("Yüklenmiş olan özel şablonu silmek ve varsayılana dönmek istiyor musunuz?")) {
                        setCustomTemplateText("");
                        setCustomTemplateName("");
                        setSelectedTemplateId("consulting_agreement");
                        CrmDb.setKv("crm_contract_custom_template", "");
                        CrmDb.setKv("crm_contract_custom_template_name", "");
                      }
                    }}
                    className="text-[10px] text-red-500 hover:text-red-700 font-bold px-2 py-1.5 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/35 rounded hover:bg-red-100 transition"
                  >
                    Sıfırla
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* INPUT VARIABLES PANEL FORM */}
        <div className="bg-white dark:bg-[#1b1a19] p-5 rounded-lg border border-[#EDEBE9] dark:border-[#323130] shadow-sm space-y-4">
          <div className="flex items-center gap-1.5 pb-2.5 border-b border-[#EDEBE9] dark:border-[#323130]">
            <Plus className="w-4 h-4 text-[#0078D4]" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-white">Sözleşme Değişkenleri Formu</span>
          </div>

          <div className="space-y-4">
            
            {/* Field 0: Sözleşme No / Sıra Numarası */}
            <div className="space-y-1.5 font-sans">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-350 flex items-center gap-1">
                  <Hash className="w-3.5 h-3.5 text-[#0078D4]" />
                  Sözleşme No / Sıra Numarası *
                </label>
                <span className="text-[10px] text-slate-400">Takip & Otomatik Artış</span>
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Örn: 1001"
                  value={contractNo}
                  onChange={(e) => setContractNo(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-[#252423] border border-[#EDEBE9] dark:border-[#323130] rounded p-2.5 text-xs focus:ring-1 focus:ring-[#0078D4] focus:outline-hidden font-mono font-bold text-[#0078D4] dark:text-blue-400"
                />
                <button
                  type="button"
                  onClick={() => {
                    setContractNo(prev => incrementSequenceNumber(prev));
                  }}
                  className="px-3 bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 border border-[#EDEBE9] dark:border-[#323130] rounded text-xs text-slate-700 dark:text-zinc-200 font-bold flex items-center gap-1 select-none cursor-pointer"
                  title="Sıra Numarasını Manuel Artır"
                >
                  Artır (+1)
                </button>
              </div>
            </div>

            {/* Field 1: Company Title (with Autocomplete from Müşteriler / Companies list) */}
            <div className="space-y-1.5 relative font-sans">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-350 flex items-center gap-1">
                  <Building className="w-3.5 h-3.5 text-[#0078D4]" />
                  Firma Unvanı (Müşteri) *
                </label>
                <span className="text-[10px] text-slate-400">{"{{COMPANY_TITLE}}"}</span>
              </div>
              
              <div className="relative">
                <input
                  type="text"
                  placeholder="Yazmaya başlayın veya listeden seçin..."
                  value={companyTitle}
                  onChange={(e) => {
                    setCompanyTitle(e.target.value);
                    setCompanyDropdownOpen(true);
                  }}
                  onFocus={() => setCompanyDropdownOpen(true)}
                  className="w-full bg-slate-50 dark:bg-[#252423] border border-[#EDEBE9] dark:border-[#323130] rounded p-2.5 pr-8 text-xs focus:ring-1 focus:ring-[#0078D4] focus:outline-hidden font-medium"
                />
                <button
                  type="button"
                  onClick={() => setCompanyDropdownOpen(!companyDropdownOpen)}
                  className="absolute right-2 top-2.5 text-slate-400 hover:text-slate-600"
                >
                  <Search className="w-4 h-4" />
                </button>
              </div>

              {/* Autocomplete Droplist */}
              {companyDropdownOpen && companyTitle.trim() && (
                <div className="absolute z-50 left-0 right-0 mt-1 bg-white dark:bg-[#1f1e1d] border border-slate-200 dark:border-zinc-800 rounded-lg shadow-xl max-h-48 overflow-y-auto divide-y divide-slate-100 dark:divide-zinc-800 font-sans">
                  {companies.filter(c => c.name.toLowerCase().includes(companyTitle.toLowerCase())).length > 0 ? (
                    companies
                      .filter(c => c.name.toLowerCase().includes(companyTitle.toLowerCase()))
                      .map((comp) => (
                        <div
                          key={comp.id}
                          onClick={() => handleSelectCompany(comp)}
                          className="p-2.5 hover:bg-slate-50 dark:hover:bg-zinc-800 text-xs cursor-pointer flex flex-col gap-1 transition"
                        >
                          <span className="font-bold text-slate-855 dark:text-zinc-100 flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-green-500"></span>
                            {comp.name}
                          </span>
                          <span className="text-[10px] text-slate-400 truncate">
                            {comp.billingAddress || "Adres bilgisi girilmemiş"}
                          </span>
                        </div>
                      ))
                  ) : (
                    <div className="p-3 text-xs text-slate-400">Eşleşen müşteri bulunamadı.</div>
                  )}
                </div>
              )}

              {/* Quick Creation Link when Company name isn't registered */}
              {(() => {
                const isExactMatched = companies.some(c => c.name.toLowerCase().trim() === companyTitle.toLowerCase().trim());
                if (!isExactMatched && companyTitle.trim()) {
                  return (
                    <div className="mt-2 p-2.5 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/35 rounded-lg text-xs font-sans">
                      <p className="text-amber-800 dark:text-amber-300 font-medium leading-relaxed">
                        ⚠️ <strong>"{companyTitle}"</strong> firması müşteri (Companies) listesinde kayıtlı değil.
                      </p>
                      <button
                        type="button"
                        onClick={handleAddNewCompanyFromForm}
                        className="mt-2 w-full bg-amber-600 hover:bg-amber-700 text-white font-bold py-1.5 px-2.5 rounded transition text-center text-[10.5px] block border border-amber-500 select-none shadow-xs"
                      >
                        ➕ Bu unvanla yeni Companies kartı oluştur
                      </button>
                    </div>
                  );
                }
                return null;
              })()}
            </div>

            {/* Field 2: Company Address */}
            <div className="space-y-1.5 font-sans">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-350">
                  Firma Tebligat Adresi *
                </label>
                <span className="text-[10px] text-slate-400">{"{{COMPANY_ADDRESS}}"}</span>
              </div>
              <textarea
                rows={2}
                placeholder="Firma tebligat ve yazışma adresini giriniz..."
                value={companyAddress}
                onChange={(e) => setCompanyAddress(e.target.value)}
                className="w-full bg-slate-50 dark:bg-[#252423] border border-[#EDEBE9] dark:border-[#323130] rounded p-2.5 text-xs focus:ring-1 focus:ring-[#0078D4] focus:outline-hidden"
              />
            </div>

            {/* Field 2.1: Tax Office (Vergi Dairesi) and Tax No (Vergi Numarası) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 font-sans">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-350">
                    Vergi Dairesi
                  </label>
                  <span className="text-[10px] text-slate-400">{"{{TAX_OFFICE}}"}</span>
                </div>
                <input
                  type="text"
                  placeholder="Vergi dairesi adını yazın..."
                  value={taxOffice}
                  onChange={(e) => setTaxOffice(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-[#252423] border border-[#EDEBE9] dark:border-[#323130] rounded p-2.5 text-xs focus:ring-1 focus:ring-[#0078D4] focus:outline-hidden"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-350">
                    Vergi Numarası
                  </label>
                  <span className="text-[10px] text-slate-400">{"{{TAX_No}}"}</span>
                </div>
                <input
                  type="text"
                  maxLength={10}
                  placeholder="10 haneli VKN girin..."
                  value={taxNo}
                  onChange={(e) => setTaxNo(e.target.value.replace(/\D/g, ""))}
                  className="w-full bg-slate-50 dark:bg-[#252423] border border-[#EDEBE9] dark:border-[#323130] rounded p-2.5 text-xs focus:ring-1 focus:ring-[#0078D4] focus:outline-hidden"
                />
              </div>
            </div>

            {/* Field 3: Subject of Contract */}
            <div className="space-y-1.5 font-sans">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-350">
                  Sözleşme Konusu / Kapsamı *
                </label>
                <span className="text-[10px] text-slate-400">{"{{SUBJECT}}"}</span>
              </div>
              <input
                type="text"
                placeholder="Sözleşme kapsamını veya projenin konusunu özetleyin..."
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full bg-slate-50 dark:bg-[#252423] border border-[#EDEBE9] dark:border-[#323130] rounded p-2.5 text-xs focus:ring-1 focus:ring-[#0078D4] focus:outline-hidden"
              />
            </div>

            {/* Field 4: Contract Date and Expiration Duration */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 font-sans">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-350 flex items-center gap-1">
                    <CalendarIcon className="w-3.5 h-3.5 text-slate-400" />
                    Sözleşme Tarihi *
                  </label>
                  <span className="text-[10px] text-slate-400">{"{{DATE}}"}</span>
                </div>
                <input
                  type="date"
                  value={contractDate}
                  onChange={(e) => setContractDate(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-[#252423] border border-[#EDEBE9] dark:border-[#323130] rounded p-2.5 text-xs focus:ring-1 focus:ring-[#0078D4] focus:outline-hidden"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-350">
                    Geçerlilik Süresi (Ay sayısı seçin/yazın)
                  </label>
                  <span className="text-[10px] text-slate-400">{"{{EXP_DATE}}"}</span>
                </div>
                <div className="flex gap-1.5">
                  <input
                    type="number"
                    min={1}
                    max={120}
                    placeholder="Ay..."
                    value={validityMonths}
                    onChange={(e) => setValidityMonths(Math.max(1, parseInt(e.target.value) || 0))}
                    className="w-20 bg-slate-50 dark:bg-[#252423] border border-[#EDEBE9] dark:border-[#323130] rounded p-2.5 text-xs text-center focus:ring-1 focus:ring-[#0078D4] focus:outline-hidden font-bold"
                  />
                  <select
                    value={validityMonths}
                    onChange={(e) => setValidityMonths(parseInt(e.target.value))}
                    className="flex-1 bg-slate-50 dark:bg-[#252423] border border-[#EDEBE9] dark:border-[#323130] rounded p-2.5 text-xs focus:ring-1 focus:ring-[#0078D4] focus:outline-hidden font-bold"
                  >
                    <option value={1}>1 Ay</option>
                    <option value={3}>3 Ay</option>
                    <option value={6}>6 Ay</option>
                    <option value={12}>12 Ay (1 Yıl)</option>
                    <option value={24}>24 Ay (2 Yıl)</option>
                    <option value={36}>36 Ay (3 Yıl)</option>
                    <option value={48}>48 Ay (4 Yıl)</option>
                  </select>
                </div>
                {contractDate && (
                  <p className="text-[10px] text-[#0078D4] font-medium tracking-tight">
                    Süre Sonu: {calculateExpirationDate(contractDate, validityMonths)}
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 font-sans">
              {/* Field 5: Project Manager */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-350 flex items-center gap-1">
                    <UserCheck className="w-3.5 h-3.5 text-slate-400" />
                    Proje Yöneticisi *
                  </label>
                  <span className="text-[10px] text-slate-400">{"{{PROJECT_MANAGER}}"}</span>
                </div>
                <div className="space-y-2">
                  <select
                    value={PROJECT_MANAGERS.some(pm => pm.name === projectManager) ? projectManager : "custom"}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val !== "custom") {
                        const pm = PROJECT_MANAGERS.find(p => p.name === val);
                        if (pm) {
                          setProjectManager(pm.name);
                          setProjectManagerTC(pm.tc);
                        }
                      }
                    }}
                    className="w-full bg-slate-50 dark:bg-[#252423] border border-[#EDEBE9] dark:border-[#323130] rounded p-2.5 text-xs focus:ring-1 focus:ring-[#0078D4] focus:outline-hidden font-bold cursor-pointer text-slate-800 dark:text-zinc-200"
                  >
                    <option value="custom">-- Seçin veya Özel Girin --</option>
                    {PROJECT_MANAGERS.map(pm => (
                      <option key={pm.name} value={pm.name}>{pm.name}</option>
                    ))}
                  </select>
                  <input
                    type="text"
                    placeholder="Müşteri onay yetkilisi adı..."
                    value={projectManager}
                    onChange={(e) => setProjectManager(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-[#252423] border border-[#EDEBE9] dark:border-[#323130] rounded p-2.5 text-xs focus:ring-1 focus:ring-[#0078D4] focus:outline-hidden font-medium text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              {/* Field 6: Project Manager National ID / TC No */}
              <div className="space-y-1.5 flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-350 flex items-center gap-1">
                    <Building className="w-3.5 h-3.5 text-slate-400" />
                    Proje Yöneticisi T.C. No *
                  </label>
                  <span className="text-[10px] text-slate-400">{"{{TC_NO}}"}</span>
                </div>
                <div className="mt-auto">
                  <input
                    type="text"
                    maxLength={11}
                    placeholder="11 haneli T.C. Kimlik..."
                    value={projectManagerTC}
                    onChange={(e) => setProjectManagerTC(e.target.value.replace(/\D/g, ""))}
                    className="w-full bg-slate-50 dark:bg-[#252423] border border-[#EDEBE9] dark:border-[#323130] rounded p-2.5 text-xs focus:ring-1 focus:ring-[#0078D4] focus:outline-hidden font-medium text-slate-900 dark:text-white font-mono"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Field 7: Contract Value */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-350 flex items-center gap-1">
                    <Tag className="w-3.5 h-3.5 text-slate-400" />
                    Sözleşme Bedeli (TL) *
                  </label>
                </div>
                <div className="relative">
                  <input
                    type="number"
                    placeholder="Bedeli sayısal giriniz..."
                    value={contractValue || ""}
                    onChange={(e) => setContractValue(Math.max(0, parseFloat(e.target.value) || 0))}
                    className="w-full bg-slate-50 dark:bg-[#252423] border border-[#EDEBE9] dark:border-[#323130] rounded p-2.5 pr-12 text-xs focus:ring-1 focus:ring-[#0078D4] focus:outline-hidden font-bold text-slate-900 dark:text-white"
                  />
                  <span className="absolute right-3.5 top-2.5 text-xs font-bold text-slate-400 select-none">TL</span>
                </div>
              </div>
            </div>

            {/* DEDICATED SYNCHRONIZED HELPER TEXT BOX (Word conversion display) */}
            <div className="p-3 bg-blue-50/50 dark:bg-blue-950/20 rounded-lg border border-blue-100 dark:border-blue-900/30">
              <div className="flex items-center gap-1.5 text-[10px] font-black uppercase text-blue-600 dark:text-blue-400">
                <SpellCheck className="w-3.5 h-3.5" />
                Sözleşme Bedeli Yazı Okunuşu (Senkronize)
              </div>
              <div className="mt-1 text-xs font-bold text-blue-800 dark:text-blue-300 italic">
                {contractValueWords ? contractValueWords : "Lütfen sıfırdan büyük bir bedel giriniz..."}
              </div>
              <p className="text-[9px] text-slate-400 mt-1">
                Girdiğiniz sayısal bedel otomatik olarak hukuki şartnamelere uygun "Yalnız ... Adır." formatında Türkçe kelimelere çevrilir.
              </p>
            </div>

          </div>
        </div>

        {/* Reset variables state tool button */}
        <button
          type="button"
          onClick={() => {
            if (confirm("Girdiğiniz tüm alanları fabrika ayarlarına sıfırlamak istiyor musunuz?")) {
              setCompanyTitle("Acme Endüstriyel Çözümler San. ve Tic. Ltd. Şti.");
              setCompanyAddress("Hadımköy Organize Sanayi Bölgesi, 3. Cadde No:14, Arnavutköy/İstanbul");
              setSubject("Yalın Üretim Hattı Kurulumu ve Operasyonel İsraf Analizi projesi");
              setContractDate(new Date().toISOString().split('T')[0]);
              setProjectManager("Ahmet Yılmaz");
              setProjectManagerTC("12345678901");
              setContractValue(250000);
            }
          }}
          className="w-full py-2 bg-slate-100 dark:bg-[#252423] text-slate-500 hover:text-[#0078D4] border border-[#EDEBE9] dark:border-[#323130] rounded text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
        >
          <RotateCcw className="w-4 h-4" />
          Tüm Alanları Varsayılana Sıfırla
        </button>

      </div>

      {/* RIGHT SECTION: DYNAMIC A4 PAPER PREVIEW & EDITING */}
      <div className={`flex-1 flex flex-col space-y-4 ${isFullscreen ? "fixed inset-0 bg-[#0c0d0e]/95 z-50 p-6 overflow-y-auto" : ""}`}>
        
        {/* ACTION BUTTON PANEL (Exports & Toggles) */}
        <div className="bg-white dark:bg-[#1b1a19] p-4 rounded-lg border border-[#EDEBE9] dark:border-[#323130] shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="text-xs font-bold text-slate-800 dark:text-white">Akıllı Önizleme Alanı</span>
          </div>

          {/* Core actions Group */}
          <div className="flex items-center flex-wrap gap-2">
            
            {/* IN PLACE EDIT TOGGLE */}
            <button
              type="button"
              onClick={handleSaveAndLock}
              className={`px-3 py-1.5 rounded text-xs font-bold flex items-center gap-1.5 transition-all outline-hidden cursor-pointer ${
                isEditMode
                  ? "bg-amber-500 hover:bg-amber-650 text-white"
                  : "bg-slate-100 hover:bg-slate-200 dark:bg-[#252423] dark:hover:bg-[#323130] text-slate-700 dark:text-slate-200 border border-[#EDEBE9] dark:border-[#323130]"
              }`}
              title={isEditMode ? "Önizleme Moduna Dön" : "Şablonu Elle Düzenle (WYSIWYG Edit)"}
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>{isEditMode ? "Kayıt / Kilitle" : "Metni Elle Düzenle"}</span>
            </button>

            {/* EXPAND MODAL TOGGLE */}
            <button
              type="button"
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="bg-slate-100 hover:bg-slate-200 dark:bg-[#252423] dark:hover:bg-[#323130] text-slate-700 dark:text-slate-200 border border-[#EDEBE9] dark:border-[#323130] p-1.5 rounded text-xs cursor-pointer flex items-center justify-center"
              title={isFullscreen ? "Tam Ekrandan Çık" : "Dikkat Dağıtmayan Tam Ekran Yazım Odası"}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>

            {/* EXPORTS BUTTONS */}
            <div className="h-4 w-px bg-slate-200 dark:bg-zinc-800 mx-1 hidden sm:block" />

            {/* WORD EXPORTER */}
            <button
              type="button"
              onClick={handleExportToWord}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:opacity-90 text-white px-3 py-1.5 rounded text-xs font-bold flex items-center gap-1.5 shadow-xs transition-opacity cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Word .doc</span>
            </button>

            {/* PDF EXPORTER */}
            <button
              type="button"
              onClick={handleExportToPDF}
              disabled={isExportingPDF}
              className={`bg-gradient-to-r from-rose-600 to-red-600 hover:opacity-90 text-white px-3 py-1.5 rounded text-xs font-bold flex items-center gap-1.5 shadow-xs transition-opacity cursor-pointer ${
                isExportingPDF ? "opacity-50 cursor-not-allowed" : ""
              }`}
            >
              <FileCheck className="w-3.5 h-3.5" />
              <span>{isExportingPDF ? "İndiriliyor..." : "PDF .pdf"}</span>
            </button>

            {/* HIGH FIDELITY PRINT EXPORTER */}
            <button
              type="button"
              onClick={handlePrintDocument}
              className="bg-slate-800 hover:bg-slate-900 dark:bg-zinc-700 dark:hover:bg-zinc-650 text-white px-3 py-1.5 rounded text-xs font-bold flex items-center gap-1.5 cursor-pointer"
            >
              <span>Yazdır / PDF Kaydet</span>
            </button>

          </div>
        </div>

        {/* DISTRACTION FOCUS TITLE IN FULLSCREEN */}
        {isFullscreen && (
          <div className="flex items-center justify-between no-print max-w-[210mm] mx-auto w-full text-slate-300 mb-2">
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-[#0078D4]" />
              <span className="text-sm font-bold tracking-wide">DIKKAT DAĞITMAYAN YAZMA ODASI (Çıkmak için ESC tuşuna basın veya sağdaki simgeye tıklayın)</span>
            </div>
            <button
              onClick={() => setIsFullscreen(false)}
              className="p-1 px-3 bg-red-650 hover:bg-red-700 text-white font-bold rounded text-xs"
            >
              Odadan Çık
            </button>
          </div>
        )}

        {/* THE PHYSICAL A4 PAPER SIMULATION AREA */}
        <div ref={paperRef} className="w-full flex flex-col gap-8 pb-12">
          {isEditMode ? (
            /* CONVENIENT SINGLE-SCREEN PAGE VIEW FOR EDITING TEXT AREA */
            <div 
              className={`bg-white text-slate-800 shadow-2xl rounded-sm mx-auto transition-all border border-slate-200 w-full max-w-[210mm] min-h-[297mm] flex flex-col ${
                isFullscreen ? "scale-100" : "scale-[0.99] origin-top"
              }`}
              style={{ 
                fontFamily: "Arial, sans-serif",
                backgroundImage: `url('${activeBgImage}')`,
                backgroundSize: "100% 100%",
                backgroundRepeat: "no-repeat",
                backgroundColor: "#ffffff",
                padding: selectedLetterheadId === "page_png_letterhead" ? "46mm 22mm 35mm 22mm" : "38mm 20mm 30mm 20mm"
              }}
            >
              {selectedLetterheadId !== "page_png_letterhead" && (
                <div 
                  className="flex items-center justify-between pb-4 mb-8 select-none"
                  style={{ 
                    borderBottom: `2.5px solid ${currentLetterhead.primaryColor}`,
                    fontFamily: "Arial, sans-serif" 
                  }}
                >
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-10 h-10 rounded-sm flex items-center justify-center font-black text-xl text-white shadow-xs"
                      style={{ backgroundColor: currentLetterhead.primaryColor }}
                    >
                      G
                    </div>
                    <div className="text-left">
                      <div 
                        className="font-black text-[13px] uppercase tracking-wider"
                        style={{ color: currentLetterhead.primaryColor }}
                      >
                        {currentLetterhead.tagline}
                      </div>
                      <div className="text-[8px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">
                        RESMİ DEGELE ANTETLİ KAĞIT DÜZENLEME MODU
                      </div>
                    </div>
                  </div>

                  <div className="text-right text-[8px] leading-relaxed text-slate-500 max-w-xs font-medium">
                    {currentLetterhead.details.split("|").map((line, idx) => (
                      <div key={idx}>{line.trim()}</div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex-1 relative flex flex-col">
                <div className="p-2 mb-3 bg-amber-50 rounded border border-amber-100 text-[11px] text-amber-800 font-bold flex flex-wrap items-center justify-between gap-2 select-none font-sans no-print">
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                    <span>Metin Düzenleme Aktif: Şartları ve maddeleri doğrudan güncelleyebilirsiniz. Değişken şablonları güncellenerek çıktılara yansır.</span>
                  </div>
                  <div className="flex items-center gap-3 text-[10px]">
                    {autoSaveStatus === "saving" && (
                      <span className="text-slate-500 animate-pulse flex items-center gap-1">
                        <span className="inline-block animate-spin">⏳</span> Otomatik kaydediliyor...
                      </span>
                    )}
                    {autoSaveStatus === "saved" && (
                      <span className="text-emerald-600 font-semibold">✓ Otomatik kaydedildi</span>
                    )}
                    {hasUnsavedChanges && autoSaveStatus === "idle" && (
                      <span className="text-amber-600">⚠️ Kaydedilmemiş değişiklikler var</span>
                    )}
                    {!hasUnsavedChanges && autoSaveStatus === "idle" && (
                      <span className="text-slate-400">✓ Kaydedildi</span>
                    )}
                    
                    <button
                      type="button"
                      onClick={handleResetToTemplate}
                      className="px-2 py-0.5 bg-rose-100 text-rose-700 hover:bg-rose-200 rounded text-[9px] font-bold uppercase transition-colors cursor-pointer"
                      title="Tüm manuel değişiklikleri temizler ve şablona geri döner"
                    >
                      Şablona Geri Dön (Sıfırla)
                    </button>
                  </div>
                </div>
                
                <WysiwygEditor value={editedBody} onChange={setEditedBody} />
              </div>

              {/* SIGNATURES BLOCK */}
              <div 
                className="grid grid-cols-2 gap-10 mt-12 pt-6 select-none"
                style={{ 
                  borderTop: "1.5px dashed #cbd5e1",
                  fontFamily: "Arial, sans-serif"
                }}
              >
                <div>
                  <span className="block text-[10px] uppercase font-black tracking-wider text-slate-400">
                    MÜŞTERİ (HİZMET ALAN)
                  </span>
                  <span className="block font-extrabold text-[11px] text-slate-900 mt-1 line-clamp-1">
                    {companyTitle || "[Firma Unvanı]"}
                  </span>
                  <span className="block text-[10px] text-slate-500 mt-2">
                    Yetkili: {projectManager}
                  </span>
                  <div className="mt-4 border-b border-dashed border-slate-200 h-10 flex items-center justify-center text-[9px] text-slate-400 italic">
                    İmza Alanı
                  </div>
                </div>

                <div>
                  <span className="block text-[10px] uppercase font-black tracking-wider text-slate-400">
                    YÜKLENİCİ (HİZMET VEREN)
                  </span>
                  <span className="block font-extrabold text-[11px] text-slate-900 mt-1">
                    Gemba Operasyonel Mükemmellik Danışmanlık A.Ş.
                  </span>
                  <span className="block text-[10px] text-slate-500 mt-2">
                    Temsilen: Genel Müdür & Operasyon Koordinatörü
                  </span>
                  <div className="mt-4 border-b border-dashed border-slate-200 h-10 flex items-center justify-center text-[9px] text-[#0078D4] italic font-bold">
                    Gemba Dijital Güvenli İmza
                  </div>
                </div>
              </div>

              {/* PHYSICAL FOOTER STRIP */}
              <div 
                className="text-[8px] text-[#94a3b8] border-t border-[#e2e8f0] pt-2 mt-12 flex justify-between select-none"
                style={{ fontFamily: "Arial, sans-serif" }}
              >
                <span>Editör Modu</span>
                <span>PROJE RESMİ REFERANS: GEM-CON-{new Date().getFullYear()}-{contractNo}</span>
                <span>Hassas Belge Düzenleme</span>
              </div>
            </div>
          ) : (
            /* DYNAMICALLY SEGMENTED AND STYLED MULTI-PAGE SPREADS */
            (() => {
              const blocksList = parseHtmlToBlocks(editedBody);
              const previewPages = paginateBlocks(blocksList);
              // Sig block adds about 10 lines. If it overflows the last page, push it to a new page
              if (previewPages[previewPages.length - 1].reduce((sum, b) => sum + estimateLineCount(b), 0) + SIGNATURE_BLOCK_LINES > MAX_LINES_PER_PAGE) {
                previewPages.push([]);
              }

              return (
                <>
                  <style>{`
                    .contract-content-body p {
                      margin-bottom: 12px !important;
                      line-height: 1.6 !important;
                      font-size: 9pt !important;
                      text-align: justify !important;
                      font-family: Arial, sans-serif !important;
                    }
                    .contract-content-body h1,
                    .contract-content-body h2,
                    .contract-content-body h3,
                    .contract-content-body h4,
                    .contract-content-body h5,
                    .contract-content-body h6 {
                      text-align: center !important;
                      font-size: 11pt !important;
                      font-weight: bold !important;
                      margin-top: 18px !important;
                      margin-bottom: 12px !important;
                      color: #1e293b !important;
                      text-transform: uppercase !important;
                      font-family: Arial, sans-serif !important;
                    }
                    .contract-content-body strong {
                      font-weight: bold !important;
                    }
                  `}</style>
                  {previewPages.map((pageBlocks, pageIndex) => {
                const isLastPage = pageIndex === previewPages.length - 1;
                return (
                  <div 
                    key={pageIndex}
                    className={`bg-white text-slate-800 shadow-xl rounded-sm mx-auto transition-all border border-slate-200 w-full max-w-[210mm] h-[297mm] min-h-[297mm] flex flex-col ${
                      isFullscreen ? "scale-100" : "scale-[0.99] origin-top"
                    }`}
                    style={{ 
                      fontFamily: "Arial, sans-serif",
                      backgroundImage: `url('${activeBgImage}')`,
                      backgroundSize: "100% 100%",
                      backgroundRepeat: "no-repeat",
                      backgroundColor: "#ffffff",
                      padding: selectedLetterheadId === "page_png_letterhead" ? "46mm 22mm 35mm 22mm" : "38mm 20mm 30mm 20mm"
                    }}
                  >
                    {/* HEADER LETTERHEAD WRAPPER */}
                    {selectedLetterheadId !== "page_png_letterhead" && (
                      <div 
                        className="flex items-center justify-between pb-3 mb-6 select-none"
                        style={{ 
                          borderBottom: `2px solid ${currentLetterhead.primaryColor}`,
                          fontFamily: "Arial, sans-serif" 
                        }}
                      >
                        <div className="flex items-center gap-3">
                          <div 
                            className="w-8 h-8 rounded-sm flex items-center justify-center font-black text-lg text-white"
                            style={{ backgroundColor: currentLetterhead.primaryColor }}
                          >
                            G
                          </div>
                          <div className="text-left">
                            <div 
                              className="font-black text-[12px] uppercase tracking-wider"
                              style={{ color: currentLetterhead.primaryColor }}
                            >
                              {currentLetterhead.tagline}
                            </div>
                            <div className="text-[7.5px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">
                              RESMİ DEGELE ANTETLİ KAĞIT SÜRECİ
                            </div>
                          </div>
                        </div>

                        <div className="text-right text-[7.5px] leading-relaxed text-slate-500 max-w-xs font-medium">
                          {currentLetterhead.details.split("|").map((line, idx) => (
                            <div key={idx}>{line.trim()}</div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* CONTENT BODY */}
                    <div className="flex-1 relative flex flex-col overflow-hidden">
                      <div 
                        className="contract-content-body text-justify flex-1 font-sans text-slate-800 selection:bg-blue-100"
                        style={{ 
                          fontFamily: "Arial, sans-serif",
                          fontSize: "9pt",
                          lineHeight: "1.6"
                        }}
                        dangerouslySetInnerHTML={{ __html: pageBlocks.join("\n") }}
                      />

                      {/* SIGNATURES BLOCK ON THE VERY LAST PAGE */}
                      {isLastPage && (
                        <div 
                          className="grid grid-cols-2 gap-10 mt-auto pt-4 select-none animate-fade-in"
                          style={{ 
                            borderTop: "1.5px dashed #cbd5e1",
                            fontFamily: "Arial, sans-serif"
                          }}
                        >
                          <div>
                            <span className="block text-[9px] uppercase font-black tracking-wider text-slate-400">
                              MÜŞTERİ (HİZMET ALAN)
                            </span>
                            <span className="block font-extrabold text-[10.5px] text-slate-900 mt-0.5 line-clamp-1">
                              {companyTitle || "[Firma Unvanı]"}
                            </span>
                            <span className="block text-[9px] text-slate-500 mt-1">
                              Yetkili: {projectManager}
                            </span>
                            <div className="mt-3 border-b border-dashed border-slate-200 h-8 flex items-center justify-center text-[9px] text-slate-400 italic">
                              İmza / Kaşe Alanı
                            </div>
                          </div>

                          <div>
                            <span className="block text-[9px] uppercase font-black tracking-wider text-slate-400">
                              YÜKLENİCİ (HİZMET VEREN)
                            </span>
                            <span className="block font-extrabold text-[10.5px] text-slate-900 mt-0.5">
                              Gemba Operasyonel Mükemmellik S.A.
                            </span>
                            <span className="block text-[9px] text-slate-500 mt-1">
                              Yetkili: GP Genel Koordinatör
                            </span>
                            <div className="mt-3 border-b border-dashed border-slate-200 h-8 flex items-center justify-center text-[9px] text-[#0078D4] italic font-bold">
                              Gemba Güvenli E-İmza
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* PHYSICAL FOOTER STRIP */}
                    <div 
                      className="text-[8px] text-[#94a3b8] border-t border-[#e2e8f0] pt-2 mt-4 flex justify-between select-none"
                      style={{ fontFamily: "Arial, sans-serif" }}
                    >
                      <span>Sayfa {pageIndex + 1} / {previewPages.length}</span>
                      <span>PROJE RESMİ REFERANS: GEM-CON-{new Date().getFullYear()}-{contractNo}</span>
                      <span>İşbu akit fiziki çıktı alındığında tam hukuki koruma sağlar.</span>
                    </div>
                  </div>
                );
              })}
                </>
              );
            })()
          )}
        </div>

      </div>

    </div>
  );
}
