import React, { createContext, useContext, useState, useEffect } from "react";
import { uiDictionaryEN, uiDictionaryTR } from "./uiDictionaryExtensions";

export type Language = "TR" | "EN";

interface LanguageContextProps {
  lang: Language;
  setLang: (lang: Language) => void;
  t: (text: string) => string;
}

const LanguageContext = createContext<LanguageContextProps | undefined>(undefined);

// Comprehensive dictionary for translating Turkish UI to English and English UI to Turkish
const dictionary: Record<Language, Record<string, string>> = {
  TR: {
    // Left Sidebar & Navigation
    "Activity Report": "Faaliyet Raporu",
    "Sales Analytics Dashboard": "Satış Analitik Paneli",
    "Revenue & Cap. Coaching": "Gelir ve Kapasite Koçluğu",
    "Revenue Management": "Gelir Yönetimi",
    "Lead Profiles": "Aday Profilleri",
    "Lead Mail Generator": "Aday E-posta Üretici",
    "AI Sales Assistant": "Yapay Zeka Satış Asistanı",
    "Companies & Targets": "Şirketler ve Hedefler",
    "Customers": "Müşteriler",
    "Company Search": "Şirket Arama",
    "Sales Dashboard": "Satış Paneli",
    "Company Intelligence": "Şirket İstihbaratı",
    "Companies Registry": "Şirket Kayıt Defteri",
    "Target Accounts": "Hedef Hesaplar",
    "Lead Discovery": "Aday Müşteri Keşfi",
    "Signature Profile Discovery": "İmza Profili Keşfi",
    "LinkedIn Profiles": "LinkedIn Profilleri",
    "Gemini Sales Coach": "Gemini Satış Koçu",
    "Campaign": "Kampanya",
    "Campaign Manager": "Kampanya Yöneticisi",
    "Campaign Dashboard": "Kampanya Gösterge Paneli",
    "Mail Merge Builder": "Akıllı E-posta Birleştirici",
    "Merge Sending Queue": "Gönderim Kuyruğu",
    "Audit Logs History": "Denetim Günlükleri",
    "Tasks": "Görevler",
    "Contract Manager": "Sözleşme Yöneticisi",
    "Services": "Hizmet Kataloğu",
    "Deal Management": "Fırsat ve Süreç Yönetimi",
    "Proposal Management": "Teklif Yönetimi",
    "Create Proposal": "Teklif Oluştur",
    "Settings": "Ayarlar",
    "General Settings": "Genel Ayarlar",
    "Switch Themes": "Temayı Değiştir",
    "Dark mode toggle": "Gece Modu",
    "Outlook / Exchange Suite": "Outlook / Exchange Paketi",
    "Yönetim Portalı & Sistem Entegrasyonları": "Yönetim Portalı & Sistem Entegrasyonları",
    "Organizasyon yapısını, yetkileri, mail şablonlarını ve Microsoft 365 bağlantı durumunu yapılandırın": "Organizasyon yapısını, yetkileri, mail şablonlarını ve Microsoft 365 bağlantı durumunu yapılandırın",
    "Kapat": "Kapat",
    "Ayarları Kaydet ve Kapat": "Ayarları Kaydet ve Kapat",
    "Administration Center": "Yönetim Merkezi",
    "System Connections": "Sistem Bağlantıları",
    "Temizle": "Temizle",

    // Top Bar
    "Gemba Partner Operating System": "Gemba Partner İşletim Sistemi",
    "ADMIN": "ADMIN",
    "USER": "KULLANICI",
    "İstanbul, TR": "İstanbul, TR",

    // Generic words
    "Kaydet": "Kaydet",
    "İptal": "İptal",
    "Düzenle": "Düzenle",
    "Sil": "Sil",
    "Ekle": "Ekle",
    "Yükleniyor...": "Yükleniyor...",
    "Başarılı": "Başarılı",
    "Hata": "Hata",
    "Aktif": "Aktif",
    "Pasif": "Pasif",
    "Arama yapın...": "Arama yapın...",
    "Filtrele": "Filtrele",
    "Overview": "Genel Özet",
    "Initial Contact": "İlk Temas",
    "Discovery Meeting": "Keşif Toplantısı",
    "Site Visit": "Saha Ziyareti",
    "Evaluation": "Değerlendiriliyor",
    "Proposal Submitted": "Teklif Sunuldu",
    "Won": "Kazanıldı",
    "Lost": "Kaybedildi",
    "Proposal": "Teklif",
    "Contract": "Sözleşme",
    "Waiting": "Bekleniyor",
    "Attachments": "Dosya Ekle",
    "Notes": "Notlar",
    
    // Connection Status
    "M365 Exchange Online Connection": "M365 Exchange Online Bağlantısı",
    "Secure connection for individual Microsoft Graph operations": "Bireysel Microsoft Graph işlemleri için güvenli bağlantı",
    "Demo Sandbox Active": "Demo Sandbox Aktif",
    "Outlook Connected": "Outlook Bağlandı",
    "Disconnect Mailbox": "E-posta Kutusunun Bağlantısını Kes",
    "Connect M365 Exchange": "M365 Exchange Bağlan",
    "Connect via Access Token (Zero Setup)": "Erişim Jetonu ile Bağlan (Sıfır Kurulum)",
    "Enable Sandbox Mode": "Sandbox Modunu Etkinleştir",
    "Requires Azure configuration in Secrets": "Secrets panelinde Azure yapılandırması gerektirir",
    "Connect with official tenant App Registration flow": "Resmi tenant Uygulama Kayıt akışı ile bağlan",
    "Connect directly using a Microsoft Graph Explorer developer token": "Doğrudan bir Microsoft Graph Explorer geliştirici tokenı kullanarak bağlan",
    "Direct Microsoft Graph Token Connection": "Doğrudan Microsoft Graph Token Bağlantısı",
    "Close Panel": "Paneli Kapat",
    
    // Settings Tab & Connections
    "1. Tavily Arama Motoru API Anahtarı (Search Grounding Engine)": "1. Tavily Arama Motoru API Anahtarı (Search Grounding Engine)",
    "Used for the 'Deep Research with Tavily' button in the AI Sales Assistant module. Conducts live cyber intelligence and web searches to prepare enriched company analysis kits in seconds.": "AI Sales Assistant modülünde \"Tavily ile Derin Araştırma Yap (Deep Search)\" butonu için kullanılır. Canlı siber istihbarat ve internet taraması yaparak saniyeler içinde zenginleştirilmiş şirket analiz kiti hazırlar.",
    "Enter your Tavily API key starting with tvly-...": "tvly-... şeklinde başlayan Tavily API anahtarınızı girin",
    "Clear": "Temizle",
    "Currently, your key is stored in local browser memory as {status}.": "Şu anda anahtarınız {status} olarak yerel tarayıcı hafızasında saklanmaktadır.",
    "Saved: {prefix}...*****": "Kaydedildi: {prefix}...*****",
    "Empty (Enters simulation mode)": "Boş (Simülasyon moduna geçilir)",
    "2. Microsoft 365 Exchange Online Bağlantısı (Outlook Mailbox)": "2. Microsoft 365 Exchange Online Bağlantısı (Outlook Mailbox)",
    "Log in or paste an Access Token so your B2B campaigns and smart emails are saved to drafts on your own Microsoft 365 Outlook address.": "B2B kampanyalarınızın ve akıllı maillerinizin kendi Microsoft 365 Outlook adresiniz üzerinden taslaklara kaydedilmesi için oturum açın ya da Access Token yapıştırın.",
    "Active Permissions & API Infrastructure (Google AI Studio Build)": "Aktif İzinler ve API Alt Yapısı (Google AI Studio Build)",
    "This application hosts a secure server-side proxy using the Gemini 1.5 Flash model and Microsoft Graph API.": "Bu uygulama Gemini-3.5-Flash modelini ve Microsoft Graph API'yi kullanarak sunucu taraflı güvenli proxy barındırmaktadır.",

    // History & Logs
    "Campaign Audit Logs": "Kampanya Denetim Günlükleri",
    "Audit dispatch records, open-rate metrics, and historical metadata database stored locally.": "Yerel olarak depolanan gönderim kayıtlarını, açılma oranı metriklerini ve geçmiş veri tabanını denetleyin.",
    "Historical Audit List": "Geçmiş Denetim Listesi",
    "Campaign databases persisted in local storage": "Yerel depolamada saklanan kampanya veritabanları",
    "No campaigns launched yet": "Henüz başlatılan bir kampanya yok",
    "Your mail merge operations will be logged here.": "Mail birleştirme işlemleriniz burada günlüğe kaydedilecektir.",
    "Recipients:": "Alıcılar:",
    "Delivered:": "İletildi:",
    "Download PDF Archive": "PDF Arşivini İndir",
    "Delete Campaign log": "Kampanya günlüğünü sil",
    "Campaign Audit performance report": "Kampanya Denetim Performans Raporu",
    "Download Report PDF": "Rapor PDF'ini İndir",
    "Audited Batch": "Denetlenen Grup",
    "Success transfers": "Başarılı Gönderimler",
    "Fail Bounces": "Hatalı Geri Dönüşler",
    "recipients": "alıcı",
    "sends": "gönderim",
    "failed": "başarısız",
    "General details": "Genel Detaylar",
    "Subject Lines:": "Konu Satırları:",
    "Attachments:": "Ekler:",
    "None included": "Hiç eklenmemiş",
    "Open Auditing Node:": "Açık Denetim Düğümü:",
    "Pixel connected": "Piksel bağlandı",
    "No pixel tracking service activated": "Aktif piksel takip servisi bulunmuyor",
    "Total Opens Audited:": "Denetlenen Toplam Açılma:",
    "email views documented": "belgelenen e-posta görüntülemesi",
    "Recipient logs": "Alıcı Günlükleri",
    "Email address": "E-posta adresi",
    "Outcome": "Sonuç",
    "Delivered": "İletildi",
    "Failed:": "Başarısız:",
    "Select a historical campaign log to review performance statistics and audit lists.": "Performans istatistiklerini ve denetim listelerini incelemek için geçmiş bir kampanya günlüğü seçin.",

    // Contacts Tab
    "Please fill out first name and last name!": "Lütfen ad ve soyad alanlarını doldurun!",
    "Contact Updated": "İletişim Kişisi Güncellendi",
    "New Contact Added": "Yeni İletişim Kişisi Eklendi",
    "Are you sure you want to delete {name}?": "{name} kişisini silmek istediğinizden emin misiniz?",
    "Contact Deleted": "İletişim Kişisi Silindi",
    "Search contacts...": "Kişilerde ara...",
    "Add New Contact": "Yeni Kişi Ekle",
    "Edit Contact Information": "Kişi Bilgilerini Düzenle",
    "Add New Contact Reference": "Yeni İrtibat Kişisi Ekle",
    "First Name *": "Ad *",
    "Last Name *": "Soyad *",
    "Phone": "Telefon",
    "Department / Title": "Departman / Ünvan",
    "e.g. Purchase Manager, COO, General Manager": "Örn. Genel Müdür, COO, Satınalma Müdürü",
    "Customer Segment": "Müşteri Tipi",
    "No contacts registered for this company yet.": "Bu şirkete ait herhangi bir kişi kaydı bulunmamaktadır.",
    "No Title Specified": "Belirtilmemiş Ünvan",
    ...uiDictionaryTR,
  },
  EN: {
    // Sidebar
    "Activity Report": "Activity Report",
    "Sales Analytics Dashboard": "Sales Analytics Dashboard",
    "Revenue & Cap. Coaching": "Revenue & Capacity Coaching",
    "Companies & Targets": "Companies & Targets",
    "Company Intelligence": "Company Intelligence",
    "Companies Registry": "Companies Registry",
    "Target Accounts": "Target Accounts",
    "Lead Discovery": "Lead Discovery",
    "Signature Profile Discovery": "Signature Profile Discovery",
    "LinkedIn Profiles": "LinkedIn Profiles",
    "Gemini Sales Coach": "Gemini Sales Coach",
    "Campaign": "Campaign",
    "Campaign Manager": "Campaign Manager",
    "Campaign Dashboard": "Campaign Dashboard",
    "Mail Merge Builder": "Mail Merge Builder",
    "Merge Sending Queue": "Merge Sending Queue",
    "Audit Logs History": "Audit Logs History",
    "Tasks": "Tasks",
    "Contract Manager": "Contract Manager",
    "Services": "Services",
    "Deal Management": "Deal Management",
    "Proposal Management": "Proposal Management",
    "Create Proposal": "Create Proposal",
    "Settings": "Settings",
    "General Settings": "General Settings",
    "Switch Themes": "Switch Themes",
    "Dark mode toggle": "Dark Mode Toggle",
    "Outlook / Exchange Suite": "Outlook / Exchange Suite",
    "Yönetim Portalı & Sistem Entegrasyonları": "Admin Portal & System Integrations",
    "Organizasyon yapısını, yetkileri, mail şablonlarını ve Microsoft 365 bağlantı durumunu yapılandırın": "Configure organizational structure, permissions, mail templates, and Microsoft 365 connection status",
    "Kapat": "Close",
    "Ayarları Kaydet ve Kapat": "Save Settings & Close",
    "Administration Center": "Administration Center",
    "System Connections": "System Connections",
    "Temizle": "Clear",

    // Top Bar
    "Gemba Partner Operating System": "Gemba Partner Operating System",
    "ADMIN": "ADMIN",
    "USER": "USER",
    "İstanbul, TR": "Istanbul, TR",

    // Generic words
    "Kaydet": "Save",
    "İptal": "Cancel",
    "Düzenle": "Edit",
    "Sil": "Delete",
    "Ekle": "Add",
    "Yükleniyor...": "Loading...",
    "Başarılı": "Success",
    "Hata": "Error",
    "Aktif": "Active",
    "Pasif": "Passive",
    "Arama yapın...": "Search...",
    "Filtrele": "Filter",
    "Overview": "Overview",
    "Initial Contact": "Initial Contact",
    "Discovery Meeting": "Discovery Meeting",
    "Site Visit": "Site Visit",
    "Evaluation": "Evaluation",
    "Proposal Submitted": "Proposal Submitted",
    "Won": "Won",
    "Lost": "Lost",
    "Proposal": "Proposal",
    "Contract": "Contract",
    "Waiting": "Waiting",
    "Attachments": "Attachments",
    "Notes": "Notes",

    // Administration Center and User Management
    "Kullanıcı Yönetimi": "User Management",
    "Sistem Ayarları": "System Settings",
    "Sistem Entegrasyonları & API": "System Integrations & API",
    "Akıllı Mail Şablonları": "Smart Email Templates",
    "Denetim İzleri (Audit Logs)": "Audit Logs",
    "Kullanıcı Listesi ve Rol Yönetimi": "User List and Role Management",
    "Yönetici, danışman ve standart kullanıcıların yetki düzeylerini, aktiflik durumlarını buradan güncelleyin.": "Update ADMIN and USER access levels and active status from here.",
    "Yeni Kullanıcı Davet Et": "Invite New User",
    "Kullanıcı Rolü": "User Role",
    "E-Posta Adresi": "Email Address",
    "Ünvan": "Title",
    "Departman": "Department",
    "Davet Gönder": "Send Invitation",
    "Şirket Ayarları ve Çalışma Düzeni": "Company Settings & Work Schedule",
    "Gemba Partner tüzel kişilik ve operasyonel çalışma saatlerini buradan yapılandırabilirsiniz.": "Configure Gemba Partner legal entity and operational working hours here.",
    "Şirket Logosu / Marka İmzası": "Company Logo / Brand Signature",
    "Yeni Logo / İsim Yükle": "Upload New Logo / Name",
    "Resmi Şirket Unvanı": "Official Company Name",
    "Vergi Dairesi & No": "Tax Office & No",
    "Web Sitesi": "Website",
    "Telefon Numarası": "Phone Number",
    "Varsayılan Para Birimi": "Default Currency",
    "Saat Dilimi (Timezone)": "Timezone",
    "Haftalık Çalışma Günleri": "Weekly Business Days",
    "Mesai Saatleri": "Working Hours",
    "Sistem Dili (System Language)": "System Language",
    "Resmi Merkez Adresi (Address)": "Official Headquarters Address",
    "Organizasyon Bilgilerini Kaydet": "Save Organization Information",
    "Sistem Sağlığı ve Entegrasyon Matrisi": "System Health & Integration Matrix",
    "Dış API servisleri, veritabanı ve e-posta entegrasyonlarının çalışma performansını analiz edin.": "Analyze performance of external API services, database, and email integrations.",
    "Sistem Sağlığı": "System Health",
    "Doğrulandı": "Verified",
    "Test Ediliyor": "Testing",
    "Çalışıyor": "Running",
    "Bağlı": "Connected",
    "Sağlık Kontrolü Yap": "Run Health Check",
    "Üretken AI ve Prompt Mühendisliği": "Generative AI & Prompt Engineering",
    "Sistem genelinde çalışan yapay zeka modellerinin sistem yönergelerini ve prompt şablonlarını özelleştirin.": "Customize system instructions and prompt templates for system-wide AI models.",
    "Şablon Adı": "Template Name",
    "Yapay Zeka Yeteneği / Skill": "AI Capability / Skill",
    "Token Tüketimi": "Token Usage",
    "Sistem Promptu / Talimat": "System Prompt / Instruction",
    "Şablonu Kaydet": "Save Template",
    "Yapay Zeka Ajan Yetenekleri (AI Skills)": "AI Agent Skills",
    "Hassas Veri Maskeleme": "Sensitive Data Masking",
    "Aktif Et": "Activate",
    "Pasif Et": "Deactivate",
    "İmza Ayrıştırıcı (Signature Extractor)": "Signature Extractor",
    "Şirket İstihbaratı ve Web Tarama (Tavily)": "Company Intelligence & Web Scanning (Tavily)",
    "Finansal Gelir Tahmini Raporlama": "Financial Revenue Forecast Reporting",
    "Akıllı Kampanya Doğrulama": "Smart Campaign Verification",
    "Kayıtlı Güvenlik Denetimleri (Audit Logs)": "Recorded Security Audits (Audit Logs)",
    "Sistem üzerinde gerçekleşen tüm kritik işlemleri, zaman damgaları ve kullanıcı kimlikleriyle takip edin.": "Track all critical actions performed on the system with timestamps and user identities.",
    "Zaman": "Time",
    "Kullanıcı / E-posta": "User / Email",
    "İşlem / Detay": "Action / Detail",
    "Modül": "Module",
    "Sonuç": "Result",
    "Kullanıcı": "User",
    "Unvan": "Title",
    "Rol": "Role",
    "Durum": "Status",
    "İşlemler": "Actions",
    "Durdur": "Stop",
    "Etkinleştir": "Enable",
    "Sıfırla": "Reset",
    "Şifresini Sıfırla": "Reset Password",
    "Yetki Askıda": "Suspended",
    "Davet et": "Invite",
    "Ad": "First Name",
    "Soyad": "Last Name",
    "E-posta": "Email",

    // Dashboard & Stats
    "Total Campaigns": "Total Campaigns",
    "Success Rate": "Success Rate",
    "Open Rate": "Open Rate",
    "Last Campaign": "Last Campaign",
    "Sistem Aktif": "System Active",
    "Satış Koçu Analizi": "Sales Coach Analysis",
    "Teklif Teklif Taslağı": "Proposal Draft",
    "Yönetim Paneli": "Dashboard",
    "Şirket İstihbarat Portalı": "Company Intelligence Portal",
    "Fırsat Kartları": "Deal Cards",
    "Teklif Yönetim Masası": "Proposal Management Board",

    // Company Discovery View / Intelligence
    "Yeni Şirket Analizi Keşfet": "Discover New Company Analysis",
    "B2B Şirket İstihbaratı ve Derin Web Araştırması": "B2B Company Intelligence & Deep Web Search",
    "Yapay zeka ve Tavily arama motorunu kullanarak, herhangi bir şirketin dijital ayak izini, mali yapısını, son haberlerini ve organizasyon şemasını dakikalar içinde analiz edin.": "Analyze any company's digital footprint, financial structure, latest news, and organizational chart in minutes using AI and Tavily search engine.",
    "Şirket Adı veya Web Sitesi": "Company Name or Website",
    "Şirket Sektörü": "Company Industry",
    "Şirket Sektörü Seçin": "Select Company Industry",
    "Üretim / Sanayi": "Manufacturing / Industry",
    "Teknoloji / Yazılım": "Technology / Software",
    "E-Ticaret / Perakende": "E-Commerce / Retail",
    "Finans / Bankacılık": "Finance / Banking",
    "Lojistik / Dağıtım": "Logistics / Distribution",
    "Enerji / Altyapı": "Energy / Infrastructure",
    "Eğitim / Danışmanlık": "Education / Consulting",
    "Sağlık / İlaç": "Healthcare / Pharma",
    "Diğer Sektörler": "Other Industries",
    "Hedef Ülke / Bölge": "Target Country / Region",
    "Analiz Derinliği": "Analysis Depth",
    "Standart Tarama (Hızlı)": "Standard Scan (Fast)",
    "Tavily ile Derin Araştırma Yap (Deep Search)": "Deep Search with Tavily",
    "Akıllı Şirket İstihbarat Raporunu Oluştur": "Generate Smart Company Intelligence Report",
    "Tavily API anahtarı boş. Simülasyon modunda rapor üretilecektir.": "Tavily API key is empty. Report will be generated in simulation mode.",
    "Analiz Başlatılıyor...": "Starting Analysis...",
    "Yapay zeka ve Tavily entegrasyonu şirket bilgilerini derliyor...": "AI and Tavily integration is compiling company info...",
    "Analiz ediliyor: ": "Analyzing: ",
    "Şirket İstihbaratı Hazırlanıyor": "Preparing Company Intelligence",
    "Web taraması yapılıyor, makaleler okunuyor...": "Scanning the web, reading articles...",
    "Şirket finansalları ve büyüme verileri analiz ediliyor...": "Analyzing company financials and growth data...",
    "Yapay zeka raporu yapılandırıyor ve Türkçe'ye çeviriyor...": "AI is formatting the report and translating...",
    "Şirket İstihbarat Veri Havuzu": "Company Intelligence Data Hub",
    "Daha önce analiz edilmiş ve veri havuzuna kaydedilmiş B2B şirket listesi.": "List of B2B companies previously analyzed and saved to the data hub.",
    "Firma Adı": "Company Name",
    "Sektör": "Industry",
    "Ülke/Bölge": "Country/Region",
    "Son Güncelleme": "Last Update",
    "Skor": "Score",
    "Detaylar": "Details",
    "İmza Analizi": "Signature Analysis",
    "Sözleşme": "Contract",
    "Müşteri": "Customer",
    "Şirket Profili": "Company Profile",
    "Genel Bakış": "Overview",
    "Mali Analiz": "Financial Analysis",
    "Son Haberler & Gelişmeler": "Latest News & Developments",
    "Organizasyon Şeması": "Organizational Chart",
    "Yol Haritası & Gemba Tavsiyesi": "Roadmap & Gemba Advice",
    "Geri Dön": "Go Back",
    "Pazar Değeri / Gelir": "Market Value / Revenue",
    "Çalışan Sayısı": "Employee Count",
    "Yıllık Büyüme Oranı": "Annual Growth Rate",
    "Dijital Olgunluk Skoru": "Digital Maturity Score",
    "Şirket Bilgileri": "Company Info",
    "Gemba Akıllı Teklif Oluştur": "Generate Gemba Smart Proposal",

    // Revenue Management / Capacity Coaching
    "Operasyonel Mükemmellik Gelir ve Kapasite Denetimi": "Operational Excellence Revenue and Capacity Audit",
    "Bu araç, Gemba Partner danışmanlarının ve yöneticilerinin şirket içi kaynak sızıntılarını tespit etmesini, satış verimliliğini değerlendirmesini ve kritik gelir aksiyon planları oluşturmasını sağlar.": "This tool allows Gemba Partner consultants and managers to detect internal resource leaks, evaluate sales efficiency, and create critical revenue action plans.",
    "Gelir Kaçağı ve Verimsizlik Analizörü (AI Destekli)": "Revenue Leak and Inefficiency Analyzer (AI Powered)",
    "Fatura Kesilmeyen Danışmanlık Saatleri": "Unbilled Consulting Hours",
    "Fiyatlama İndirim Aşınması": "Pricing Discount Erosion",
    "Teklif Revizyon Gecikmeleri": "Proposal Revision Delays",
    "Satış Temsilcisi Performans Analizi": "Sales Representative Performance Analysis",
    "Danışman & Proje Kapasite Matrisi": "Consultant & Project Capacity Matrix",
    "Kapasite Doluluk Oranı": "Capacity Occupancy Rate",
    "Danışman": "Consultant",
    "Toplam Kapasite (Saat)": "Total Capacity (Hours)",
    "Atanan Projeler": "Assigned Projects",
    "Yapay Zeka Gelir ve Kapasite Denetimi Başlat": "Launch AI Revenue & Capacity Audit",
    "Gemba Gelir Koçluğu Raporu": "Gemba Revenue Coaching Report",
    "Yapay zeka gelir optimizasyon analizini derliyor...": "AI compiling revenue optimization analysis...",
    "Denetim raporu hazırlanıyor...": "Preparing audit report...",
    "Kapasite sızıntıları taranıyor...": "Scanning capacity leaks...",
    "Gelir Koçluğu Analizi Tamamlandı": "Revenue Coaching Analysis Completed",

    // Tasks View
    "Görev Takip Paneli": "Task Management Board",
    "Yeni Görev Ekle": "Add New Task",
    "Görev Başlığı": "Task Title",
    "Açıklama": "Description",
    "Sorumlu Kişi": "Assignee",
    "Teslim Tarihi": "Due Date",
    "Öncelik": "Priority",
    "Yüksek": "High",
    "Orta": "Medium",
    "Düşük": "Low",
    "Görev Ekle": "Add Task",
    "Notification Hub & Escalation Engine": "Notification Hub & Escalation Engine",
    "E-posta Bildirim Kuralları ve Gecikme Eskalasyon Yönetimi": "Email Notification Rules & Overdue Escalation Management",
    "Sorumlulara bitiş tarihi yaklaşan görevleri hatırlatın, geciken işleri otomatik olarak yöneticilere eskale edin ve e-posta şablonlarını yönetin.": "Remind assignees of upcoming task due dates, automatically escalate overdue work to managers, and manage email templates.",
    "E-posta Bildirim Tetikleyicileri": "Email Notification Triggers",
    "Göreve 2 gün kala hatırlatıcı gönder": "Send reminder 2 days before due",
    "Görevin son günü hatırlatıcı gönder": "Send reminder on the due day",
    "Gecikme Tespiti ve Raporlama": "Overdue Detection & Reporting",
    "Teslim tarihi geçen görevleri otomatik tespit et": "Automatically detect overdue tasks",
    "Gecikmenin 3. gününde uyarı gönder": "Send warning on 3rd day of delay",
    "Gecikmenin 7. gününde uyarı gönder": "Send warning on 7th day of delay",
    "Her 7 günde bir periyodik hatırlat": "Remind periodically every 7 days",
    "Yönetici Eskalasyon Seviyeleri (Escalation Rules)": "Manager Escalation Levels (Escalation Rules)",
    "Haftalık Görev Raporu Zamanlaması": "Weekly Task Report Schedule",
    "Her Pazartesi sabahı 09:00'da tüm departmana haftalık özet gönder": "Send weekly summary to all department every Monday at 09:00 AM",
    "Ayarları Güncelle": "Update Settings",
    "Eskalasyon Kuralları ve Bildirim Ayarları Başarıyla Güncellendi!": "Escalation Rules and Notification Settings Updated Successfully!",

    // Services Catalog
    "Hizmet ve Mühendislik Eğitim Kataloğu": "Services & Engineering Education Catalog",
    "Müşterilerinize sunduğunuz kurumsal eğitimleri, operasyonel mükemmellik programlarını ve danışmanlık paketlerini yönetin.": "Manage corporate training, operational excellence programs, and consulting packages you offer to your clients.",
    "Hizmet Kartı Görünümü": "Service Cards View",
    "Yeni Hizmet / Eğitim Ekle": "Add New Service / Course",
    "Süre (Gün)": "Duration (Days)",
    "Eğitmen Seviyesi": "Trainer Level",
    "Fiyat (EUR)": "Price (EUR)",
    "Eğitim / Hizmet Adı": "Training / Service Name",
    "Hedef Kitle": "Target Audience",
    "Açıklama / İçerik": "Description / Content",
    "Hizmet Ekle": "Add Service",
    "Hizmet Kataloğu başarıyla güncellendi!": "Service Catalog updated successfully!",

    // Deal Management
    "Fırsat Kartları ve Satış Hunisi": "Deals Board and Sales Pipeline",
    "Müşteri adayları ile yürütülen aktif satış süreçlerini, teklif aşamalarını ve finansal hacimleri kanban pano üzerinde yönetin.": "Manage active sales processes, proposal stages, and financial volume with client leads on a kanban board.",
    "Yeni Satış Fırsatı Ekle": "Add New Sales Deal",
    "Fırsat Adı / Şirket": "Deal Name / Company",
    "Aşama / Sütun": "Stage / Column",
    "Tahmini Gelir (EUR)": "Estimated Revenue (EUR)",
    "Olasılık (%)": "Probability (%)",
    "Fırsatı Kaydet": "Save Deal",
    "Fırsat Listesi Görünümü": "Deal List View",
    "Fırsat Kartı": "Deal Card",
    "Kapatılan Kazanç": "Closed Won",
    "Aktif Fırsatlar": "Active Deals",
    "Kazanma Oranı": "Win Rate",
    "Fırsat başarıyla eklendi!": "Deal added successfully!",
    ...uiDictionaryEN,
  }
};

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [lang, setLangState] = useState<Language>(() => {
    return (localStorage.getItem("system_language") as Language) || "TR";
  });

  const setLang = (newLang: Language) => {
    setLangState(newLang);
    localStorage.setItem("system_language", newLang);
    // Dispatch event to make sure any storage listener knows
    window.dispatchEvent(new Event("language-change"));
  };

  const t = (text: string): string => {
    if (!text) return "";
    const cleanText = text.trim();
    
    // 1. Exact match in the selected language's dictionary
    if (dictionary[lang] && dictionary[lang][cleanText]) {
      return dictionary[lang][cleanText];
    }
    
    // 2. Case-insensitive lookup in the current language's dictionary
    const currentKeys = Object.keys(dictionary[lang] || {});
    const caseMatchKey = currentKeys.find(k => k.toLowerCase() === cleanText.toLowerCase());
    if (caseMatchKey) {
      return dictionary[lang][caseMatchKey];
    }

    // 3. Bidirectional/Reverse Lookup:
    // If language is English (EN):
    if (lang === "EN") {
      // A) Translate Turkish values (from dictionary.TR) to English keys
      const trEntries = Object.entries(dictionary.TR);
      const foundEntry = trEntries.find(([k, v]) => v.toLowerCase() === cleanText.toLowerCase());
      if (foundEntry) {
        const key = foundEntry[0];
        return dictionary.EN[key] || key;
      }
      // B) Or if cleanText is a key in dictionary.EN, return its value
      if (dictionary.EN[cleanText]) {
        return dictionary.EN[cleanText];
      }
    }
    
    // If language is Turkish (TR):
    if (lang === "TR") {
      // A) Translate English keys (from dictionary.TR) to Turkish values
      const trKeys = Object.keys(dictionary.TR);
      const foundKey = trKeys.find(k => k.toLowerCase() === cleanText.toLowerCase());
      if (foundKey) {
        return dictionary.TR[foundKey];
      }
      // B) Or if cleanText is an English value in dictionary.EN, find the Turkish key!
      const enEntries = Object.entries(dictionary.EN);
      const foundEntry = enEntries.find(([k, v]) => v.toLowerCase() === cleanText.toLowerCase());
      if (foundEntry) {
        return foundEntry[0]; // The Turkish key
      }
    }
    
    return text;
  };

  useEffect(() => {
    const handleStorageChange = () => {
      const stored = localStorage.getItem("system_language") as Language;
      if (stored && stored !== lang) {
        setLangState(stored);
      }
    };
    window.addEventListener("language-change", handleStorageChange);
    window.addEventListener("storage", handleStorageChange);
    return () => {
      window.removeEventListener("language-change", handleStorageChange);
      window.removeEventListener("storage", handleStorageChange);
    };
  }, [lang]);

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
};
