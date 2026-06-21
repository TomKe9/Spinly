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
  Award,
  Menu,
  X,
  Wallet,
  Search
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
import { doc, setDoc, getDoc, serverTimestamp, collection, onSnapshot } from "firebase/firestore";
import { auth, db } from "./firebase";
import Dashboard from "./components/Dashboard";
import ClientBookingPage from "./components/ClientBookingPage";
import WalletModal from "./components/WalletModal";

export default function App() {
  const [activeSegment, setActiveSegment] = useState(INDUSTRIES[0]);
  const [billingPeriod, setBillingPeriod] = useState<"monthly" | "yearly">("yearly");
  const [isLeadModalOpen, setIsLeadModalOpen] = useState(false);
  const [selectedPlanForModal, setSelectedPlanForModal] = useState("Pro");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Multi-merchant state-based routing states
  const [view, setView] = useState<"landing" | "dashboard" | "client-booking">("landing");
  const [landingSubView, setLandingSubView] = useState<"home" | "problém-řešení" | "funkce" | "cenik" | "faq">("home");
  const [currentUser, setCurrentUser] = useState<any | null>(null);
  const [selectedBusinessId, setSelectedBusinessId] = useState<string>("default");
  const [checkingAuth, setCheckingAuth] = useState(true);

  // Authentication dialog form states
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isWalletOpen, setIsWalletOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [authAccountType, setAuthAccountType] = useState<"partner" | "customer">("partner");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authBusinessName, setAuthBusinessName] = useState("");
  const [authSegment, setAuthSegment] = useState("salon");
  const [authError, setAuthError] = useState("");
  const [authSubmitting, setAuthSubmitting] = useState(false);

  // List of salons fetched from firebase db
  const [salonsList, setSalonsList] = useState<any[]>([]);
  const [loadingSalonsList, setLoadingSalonsList] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Live stream salons list for autocomplete search
  useEffect(() => {
    setLoadingSalonsList(true);
    const unsubscribe = onSnapshot(
      collection(db, "leads"),
      (snapshot) => {
        const list: any[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          if (data && data.businessName) {
            list.push({ id: doc.id, ...data });
          }
        });
        setSalonsList(list);
        setLoadingSalonsList(false);
      },
      (error) => {
        console.error("Error loading salons stream:", error);
        setLoadingSalonsList(false);
      }
    );
    return () => unsubscribe();
  }, []);

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
  }, [view, landingSubView]);

  // Auth Operations
  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    setAuthSubmitting(true);
    try {
      if (authMode === "register") {
        if (authAccountType === "partner") {
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
            walletBalance: 1000,
            createdAt: serverTimestamp()
          });

          setIsLoginModalOpen(false);
          setView("dashboard");
        } else {
          // Customer / Client account registration
          const credential = await createUserWithEmailAndPassword(auth, authEmail, authPassword);
          const emailPrefix = authEmail.split('@')[0];
          const displayClientName = emailPrefix.charAt(0).toUpperCase() + emailPrefix.slice(1);

          await setDoc(doc(db, "leads", credential.user.uid), {
            businessName: "Osobní profil (Zákazník)",
            segment: "customer",
            name: displayClientName,
            email: authEmail,
            phone: "+420 601 234 567",
            plan: "Uživatel",
            walletBalance: 1000, // Pre-seeded with 1000 CZK bonus budget!
            createdAt: serverTimestamp()
          });

          setIsLoginModalOpen(false);
          setView("landing");
          setIsWalletOpen(true); // Pop open wallet immediately so they can play with their money
        }
      } else {
        const credential = await signInWithEmailAndPassword(auth, authEmail, authPassword);
        
        // Quietly inspect their user record to decide view redirects
        const profileSnap = await getDoc(doc(db, "leads", credential.user.uid));
        setIsLoginModalOpen(false);
        
        if (profileSnap.exists() && profileSnap.data().segment === "customer") {
          setView("landing");
          setIsWalletOpen(true); // Open pre-paid wallet instantly upon user sign in! Excellent
        } else {
          setView("dashboard");
        }
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
      } else if (err.code === "auth/operation-not-allowed" || String(err).includes("operation-not-allowed")) {
        setAuthError("Nepovolený přístup: Registrace e-mailem/heslem není ve vašem Firebase projektu povolena. Povolte prosím 'E-mail/heslo' v konzoli Firebase (Authentication -> Sign-in method), nebo použijte přihlášení přes Google / Host Demo.");
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
    <div className="min-h-screen bg-[#fbfbf9] text-stone-900 selection:bg-brand-100 selection:text-brand-900 font-sans antialiased scroll-smooth relative pb-10">
      
      {/* 1. Header Navigation Menu */}
      <header className="sticky top-0 z-40 bg-[#fbfbf9]/95 backdrop-blur-md border-b border-stone-200/60 transition-all text-stone-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between relative">
          
          {/* Logo element matches humble branding rules */}
          <a 
            href="#" 
            onClick={(e) => { e.preventDefault(); setMobileMenuOpen(false); setLandingSubView("home"); }} 
            className="flex items-center gap-2.5 hover:opacity-90 active:scale-98 transition-all shrink-0"
          >
            <div className="bg-brand-600 text-white p-2.5 rounded-xl flex items-center justify-center font-bold tracking-tight shadow-xs">
              <CalendarCheck className="w-5 h-5 stroke-[2.5]" />
            </div>
            <span className="text-2xl font-display font-black tracking-tight text-stone-900 flex items-center gap-1">
              Spinly
              <span className="text-[10px] bg-brand-50 text-brand-700 font-mono font-bold px-2 py-0.5 rounded-full border border-brand-200">CZ</span>
            </span>
          </a>

          {/* Right Actions & Menu Trigger (All Screen Sizes) */}
          <div className="flex items-center gap-3">
            
            {/* Wallet Quick Access Pill */}
            <button
              onClick={() => setIsWalletOpen(true)}
              className="bg-stone-900 hover:bg-stone-850 text-[#d5af66] font-mono font-black py-2 px-3 sm:px-3.5 rounded-xl text-[10px] uppercase tracking-wider flex items-center gap-2 shadow-xs transition-all cursor-pointer border border-stone-850 outline-none hover:scale-[1.02]"
            >
              <Wallet className="w-3.5 h-3.5 shrink-0 text-[#d5af66]" />
              <span>Peněženka</span>
            </button>
            
            {/* Desktop Auth Actions - Visible only on MD and larger screens next to the menu */}
            <div className="hidden md:flex items-center gap-2.5">
              {currentUser ? (
                <button
                  onClick={() => setView("dashboard")}
                  className="bg-brand-600 hover:bg-brand-700 text-white font-extrabold py-2 px-4 rounded-xl text-xs uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Zap className="w-4 h-4 fill-white text-white" />
                  Vstup do administrace
                </button>
              ) : (
                <>
                  <button
                    onClick={() => {
                      setAuthMode("login");
                      setIsLoginModalOpen(true);
                    }}
                    className="text-stone-500 hover:text-stone-900 font-bold text-xs uppercase tracking-wider py-2 px-3.5 cursor-pointer transition-colors"
                  >
                    Přihlásit se
                  </button>
                  <button
                    onClick={() => {
                      setAuthMode("register");
                      setIsLoginModalOpen(true);
                    }}
                    className="bg-brand-600 hover:bg-brand-700 text-white font-extrabold py-2 px-4 rounded-xl text-xs uppercase tracking-wider shadow-xs transition-all cursor-pointer"
                  >
                    Založit účet
                  </button>
                </>
              )}
            </div>

            {/* Hamburger / Menu Trigger - Visible across all screens */}
            <button
              onClick={() => setMobileMenuOpen(prev => !prev)}
              type="button"
              className="p-2.5 rounded-xl bg-stone-100 border border-stone-200 text-stone-700 transition-all hover:bg-stone-200/50 active:scale-95 cursor-pointer flex items-center gap-1.5 justify-center font-bold"
              aria-label="Menu"
            >
              {mobileMenuOpen ? (
                <>
                  <X className="w-5 h-5 stroke-[2.5]" />
                  <span className="hidden sm:inline text-xs uppercase tracking-wider font-extrabold">Zavřít</span>
                </>
              ) : (
                <>
                  <Menu className="w-5 h-5 stroke-[2.5]" />
                  <span className="hidden sm:inline text-xs uppercase tracking-wider font-extrabold">Menu</span>
                </>
              )}
            </button>
          </div>

        </div>

        {/* Elegant Animated Dropdown Drawer Overlay & Sheet for Mobile & Desktop */}
        {mobileMenuOpen && (
          <div className="border border-stone-200 bg-[#fbfbf9]/98 backdrop-blur-xl absolute top-[calc(100%-8px)] right-4 sm:right-6 lg:right-8 left-4 md:left-auto md:w-80 rounded-2xl shadow-xl z-50 animate-slideUp overflow-hidden">
            <div className="p-5 space-y-5">
              
              {/* Vertical stacked link paths */}
              <nav className="flex flex-col gap-2 font-bold text-stone-650">
                {[
                  { id: "home", label: "Úvod" },
                  { id: "problém-řešení", label: "Problém vs. Řešení" },
                  { id: "funkce", label: "Klíčové funkce" },
                  { id: "cenik", label: "Ceník" },
                  { id: "faq", label: "Časté dotazy" }
                ].map((l) => {
                  const isActive = landingSubView === l.id;
                  return (
                    <button
                      key={l.id}
                      onClick={() => {
                        setLandingSubView(l.id as any);
                        setMobileMenuOpen(false);
                      }}
                      className={`text-sm py-2 px-2 rounded-lg transition-all flex items-center justify-between font-semibold w-full text-left cursor-pointer ${
                        isActive 
                          ? "bg-brand-50 text-brand-700 font-extrabold" 
                          : "hover:bg-stone-50 hover:text-stone-900"
                      }`}
                    >
                      <span>{l.label}</span>
                      <span className={isActive ? "text-brand-500 font-extrabold" : "text-stone-400 text-xs"}>
                        {isActive ? "•" : "→"}
                      </span>
                    </button>
                  );
                })}
              </nav>

              {/* Action items stacked (shows auth actions natively inside drawer too for convenience/mobile) */}
              <div className="flex flex-col gap-2 pt-2 border-t border-[#e2e2df]">
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    setIsWalletOpen(true);
                  }}
                  className="w-full bg-[#fbfbf9] hover:bg-stone-50 text-stone-900 border border-stone-300 font-extrabold py-2.5 px-4 rounded-xl text-center shadow-xs transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-2 text-xs uppercase tracking-wider mb-1"
                >
                  <Wallet className="w-4 h-4 text-brand-600 shrink-0" />
                  Spinly Pay Peněženka
                </button>

                {currentUser ? (
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      setView("dashboard");
                    }}
                    className="w-full bg-brand-600 hover:bg-brand-700 text-white font-bold py-2.5 px-4 rounded-xl text-center transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-1.5 text-xs uppercase tracking-wider shadow-xs"
                  >
                    <Zap className="w-4 h-4 fill-white text-white" />
                    Otevřít Administraci
                  </button>
                ) : (
                  <>
                    <button
                      onClick={() => {
                        setMobileMenuOpen(false);
                        setAuthMode("register");
                        setIsLoginModalOpen(true);
                       }}
                      className="w-full bg-brand-600 hover:bg-brand-700 text-white font-bold py-2.5 px-4 rounded-xl text-center shadow-xs transition-all active:scale-95 cursor-pointer text-xs uppercase tracking-wider"
                    >
                      Zaregistrovat podnik zdarma
                    </button>
                    <button
                      onClick={() => {
                        setMobileMenuOpen(false);
                        setAuthMode("login");
                        setIsLoginModalOpen(true);
                      }}
                      className="w-full bg-white hover:bg-stone-50 text-stone-750 border border-stone-300 font-bold py-2.5 px-4 rounded-xl text-center transition-all active:scale-95 cursor-pointer text-xs uppercase tracking-wider"
                    >
                      Přihlásit se
                    </button>
                  </>
                )}
              </div>

            </div>
          </div>
        )}
      </header>

      {/* LANDING SUB PAGES SWITCHER */}
      {landingSubView === "home" && (
        <>
          {/* 2. Hero Section */}
          <section className="relative overflow-hidden pt-10 pb-16 lg:pt-16 lg:pb-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          {/* Segment fast personalized toggles */}
          <div className="flex flex-wrap items-center justify-center gap-1.5 mb-8">
            <span className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mr-2 font-mono">Váš obor:</span>
            {INDUSTRIES.map((ind) => {
              const isSelected = activeSegment.id === ind.id;
              return (
                <button
                  key={ind.id}
                  onClick={() => setActiveSegment(ind)}
                  className={`py-2 px-3.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border ${
                    isSelected 
                      ? "bg-brand-600 border-brand-500 text-white font-extrabold scale-[1.03] shadow-xs" 
                      : "bg-white border-stone-200 text-stone-605 hover:border-stone-300 hover:text-stone-850"
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
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-brand-50 text-brand-700 text-[10px] font-bold rounded-full uppercase tracking-widest mb-6 border border-brand-200">
              <Sparkles className="w-3.5 h-3.5 text-brand-555" />
              Slovenský a Český špičkový SaaS systém
            </div>

            <h1 className="text-3xl sm:text-5xl lg:text-7xl font-display font-black tracking-tight text-stone-900 leading-none">
              {currentCopy.h1}
            </h1>
            
            <p className="mt-6 text-sm sm:text-base text-stone-500 max-w-2xl mx-auto leading-relaxed font-semibold">
              {currentCopy.sub} Nechte své zákazníky rezervovat se <strong className="text-stone-800">samy 24/7</strong> bez nutnosti telefonování. Ušetřete až 12 hodin týdně díky automatizovaným <strong className="text-stone-850">dvoucestným SMS</strong>.
            </p>

            {/* Hledat salon nebo službu - Vyhledávač */}
            <div className="max-w-xl mx-auto mt-9 relative z-30">
              <div className="relative flex items-center bg-white border border-stone-250 hover:border-stone-400 focus-within:border-brand-500 focus-within:ring-3 focus-within:ring-brand-100 rounded-2xl shadow-sm transition-all">
                <Search className="w-5 h-5 text-stone-400 shrink-0 ml-4 stroke-[2.5]" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Hledat salon, město nebo službu (např. 'Bomton', 'Ostrava', 'střih')..."
                  className="w-full px-3 py-4 text-xs font-bold text-stone-900 border-none outline-none focus:ring-0 bg-transparent placeholder-stone-400 rounded-r-2xl"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="p-1 text-stone-400 hover:text-stone-700 cursor-pointer mr-3 hover:bg-stone-100 rounded-full transition-all"
                  >
                    <X className="w-4 h-4 stroke-[2.5]" />
                  </button>
                )}
              </div>



              {/* Dropdown with results */}
              {searchQuery.trim().length > 0 && (
                <div className="absolute left-0 right-0 top-full mt-2 bg-white border border-stone-200/90 rounded-2xl shadow-xl overflow-hidden z-50 text-left max-h-80 overflow-y-auto animate-fadeIn">
                  <div className="p-3 bg-stone-50/50 border-b border-stone-100 flex items-center justify-between text-xxs font-mono text-stone-400 font-extrabold uppercase tracking-wider">
                    <span>Výsledky vyhledávání pro: "{searchQuery}"</span>
                    <span>Nalezeno: {
                      salonsList.filter((s) => {
                        const q = searchQuery.toLowerCase();
                        const matchesName = s.businessName?.toLowerCase().includes(q);
                        const matchesContact = s.name?.toLowerCase().includes(q);
                        
                        let segments = "";
                        if (s.segment === "hair") segments = "kadeřnictví střih kadeřník barva kadeřnice barber olivový joshua";
                        else if (s.segment === "salon") segments = "kosmetika nehty manikúra pedikúra řasy krása bomton sparta clinic";
                        else if (s.segment === "massage") segments = "masáže masáž wellness thajská spa relaxace aura siam";
                        else if (s.segment === "physio") segments = "fyzioterapie rehabilitace záda blokády cvičení doktor chodov reha";
                        else if (s.segment === "fitness") segments = "posilovna fitness trenér cvičení trénink sport vlk";
                        else if (s.segment === "courts") segments = "tenis badminton squash hřiště tělocvična kurty štvanice";

                        const matchesSegment = segments.includes(q) || s.segment?.toLowerCase().includes(q);
                        return matchesName || matchesContact || matchesSegment;
                      }).length
                    }</span>
                  </div>

                  {(() => {
                    const filtered = salonsList.filter((s) => {
                      const q = searchQuery.toLowerCase();
                      const matchesName = s.businessName?.toLowerCase().includes(q);
                      const matchesContact = s.name?.toLowerCase().includes(q);
                      
                      let segments = "";
                      if (s.segment === "hair") segments = "kadeřnictví střih kadeřník barva kadeřnice barber olivový joshua";
                      else if (s.segment === "salon") segments = "kosmetika nehty manikúra pedikúra řasy krása bomton sparta clinic";
                      else if (s.segment === "massage") segments = "masáže masáž wellness thajská spa relaxace aura siam";
                      else if (s.segment === "physio") segments = "fyzioterapie rehabilitace záda blokády cvičení doktor chodov reha";
                      else if (s.segment === "fitness") segments = "posilovna fitness trenér cvičení trénink sport vlk";
                      else if (s.segment === "courts") segments = "tenis badminton squash hřiště tělocvična kurty štvanice";

                      const matchesSegment = segments.includes(q) || s.segment?.toLowerCase().includes(q);
                      return matchesName || matchesContact || matchesSegment;
                    });

                    if (filtered.length === 0) {
                      return (
                        <div className="p-6 text-center">
                          <p className="text-stone-500 font-bold text-xs">Žádanému vyhledávání neodpovídá žádný podnik k rezervaci.</p>
                          <p className="text-stone-400 text-[10px] mt-1 font-semibold">Zkuste zadat klíčové slovo jako např. "Bomton", "střih", "Ostrava" nebo "Arsov".</p>
                          
                          {/* Empty state details */}
                        </div>
                      );
                    }

                    return (
                      <div className="divide-y divide-stone-100">
                        {filtered.map((salon) => (
                          <div 
                            key={salon.id}
                            className="p-3.5 hover:bg-stone-50/70 flex items-center justify-between gap-4 transition-all"
                          >
                            <div className="flex items-center gap-3">
                              <div className="p-2 rounded-xl bg-brand-50 text-brand-600 border border-brand-100 shadow-xxs">
                                {salon.segment === "hair" ? (
                                  <Scissors className="w-4 h-4 stroke-[2.5]" />
                                ) : salon.segment === "physio" ? (
                                  <Activity className="w-4 h-4 stroke-[2.5]" />
                                ) : (
                                  <CalendarCheck className="w-4 h-4 stroke-[2.5]" />
                                )}
                              </div>
                              <div className="min-w-0">
                                <h5 className="font-extrabold text-stone-900 text-xs truncate">{salon.businessName}</h5>
                                <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] text-stone-500 font-semibold">
                                  <span className="uppercase font-extrabold text-brand-700 bg-brand-50/50 px-1 py-0.5 rounded text-[9px] border border-brand-100/50">
                                    {salon.segment === "hair" && "Kadeřnictví & Barber"}
                                    {salon.segment === "salon" && "Kosmetický Salon"}
                                    {salon.segment === "massage" && "Masáže & Spa"}
                                    {salon.segment === "physio" && "Fyzioterapie"}
                                    {salon.segment === "fitness" && "Osobní trénink"}
                                    {salon.segment === "courts" && "Sportoviště"}
                                    {salon.segment === "other" && "Služby"}
                                  </span>
                                  <span>•</span>
                                  <span>{salon.name}</span>
                                </div>
                              </div>
                            </div>

                            <button
                              onClick={() => {
                                setSelectedBusinessId(salon.id);
                                setView("client-booking");
                              }}
                              className="bg-[#242424] hover:bg-black text-white shrink-0 font-extrabold px-3 py-1.5 rounded-xl text-[10px] uppercase tracking-wider flex items-center gap-1 cursor-pointer transition-all active:scale-95 shadow-xs"
                            >
                              <span>Rezervovat</span>
                              <ArrowRight className="w-3 h-3 stroke-[2.5]" />
                            </button>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>

            {/* Main Action Buttons */}
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
              <button
                onClick={() => openLeadForPlan("Pro")}
                className="w-full sm:w-auto bg-brand-600 hover:bg-brand-700 text-white font-bold px-8 py-4 rounded-xl text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all transform hover:-translate-y-0.5 cursor-pointer shadow-md"
              >
                Vyzkoušet Spinly zdarma
                <ArrowRight className="w-4 h-4" />
              </button>
              
              <a 
                href="#demo-showcase"
                onClick={scrollToDemo}
                className="w-full sm:w-auto bg-white border border-stone-250 text-stone-705 hover:bg-stone-50 font-bold px-8 py-4 rounded-xl text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-xs"
              >
                <Clock className="w-4 h-4 text-brand-600 animate-pulse" />
                Jak to funguje? (Ukázka)
              </a>
            </div>

            {/* Badges footer info */}
            <div className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xxs font-bold text-stone-400 uppercase tracking-widest font-mono">
              <span className="flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-brand-600 stroke-[3]" /> 14 dní zdarma na zkoušku
              </span>
              <span className="flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-brand-600 stroke-[3]" /> Bez vkládání platební karty
              </span>
              <span className="flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-brand-600 stroke-[3]" /> Rychlé nastavení za 5 min
              </span>
            </div>
          </div>

          {/* Interactive Demo Block matches premium craft guidelines */}
          <div className="mt-12 group transition-all duration-300">
            <InteractiveShowcase />
          </div>

        </div>
      </section>

      {/* 3. Social Proof Stats Row */}
      <section className="py-12 border-y border-stone-200/60 bg-stone-50/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 text-center">
            
            <div className="p-2 relative">
              <p className="text-3xl md:text-5xl font-display font-black text-brand-700 tracking-tight">
                {bookingCounter.toLocaleString("cs-CZ")}
              </p>
              <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mt-2 flex items-center justify-center gap-1.5 font-mono">
                <span className="w-2 h-2 bg-brand-500 rounded-full animate-ping" />
                Celkem rezervací
              </p>
            </div>

            <div className="p-2">
              <p className="text-3xl md:text-5xl font-display font-black text-brand-700 tracking-tight">-92 %</p>
              <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mt-2 font-mono">Zapomenutých schůzek</p>
            </div>

            <div className="p-2">
              <p className="text-3xl md:text-5xl font-display font-black text-brand-700 tracking-tight">12+ hod</p>
              <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mt-2 font-mono">Ušetřeného času týdně</p>
            </div>

            <div className="p-2">
              <p className="text-3xl md:text-5xl font-display font-black text-brand-700 tracking-tight">99.8 %</p>
              <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mt-2 font-mono">Spolehlivost SMS</p>
            </div>

          </div>
        </div>
      </section>
        </>
      )}

      {landingSubView === "problém-řešení" && (
        <>
          {/* 4. PAS - Problem vs Solution Section */}
          <section id="problém-řešení" className="py-20 lg:py-28 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="text-[10px] font-bold text-brand-700 uppercase tracking-widest bg-brand-50 px-3.5 py-1.5 rounded-full border border-brand-200 font-mono">
              Tradiční Chaos vc. Moderní Klid
            </span>
            <h2 className="text-2xl sm:text-4xl font-display font-black text-stone-900 mt-4 tracking-tight">
              Proč stále plánovat služby ručně a ztrácet čas i peníze?
            </h2>
            <p className="text-stone-500 text-xs md:text-sm mt-3 max-w-2xl mx-auto leading-relaxed font-semibold">
              Zvonící telefony uprostřed rozdělané práce, zapomenuté termíny a přeplněný, nečitelný papírový diář. Tam venku je zbytečný zmatek. Spinly vám vrátí stoprocentní kontrolu.
            </p>

            {/* Selector for PAS elements */}
            <div className="inline-flex mt-8 p-1 bg-stone-100 border border-stone-200 rounded-xl">
              <button
                onClick={() => setPasTab("chaos")}
                className={`px-5 py-2 rounded-lg text-xxs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                  pasTab === "chaos" 
                    ? "bg-rose-50 text-rose-700 border border-rose-200/80 font-black" 
                    : "text-stone-500 hover:text-stone-850"
                }`}
              >
                Tradiční cesta (Chaos)
              </button>
              <button
                onClick={() => setPasTab("spinly")}
                className={`px-5 py-2 rounded-lg text-xxs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                  pasTab === "spinly" 
                    ? "bg-brand-600 text-white font-black" 
                    : "text-stone-500 hover:text-stone-850"
                }`}
              >
                Cesta se Spinly (Klid)
              </button>
            </div>
          </div>

          {/* Side-by-side PAS Presentation Container */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            
            {/* Column A: Chaos Path */}
            <div className={`border rounded-3xl p-6 md:p-8 transition-all duration-300 ${
              pasTab === "chaos" 
                ? "border-rose-300 bg-rose-50/20 ring-1 ring-rose-250/20 scale-[1.01]" 
                : "border-stone-200 bg-white opacity-40 hover:opacity-100"
            }`}>
              <div className="flex items-center gap-3 border-b border-rose-100 pb-4 mb-6">
                <div className="bg-rose-50 text-rose-600 p-2.5 rounded-xl border border-rose-100">
                  <AlertCircle className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <h4 className="text-base font-bold text-stone-900 font-display">Papírové a ruční plánování</h4>
                  <p className="text-[10px] text-rose-600 font-mono font-bold uppercase tracking-wider">Ztrácí čas a tržby</p>
                </div>
              </div>

              <ul className="space-y-4">
                {[
                  {
                    title: "Zákazníci zapomínají schůzky",
                    text: "Klienti si nezapíšou termín, spletou si datum a nedorazí. Vaše židle zůstává prázdná a tržba je navždy pryč."
                  },
                  {
                    title: "Uvolněné chvilky rušeny zprávami",
                    text: "Během stříhání nebo masáže neustále drnčí telefon. Musíte pokaždé přerušit klienta nebo naopak riskovat ztrátu nového."
                  },
                  {
                    title: "Diář uzamčený v budově salonu",
                    text: "Nemáte přístup k diáři z domu ani na cestách. Když chce zákazník změnit čas o víkendu, musíte jet do salonu."
                  }
                ].map((item, index) => (
                  <li key={index} className="flex gap-3">
                    <span className="w-5 h-5 rounded-full bg-rose-50 text-rose-600 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5 border border-rose-150">✕</span>
                    <div>
                      <strong className="block text-xs uppercase tracking-wide text-rose-800 font-extrabold">{item.title}</strong>
                      <span className="text-xs text-stone-500 mt-0.5 block leading-relaxed font-semibold">{item.text}</span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            {/* Column B: Spinly Path */}
            <div className={`border rounded-3xl p-6 md:p-8 transition-all duration-300 ${
              pasTab === "spinly" 
                ? "border-brand-300 bg-brand-50/15 ring-2 ring-brand-500/10 scale-[1.01]" 
                : "border-stone-200 bg-white opacity-40 hover:opacity-100"
            }`}>
              <div className="flex items-center gap-3 border-b border-stone-100 pb-4 mb-6">
                <div className="bg-brand-50 text-brand-700 p-2.5 rounded-xl border border-brand-100">
                  <ShieldCheck className="w-5 h-5 text-brand-600" />
                </div>
                <div>
                  <h4 className="text-base font-bold text-stone-900 font-display">Automatizace se Spinly</h4>
                  <p className="text-[10px] text-brand-700 font-mono font-bold uppercase tracking-wider">Klid, pořádek a jistota</p>
                </div>
              </div>

              <ul className="space-y-4">
                {[
                  {
                    title: "No-show problém stoprocentně vyřešen",
                    text: "Chytrý SMS asistent pošle přesné potvrzení a připomínku. Lidé chodí přesně a vy vyděláváte každou hodinu."
                  },
                  {
                    title: "Rezervování pokračuje, i když spíte",
                    text: "Více než 45 % klientů se objednává večer, o víkendu nebo v noci, když u vás nesvítí světlo. Spinly pracuje 24/7."
                  },
                  {
                    title: "Kalendář nonstop s vámi",
                    text: "Mobilní rozhraní vás propojí přímo z domu, z pláže i z tramvaje. Vždy víte, kolik si zítra vyděláte peněz."
                  }
                ].map((item, index) => (
                  <li key={index} className="flex gap-3">
                    <span className="w-5 h-5 rounded-full bg-brand-50 text-brand-650 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5 border border-brand-200 font-extrabold">✓</span>
                    <div>
                      <strong className="block text-xs uppercase tracking-wide text-brand-850 font-extrabold">{item.title}</strong>
                      <span className="text-xs text-stone-500 mt-0.5 block leading-relaxed font-semibold">{item.text}</span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

          </div>

          {/* Srovnání s konkurencí aneb Proč Spinly nemá konkurenci */}
          <div className="mt-24 space-y-12">
            <div className="text-center max-w-3xl mx-auto space-y-3">
              <span className="text-[10px] font-bold text-brand-705 uppercase tracking-widest bg-brand-50 px-3.5 py-1.5 rounded-full border border-brand-200 font-mono">
                Srovnávací tabulka
              </span>
              <h3 className="text-2xl sm:text-3xl font-display font-black text-stone-900 tracking-tight">
                V čem se Spinly liší od konkurence?
              </h3>
              <p className="text-stone-500 text-xs md:text-sm leading-relaxed max-w-xl mx-auto font-semibold">
                Navrhli jsme celý systém tak, aby odboural složité registrace a fungoval tak hladce a rychle, jak je to v roce 2026 technicky možné.
              </p>
            </div>

            {/* Premium Interactive Comparison Grid */}
            <div className="max-w-5xl mx-auto bg-white border border-stone-200/60 rounded-3xl overflow-hidden shadow-xs relative">
              
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[700px]">
                  <thead>
                    <tr className="border-b border-stone-200 bg-stone-50/60">
                      <th className="py-5 px-6 text-[10px] font-bold text-stone-400 uppercase tracking-widest w-1/3 font-mono">Vlastnost / Funkce</th>
                      <th className="py-5 px-6 text-xs font-bold text-brand-700 bg-brand-50/30 relative">
                        <span className="absolute top-0 inset-x-0 h-0.5 bg-brand-600" />
                        ✨ Spinly (Moderní kalendář)
                      </th>
                      <th className="py-5 px-6 text-[10px] font-bold text-stone-405 uppercase tracking-widest font-mono">Staré složité kalendáře</th>
                      <th className="py-5 px-6 text-[10px] font-bold text-stone-405 uppercase tracking-widest font-mono">Papírový diář</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-150 text-xs">
                    {[
                      {
                        feat: "Rychlost a jednoduchost pro klienty",
                        spinly: "Rezervace na 3 kliknutí (do 12 sekund). Bez nucených registrací a pamatování hesel.",
                        legacy: "Složité vytváření profilů a ověřování e-mailu předem.",
                        papir: "Nutnost zdlouhavě volat, hledat termín v sešitu."
                      },
                      {
                        feat: "Terminologie ušitá na míru oboru",
                        spinly: "Modulární šablony – kadeřnice vidí kadeřnice, tenisový klub hřiště, fyzioterapeut terapeuta.",
                        legacy: "Zastaralé univerzální názvosloví, které mate zákazníky.",
                        papir: "Záleží čistě na tom, jak úhledně si to sami nadepíšete."
                      },
                      {
                        feat: "SMS a WhatsApp připomínky",
                        spinly: "Automatické upomínky doručované s 99.8% úspěšností.",
                        legacy: "Pouze zapadající maily, nebo drahé SMS s nutností nákupu kreditů.",
                        papir: "Úplně chybí. Hrozí prázdný čas."
                      },
                      {
                        feat: "Osobní asistence s nastavením v češtině",
                        spinly: "Telefonická podpora zdarma. Naši specialisté vám pomohou vše vyladit.",
                        legacy: "Neosobní e-mailová podpora v cizím jazyce, odpovědi trvají dny.",
                        papir: "Záleží jen na vás."
                      }
                    ].map((row, idx) => (
                      <tr key={idx} className="hover:bg-stone-50/50 transition-colors">
                        <td className="py-4.5 px-6 font-bold text-stone-900 text-xs">{row.feat}</td>
                        <td className="py-4.5 px-6 font-semibold text-brand-850 bg-brand-50/15">
                          <div className="flex items-start gap-2">
                            <span className="w-4 h-4 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center shrink-0 font-extrabold border border-brand-200 text-[10px]">✓</span>
                            <span>{row.spinly}</span>
                          </div>
                        </td>
                        <td className="py-4.5 px-6 text-stone-500 text-xs font-semibold">
                          <div className="flex items-start gap-1.5">
                            <span className="text-amber-600 text-[11px] shrink-0">⚠️</span>
                            <span>{row.legacy}</span>
                          </div>
                        </td>
                        <td className="py-4.5 px-6 text-stone-500 text-xs font-semibold">
                          <div className="flex items-start gap-1.5">
                            <span className="text-rose-500 text-[11px] shrink-0">✕</span>
                            <span>{row.papir}</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="bg-stone-50 text-[#555552] p-5 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs border-t border-stone-200">
                <span className="font-bold text-stone-900">🔥 Připojte se ke stovkám úspěšných CZ a SK studií již dnes!</span>
                <button
                  type="button"
                  onClick={() => openLeadForPlan("Pro")}
                  className="bg-brand-600 hover:bg-brand-700 text-white font-black py-2.5 px-6 rounded-xl transition-all cursor-pointer text-xxs uppercase tracking-wider shadow-sm"
                >
                  Začít používat Spinly teď
                </button>
              </div>
            </div>
          </div>

          <div className="mt-12 bg-brand-50/30 border border-brand-100 rounded-2xl p-5 text-center max-w-3xl mx-auto">
            <p className="text-xs text-brand-850 leading-relaxed font-semibold">
              💡 <strong>Statistický fakt z praxe:</strong> Salony přecházející na rezervační systém Spinly hlásí v průměru <strong>24% nárůst tržeb</strong> hned v prvních dvou měsících díky automatizovanému vyplňování zrušených časů.
            </p>
          </div>

          {/* Section Navigation Buttons */}
          <div className="mt-16 text-center flex flex-col sm:flex-row items-center justify-center gap-4 max-w-md mx-auto">
            <button
              onClick={() => { setLandingSubView("funkce"); }}
              className="w-full bg-brand-600 hover:bg-brand-700 text-white font-extrabold py-3.5 px-8 rounded-xl text-xs uppercase tracking-wider shadow-sm cursor-pointer"
            >
              Pokračovat na Klíčové funkce →
            </button>
            <button
              onClick={() => { setLandingSubView("home"); }}
              className="w-full bg-white border border-stone-200 text-stone-605 hover:bg-stone-50 font-bold py-3.5 px-8 rounded-xl text-xs uppercase tracking-wider cursor-pointer"
            >
              Zpět na úvod
            </button>
          </div>

        </div>
      </section>
        </>
      )}

      {landingSubView === "funkce" && (
        <>
          {/* 5. Key Features Grid */}
          <section id="funkce" className="py-16 lg:py-24 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="text-[10px] font-bold text-brand-700 uppercase tracking-widest bg-brand-50 px-3.5 py-1.5 rounded-full border border-brand-200 font-mono">
              Kompletní výbava
            </span>
            <h2 className="text-2xl sm:text-4xl font-display font-black text-stone-900 mt-4 tracking-tight">
              Všechny funkce pro váš růst v jedné appce
            </h2>
            <p className="text-stone-500 text-xs md:text-sm mt-3 font-semibold">
              Zapomeňte na instalaci složitých programů. Spinly je blesková webová platforma plně připravená pro provoz na mobilu i počítači.
            </p>
          </div>

          {/* Features Grid layout block */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {FEATURES.map((feat) => {
              return (
                <div 
                  key={feat.id}
                  className="bg-white hover:bg-brand-50/10 border border-stone-200 hover:border-brand-300 p-6 rounded-2xl transition-all hover:scale-[1.01] shadow-xs group"
                >
                  <div className="bg-stone-50 group-hover:bg-brand-50 text-brand-700 w-12 h-12 rounded-xl flex items-center justify-center border border-stone-200 transition-colors">
                    {feat.iconName === "CalendarRange" && <Calendar className="w-5 h-5 text-brand-600" />}
                    {feat.iconName === "MessageSquareText" && <MessageSquare className="w-5 h-5 text-brand-600" />}
                    {feat.iconName === "UsersRound" && <UsersRound className="w-5 h-5 text-brand-600" />}
                    {feat.iconName === "FileSpreadsheet" && <FileSpreadsheet className="w-5 h-5 text-brand-600" />}
                  </div>

                  <h3 className="text-base font-extrabold font-display text-stone-900 mt-5 mb-2">
                    {feat.title}
                  </h3>
                  
                  <p className="text-xs text-stone-500 leading-relaxed font-semibold">
                    {feat.description}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Section Navigation Buttons */}
          <div className="mt-16 text-center flex flex-col sm:flex-row items-center justify-center gap-4 max-w-md mx-auto">
            <button
              onClick={() => { setLandingSubView("cenik"); }}
              className="w-full bg-brand-600 hover:bg-brand-700 text-white font-extrabold py-3.5 px-8 rounded-xl text-xs uppercase tracking-wider shadow-sm cursor-pointer"
            >
              Zobrazit Ceník a Tarify →
            </button>
            <button
              onClick={() => { setLandingSubView("home"); }}
              className="w-full bg-white border border-stone-200 text-stone-605 hover:bg-stone-50 font-bold py-3.5 px-8 rounded-xl text-xs uppercase tracking-wider cursor-pointer"
            >
              Zpět na úvod
            </button>
          </div>

        </div>
      </section>
        </>
      )}

      {landingSubView === "cenik" && (
        <>
          {/* 7. Pricing Configurator Section */}
          <section id="cenik" className="py-20 lg:py-28 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-2xl mx-auto mb-10">
            <span className="text-[10px] font-bold text-brand-700 uppercase tracking-widest bg-brand-50 px-3.5 py-1.5 rounded-full border border-brand-200 font-mono">
              Fér tarify
            </span>
            <h2 className="text-2xl sm:text-4xl font-display font-black text-stone-900 mt-4 tracking-tight">
              Jasné ceny bez skrytých poplatků
            </h2>
            <p className="text-stone-500 text-xs md:text-sm mt-3 font-semibold">
              Vyberte si balíček odpovídající velikosti vašeho podnikání. Kdykoliv můžete přejít výše, snížit tarif nebo změnit předplatné.
            </p>

            {/* Interactive Billing Period Toggle */}
            <div className="mt-8 inline-flex items-center gap-2 bg-stone-100 border border-stone-200 p-1.5 rounded-xl font-bold">
              <button
                type="button"
                onClick={() => setBillingPeriod("monthly")}
                className={`px-4 py-2 rounded-lg text-xxs font-black uppercase tracking-wider transition-all cursor-pointer ${
                  billingPeriod === "monthly" 
                    ? "bg-white text-stone-900 border border-stone-205 shadow-xs font-bold" 
                    : "text-stone-400 hover:text-stone-800"
                }`}
              >
                Měsíční platba
              </button>
              
              <button
                type="button"
                onClick={() => setBillingPeriod("yearly")}
                className={`px-4 py-2 rounded-lg text-xxs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer ${
                  billingPeriod === "yearly" 
                    ? "bg-brand-600 text-white font-bold" 
                    : "text-stone-400 hover:text-stone-850"
                }`}
              >
                Roční platba
                <span className="bg-stone-50 text-brand-700 text-[8px] font-black px-1.5 py-0.5 rounded uppercase font-mono tracking-tighter shrink-0 border border-stone-200">
                  Ušetříte 20%
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
                      ? "border-brand-500 ring-2 ring-brand-500/20 shadow-xs scale-[1.03] z-10" 
                      : "border-stone-200 hover:border-stone-300 shadow-xs"
                  }`}
                >
                  
                  {/* Popular tag */}
                  {plan.isPopular && (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-brand-600 text-white text-[9px] font-bold px-3.5 py-1 rounded-full uppercase tracking-widest font-mono">
                      Doporučujeme
                    </span>
                  )}

                  <div>
                    <h3 className="text-lg font-extrabold font-display text-stone-900 uppercase tracking-tight">{plan.name}</h3>
                    <p className="text-xs text-stone-500 mt-1 min-h-[30px] leading-relaxed font-semibold">{plan.description}</p>
                    
                    {/* Price Tag */}
                    <div className="my-6">
                      {hasPrice ? (
                        <div className="flex items-baseline gap-1">
                          <span className="text-3xl sm:text-4xl font-display font-black text-stone-900">
                            {currentPrice} Kč
                          </span>
                          <span className="text-xs text-stone-400 font-bold font-semibold">/ měsíc</span>
                        </div>
                      ) : (
                        <span className="text-3xl sm:text-4xl font-display font-black text-stone-900">Zdarma</span>
                      )}
                      
                      <p className="text-[10px] text-brand-600 mt-1 font-mono uppercase tracking-widest font-bold">
                        {billingPeriod === "yearly" && hasPrice ? "Celkem " + (currentPrice * 12) + " Kč ročně" : "Zkušební doba zdarma"}
                      </p>
                    </div>

                    <div className="border-t border-stone-100 pt-6">
                      <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest font-mono mb-3">Co vše je v ceně:</p>
                      
                      <ul className="space-y-2.5">
                        {plan.features.map((feat, index) => (
                          <li key={index} className="flex items-start gap-2 text-xs text-stone-605 leading-relaxed font-semibold font-medium">
                            <Check className="w-4 h-4 text-brand-600 stroke-[3] shrink-0 mt-0.5" />
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
                      className={`w-full py-3 px-6 rounded-xl text-xs uppercase tracking-wider font-extrabold transition-all cursor-pointer ${
                        plan.isPopular 
                          ? "bg-brand-600 hover:bg-brand-700 text-white shadow-xs" 
                          : "bg-stone-50 hover:bg-stone-100 text-stone-705 border border-stone-250"
                      }`}
                    >
                      {plan.cta}
                    </button>
                  </div>

                </div>
              );
            })}
          </div>

          <div className="mt-8 text-center text-[10px] text-stone-400 font-bold uppercase tracking-wide font-mono">
            * Uvedené ceny jsou konečné roční pro bezstarostné podnikání. Aktivujeme ihned.
          </div>

          {/* Section Navigation Buttons */}
          <div className="mt-16 text-center flex flex-col sm:flex-row items-center justify-center gap-4 max-w-md mx-auto">
            <button
              onClick={() => { setLandingSubView("faq"); }}
              className="w-full bg-brand-600 hover:bg-brand-700 text-white font-extrabold py-3.5 px-8 rounded-xl text-xs uppercase tracking-wider shadow-sm cursor-pointer"
            >
              Pokračovat na Časté dotazy →
            </button>
            <button
              onClick={() => { setLandingSubView("home"); }}
              className="w-full bg-white border border-stone-200 text-stone-605 hover:bg-stone-50 font-bold py-3.5 px-8 rounded-xl text-xs uppercase tracking-wider cursor-pointer"
            >
              Zpět na úvod
            </button>
          </div>

        </div>
      </section>
        </>
      )}

      {landingSubView === "faq" && (
        <>
          {/* 8. Accordion Section */}
          <section id="faq" className="py-20 lg:py-28 relative bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-2xl mx-auto mb-14">
            <span className="text-[10px] font-bold text-brand-700 uppercase tracking-widest bg-brand-50 px-3.5 py-1.5 rounded-full border border-brand-200 font-mono">
              Odpovědi na otázky
            </span>
            <h2 className="text-2xl sm:text-4xl font-display font-black text-stone-900 mt-4 tracking-tight">
              Často kladené otázky (FAQ)
            </h2>
            <p className="text-stone-500 text-xs md:text-sm mt-3 font-semibold">
              Máte pochybnosti? Zde najdete srozumitelné odpovědi na nejčastější obavy majitelů českých studií před spuštěním.
            </p>
          </div>

          {/* Faq rendering module */}
          <FaqSection />

        </div>

        {/* Section Navigation Buttons */}
        <div className="mt-16 text-center flex flex-col sm:flex-row items-center justify-center gap-4 max-w-md mx-auto">
          <button
            onClick={() => { openLeadForPlan("Pro"); }}
            className="w-full bg-brand-600 hover:bg-brand-700 text-white font-extrabold py-3.5 px-8 rounded-xl text-xs uppercase tracking-wider shadow-sm cursor-pointer animate-pulse"
          >
            Vyzkoušet na 14 dní zdarma teď!
          </button>
          <button
            onClick={() => { setLandingSubView("home"); }}
            className="w-full bg-white border border-stone-200 text-stone-605 hover:bg-stone-50 font-bold py-3.5 px-8 rounded-xl text-xs uppercase tracking-wider cursor-pointer"
          >
            Zpět na úvod
          </button>
        </div>

      </section>
        </>
      )}

      {/* 9. Final CTA conversion block */}
      {landingSubView === "home" && (
        <section className="relative py-20 lg:py-28 overflow-hidden text-center select-none bg-[#FAF9F5] border-y border-stone-200/80">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
            
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-brand-50 border border-brand-200 rounded-full text-[10px] font-bold uppercase tracking-widest text-brand-700 font-mono">
              <Shield className="w-3.5 h-3.5 text-brand-600" />
              Aktivace bez platební karty, okamžitý klid
            </div>

            <h2 className="text-3xl sm:text-5xl font-display font-black tracking-tight leading-tight text-stone-900">
              Stop telefonování. Začněte šetřit 12 hodin týdně.
            </h2>
            
            <p className="text-xs sm:text-sm text-stone-500 max-w-2xl mx-auto leading-relaxed font-semibold">
              Vyzkoušejte nejpopulárnější kadeřnický a salonní asistent Spinly na 14 dní bezplatně. Odbourejte zapomenuté rezervace a soustřeďte se čistě na klientský zážitek.
            </p>

            <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3.5 max-w-md mx-auto">
              <button
                onClick={() => openLeadForPlan("Pro")}
                className="w-full bg-brand-600 hover:bg-brand-700 text-white font-extrabold py-4 px-8 rounded-xl text-xs uppercase tracking-wider shadow-sm transition-all pointer-events-auto transform hover:-translate-y-0.5 cursor-pointer"
              >
                Získat zkušební verzi na 14 dní zdarma
              </button>
            </div>

            <div className="flex items-center justify-center gap-5 text-stone-400 text-xxs font-bold uppercase tracking-wider pt-2 font-mono">
              <span>✓ Nastavení zabere 5 min</span>
              <span className="w-1.5 h-1.5 bg-stone-300 rounded-full" />
              <span>✓ Česká linka podpory</span>
              <span className="w-1.5 h-1.5 bg-stone-300 rounded-full" />
              <span>✓ Bez závazků</span>
            </div>

          </div>
        </section>
      )}

      {/* 10. Styled footer conforming with terms and gdpr guidelines */}
      <footer className="py-12 md:py-16 border-t border-stone-200 bg-stone-50 text-stone-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
            
            {/* Branding Column */}
            <div className="space-y-4 md:col-span-1">
              <div className="flex items-center gap-2">
                <div className="bg-brand-600 text-white p-2.5 rounded-lg">
                  <CalendarCheck className="w-4 h-4" />
                </div>
                <span className="text-lg font-display font-extrabold text-stone-900">Spinly</span>
              </div>
              <p className="text-xs text-stone-500 leading-relaxed font-semibold">
                Slovenský a Český inteligentní rezervační motor pro plynulý chod salonů, kadeřnictví, sportovišť i ordinací.
              </p>
            </div>

            {/* Links Columns */}
            <div>
              <h4 className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-4 font-mono">Obsah</h4>
              <ul className="space-y-2.5 text-xs text-stone-605 font-semibold flex flex-col items-start">
                <li><button onClick={() => { setLandingSubView("problém-řešení"); window.scrollTo({ top: 0, behavior: "smooth" }); }} className="hover:text-brand-700 transition-colors cursor-pointer text-left">Problém vs. Řešení</button></li>
                <li><button onClick={() => { setLandingSubView("funkce"); window.scrollTo({ top: 0, behavior: "smooth" }); }} className="hover:text-brand-700 transition-colors cursor-pointer text-left">Klíčové funkce</button></li>
                <li><button onClick={() => { setLandingSubView("cenik"); window.scrollTo({ top: 0, behavior: "smooth" }); }} className="hover:text-brand-700 transition-colors cursor-pointer text-left">Tarify &amp; Ceník</button></li>
                <li><button onClick={() => { setLandingSubView("faq"); window.scrollTo({ top: 0, behavior: "smooth" }); }} className="hover:text-brand-700 transition-colors cursor-pointer text-left">Časté dotazy</button></li>
              </ul>
            </div>

            <div>
              <h4 className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-4 font-mono">Legislativa</h4>
              <ul className="space-y-2.5 text-xs text-stone-605 font-semibold">
                <li>
                  <a 
                    href="#gdpr" 
                    onClick={(e) => { e.preventDefault(); alert("Zpracování osobních údajů (GDPR):\nVšechna zadaná data v tomto systému podléhají šifrování dle certifikace GDPR a jsou uložena v zabezpečených evropských datacentrech. Vaše kontakty nikdy neposkytujeme k reklamním účelům třetích stran."); }}
                    className="hover:text-brand-700 transition-colors"
                  >
                    Ochrana osobních údajů (GDPR)
                  </a>
                </li>
                <li>
                  <a 
                    href="#terms" 
                    onClick={(e) => { e.preventDefault(); alert("Obchodní podmínky Spinly:\nRegistrace je dobrovolná. Po dobu 14 dní je systém plně zdarma bez jakýchkoliv závazků. Služba je poskytována na principu Software as a Service (SaaS)."); }}
                    className="hover:text-brand-700 transition-colors"
                  >
                    Všeobecné obchodní podmínky
                  </a>
                </li>
                <li>
                  <a 
                    href="#cookies" 
                    onClick={(e) => { e.preventDefault(); alert("Zásady cookies:\nPoužíváme pouze nezbytná funkční cookies pro přihlášení a uchování vaší zkušební relace."); }}
                    className="hover:text-brand-700 transition-colors"
                  >
                    Zásady Cookies
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-4 font-mono">Kontakt doručitelnosti</h4>
              <ul className="space-y-2.5 text-xs text-stone-605 font-semibold">
                <li className="flex items-center gap-2 font-bold text-brand-700">
                  <PhoneCall className="w-3.5 h-3.5 text-brand-600" />
                  +420 234 567 890
                </li>
                <li className="flex items-center gap-1.5 text-stone-500">
                  <span className="text-stone-400 font-mono">E-mail:</span>
                  <a href="mailto:info@spinly.cz" className="hover:text-brand-700 transition-colors underline">info@spinly.cz</a>
                </li>
                <li className="text-[10px] text-stone-400 leading-normal pt-1 font-mono">
                  Spinly Technologies s.r.o.<br />
                  Rybná 716/24, Staré Město<br />
                  110 00 Praha 1, IČ: 12345678
                </li>
              </ul>
            </div>

          </div>

          {/* Decent bottom copyright statement matches high security branding rules */}
          <div className="border-t border-stone-200 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-stone-400 font-bold uppercase tracking-wider font-mono">
            <p>© {new Date().getFullYear()} Spinly. Všechna práva vyhrazena. Navrženo pro prosperující CZ a SK studia.</p>
            <div className="flex items-center gap-3 text-brand-700/80">
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

      {/* 11b. Spinly Pay Wallet Modal Overlay */}
      <WalletModal 
        isOpen={isWalletOpen} 
        onClose={() => setIsWalletOpen(false)} 
        onOpenAuth={(mode) => {
          setAuthMode(mode);
          setIsLoginModalOpen(true);
        }}
      />

      {/* 12. Multi-Merchant Account Authorization Dialog */}
      {isLoginModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-[#FAF9F5] rounded-3xl border border-stone-200 p-6 md:p-8 w-full max-w-md shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-brand-600" />
            
            {/* Close button */}
            <button 
              onClick={() => { setIsLoginModalOpen(false); setAuthError(""); }}
              className="absolute top-4 right-4 text-stone-400 hover:text-stone-900 font-extrabold text-xl p-1 leading-none select-none"
            >
              ✕
            </button>

            {/* Core Header */}
            <div className="text-center space-y-1.5 mb-6">
              <div className="bg-brand-50 text-brand-700 font-bold p-3 rounded-2xl w-fit mx-auto mb-2 border border-brand-150">
                <Scissors className="w-5 h-5 text-brand-600" />
              </div>
              <h3 className="text-xl font-display font-extrabold text-stone-900">
                {authMode === "login" 
                  ? "Vstup do administrace" 
                  : authAccountType === "customer" 
                    ? "Registrace zákazníka" 
                    : "Založení bezplatného účtu"}
              </h3>
              <p className="text-xs text-stone-500 leading-relaxed font-semibold">
                {authMode === "login" 
                  ? "Spravujte své rezervace a zákazníky na jednom místě." 
                  : authAccountType === "customer"
                    ? "Získejte 1 000 Kč bonus k registraci a plaťte v salonech přes Spinly Pay!"
                    : "Získejte kompletní rezervační kalendář zdarma na 14 dní."}
              </p>
            </div>

            {/* Form Toggle Tabs switcher */}
            <div className="flex border-b border-stone-200 pb-3 mb-4 select-none">
              <button
                type="button"
                onClick={() => { setAuthMode("login"); setAuthError(""); }}
                className={`flex-1 text-center pb-2 text-xs font-black uppercase tracking-wider transition-all border-b-2 cursor-pointer ${
                  authMode === "login" 
                    ? "border-brand-600 text-brand-700" 
                    : "border-transparent text-stone-400 hover:text-stone-600"
                }`}
              >
                Přihlášení
              </button>
              <button
                type="button"
                onClick={() => { setAuthMode("register"); setAuthError(""); }}
                className={`flex-1 text-center pb-2 text-xs font-black uppercase tracking-wider transition-all border-b-2 cursor-pointer ${
                  authMode === "register" 
                    ? "border-brand-600 text-brand-700" 
                    : "border-transparent text-stone-400 hover:text-stone-600"
                }`}
              >
                Registrace
              </button>
            </div>

            {/* Account Type Selector for Register Mode */}
            {authMode === "register" && (
              <div className="bg-stone-100 p-1 rounded-2xl flex items-center mb-4 border border-stone-200/50">
                <button
                  type="button"
                  onClick={() => setAuthAccountType("customer")}
                  className={`flex-1 text-center py-2.5 text-[10px] font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer ${
                    authAccountType === "customer"
                      ? "bg-stone-900 text-[#d5af66] shadow-sm"
                      : "text-stone-500 hover:text-stone-700"
                  }`}
                >
                  🙋‍♂️ Jsem zákazník
                </button>
                <button
                  type="button"
                  onClick={() => setAuthAccountType("partner")}
                  className={`flex-1 text-center py-2.5 text-[10px] font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer ${
                    authAccountType === "partner"
                      ? "bg-brand-600 text-white shadow-sm"
                      : "text-stone-500 hover:text-stone-700"
                  }`}
                >
                  💼 Jsem podnik / salon
                </button>
              </div>
            )}

            {/* Core credentials form fields */}
            <form onSubmit={handleAuthSubmit} className="space-y-4">
              
              {authMode === "register" && authAccountType === "partner" && (
                <>
                  <div>
                    <label className="block text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-1.5 font-mono">
                      Název vašeho podniku / salonu
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Např. Studio Glamour"
                      value={authBusinessName}
                      onChange={(e) => setAuthBusinessName(e.target.value)}
                      className="w-full px-3.5 py-2.5 border border-stone-200 bg-white focus:outline-none focus:border-brand-500 text-xs font-extrabold text-stone-900 placeholder-stone-400 rounded-xl"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-1.5 font-mono">
                      Hlavní zaměření / segment
                    </label>
                    <select
                      value={authSegment}
                      onChange={(e) => setAuthSegment(e.target.value)}
                      className="w-full px-3.5 py-2.5 border border-stone-200 bg-white text-stone-900 focus:outline-none focus:border-brand-500 rounded-xl text-xs font-bold cursor-pointer"
                    >
                      {INDUSTRIES.map(i => (
                        <option key={i.id} value={i.id}>{i.label}</option>
                      ))}
                    </select>
                  </div>
                </>
              )}

              <div>
                <label className="block text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-1.5 font-mono">
                  E-mailová adresa (přihlášení)
                </label>
                <input
                  type="email"
                  required
                  placeholder="partner@spinly.cz"
                  value={authEmail}
                  onChange={(e) => setAuthEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-stone-200 bg-white focus:outline-none focus:border-brand-500 text-xs font-extrabold text-stone-900 placeholder-stone-400 rounded-xl font-mono"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-1.5 font-mono">
                  Bezpečné heslo (min. 6 znaků)
                </label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-stone-200 bg-white focus:outline-none focus:border-brand-500 text-xs font-extrabold text-stone-900 placeholder-stone-400 rounded-xl"
                />
              </div>

              {/* Error box */}
              {authError && (
                <div className="flex gap-2 items-start bg-red-50 border border-red-200 text-red-700 p-3 rounded-xl text-[11px] font-semibold">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 animate-bounce" />
                  <span>{authError}</span>
                </div>
              )}

              {/* Submit triggers */}
              <button
                type="submit"
                disabled={authSubmitting}
                className="w-full py-3 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all shadow-sm cursor-pointer"
              >
                {authSubmitting ? "Ověřuji..." : authMode === "login" ? "Přihlásit se" : "Založit účet zdarma"}
              </button>

            </form>

            {/* Split dividers */}
            <div className="relative my-5 text-center select-none font-mono">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-stone-200" />
              </div>
              <span className="relative bg-[#FAF9F5] px-2.5 text-[9px] font-black text-stone-400 uppercase tracking-widest">Nebo</span>
            </div>

            {/* Google sign-in integrations */}
            <div className="space-y-2.5">
              <button
                onClick={handleGoogleSignIn}
                disabled={authSubmitting}
                className="w-full py-2.5 bg-white border border-stone-200 text-stone-700 hover:bg-stone-50 rounded-xl text-xs font-bold tracking-wide transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs"
              >
                <span>🌐</span>
                Přihlásit se přes Google
              </button>

              {/* Fast anonymous sandbox tour bypass is a premier design decision */}
              <button
                onClick={handleDemoSignIn}
                disabled={authSubmitting}
                className="w-full py-3 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm animate-pulse"
              >
                <Zap className="w-3.5 h-3.5 fill-white stroke-[3] text-white" />
                Vstoupit jako Host Administrátor (Demo)
              </button>
              <p className="text-[9px] text-stone-400 font-bold text-center uppercase tracking-widest mt-1">
                (Okamžitě aktivuje plnou administraci na 1 kliknutí)
              </p>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
