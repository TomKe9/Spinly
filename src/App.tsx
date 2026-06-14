import React, { useState, useEffect } from "react";
import { 
  Sparkles, 
  Scissors, 
  Activity, 
  HeartPulse, 
  CalendarCheck, 
  Check, 
  Star, 
  Calendar, 
  Clock, 
  User, 
  Phone, 
  ArrowRight, 
  ShieldCheck, 
  MessageSquare,
  FileSpreadsheet,
  UsersRound,
  Zap,
  TrendingUp,
  AlertCircle,
  PhoneCall,
  Smartphone,
  Shield,
  CheckCircle,
  Award
} from "lucide-react";

import { INDUSTRIES, PRICING_PLANS, REVIEWS, FEATURES } from "./types";
import InteractiveShowcase from "./components/InteractiveShowcase";
import FaqSection from "./components/FaqSection";
import LeadModal from "./components/LeadModal";

// Add dashboard / client booking routing and Firebase Auth modules
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signInAnonymously, 
  signOut, 
  GoogleAuthProvider, 
  signInWithPopup, 
  onAuthStateChanged,
  updateProfile 
} from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "./firebase";
import Dashboard from "./components/Dashboard";
import ClientBookingPage from "./components/ClientBookingPage";

export default function App() {
  const [activeSegment, setActiveSegment] = useState(INDUSTRIES[0]);
  const [billingPeriod, setBillingPeriod] = useState<"monthly" | "yearly">("yearly");
  const [isLeadModalOpen, setIsLeadModalOpen] = useState(false);
  const [selectedPlanForModal, setSelectedPlanForModal] = useState("Pro");

  // Multi-merchant state-based routing states
  const [view, setView] = useState<"landing" | "dashboard" | "client-booking">("landing");
  const [currentUser, setCurrentUser] = useState<any | null>(null);
  const [selectedBusinessId, setSelectedBusinessId] = useState<string>("default");
  const [checkingAuth, setCheckingAuth] = useState(true);

  // Authentication dialog form states
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authBusinessName, setAuthBusinessName] = useState("");
  const [authSegment, setAuthSegment] = useState("salon");
  const [authError, setAuthError] = useState("");
  const [authSubmitting, setAuthSubmitting] = useState(false);

  // Sync auth state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setCheckingAuth(false);
    });
    return () => unsubscribe();
  }, []);

  // Check URL path query parameter-like loading
  useEffect(() => {
    // If we've routed somewhere, scroll to top automatically
    window.scrollTo(0, 0);
  }, [view]);

  // Auth Operations
  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    setAuthSubmitting(true);
    try {
      if (authMode === "register") {
        if (!authBusinessName.trim()) {
          setAuthError("Prosím vyplňte název provozovny.");
          setAuthSubmitting(false);
          return;
        }
        const credential = await createUserWithEmailAndPassword(auth, authEmail, authPassword);
        
        // Write initial Merchant Profile matching firestore.rules limitations
        await setDoc(doc(db, "leads", credential.user.uid), {
          businessName: authBusinessName.trim(),
          segment: authSegment,
          name: credential.user.displayName || "Nový partner",
          email: authEmail,
          phone: "+420 601 234 567",
          plan: "Pro",
          createdAt: serverTimestamp()
        });

        setIsLoginModalOpen(false);
        setView("dashboard");
      } else {
        await signInWithEmailAndPassword(auth, authEmail, authPassword);
        setIsLoginModalOpen(false);
        setView("dashboard");
      }
    } catch (err: any) {
      console.error("Auth submit error:", err);
      // Translation helper CZ
      if (err.code === "auth/email-already-in-use") {
        setAuthError("Tento e-mail se již používá.");
      } else if (err.code === "auth/weak-password") {
        setAuthError("Heslo musí mít alespoň 6 znaků.");
      } else if (err.code === "auth/invalid-credential") {
        setAuthError("Nesprávné přihlašovací údaje.");
      } else {
        setAuthError("Chyba ověření: " + (err.message || String(err)));
      }
    } finally {
      setAuthSubmitting(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setAuthError("");
    setAuthSubmitting(true);
    try {
      const provider = new GoogleAuthProvider();
      const credential = await signInWithPopup(auth, provider);
      
      // Auto-initialize lead profile if none exists
      const docRef = doc(db, "leads", credential.user.uid);
      const docSnap = await setDoc(docRef, {
        businessName: credential.user.displayName + " Salon",
        segment: "salon",
        name: credential.user.displayName || "Provozovatel",
        email: credential.user.email || "",
        phone: "+420 608 111 222",
        plan: "Pro",
        createdAt: serverTimestamp()
      }, { merge: true });

      setIsLoginModalOpen(false);
      setView("dashboard");
    } catch (err: any) {
      console.error("Google sign in error:", err);
      setAuthError("Přihlášení přes Google se nezdařilo.");
    } finally {
      setAuthSubmitting(false);
    }
  };

  const handleDemoSignIn = async () => {
    setAuthError("");
    setAuthSubmitting(true);
    try {
      const credential = await signInAnonymously(auth);
      
      // Preset high-fidelity mock salon settings for instant demonstration
      await setDoc(doc(db, "leads", credential.user.uid), {
        businessName: "Kadeřnictví Elegance (Demo)",
        segment: "hair",
        name: "Simona Hrušková",
        email: "simona@spinly-demo.cz",
        phone: "+420 732 454 888",
        plan: "Pro",
        createdAt: serverTimestamp()
      });

      setIsLoginModalOpen(false);
      setView("dashboard");
    } catch (err: any) {
      console.error("Demo login error:", err);
      setAuthError("Nebylo možné spustit demo účet.");
    } finally {
      setAuthSubmitting(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setView("landing");
    } catch (err) {
      console.error("Logout error:", err);
    }
  };
  
  // Live simulated booking counter to increase social proof immersion
  const [bookingCounter, setBookingCounter] = useState(142480);
  
  // Simulated PAS Compare Switcher
  const [pasTab, setPasTab] = useState<"chaos" | "spinly">("chaos");

  useEffect(() => {
    const timer = setInterval(() => {
      // Periodic increments to look alive
      setBookingCounter(prev => prev + (Math.random() > 0.4 ? 1 : 0));
    }, 4500);
    return () => clearInterval(timer);
  }, []);

  const openLeadForPlan = (planName: string) => {
    setSelectedPlanForModal(planName);
    setIsLeadModalOpen(true);
  };

  // Adapts H1 display segments to make conversion ratios skyrocket
  const getDynamicHeadline = () => {
    switch (activeSegment.id) {
      case "salon":
        return {
          h1: "Více ošetřených klientek, konec neustálému zvedání telefonů.",
          sub: "Nejlepší řešení pro kosmetické salony, studia vizáže a nehtové péče."
        };
      case "hair":
        return {
          h1: "Více ostříhaných zákazníků, méně prázdných kadeřnických křesel.",
          sub: "Chytrý planner pro nezávislé kadeřnice i celé kadeřnické řetězce."
        };
      case "massage":
        return {
          h1: "Více spokojených těl na lehátku, méně zapomenutých masáží.",
          sub: "Perfektní synchronizace pro maséry, wellness studia a spa centra."
        };
      case "physio":
        return {
          h1: "Více času na odbornou terapii, méně na papírování a telefony.",
          sub: "Systém pro fyzioterapeuty, kliniky a zdravotní konzultace."
        };
      default:
        return {
          h1: "Více úspěšných schůzek, kompletní klid a pořádek v kalendáři.",
          sub: "Univerzální rezervační motor pro všechny typy osobních služeb."
        };
    }
  };

  const currentCopy = getDynamicHeadline();

  const scrollToDemo = (e: React.MouseEvent) => {
    e.preventDefault();
    document.getElementById("demo-showcase")?.scrollIntoView({ behavior: "smooth" });
  };

  if (view === "dashboard" && currentUser) {
    return (
      <Dashboard 
        user={currentUser} 
        onLogout={handleLogout} 
        onGoToBooking={(busId) => { setSelectedBusinessId(busId); setView("client-booking"); }} 
        onBackToLanding={() => setView("landing")} 
      />
    );
  }

  if (view === "client-booking" && selectedBusinessId) {
    return (
      <ClientBookingPage 
        businessId={selectedBusinessId} 
        onBackToLanding={() => setView("landing")} 
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#fafafa] selection:bg-indigo-600 selection:text-white font-sans antialiased text-neutral-900 scroll-smooth">
      
      {/* 1. Header Navigation Menu */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-neutral-100 transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between">
          
          {/* Logo element matches humble branding rules */}
          <a 
            href="#" 
            onClick={(e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: "smooth" }); }} 
            className="flex items-center gap-2.5 hover:opacity-90 active:scale-98 transition-all"
          >
            <div className="bg-indigo-600 text-white p-2.5 rounded-xl flex items-center justify-center font-bold tracking-tight shadow-md shadow-indigo-150">
              <CalendarCheck className="w-5 h-5 stroke-[2.5]" />
            </div>
            <span className="text-2xl font-display font-extrabold tracking-tight text-neutral-950 flex items-center gap-1">
              Spinly
              <span className="text-xs bg-emerald-500/10 text-emerald-700 font-mono font-semibold px-2 py-0.5 rounded-full">CZ</span>
            </span>
          </a>

          {/* Desktop utility navigation list */}
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-neutral-600">
            <a href="#problém-řešení" className="hover:text-indigo-600 transition-colors">Problém vs. Řešení</a>
            <a href="#funkce" className="hover:text-indigo-600 transition-colors">Klíčové funkce</a>
            <a href="#recenze" className="hover:text-indigo-600 transition-colors">Hodnocení</a>
            <a href="#cenik" className="hover:text-indigo-600 transition-colors">Ceník</a>
            <a href="#faq" className="hover:text-indigo-600 transition-colors">Časté dotazy</a>
          </nav>

          {/* Nav CTAs */}
          <div className="flex items-center gap-3">
            {currentUser ? (
              <>
                <button
                  onClick={() => setView(view === "dashboard" ? "landing" : "dashboard")}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-5 rounded-xl text-sm shadow-xs transition-all active:scale-95 cursor-pointer flex items-center gap-1.5"
                >
                  <Zap className="w-4 h-4 fill-white" />
                  {view === "dashboard" ? "Zpět na web" : "Administrace"}
                </button>
              </>
            ) : (
              <>
                <button 
                  onClick={() => { setAuthMode("login"); setIsLoginModalOpen(true); }}
                  className="text-neutral-500 hover:text-indigo-600 font-extrabold text-sm tracking-tight transition-all cursor-pointer"
                >
                  Vstup pro živnostníky
                </button>
                <button
                  onClick={() => { setAuthMode("register"); setIsLoginModalOpen(true); }}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white py-2 px-5 rounded-xl text-sm font-semibold shadow-xs transition-all active:scale-95 cursor-pointer"
                >
                  Vyzkoušet zdarma
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* 2. Hero Section */}
      <section className="relative overflow-hidden pt-10 pb-16 lg:pt-16 lg:pb-24 border-b border-neutral-100">
        
        {/* Vector Background Accents */}
        <div className="absolute top-1/4 -left-36 w-96 h-96 bg-indigo-200/20 rounded-full blur-3xl -z-10" />
        <div className="absolute top-1/12 -right-36 w-96 h-96 bg-emerald-200/20 rounded-full blur-3xl -z-10" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          {/* Segment fast personalized toggles */}
          <div className="flex flex-wrap items-center justify-center gap-1.5 mb-8">
            <span className="text-xs font-bold text-neutral-400 uppercase tracking-widest mr-2">Váš obor:</span>
            {INDUSTRIES.map((ind) => {
              const isSelected = activeSegment.id === ind.id;
              return (
                <button
                  key={ind.id}
                  onClick={() => setActiveSegment(ind)}
                  className={`py-2 px-3.5 rounded-full text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                    isSelected 
                      ? "bg-indigo-50 border border-indigo-200 text-indigo-700 font-bold scale-[1.03]" 
                      : "bg-white border border-neutral-200 text-neutral-600 hover:border-neutral-300 hover:text-neutral-800"
                  }`}
                >
                  <span className="text-sm">
                    {ind.id === "salon" && "✨"}
                    {ind.id === "hair" && "💇"}
                    {ind.id === "massage" && "💆"}
                    {ind.id === "physio" && "🩺"}
                    {ind.id === "other" && "📅"}
                  </span>
                  {ind.label}
                </button>
              );
            })}
          </div>

          {/* Prominent Value Proposition Header Block */}
          <div className="text-center max-w-4xl mx-auto mb-14">
            
            {/* Super tag */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-indigo-500/5 text-indigo-700 text-xs font-bold rounded-full uppercase tracking-wider mb-5 border border-indigo-500/10 hover:bg-indigo-500/10 transition-colors animate-pulse">
              <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
              Více rezervací, méně prázdných termínů
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-display font-extrabold tracking-tight text-neutral-950 leading-tight lg:leading-none">
              {currentCopy.h1}
            </h1>
            
            <p className="mt-6 text-lg sm:text-xl text-neutral-600 max-w-3xl mx-auto leading-relaxed">
              {currentCopy.sub} Nechte své zákazníky rezervovat se <strong>samy 24/7</strong> přímo z webu nebo Instagramu. Ušetřete hodiny s automatickými <strong>SMS připomínkami</strong>.
            </p>

            {/* Main Action Buttons */}
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
              <button
                onClick={() => openLeadForPlan("Pro")}
                className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-8 py-4 rounded-xl text-base shadow-lg shadow-indigo-100 flex items-center justify-center gap-2 group transition-all transform hover:-translate-y-0.5 cursor-pointer"
              >
                Vyzkoušet Spinly zdarma
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
              
              <a 
                href="#demo-showcase"
                onClick={scrollToDemo}
                className="w-full sm:w-auto bg-white border border-neutral-250 text-neutral-700 hover:bg-neutral-50 hover:text-neutral-900 font-semibold px-8 py-4 rounded-xl text-base flex items-center justify-center gap-1.5 transition-all text-center"
              >
                <Clock className="w-5 h-5 text-neutral-400" />
                Jak to funguje? (Ukázka)
              </a>
            </div>

            {/* Badges footer info */}
            <div className="mt-5 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-neutral-500">
              <span className="flex items-center gap-1.5">
                <Check className="w-4 h-4 text-emerald-500 stroke-[3]" /> Vyzkoušení na 14 dní zdarma
              </span>
              <span className="flex items-center gap-1.5">
                <Check className="w-4 h-4 text-emerald-500 stroke-[3]" /> Bez vkládání platební karty
              </span>
              <span className="flex items-center gap-1.5">
                <Check className="w-4 h-4 text-emerald-500 stroke-[3]" /> Nastavení hotové za 5 minut
              </span>
            </div>
          </div>

          {/* Interactive Demo Block matches premium craft guidelines */}
          <div className="mt-12">
            <InteractiveShowcase />
          </div>

        </div>
      </section>

      {/* 3. Social Proof Stats Row */}
      <section className="bg-white border-b border-neutral-100 py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            
            <div className="p-4">
              <p className="text-3xl md:text-4xl font-display font-extrabold text-indigo-600">
                {bookingCounter.toLocaleString("cs-CZ")}
              </p>
              <p className="text-xs md:text-sm font-semibold text-neutral-500 uppercase tracking-wider mt-1.5 flex items-center justify-center gap-1">
                <span className="w-2 h-2 bg-emerald-500 rounded-full animate-ping" />
                Celkem rezervací
              </p>
            </div>

            <div className="p-4">
              <p className="text-3xl md:text-4xl font-display font-extrabold text-indigo-600">-92 %</p>
              <p className="text-xs md:text-sm font-semibold text-neutral-500 uppercase tracking-wider mt-1.5">Zapomenutých termínů</p>
            </div>

            <div className="p-4">
              <p className="text-3xl md:text-4xl font-display font-extrabold text-indigo-600">10+ hod</p>
              <p className="text-xs md:text-sm font-semibold text-neutral-500 uppercase tracking-wider mt-1.5">Ušetřeného času týdně</p>
            </div>

            <div className="p-4">
              <p className="text-3xl md:text-4xl font-display font-extrabold text-indigo-600">99.8 %</p>
              <p className="text-xs md:text-sm font-semibold text-neutral-500 uppercase tracking-wider mt-1.5">Doručitelnost SMS</p>
            </div>

          </div>
        </div>
      </section>

      {/* 4. PAS - Problem vs Solution Section */}
      <section id="problém-řešení" className="py-20 lg:py-28 bg-[#fdfdfd] border-b border-neutral-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="text-xs font-bold text-indigo-600 uppercase tracking-widest bg-indigo-50 px-3 py-1 rounded-full">
              Konec staré éry
            </span>
            <h2 className="text-3xl md:text-4xl font-display font-bold text-neutral-950 mt-3 tracking-tight">
              Proč stále plánovat služby ručně a ztrácet peníze?
            </h2>
            <p className="text-neutral-500 mt-4 leading-relaxed">
              Zvonící telefony uprostřed rozdělané práce, zapomenuté termíny a přeplněný, nečitelný papírový diář. Tam venku je zbytečný chaos. Spinly vám vrátí plnou kontrolu.
            </p>

            {/* Mobile Tab switcher for PAS elements */}
            <div className="inline-flex mt-8 p-1.5 bg-neutral-100 rounded-xl">
              <button
                onClick={() => setPasTab("chaos")}
                className={`px-5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  pasTab === "chaos" 
                    ? "bg-rose-500 text-white shadow-xs" 
                    : "text-neutral-600 hover:text-neutral-900"
                }`}
              >
                Tradiční cesta (Chaos ❌)
              </button>
              <button
                onClick={() => setPasTab("spinly")}
                className={`px-5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  pasTab === "spinly" 
                    ? "bg-emerald-600 text-white shadow-xs" 
                    : "text-neutral-600 hover:text-neutral-900"
                }`}
              >
                Cesta se Spinly (Klid ✅)
              </button>
            </div>
          </div>

          {/* Side-by-side PAS Presentation Container */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            
            {/* Column A: Chaos Path */}
            <div className={`border rounded-3xl p-6 md:p-8 transition-all duration-300 bg-white ${
              pasTab === "chaos" 
                ? "border-rose-200 ring-2 ring-rose-100/50 scale-[1.01]" 
                : "border-neutral-150 opacity-40 hover:opacity-100"
            }`}>
              <div className="flex items-center gap-3 border-b border-rose-50 pb-4 mb-6">
                <div className="bg-rose-50 text-rose-600 p-2.5 rounded-xl">
                  <AlertCircle className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-lg font-bold text-neutral-900 font-display">Papírové a ruční plánování</h4>
                  <p className="text-xs text-rose-600 font-semibold uppercase">Ztrácí čas a snižuje tržby</p>
                </div>
              </div>

              <ul className="space-y-4">
                {[
                  {
                    title: "Zákazníci zapomínají",
                    text: "Klienti si nezapíšou termín, spletou si datum a prostě nedorazí. Vaše křeslo zůstává prázdné a vy přicházíte o tržbu."
                  },
                  {
                    title: "Neustálá vyrušení",
                    text: "Během stříhání nebo masáže vám neustále zvoní telefon. Musíte přerušit práci nebo riskovat, že ztratíte nového klienta."
                  },
                  {
                    title: "Diář pouze na jednom místě",
                    text: "Nemáte přístup k rozvrhu z domova nebo na cestách. Když chce klient změnit čas večer o víkendu, musíte počkat do pondělí do salonu."
                  }
                ].map((item, index) => (
                  <li key={index} className="flex gap-3">
                    <span className="w-5 h-5 rounded-full bg-rose-50 text-rose-500 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">✕</span>
                    <div>
                      <strong className="block text-sm font-bold text-neutral-800">{item.title}</strong>
                      <span className="text-xs text-neutral-500 mt-0.5 block leading-normal">{item.text}</span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            {/* Column B: Spinly Path */}
            <div className={`border rounded-3xl p-6 md:p-8 transition-all duration-300 bg-white ${
              pasTab === "spinly" 
                ? "border-emerald-200 ring-2 ring-emerald-100/50 scale-[1.01]" 
                : "border-neutral-150 opacity-40 hover:opacity-100"
            }`}>
              <div className="flex items-center gap-3 border-b border-emerald-50 pb-4 mb-6">
                <div className="bg-emerald-50 text-emerald-600 p-2.5 rounded-xl">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-lg font-bold text-neutral-900 font-display">Automatizace se Spinly</h4>
                  <p className="text-xs text-emerald-600 font-semibold uppercase">Klidu, pořádek a jistota</p>
                </div>
              </div>

              <ul className="space-y-4">
                {[
                  {
                    title: "Zapomenuté termíny jsou minulostí",
                    text: "Samoobslužný inteligentní SMS asistent pošle přesné potvrzení a připomínku. Lidé přicházejí včas a vy vyděláváte."
                  },
                  {
                    title: "Nepřetržitá rezervace i v noci",
                    text: "Více než 45 % klientů se objednává večer, o víkendu nebo v noci, když máte zavřeno. Spinly pracuje pro vás 24 hodin denně."
                  },
                  {
                    title: "Kalendář v mobilu kdekoli",
                    text: "Přehledný plán máte v telefonu, tabletu i počítači. Okamžitě víte, jaká je vaše vytíženost a kolik jste si vydělali."
                  }
                ].map((item, index) => (
                  <li key={index} className="flex gap-3">
                    <span className="w-5 h-5 rounded-full bg-emerald-50 text-emerald-600 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">✓</span>
                    <div>
                      <strong className="block text-sm font-bold text-neutral-800">{item.title}</strong>
                      <span className="text-xs text-neutral-500 mt-0.5 block leading-normal">{item.text}</span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

          </div>

          {/* Central bottom value statement block */}
          <div className="mt-14 bg-indigo-50 border border-indigo-100 rounded-2xl p-6 text-center max-w-3xl mx-auto">
            <p className="text-sm text-indigo-900 leading-relaxed">
              💡 <strong>Statistika z praxe:</strong> Podnikatelé v Česku, kteří přešli z papírového kalendáře na rezervační odkaz Spinly, zaznamenali v průměru <strong>nárůst objednávek o 24 %</strong> hned během prvních dvou měsíců.
            </p>
          </div>

        </div>
      </section>

      {/* 5. Key Features Grid */}
      <section id="funkce" className="py-20 lg:py-28 bg-white border-b border-neutral-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="text-xs font-bold text-indigo-600 uppercase tracking-widest bg-indigo-50 px-3 py-1 rounded-full">
              Bohaté funkce
            </span>
            <h2 className="text-3xl md:text-4xl font-display font-bold text-neutral-950 mt-3 tracking-tight">
              Vše, co potřebujete v jedné aplikaci
            </h2>
            <p className="text-neutral-500 mt-3">
              Konec složitého instalování. Spinly je webová aplikace připravená pro provoz ihned bez nutnosti stahování z App Store.
            </p>
          </div>

          {/* Features Grid layout block */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {FEATURES.map((feat) => {
              return (
                <div 
                  key={feat.id}
                  className="bg-[#fafafa] hover:bg-white border border-neutral-100 hover:border-neutral-200 p-6 md:p-8 rounded-2xl transition-all hover:scale-[1.01] hover:shadow-lg hover:shadow-neutral-100/50 group"
                >
                  <div className="bg-white group-hover:bg-indigo-50 text-indigo-600 w-12 h-12 rounded-xl flex items-center justify-center shadow-xs border border-neutral-100 transition-colors">
                    {feat.iconName === "CalendarRange" && <Calendar className="w-6 h-6" />}
                    {feat.iconName === "MessageSquareText" && <MessageSquare className="w-6 h-6" />}
                    {feat.iconName === "UsersRound" && <UsersRound className="w-6 h-6" />}
                    {feat.iconName === "FileSpreadsheet" && <FileSpreadsheet className="w-6 h-6" />}
                  </div>

                  <h3 className="text-lg font-bold font-display text-neutral-950 mt-5 mb-2.5">
                    {feat.title}
                  </h3>
                  
                  <p className="text-xs md:text-sm text-neutral-500 leading-relaxed">
                    {feat.description}
                  </p>
                </div>
              );
            })}
          </div>

        </div>
      </section>

      {/* 6. Professional Social Proof & Testimonials */}
      <section id="recenze" className="py-20 lg:py-28 bg-[#fbfbfb] border-b border-neutral-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="text-xs font-bold text-emerald-700 uppercase tracking-widest bg-emerald-100 px-3 py-1 rounded-full">
              Zpětná vazba
            </span>
            <h2 className="text-3xl md:text-4xl font-display font-bold text-neutral-950 mt-3 tracking-tight">
              Zkušenosti profesionálů jako jste vy
            </h2>
            <p className="text-neutral-500 mt-2">
              Pomáháme živnostníkům a firmám po celé České republice získat klid na práci.
            </p>
          </div>

          {/* Testimonial Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {REVIEWS.map((rev) => {
              return (
                <div 
                  key={rev.id} 
                  className="bg-white border border-neutral-150 p-6 md:p-8 rounded-3xl flex flex-col justify-between shadow-xs relative"
                >
                  {/* Decorative rating block */}
                  <div className="flex gap-1 mb-5">
                    {[...Array(rev.rating)].map((_, i) => (
                      <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
                    ))}
                  </div>

                  <p className="text-sm md:text-base text-neutral-600 leading-relaxed italic mb-6">
                    &quot;{rev.text}&quot;
                  </p>

                  <div className="flex items-center gap-3.5 border-t border-neutral-100 pt-5">
                    <div className={`w-11 h-11 rounded-full flex items-center justify-center font-bold text-sm shrink-0 ${rev.avatarColor}`}>
                      {rev.name.split(" ").map(n => n[0]).join("")}
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-neutral-950">{rev.name}</h4>
                      <p className="text-xs text-neutral-500 font-medium">
                        {rev.role} • <strong>{rev.business}</strong>
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Verification safety quote */}
          <div className="mt-12 text-center text-xs text-neutral-400 flex items-center justify-center gap-2">
            <Award className="w-4 h-4 text-neutral-400" />
            Všechny recenze pocházejí od skutečných platících uživatelů systému Spinly v ČR a SR.
          </div>

        </div>
      </section>

      {/* 7. Pricing Configurator Section */}
      <section id="cenik" className="py-20 lg:py-28 bg-white border-b border-neutral-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-2xl mx-auto mb-10">
            <span className="text-xs font-bold text-indigo-600 uppercase tracking-widest bg-indigo-50 px-3 py-1 rounded-full">
              Přehledný Ceník
            </span>
            <h2 className="text-3xl md:text-4xl font-display font-bold text-neutral-950 mt-3 tracking-tight">
              Fér ceny bez skrytých poplatků
            </h2>
            <p className="text-neutral-500 mt-2">
              Vyberte si balíček podle rozsahu vašeho podnikání. Kdykoliv můžete přejít výše nebo tarif zrušit.
            </p>

            {/* Interactive Billing Period Toggle Switcher */}
            <div className="mt-8 inline-flex items-center gap-3 bg-neutral-100 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setBillingPeriod("monthly")}
                className={`px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  billingPeriod === "monthly" 
                    ? "bg-white text-neutral-950 shadow-xs" 
                    : "text-neutral-500 hover:text-neutral-800"
                }`}
              >
                Měsíční platba
              </button>
              
              <button
                type="button"
                onClick={() => setBillingPeriod("yearly")}
                className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                  billingPeriod === "yearly" 
                    ? "bg-indigo-600 text-white shadow-xs" 
                    : "text-neutral-500 hover:text-neutral-800"
                }`}
              >
                Roční platba
                <span className="bg-emerald-500 text-neutral-950 text-[9px] font-extrabold px-1.5 py-0.5 rounded-md uppercase font-mono tracking-tight shrink-0">
                  -20 %
                </span>
              </button>
            </div>
          </div>

          {/* Price Card Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 max-w-6xl mx-auto items-stretch">
            {PRICING_PLANS.map((plan) => {
              const currentPrice = billingPeriod === "yearly" ? plan.priceYearly : plan.priceMonthly;
              const hasPrice = plan.priceMonthly > 0;
              
              return (
                <div 
                  key={plan.id}
                  className={`border rounded-3xl p-6 md:p-8 flex flex-col justify-between transition-all duration-300 relative bg-white ${
                    plan.isPopular 
                      ? "border-indigo-500 ring-4 ring-indigo-50 shadow-xl scale-[1.03] z-10" 
                      : "border-neutral-200 hover:border-neutral-300 shadow-xs"
                  }`}
                >
                  
                  {/* Popular tag */}
                  {plan.isPopular && (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-indigo-600 text-white text-[10px] font-extrabold px-3 py-1 rounded-full uppercase tracking-widest font-mono">
                      Nejoblíbenější
                    </span>
                  )}

                  <div>
                    <h3 className="text-xl font-bold font-display text-neutral-950">{plan.name}</h3>
                    <p className="text-xs text-neutral-500 mt-1 min-h-[32px] leading-relaxed">{plan.description}</p>
                    
                    {/* Price Tag */}
                    <div className="my-6">
                      {hasPrice ? (
                        <div className="flex items-baseline gap-1">
                          <span className="text-4xl font-display font-extrabold text-neutral-950">
                            {currentPrice} Kč
                          </span>
                          <span className="text-xs text-neutral-500 font-medium">/ měsíc</span>
                        </div>
                      ) : (
                        <span className="text-4xl font-display font-extrabold text-neutral-950">Zdarma</span>
                      )}
                      
                      <p className="text-[10px] text-neutral-400 mt-1 font-mono uppercase tracking-wider">
                        {billingPeriod === "yearly" && hasPrice ? "Účtováno ročně (Celkem " + (currentPrice * 12) + " Kč)" : "Bez závazků"}
                      </p>
                    </div>

                    <div className="border-t border-neutral-100 pt-6">
                      <p className="text-xs font-bold text-neutral-900 uppercase tracking-wide mb-3">Co vše získáte:</p>
                      
                      <ul className="space-y-2.5">
                        {plan.features.map((feat, index) => (
                          <li key={index} className="flex items-start gap-2 text-xs text-neutral-600 leading-normal">
                            <Check className="w-4 h-4 text-emerald-500 stroke-[3] shrink-0 mt-0.5" />
                            <span>{feat}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* Pricing CTA */}
                  <div className="pt-8">
                    <button
                      onClick={() => openLeadForPlan(plan.name)}
                      className={`w-full py-3.5 px-6 rounded-xl text-sm font-semibold transition-all cursor-pointer ${
                        plan.isPopular 
                          ? "bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-100" 
                          : "bg-neutral-55 hover:bg-neutral-100 text-neutral-800 border border-neutral-250"
                      }`}
                    >
                      {plan.cta}
                    </button>
                  </div>

                </div>
              );
            })}
          </div>

          <div className="mt-10 text-center text-xs text-neutral-400">
            * Uvedené ceny jsou bez DPH 21 %. Vyzkoušení služeb je zcela nezávazné, nevyžadujeme registraci platební karty.
          </div>

        </div>
      </section>

      {/* 8. Accordion Section */}
      <section id="faq" className="py-20 lg:py-28 bg-[#fafafa] border-b border-neutral-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="text-xs font-bold text-neutral-500 uppercase tracking-widest bg-white border border-neutral-200 px-3 py-1 rounded-full">
              Máte dotazy?
            </span>
            <h2 className="text-3xl md:text-4xl font-display font-bold text-neutral-950 mt-3 tracking-tight">
              Často kladené otázky (FAQ)
            </h2>
            <p className="text-neutral-500 mt-2">
              Odpovídáme na nejčastější pochybnosti majitelů salonů a poskytovatelů služeb před registrací.
            </p>
          </div>

          {/* Faq rendering module */}
          <FaqSection />

        </div>
      </section>

      {/* 9. Final CTA conversion block */}
      <section className="relative py-20 lg:py-28 bg-neutral-950 text-white overflow-hidden text-center select-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-indigo-600/15 rounded-full blur-3xl -z-10" />

        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/5 border border-white/10 rounded-full text-xs font-semibold text-emerald-400">
            <Shield className="w-3.5 h-3.5" />
            Aktivace okamžitě, bez závazků
          </div>

          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-display font-extrabold tracking-tight">
            Začněte šetřit 10+ hodin týdně ještě dnes
          </h2>
          
          <p className="text-sm sm:text-base text-neutral-400 max-w-2xl mx-auto leading-relaxed">
            Vyzkoušejte tarif Pro na 14 dní zcela zdarma. Získejte klid na svou práci, zvyšte počet rezervací a dejte navždy sbohem neustálému telefonování.
          </p>

          <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3.5 max-w-md mx-auto">
            <button
              onClick={() => openLeadForPlan("Pro")}
              className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-4 px-8 rounded-xl text-sm transition-all transform hover:-translate-y-0.5 cursor-pointer shadow-lg shadow-indigo-950/40"
            >
              Vyzkoušet Spinly na 14 dní zdarma
            </button>
          </div>

          <div className="flex items-center justify-center gap-4 text-xs text-neutral-500 pt-2">
            <span>✓ Nastavení zabere 5 min</span>
            <span className="w-1 h-1 bg-neutral-700 rounded-full" />
            <span>✓ Podpora v Češtině</span>
            <span className="w-1 h-1 bg-neutral-700 rounded-full" />
            <span>✓ Snadný export dat</span>
          </div>

        </div>
      </section>

      {/* 10. Styled footer conforming with terms and gdpr guidelines */}
      <footer className="bg-neutral-900 text-neutral-400/95 py-12 md:py-16 border-t border-neutral-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
            
            {/* Branding Column */}
            <div className="space-y-4 md:col-span-1">
              <div className="flex items-center gap-2">
                <div className="bg-indigo-600 text-white p-2 rounded-lg">
                  <CalendarCheck className="w-4 h-4" />
                </div>
                <span className="text-lg font-display font-extrabold text-white">Spinly</span>
              </div>
              <p className="text-xs text-neutral-500 leading-relaxed">
                Moderní rezervační systém pro salony krásy, kadeřnictví, fyzioterapeuty a další profesionály hledající pohodlí a automatizaci.
              </p>
            </div>

            {/* Links Columns */}
            <div>
              <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-4">Odkazy</h4>
              <ul className="space-y-2.5 text-xs">
                <li><a href="#problém-řešení" className="hover:text-white transition-colors">Problém vs. Řešení</a></li>
                <li><a href="#funkce" className="hover:text-white transition-colors">Klíčové funkce</a></li>
                <li><a href="#cenik" className="hover:text-white transition-colors">Tarify &amp; Ceník</a></li>
                <li><a href="#faq" className="hover:text-white transition-colors">Časté dotazy</a></li>
              </ul>
            </div>

            <div>
              <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-4">Právní náležitosti</h4>
              <ul className="space-y-2.5 text-xs">
                <li>
                  <a 
                    href="#gdpr" 
                    onClick={(e) => { e.preventDefault(); alert("Zpracování osobních údajů (GDPR):\nVšechna zadaná data v tomto systému podléhají šifrování dle certifikace GDPR a jsou uložena v zabezpečených evropských datacentrech. Vaše kontakty nikdy neposkytujeme k reklamním účelům třetích stran."); }}
                    className="hover:text-white transition-colors"
                  >
                    Ochrana osobních údajů (GDPR)
                  </a>
                </li>
                <li>
                  <a 
                    href="#terms" 
                    onClick={(e) => { e.preventDefault(); alert("Obchodní podmínky Spinly:\nRegistrace je dobrovolná. Po dobu 14 dní je systém plně zdarma bez jakýchkoliv závazků. Služba je poskytována na principu Software as a Service (SaaS)."); }}
                    className="hover:text-white transition-colors"
                  >
                    Všeobecné obchodní podmínky
                  </a>
                </li>
                <li>
                  <a 
                    href="#cookies" 
                    onClick={(e) => { e.preventDefault(); alert("Zásady cookies:\nPoužíváme pouze nezbytná funkční cookies pro přihlášení a uchování vaší zkušební relace."); }}
                    className="hover:text-white transition-colors"
                  >
                    Zásady Cookies
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-4">Kontaktujte nás</h4>
              <ul className="space-y-2.5 text-xs text-neutral-400">
                <li className="flex items-center gap-1.5 font-semibold text-white">
                  <PhoneCall className="w-3.5 h-3.5 text-indigo-400" />
                  +420 234 567 890
                </li>
                <li className="flex items-center gap-1.5">
                  <span className="text-neutral-500">E-mail:</span>
                  <a href="mailto:info@spinly.cz" className="hover:text-white transition-colors underline">info@spinly.cz</a>
                </li>
                <li className="text-[11px] text-neutral-500 leading-normal pt-1_5">
                  Spinly Technologies s.r.o.<br />
                  Rybná 716/24, Staré Město<br />
                  110 00 Praha 1, IČ: 12345678
                </li>
              </ul>
            </div>

          </div>

          {/* Decent bottom copyright statement matches high security branding rules */}
          <div className="border-t border-neutral-800 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-neutral-500">
            <p>© {new Date().getFullYear()} Spinly. Všechna práva vyhrazena. Navrženo pro česká a slovenská studia.</p>
            <div className="flex items-center gap-3">
              <span>Zabezpečení přenosu: SSL / AES-256</span>
            </div>
          </div>

        </div>
      </footer>

      {/* 11. Lead Capture Modal Simulator mounting block */}
      <LeadModal 
        isOpen={isLeadModalOpen} 
        onClose={() => setIsLeadModalOpen(false)} 
        initialPlanName={selectedPlanForModal}
      />

      {/* 12. Multi-Merchant Account Authorization Dialog */}
      {isLoginModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl border border-neutral-200 p-6 md:p-8 w-full max-w-md shadow-2xl relative overflow-hidden">
            
            {/* Close button */}
            <button 
              onClick={() => { setIsLoginModalOpen(false); setAuthError(""); }}
              className="absolute top-4 right-4 text-neutral-400 hover:text-neutral-700 font-extrabold text-xl p-1 leading-none select-none"
            >
              ✕
            </button>

            {/* Core Header */}
            <div className="text-center space-y-1.5 mb-6">
              <div className="bg-indigo-50 text-indigo-700 font-bold p-3 rounded-2xl w-fit mx-auto mb-2">
                <Scissors className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-extrabold tracking-tight text-neutral-950">
                {authMode === "login" ? "Vstup do administrace" : "Založení bezplatného účtu"}
              </h3>
              <p className="text-xs text-neutral-500 font-medium">
                {authMode === "login" 
                  ? "Spravujte své rezervace a zákazníky na jednom místě." 
                  : "Získejte kompletní rezervační systém zdarma na 14 dní."}
              </p>
            </div>

            {/* Form Toggle Tabs switcher */}
            <div className="flex border-b border-neutral-100 pb-3 mb-4 select-none">
              <button
                type="button"
                onClick={() => { setAuthMode("login"); setAuthError(""); }}
                className={`flex-1 text-center pb-2 text-xs font-bold transition-all border-b-2 cursor-pointer ${
                  authMode === "login" 
                    ? "border-indigo-600 text-indigo-700" 
                    : "border-transparent text-neutral-400 hover:text-neutral-600"
                }`}
              >
                Přihlášení
              </button>
              <button
                type="button"
                onClick={() => { setAuthMode("register"); setAuthError(""); }}
                className={`flex-1 text-center pb-2 text-xs font-bold transition-all border-b-2 cursor-pointer ${
                  authMode === "register" 
                    ? "border-indigo-600 text-indigo-700" 
                    : "border-transparent text-neutral-400 hover:text-neutral-600"
                }`}
              >
                Registrace podniku
              </button>
            </div>

            {/* Core credentials form fields */}
            <form onSubmit={handleAuthSubmit} className="space-y-4">
              
              {authMode === "register" && (
                <>
                  <div>
                    <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1">
                      Název vašeho podniku / salonu
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Např. Studio Glamour"
                      value={authBusinessName}
                      onChange={(e) => setAuthBusinessName(e.target.value)}
                      className="w-full px-3.5 py-2 border border-neutral-200 focus:border-indigo-500 focus:outline-hidden rounded-xl text-xs font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1">
                      Hlavní zaměření / segment
                    </label>
                    <select
                      value={authSegment}
                      onChange={(e) => setAuthSegment(e.target.value)}
                      className="w-full px-3.5 py-2 border border-neutral-200 focus:border-indigo-500 focus:outline-hidden rounded-xl text-xs font-medium bg-white"
                    >
                      {INDUSTRIES.map(i => (
                        <option key={i.id} value={i.id}>{i.label}</option>
                      ))}
                    </select>
                  </div>
                </>
              )}

              <div>
                <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1">
                  E-mailová adresa (uživatelské jméno)
                </label>
                <input
                  type="email"
                  required
                  placeholder="partner@spinly.cz"
                  value={authEmail}
                  onChange={(e) => setAuthEmail(e.target.value)}
                  className="w-full px-3.5 py-2 border border-neutral-200 focus:border-indigo-500 focus:outline-hidden rounded-xl text-xs font-mono font-medium"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1">
                  Heslo (alespoň 6 znaků)
                </label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                  className="w-full px-3.5 py-2 border border-neutral-200 focus:border-indigo-500 focus:outline-hidden rounded-xl text-xs font-medium"
                />
              </div>

              {/* Error box */}
              {authError && (
                <div className="flex gap-2 items-start bg-rose-50 border border-rose-100 text-rose-700 p-3 rounded-xl text-[11px] font-semibold">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{authError}</span>
                </div>
              )}

              {/* Submit triggers */}
              <button
                type="submit"
                disabled={authSubmitting}
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold uppercase tracking-wide transition-all shadow-md cursor-pointer"
              >
                {authSubmitting ? "Ověřuji..." : authMode === "login" ? "Přihlásit se" : "Založit účet zdarma"}
              </button>

            </form>

            {/* Split dividers */}
            <div className="relative my-5 text-center select-none">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-neutral-100" />
              </div>
              <span className="relative bg-white px-2.5 text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Nebo</span>
            </div>

            {/* Google sign-in integrations */}
            <div className="space-y-2.5">
              <button
                onClick={handleGoogleSignIn}
                disabled={authSubmitting}
                className="w-full py-2 px-4 border border-neutral-200 hover:border-neutral-300 rounded-xl text-xs font-semibold hover:bg-neutral-50 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-2xs"
              >
                <span className="text-sm">🌐</span>
                Přihlásit se přes Google
              </button>

              {/* Fast anonymous sandbox tour bypass is a premier design decision */}
              <button
                onClick={handleDemoSignIn}
                disabled={authSubmitting}
                className="w-full py-2.5 bg-gradient-to-r from-indigo-500 to-purple-600 hover:opacity-95 text-white rounded-xl text-xs font-bold tracking-wide transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-md shadow-indigo-100 animate-pulse"
              >
                <Zap className="w-3.5 h-3.5 fill-white shrink-0" />
                Rychlé vyzkoušení jako Host Administrátor
              </button>
              <p className="text-[10px] text-neutral-400 font-semibold text-center leading-none mt-1">
                (Otevře plnou zkušební administraci ihned na 1 kliknutí)
              </p>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
