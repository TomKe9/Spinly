export interface PricingPlan {
  id: string;
  name: string;
  priceMonthly: number;
  priceYearly: number;
  description: string;
  features: string[];
  cta: string;
  isPopular?: boolean;
}

export interface Review {
  id: string;
  name: string;
  role: string;
  business: string;
  avatarColor: string;
  rating: number;
  text: string;
}

export interface FAQItem {
  id: string;
  question: string;
  answer: string;
}

export interface FeatureItem {
  id: string;
  title: string;
  description: string;
  iconName: string;
}

export const INDUSTRIES = [
  { id: "salon", label: "Salony krásy", icon: "Sparkles", service: "Kosmetické ošetření" },
  { id: "hair", label: "Kadeřnictví", icon: "Scissors", service: "Střih & Balayage" },
  { id: "massage", label: "Masáže & Wellness", icon: "Activity", service: "Relaxační masáž zad" },
  { id: "physio", label: "Fyzioterapie", icon: "HeartPulse", service: "Vstupní vyšetření" },
  { id: "other", label: "Ostatní služby", icon: "CalendarCheck", service: "Konzultace" },
];

export const FEATURES: FeatureItem[] = [
  {
    id: "online-booking",
    iconName: "CalendarRange",
    title: "Samoobslužné rezervace 24/7",
    description: "Klienti se objednají sami, kdykoliv mají čas, přímo z vašeho webu, Instagramu nebo Facebooku. Telefon v kapse vám přestane neustále zvonit.",
  },
  {
    id: "sms-reminders",
    iconName: "MessageSquareText",
    title: "Chytré SMS připomínky",
    description: "Systém automaticky odešle klientovi připomínku 24 hodin předem. Snížíte počet zapomenutých termínů až o 92 % a ochráníte své tržby.",
  },
  {
    id: "staff-calendar",
    iconName: "UsersRound",
    title: "Týmové kalendáře & Směny",
    description: "Každý sval, stůl nebo zaměstnanec má svůj vlastní kalendář. Snadno nastavíte pracovní dobu, dovolené a provázanost sdílených místností.",
  },
  {
    id: "customer-history",
    iconName: "FileSpreadsheet",
    title: "Klientská karta & Statistiky",
    description: "Historie návštěv, poznámky o preferencích, alergie nebo receptury. Zároveň uvidíte přehledné grafy o vytíženosti a tržbách vašeho podnikání.",
  },
];

export const PRICING_PLANS: PricingPlan[] = [
  {
    id: "free",
    name: "Zdarma",
    priceMonthly: 0,
    priceYearly: 0,
    description: "Pro začínající živnostníky, kteří chtějí vyzkoušet výhody online kalendáře.",
    features: [
      "Až 50 rezervací měsíčně",
      "Rezervační odkaz na web a Instagram",
      "E-mailové potvrzení pro klienty",
      "Základní zákaznická databáze",
      "Pouze pro 1 kalendář / zaměstnance",
    ],
    cta: "Vyzkoušet zdarma",
  },
  {
    id: "pro",
    name: "Pro",
    priceMonthly: 490,
    priceYearly: 390,
    description: "Kompletní automatizace pro vytížené profesionály a rostoucí salony.",
    features: [
      "Neomezený počet rezervací",
      "Automatické SMS připomínky (100 SMS v ceně)",
      "Pokročilé nastavení směn a služeb",
      "Až 5 zaměstnanců / kalendářů",
      "Propojení s Google Kalendářem",
      "Exporty pro účetnictví a statistiky top služeb",
      "Technická podpora na telefonu",
    ],
    cta: "Začít s Pro",
    isPopular: true,
  },
  {
    id: "enterprise",
    name: "Enterprise",
    priceMonthly: 1290,
    priceYearly: 990,
    description: "Řešení na míru pro sítě salonů, kliniky a velká studia se specifickými požadavky.",
    features: [
      "Neomezený počet kalendářů & zaměstnanců",
      "Vlastní doména pro rezervační rozhraní",
      "Neomezené SMS zprávy za výhodný tarif",
      "API integrace s vaším interním systémem",
      "Hromadný import dat z předchozího systému",
      "Dedikovaný account manažer",
      "SLA podpora s garantovanou dostupností",
    ],
    cta: "Kontaktujte nás",
  },
];

export const REVIEWS: Review[] = [
  {
    id: "rev-1",
    name: "Lucie Králová",
    role: "Majitelka",
    business: "Studio Glamour, Praha",
    avatarColor: "bg-indigo-100 text-indigo-600",
    rating: 5,
    text: "Před Spinly jsem večery trávila odepisováním na Messengeru a SMSkách. Klienti teď kliknou na odkaz na mém Instagramu a objednají se sami. SMS připomínky navíc zachránily spoustu termínů, na které lidé dříve zapomínali.",
  },
  {
    id: "rev-2",
    name: "Tomáš Novák",
    role: "Hlavní fyzioterapeut",
    business: "RehaFyzio, Brno",
    avatarColor: "bg-teal-100 text-teal-600",
    rating: 5,
    text: "Měli jsme strach, že starší klienti nebudou umět online rezervační systém ovládat. Opak je pravdou. Systém Spinly je tak jednoduchý a intuitivní, že se u nás objednávají i lidé přes sedmdesát let. Za mě skvělá investice.",
  },
  {
    id: "rev-3",
    name: "Alena Svobodová",
    role: "Zakladatelka",
    business: "Aura Wellness, Plzeň",
    avatarColor: "bg-pink-100 text-pink-600",
    rating: 5,
    text: "Díky Spinly spravujeme 8 terapeutů a 4 sdílené místnosti bez jakýchkoliv kolizí. Každý ráno přesně ví, kdo kdy přijde. Ušetřilo nám to minimálně 10 hodin administrativní práce týdně.",
  },
];

export const FAQS: FAQItem[] = [
  {
    id: "faq-1",
    question: "Je těžké přejít z papírového diáře?",
    answer: "Vůbec ne! Většina našich klientů prošla stejnou obavou. Vytvořili jsme rozhraní Spinly tak, aby vypadalo jako přehledný kalendář. Navíc vám s prvním nastavením během pár minut pomůžeme. Přechod trvá obvykle jedno odpoledne.",
  },
  {
    id: "faq-2",
    question: "Zvládnu to nastavit sám/sama bez programování?",
    answer: "Ano, stoprocentně. Nepotřebujete žádný kód ani programátora. Stačí zaregistrovat e-mail, zadat vaše služby, jejich délku a vybrat si dny, kdy pracujete. Spinly vám vygeneruje odkaz, který jednoduše vložíte na svůj Facebook, Instagram nebo stávající web.",
  },
  {
    id: "faq-3",
    question: "Kolik stojí SMS zprávy a odejdou automaticky?",
    answer: "Ano, odcházejí zcela automaticky podle nastavení (např. 24 hodin před termínem). V tarifu PRO máte 100 SMS měsíčně již započítaných v ceně. Každá další SMS nad limit stojí pouze 1,20 Kč bez DPH, takže náklady jsou naprosto minimální v porovnání s propadlým časem.",
  },
  {
    id: "faq-4",
    question: "Mohu Spinly propojit se svým Google Kalendářem?",
    answer: "Ano, propojitelnost je obousměrná. Pokud si do svého osobního Google Kalendáře zapíšete například lékaře nebo schůzku, Spinly tento čas v nabídce pro vaše klienty automaticky uzamkne. Stejně tak se nové rezervace ze Spinly okamžitě propíšou k vám.",
  },
  {
    id: "faq-5",
    question: "Co když klient rezervaci zruší na poslední chvíli?",
    answer: "V nastavení Spinly si můžete zvolit vlastní storno podmínky – například, že zrušit či změnit rezervaci lze nejpozději 12 nebo 24 hodin předem. Pokud se o to klient pokusí později, systém ho odkáže na přímý kontakt s vámi, abyste se mohli dohodnout.",
  },
];
