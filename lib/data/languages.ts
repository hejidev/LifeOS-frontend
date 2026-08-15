export interface LanguageEntry {
    name: string;
    native: string;
    continent: "Africa" | "Asia" | "Europe" | "Americas";
    rtl?: boolean;
  }
  
  export const LANGUAGES: LanguageEntry[] = [
    // Africa
    { name: "Swahili", native: "Kiswahili", continent: "Africa" },
    { name: "Amharic", native: "አማርኛ", continent: "Africa" },
    { name: "Yoruba", native: "Yorùbá", continent: "Africa" },
    { name: "Igbo", native: "Asụsụ Igbo", continent: "Africa" },
    { name: "Hausa", native: "Harshen Hausa", continent: "Africa" },
    { name: "Zulu", native: "isiZulu", continent: "Africa" },
    { name: "Xhosa", native: "isiXhosa", continent: "Africa" },
    { name: "Afrikaans", native: "Afrikaans", continent: "Africa" },
    { name: "Somali", native: "Af-Soomaali", continent: "Africa" },
    { name: "Wolof", native: "Wolof", continent: "Africa" },
    // Asia
    { name: "Mandarin Chinese", native: "中文", continent: "Asia" },
    { name: "Hindi", native: "हिन्दी", continent: "Asia" },
    { name: "Japanese", native: "日本語", continent: "Asia" },
    { name: "Korean", native: "한국어", continent: "Asia" },
    { name: "Arabic", native: "العربية", continent: "Asia", rtl: true },
    { name: "Vietnamese", native: "Tiếng Việt", continent: "Asia" },
    { name: "Thai", native: "ภาษาไทย", continent: "Asia" },
    { name: "Indonesian", native: "Bahasa Indonesia", continent: "Asia" },
    { name: "Bengali", native: "বাংলা", continent: "Asia" },
    { name: "Urdu", native: "اردو", continent: "Asia", rtl: true },
    { name: "Tamil", native: "தமிழ்", continent: "Asia" },
    { name: "Turkish", native: "Türkçe", continent: "Asia" },
    { name: "Persian", native: "فارسی", continent: "Asia", rtl: true },
    { name: "Filipino", native: "Filipino", continent: "Asia" },
    // Europe
    { name: "English", native: "English", continent: "Europe" },
    { name: "French", native: "Français", continent: "Europe" },
    { name: "German", native: "Deutsch", continent: "Europe" },
    { name: "Spanish", native: "Español", continent: "Europe" },
    { name: "Italian", native: "Italiano", continent: "Europe" },
    { name: "Portuguese", native: "Português", continent: "Europe" },
    { name: "Russian", native: "Русский", continent: "Europe" },
    { name: "Dutch", native: "Nederlands", continent: "Europe" },
    { name: "Polish", native: "Polski", continent: "Europe" },
    { name: "Greek", native: "Ελληνικά", continent: "Europe" },
    { name: "Swedish", native: "Svenska", continent: "Europe" },
    { name: "Ukrainian", native: "Українська", continent: "Europe" },
    // Americas
    { name: "English (US)", native: "English", continent: "Americas" },
    { name: "Spanish (Mexico)", native: "Español", continent: "Americas" },
    { name: "Portuguese (Brazil)", native: "Português", continent: "Americas" },
    { name: "French (Canada)", native: "Français", continent: "Americas" },
    { name: "Haitian Creole", native: "Kreyòl Ayisyen", continent: "Americas" },
    { name: "Quechua", native: "Runasimi", continent: "Americas" },
  ];