import React, { useState, useEffect } from "react";
import { 
  Calendar, 
  Users, 
  Scissors, 
  Settings, 
  TrendingUp, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  LogOut, 
  Plus, 
  FileText, 
  Phone, 
  Share2, 
  ChevronLeft, 
  ChevronRight, 
  CornerDownRight, 
  Sparkles,
  Info
} from "lucide-react";
import { 
  doc, 
  setDoc, 
  getDoc, 
  collection, 
  query, 
  where, 
  getDocs, 
  updateDoc, 
  deleteDoc, 
  serverTimestamp, 
  onSnapshot 
} from "firebase/firestore";
import { db, auth, handleFirestoreError, OperationType } from "../firebase";
import { INDUSTRIES } from "../types";

interface DashboardProps {
  user: any;
  onLogout: () => void;
  onGoToBooking: (businessId: string) => void;
  onBackToLanding: () => void;
}

export default function Dashboard({ user, onLogout, onGoToBooking, onBackToLanding }: DashboardProps) {
  const [activeTab, setActiveTab] = useState<"overview" | "calendar" | "services" | "customers" | "settings">("overview");
  
  // Profile data from /leads/{uid}
  const [profile, setProfile] = useState({
    businessName: "Můj Salon",
    ownerName: user.displayName || "Provozovatel",
    email: user.email || "",
    phone: "+420 601 234 567",
    segment: "salon",
    plan: "Pro"
  });
  
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [bookings, setBookings] = useState<any[]>([]);
  const [loadingBookings, setLoadingBookings] = useState(true);
  
  // Modals status
  const [isNewBookingOpen, setIsNewBookingOpen] = useState(false);
  const [selectedBookingDetails, setSelectedBookingDetails] = useState<any | null>(null);
  
  // Form states for manual booking creation
  const [manualName, setManualName] = useState("");
  const [manualPhone, setManualPhone] = useState("");
  const [manualTime, setManualTime] = useState("10:00");
  const [manualDay, setManualDay] = useState("V pondělí");
  const [manualService, setManualService] = useState("");
  const [manualNote, setManualNote] = useState("");

  const [savingManual, setSavingManual] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [noteText, setNoteText] = useState("");

  // Services state (fallback local storage + synced)
  const [services, setServices] = useState<any[]>([]);
  const [newServiceName, setNewServiceName] = useState("");
  const [newServicePrice, setNewServicePrice] = useState("450");
  const [newServiceDuration, setNewServiceDuration] = useState("45");
  const [isAddServiceOpen, setIsAddServiceOpen] = useState(false);

  // Load profile from firestore
  useEffect(() => {
    let unsubProfile = () => {};
    
    async function loadData() {
      try {
        const docRef = doc(db, "leads", user.uid);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          setProfile(docSnap.data() as any);
        } else {
          // Initialize a clean lead profile
          const initialProfile = {
            businessName: profile.businessName,
            ownerName: profile.ownerName,
            email: profile.email,
            phone: profile.phone,
            segment: profile.segment,
            plan: "Pro",
            createdAt: serverTimestamp()
          };
          await setDoc(docRef, initialProfile);
          setProfile(initialProfile as any);
        }
      } catch (err) {
        console.error("Error loading profile:", err);
      } finally {
        setLoadingProfile(false);
      }
    }

    loadData();

    // Fetch services according to segment or local storage
    const localServicesKey = `spinly_services_${user.uid}`;
    const savedServices = localStorage.getItem(localServicesKey);
    if (savedServices) {
      setServices(JSON.parse(savedServices));
    } else {
      // Load fallback services based on segment
      const defaultServices = getDefaultServicesForSegment(profile.segment);
      setServices(defaultServices);
      localStorage.setItem(localServicesKey, JSON.stringify(defaultServices));
    }
  }, [user.uid]);

  // Sync services back to localStorage when changed
  const saveServices = (newServices: any[]) => {
    setServices(newServices);
    localStorage.setItem(`spinly_services_${user.uid}`, JSON.stringify(newServices));
  };

  // Helper for default services
  const getDefaultServicesForSegment = (seg: string) => {
    switch (seg) {
      case "salon":
        return [
          { id: "s1", name: "Kompletní ošetření pleti", price: 890, duration: 60 },
          { id: "s2", name: "Laminace obočí", price: 490, duration: 45 },
          { id: "s3", name: "Masáž obličeje a dekoltu", price: 390, duration: 30 }
        ];
      case "hair":
        return [
          { id: "h1", name: "Kreativní střih & Styling", price: 750, duration: 60 },
          { id: "h2", name: "Balayage / Kompletní barvení", price: 1850, duration: 120 },
          { id: "h3", name: "Pánský střih & Barber úprava", price: 450, duration: 30 }
        ];
      case "massage":
        return [
          { id: "m1", name: "Relaxační masáž celého těla", price: 950, duration: 60 },
          { id: "m2", name: "Hloubková sportovní masáž zad", price: 650, duration: 45 },
          { id: "m3", name: "Masáž lávovými kameny", price: 1100, duration: 75 }
        ];
      case "physio":
        return [
          { id: "p1", name: "Vstupní fyzioterapeutické vyšetření", price: 1200, duration: 60 },
          { id: "p2", name: "Individuální rehabilitační cvičení", price: 700, duration: 45 },
          { id: "p3", name: "Kineziotaping zad a šíje", price: 290, duration: 20 }
        ];
      default:
        return [
          { id: "o1", name: "Osobní konzultace", price: 500, duration: 45 },
          { id: "o2", name: "Základní služba", price: 400, duration: 30 }
        ];
    }
  };

  // Listen for real bookings
  useEffect(() => {
    // We listen to all bookings. Since strict firebase rule might be tricky, 
    // we fetch them all and query-filter client-side or use where query.
    // To distinguish, our client bookings have industry = "[segment]__[uid]"
    const matchSegmentKey = `${profile.segment}__${user.uid}`;
    
    const q = query(
      collection(db, "bookings"),
      where("industry", "==", matchSegmentKey)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: any[] = [];
      snapshot.forEach((doc) => {
        list.push({ id: doc.id, ...doc.data() });
      });
      // Sort bookings by createdAt/date
      list.sort((a, b) => {
        const timeA = a.createdAt?.seconds || 0;
        const timeB = b.createdAt?.seconds || 0;
        return timeB - timeA; // most recent first
      });
      setBookings(list);
      setLoadingBookings(false);
    }, (error) => {
      console.error("Listening for bookings failed, falling back to client-only simulation list.", error);
      // Fallback if permission failed because document doesn't match
      setLoadingBookings(false);
    });

    return () => unsubscribe();
  }, [profile.segment, user.uid]);

  // Handle service selection change when custom services are updated
  useEffect(() => {
    if (services.length > 0 && !manualService) {
      setManualService(services[0].name);
    }
  }, [services]);

  // Profile Save
  const [savingProfile, setSavingProfile] = useState(false);
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      await setDoc(doc(db, "leads", user.uid), {
        ...profile,
        updatedAt: serverTimestamp()
      }, { merge: true });
      alert("Nastavení úspěšně uloženo!");
      
      // Update services default segment if segment changed
      const localServicesKey = `spinly_services_${user.uid}`;
      const defaultServices = getDefaultServicesForSegment(profile.segment);
      setServices(defaultServices);
      localStorage.setItem(localServicesKey, JSON.stringify(defaultServices));
    } catch (err) {
      console.error("Save profile error:", err);
      alert("Chyba při ukládání nastavení.");
    } finally {
      setSavingProfile(false);
    }
  };

  // Status management for booking
  const handleUpdateBookingStatus = async (bookingId: string, status: string) => {
    try {
      await updateDoc(doc(db, "bookings", bookingId), { status });
      // Update our selected details modal if open
      if (selectedBookingDetails && selectedBookingDetails.id === bookingId) {
        setSelectedBookingDetails((prev: any) => ({ ...prev, status }));
      }
    } catch (err) {
      console.error("Error updating booking status:", err);
      alert("Nepodařilo se změnit stav termínu.");
    }
  };

  // Add internal merchant notes
  const handleSaveInternalNote = async (bookingId: string, noteText: string) => {
    try {
      await updateDoc(doc(db, "bookings", bookingId), { note: noteText });
      setEditingNoteId(null);
      if (selectedBookingDetails && selectedBookingDetails.id === bookingId) {
        setSelectedBookingDetails((prev: any) => ({ ...prev, note: noteText }));
      }
      alert("Poznámka k návštěvě uložena!");
    } catch (err) {
      console.error("Error updating note:", err);
      alert("Nepodařilo se uložit poznámku.");
    }
  };

  // Delete booking
  const handleDeleteBooking = async (bookingId: string) => {
    if (!window.confirm("Opravdu chcete tuto rezervaci trvale odstranit z kalendáře?")) return;
    try {
      await deleteDoc(doc(db, "bookings", bookingId));
      setSelectedBookingDetails(null);
      alert("Rezervace smazána.");
    } catch (err) {
      console.error("Error deleting booking:", err);
      alert("Smazání rezervace se nezdařilo.");
    }
  };

  // Submit manual booking
  const handleCreateManualBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualName.trim() || !manualPhone.trim()) return;

    setSavingManual(true);
    const bookingId = "manual-" + Math.random().toString(36).substring(2, 11);
    const matchSegmentKey = `${profile.segment}__${user.uid}`;

    try {
      await setDoc(doc(db, "bookings", bookingId), {
        service: manualService,
        day: manualDay,
        time: manualTime,
        clientName: manualName.trim(),
        clientPhone: manualPhone.trim(),
        status: "potvrzeno", // manual reservations are automatically confirmed by default
        industry: matchSegmentKey,
        note: manualNote.trim(),
        createdAt: serverTimestamp()
      });

      setIsNewBookingOpen(false);
      // reset manual states
      setManualName("");
      setManualPhone("");
      setManualNote("");
      alert("Nová rezervace byla ručně přidána do vašeho kalendáře!");
    } catch (err) {
      console.error("Error adding manual booking:", err);
      alert("Chyba při zakládání rezervace.");
    } finally {
      setSavingManual(false);
    }
  };

  // Add custom service
  const handleAddCustomService = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newServiceName.trim()) return;

    const newS = {
      id: "ser-" + Math.random().toString(36).substring(2, 9),
      name: newServiceName.trim(),
      price: Number(newServicePrice),
      duration: Number(newServiceDuration)
    };

    const updated = [...services, newS];
    saveServices(updated);

    // reset
    setNewServiceName("");
    setNewServicePrice("490");
    setNewServiceDuration("45");
    setIsAddServiceOpen(false);
    alert("Nová služba byla úspěšně vytvořena!");
  };

  // Delete custom service
  const handleDeleteCustomService = (id: string) => {
    if (!window.confirm("Opravdu chcete tuto službu smazat z nabídky?")) return;
    const filtered = services.filter(s => s.id !== id);
    saveServices(filtered);
    alert("Služba smazána.");
  };

  // Dynamic calculations for CRM overview
  const uniqueClients = React.useMemo(() => {
    const clientsMap = new Map<string, { name: string; phone: string; visits: number; spent: number; lastVisit: string; notesHistory: string[] }>();
    
    bookings.forEach((bk) => {
      // Find service price
      const serviceMatch = services.find(s => s.name === bk.service);
      const price = serviceMatch ? serviceMatch.price : 500; // fallback default
      
      const key = `${bk.clientName.trim().toLowerCase()}_${bk.clientPhone.trim()}`;
      const existing = clientsMap.get(key);
      
      const noteHist = bk.note ? [bk.note] : [];

      if (existing) {
        existing.visits += 1;
        if (bk.status !== "stornováno") {
          existing.spent += price;
        }
        if (bk.note) {
          existing.notesHistory.push(`${bk.day} obsluha: ${bk.note}`);
        }
        clientsMap.set(key, existing);
      } else {
        clientsMap.set(key, {
          name: bk.clientName,
          phone: bk.clientPhone,
          visits: 1,
          spent: bk.status !== "stornováno" ? price : 0,
          lastVisit: bk.day,
          notesHistory: noteHist
        });
      }
    });

    return Array.from(clientsMap.values());
  }, [bookings, services]);

  const totalEarnings = bookings.reduce((sum, bk) => {
    if (bk.status === "stornováno") return sum;
    const serviceMatch = services.find(s => s.name === bk.service);
    const price = serviceMatch ? serviceMatch.price : 500;
    return sum + price;
  }, 0);

  // Search filter for clients
  const [clientSearch, setClientSearch] = useState("");
  const filteredClientsList = uniqueClients.filter(c => 
    c.name.toLowerCase().includes(clientSearch.toLowerCase()) || 
    c.phone.includes(clientSearch)
  );

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans antialiased text-slate-800">
      
      {/* 1. Header bar with branding & quick logout */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-20 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <button 
              onClick={onBackToLanding}
              className="text-slate-500 hover:text-slate-900 flex items-center gap-1.5 text-sm font-medium transition-all"
            >
              <ChevronLeft className="w-4 h-4" />
              Zpět na web
            </button>
            <div className="h-5 w-px bg-slate-200" />
            <div className="flex items-center gap-2">
              <div className="bg-indigo-600 text-white p-2 rounded-lg flex items-center justify-center font-bold">
                <Scissors className="w-4 h-4" />
              </div>
              <span className="text-lg font-extrabold tracking-tight text-slate-950">
                Spinly <span className="text-xs bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded font-mono">ADMIN</span>
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded-full flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              Tarif {profile.plan || "Pro"}
            </span>
            <div className="text-right hidden md:block">
              <p className="text-xs font-bold text-slate-900 leading-tight">{profile.businessName}</p>
              <p className="text-[10px] text-slate-500 leading-tight">{profile.email}</p>
            </div>
            <button
              onClick={onLogout}
              className="text-rose-600 hover:text-rose-800 p-2 rounded-xl hover:bg-rose-50 transition-all flex items-center justify-center gap-1.5 text-xs font-semibold"
              title="Odhlásit se"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Odhlásit</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col md:flex-row gap-8">
        
        {/* Sidebar Controls */}
        <aside className="w-full md:w-64 flex flex-row md:flex-col gap-1.5 overflow-x-auto md:overflow-visible pb-3 md:pb-0 shrink-0 select-none">
          
          <div className="hidden md:block pb-4 mb-4 border-b border-slate-200">
            <div className="p-4 bg-gradient-to-r from-indigo-900 to-indigo-800 text-white rounded-2xl shadow-sm relative overflow-hidden">
              <div className="absolute top-0 right-0 p-8 bg-white/5 rounded-full blur-xl translate-x-4 -translate-y-4" />
              <p className="text-[10px] opacity-75 font-mono uppercase tracking-wider font-semibold">Váš rezervační štít status</p>
              <h4 className="text-base font-bold truncate mt-1">{profile.businessName}</h4>
              <p className="text-xs text-indigo-200 mt-1">{INDUSTRIES.find(i => i.id === profile.segment)?.label || "Služby"}</p>
              
              <button
                onClick={() => onGoToBooking(user.uid)}
                className="mt-4 w-full bg-white hover:bg-slate-50 text-indigo-900 py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm transition-all active:scale-[0.98]"
              >
                <Share2 className="w-3.5 h-3.5" />
                Vlastní Webová Stránka
              </button>
            </div>
          </div>

          {[
            { id: "overview", label: "Přehled & Statistiky", icon: TrendingUp },
            { id: "calendar", label: "Kalendář schůzek", icon: Calendar },
            { id: "services", label: "Nabídka služeb", icon: Scissors },
            { id: "customers", label: "Zákaznická karta (CRM)", icon: Users },
            { id: "settings", label: "Nastavení salonu", icon: Settings }
          ].map((item) => {
            const IsActive = activeTab === item.id;
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id as any)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 font-medium text-sm text-left truncate whitespace-nowrap cursor-pointer ${
                  IsActive 
                    ? "bg-indigo-600 text-white shadow-xs" 
                    : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                <Icon className={`w-4 h-4 shrink-0 ${IsActive ? "text-white" : "text-slate-400"}`} />
                {item.label}
              </button>
            );
          })}
        </aside>

        {/* Content Panel Area */}
        <main className="flex-1 bg-white border border-slate-200 rounded-3xl p-6 md:p-8 shadow-sm">
          
          {loadingProfile || loadingBookings ? (
            <div className="py-20 flex flex-col items-center justify-center space-y-3">
              <div className="w-10 h-10 border-3 border-indigo-100 border-t-indigo-600 rounded-full animate-spin" />
              <p className="text-sm font-semibold text-slate-500 animate-pulse">Načítám administraci vašeho kalendáře...</p>
            </div>
          ) : (
            <>
              {/* TAB 1: OVERVIEW */}
              {activeTab === "overview" && (
                <div className="space-y-8 animate-fadeIn">
                  
                  {/* Top Header Row */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <h2 className="text-2xl font-extrabold text-slate-950 tracking-tight">Vítejte zpět v administraci, {profile.ownerName}!</h2>
                      <p className="text-sm text-slate-500 mt-1">Zde najdete přehledné statistiky a dnešní schůzky vašeho podniku.</p>
                    </div>
                    <button
                      onClick={() => setIsNewBookingOpen(true)}
                      className="inline-flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold px-4 py-2.5 rounded-xl shadow-xs transition-all active:scale-95 cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      Přidat rezervaci ručně
                    </button>
                  </div>

                  {/* Primary Stats Bento Box */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    
                    <div className="p-5 border border-slate-200 rounded-2xl bg-white flex flex-col justify-between">
                      <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Celkový obrat</span>
                      <div className="mt-2.5">
                        <span className="text-2xl font-black text-slate-950 font-mono">{totalEarnings.toLocaleString("cs-CZ")} Kč</span>
                        <p className="text-slate-500 text-[10px] mt-0.5 font-semibold">Z dokončených / přijatých služeb</p>
                      </div>
                    </div>

                    <div className="p-5 border border-slate-200 rounded-2xl bg-white flex flex-col justify-between">
                      <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Celkem schůzek</span>
                      <div className="mt-2.5">
                        <span className="text-2xl font-black text-slate-950 font-mono">{bookings.length}</span>
                        <p className="text-slate-500 text-[10px] mt-0.5 font-semibold">Evidováno v kalendáři</p>
                      </div>
                    </div>

                    <div className="p-5 border border-slate-200 rounded-2xl bg-white flex flex-col justify-between">
                      <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Počet služeb</span>
                      <div className="mt-2.5">
                        <span className="text-2xl font-black text-slate-950 font-mono">{services.length}</span>
                        <p className="text-slate-500 text-[10px] mt-0.5 font-semibold">Aktivních položek v ceníku</p>
                      </div>
                    </div>

                    <div className="p-5 border border-slate-200 rounded-2xl bg-white flex flex-col justify-between">
                      <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Zákaznické kontakty</span>
                      <div className="mt-2.5">
                        <span className="text-2xl font-black text-slate-950 font-mono">{uniqueClients.length}</span>
                        <p className="text-slate-500 text-[10px] mt-0.5 font-semibold">Unikátních telefonních čísel</p>
                      </div>
                    </div>

                  </div>

                  {/* Public link share assistant */}
                  <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex gap-3 items-start">
                      <div className="bg-indigo-600 text-white p-2 rounded-xl mt-0.5">
                        <Share2 className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-slate-900">Váš veřejný rezervační widget je plně aktivní!</h4>
                        <p className="text-xs text-slate-600">
                          Tento odkaz můžete sdílet s klienty na Facebooku, Instagramu, v popisu nebo jej posílat přímo v SMS.
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 w-full sm:w-auto shrink-0 justify-end">
                      <button
                        onClick={() => {
                          const url = `${window.location.origin}/booking/${user.uid}`;
                          navigator.clipboard.writeText(url);
                          alert("Odkaz na vaši rezervační stránku byl zkopírován do schránky:\n" + url);
                        }}
                        className="bg-white hover:bg-slate-50 border border-indigo-200 text-xs font-bold text-indigo-700 px-4 py-2 rounded-xl shrink-0 transition-all active:scale-95"
                      >
                        Zkopírovat odkaz
                      </button>
                      <button
                        onClick={() => onGoToBooking(user.uid)}
                        className="bg-indigo-600 hover:bg-indigo-750 text-white text-xs font-bold px-4 py-2 rounded-xl shrink-0 transition-all active:scale-95"
                      >
                        Otevřít stránku
                      </button>
                    </div>
                  </div>

                  {/* Recent Bookings Live Stream */}
                  <div>
                    <h3 className="text-lg font-bold text-slate-950 mb-4 flex items-center gap-2">
                      <Clock className="w-5 h-5 text-indigo-600" />
                      Přehled nejnovějších schůzek
                    </h3>
                    
                    {bookings.length === 0 ? (
                      <div className="border border-dashed border-slate-200 rounded-2xl py-12 text-center text-slate-400">
                        <Calendar className="w-10 h-10 mx-auto opacity-40 mb-2 stroke-[1.5]" />
                        <p className="text-sm font-semibold">Zatím se u vás nikdo neobjednal.</p>
                        <p className="text-xs mt-1 max-w-sm mx-auto">Zkuste ve svém vlastním rezervačním odkazu výše zkušebně objednat schůzku. Ihned se objeví zde!</p>
                      </div>
                    ) : (
                      <div className="border border-slate-200 rounded-2xl overflow-hidden divide-y divide-slate-100 shadow-2xs">
                        {bookings.slice(0, 8).map((bk) => (
                          <div 
                            key={bk.id}
                            onClick={() => setSelectedBookingDetails(bk)}
                            className="p-4 hover:bg-slate-50 transition-all cursor-pointer flex items-center justify-between gap-4"
                          >
                            <div className="flex items-center gap-3">
                              <div className="bg-indigo-50 p-2.5 rounded-xl text-indigo-600 uppercase font-mono font-bold text-xs shrink-0 w-14 text-center">
                                {bk.time}
                              </div>
                              <div>
                                <h4 className="font-bold text-sm text-slate-900">{bk.clientName}</h4>
                                <p className="text-xs text-slate-500 font-semibold">{bk.service}</p>
                              </div>
                            </div>

                            <div className="flex items-center gap-3">
                              <span className="text-xs text-slate-400 font-medium font-mono hidden md:inline">{bk.day}</span>
                              {bk.status === "přijato" && (
                                <span className="text-[10px] font-bold bg-amber-50 text-amber-700 px-2.5 py-1 rounded-full border border-amber-200">
                                  Čeká na schválení
                                </span>
                              )}
                              {bk.status === "potvrzeno" && (
                                <span className="text-[10px] font-bold bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-full border border-emerald-200">
                                  Potvrzeno
                                </span>
                              )}
                              {bk.status === "hotovo" && (
                                <span className="text-[10px] font-bold bg-slate-50 text-slate-600 px-2.5 py-1 rounded-full border border-slate-150">
                                  Vyřízeno (Hotovo)
                                </span>
                              )}
                              {bk.status === "stornováno" && (
                                <span className="text-[10px] font-bold bg-rose-50 text-rose-700 px-2.5 py-1 rounded-full border border-rose-200">
                                  Zrušeno
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 2: CALENDAR */}
              {activeTab === "calendar" && (
                <div className="space-y-6 animate-fadeIn">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <h2 className="text-xl font-extrabold text-slate-950 tracking-tight">Plánovač kalendáře</h2>
                      <p className="text-sm text-slate-500 mt-1">Zde uvidíte detailní rozvrh a můžete měnit stavy schůzek či zapisovat poznámky.</p>
                    </div>
                    <button
                      onClick={() => setIsNewBookingOpen(true)}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold px-4 py-2.5 rounded-xl shadow-xs transition-all flex items-center gap-1.5 active:scale-95 cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      Nová schůzka
                    </button>
                  </div>

                  {/* Days filtering switcher */}
                  <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 pb-4">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest mr-2">Zobrazit dny:</span>
                    {["Všechny dny", "Dnes", "Zítra", "Pondělí"].map((dayOpt) => (
                      <button
                        key={dayOpt}
                        onClick={() => {
                          // Filter option click
                          // We can simulate filter on day
                        }}
                        className="py-1.5 px-3.5 bg-slate-50 border border-slate-200 hover:border-slate-350 text-slate-700 text-xs font-semibold rounded-full hover:bg-slate-100 transition-all cursor-pointer"
                      >
                        {dayOpt}
                      </button>
                    ))}
                  </div>

                  {bookings.length === 0 ? (
                    <div className="border border-dashed border-slate-200 rounded-3xl py-12 text-center text-slate-400">
                      <Calendar className="w-12 h-12 mx-auto opacity-35 mb-2" />
                      <p className="font-semibold text-sm">Kalendář je momentálně prázdný.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {["Dnes", "Zítra", "Pondělí", "Ostatní termíny"].map((dayGroup) => {
                        const dayBookings = bookings.filter((bk) => {
                          if (dayGroup === "Ostatní termíny") {
                            return bk.day !== "Dnes" && bk.day !== "Zítra" && bk.day !== "Pondělí";
                          }
                          return bk.day === dayGroup;
                        });

                        if (dayBookings.length === 0) return null;

                        return (
                          <div key={dayGroup} className="space-y-2">
                            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest border-l-2 border-indigo-600 pl-2 bg-slate-50/50 py-1 rounded">
                              {dayGroup}
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              {dayBookings.map((bk) => (
                                <div
                                  key={bk.id}
                                  onClick={() => setSelectedBookingDetails(bk)}
                                  className="p-4 bg-white hover:bg-indigo-50/20 border border-slate-200 hover:border-indigo-200 rounded-2xl transition-all cursor-pointer flex flex-col justify-between gap-3 shadow-xs"
                                >
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="flex items-center gap-2.5">
                                      <div className="bg-indigo-50 border border-indigo-100 text-indigo-700 p-2 text-center font-bold font-mono text-xs rounded-xl h-10 w-14 flex items-center justify-center">
                                        {bk.time}
                                      </div>
                                      <div>
                                        <h5 className="font-bold text-sm text-slate-900">{bk.clientName}</h5>
                                        <p className="text-xs text-slate-500 font-semibold">{bk.service}</p>
                                      </div>
                                    </div>
                                    {bk.status === "přijato" && (
                                      <span className="text-[9px] font-bold bg-amber-50 text-amber-700 px-2 py-0.5 rounded border border-amber-200 shrink-0">
                                        Nová
                                      </span>
                                    )}
                                    {bk.status === "potvrzeno" && (
                                      <span className="text-[9px] font-bold bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded border border-emerald-200 shrink-0">
                                        Potvrzeno
                                      </span>
                                    )}
                                  </div>

                                  <div className="flex items-center justify-between border-t border-slate-100 pt-2 text-[11px] text-slate-500">
                                    <span className="flex items-center gap-1">
                                      <Phone className="w-3 h-3 text-slate-400" />
                                      {bk.clientPhone}
                                    </span>
                                    <span className="font-semibold text-indigo-600 hover:underline">Zobrazit detail →</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: SERVICES */}
              {activeTab === "services" && (
                <div className="space-y-6 animate-fadeIn">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <h2 className="text-xl font-extrabold text-slate-950 tracking-tight">Moje nabídka služeb</h2>
                      <p className="text-sm text-slate-500 mt-1">Nastavte si nabízené procedury, jejich ceny a dobu trvání. Tyto se propíšou do rezervačního widgetu.</p>
                    </div>
                    <button
                      onClick={() => setIsAddServiceOpen(true)}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold px-4 py-2.5 rounded-xl shadow-xs transition-all flex items-center gap-1.5 active:scale-95 cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      Přidat službu do ceníku
                    </button>
                  </div>

                  {isAddServiceOpen && (
                    <form onSubmit={handleAddCustomService} className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4 animate-fadeIn">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Název služby</label>
                          <input
                            type="text"
                            required
                            placeholder="Např. Klasická pedikúra"
                            value={newServiceName}
                            onChange={(e) => setNewServiceName(e.target.value)}
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Cena (Kč)</label>
                          <input
                            type="number"
                            required
                            placeholder="650"
                            value={newServicePrice}
                            onChange={(e) => setNewServicePrice(e.target.value)}
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white font-mono"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Trvání (minut)</label>
                          <input
                            type="number"
                            required
                            placeholder="45"
                            value={newServiceDuration}
                            onChange={(e) => setNewServiceDuration(e.target.value)}
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white font-mono"
                          />
                        </div>
                      </div>
                      <div className="flex justify-end gap-2 text-xs font-semibold">
                        <button
                          type="button"
                          onClick={() => setIsAddServiceOpen(false)}
                          className="px-3.5 py-2 border border-slate-200 hover:bg-slate-100 text-slate-600 rounded-lg"
                        >
                          Zrušit
                        </button>
                        <button
                          type="submit"
                          className="px-3.5 py-2 bg-indigo-600 text-white hover:bg-indigo-750 rounded-lg shadow-sm"
                        >
                          Uložit změnu
                        </button>
                      </div>
                    </form>
                  )}

                  <div className="border border-slate-200 rounded-2xl overflow-hidden divide-y divide-slate-100 shadow-3xs">
                    {services.map((ser) => (
                      <div key={ser.id} className="p-4 flex items-center justify-between gap-4 hover:bg-slate-50 transition-all">
                        <div className="flex items-center gap-3">
                          <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">
                            <Scissors className="w-5 h-5" />
                          </div>
                          <div>
                            <h4 className="font-bold text-sm text-slate-900">{ser.name}</h4>
                            <p className="text-xs text-slate-500 font-medium">Čas ošetření: <Clock className="w-3.5 h-3.5 inline mx-0.5" /> {ser.duration} minut</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-6">
                          <span className="font-mono font-black text-slate-950 text-base">{ser.price} Kč</span>
                          <button
                            onClick={() => handleDeleteCustomService(ser.id)}
                            className="text-xs text-rose-500 hover:text-rose-700 font-bold hover:underline"
                          >
                            Odstranit
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                </div>
              )}

              {/* TAB 4: CUSTOMERS */}
              {activeTab === "customers" && (
                <div className="space-y-6 animate-fadeIn">
                  <div>
                    <h2 className="text-xl font-extrabold text-slate-950 tracking-tight">Klientská karta & CRM Databáze</h2>
                    <p className="text-sm text-slate-500 mt-1">Kompletní historie vašich klientů, celková útrata a osobní poznámky o ošetření.</p>
                  </div>

                  {/* Search filter input */}
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Vyhledat zákazníka dle jména nebo telefonu..."
                      value={clientSearch}
                      onChange={(e) => setClientSearch(e.target.value)}
                      className="w-full px-4 py-2.5 border border-slate-200 focus:border-indigo-500 focus:outline-hidden rounded-xl text-sm leading-none font-medium bg-slate-50 focus:bg-white transition-all text-slate-800"
                    />
                  </div>

                  {filteredClientsList.length === 0 ? (
                    <div className="border border-dashed border-slate-200 rounded-2xl py-12 text-center text-slate-400">
                      <Users className="w-10 h-10 mx-auto opacity-45 mb-2" />
                      <p className="text-sm font-semibold">Žádní zákazníci neodpovídají vyhledávání.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {filteredClientsList.map((c, index) => (
                        <div 
                          key={index}
                          className="bg-white border border-slate-200 rounded-2xl p-5 hover:border-indigo-200 hover:shadow-xs transition-all space-y-4"
                        >
                          <div className="flex items-start justify-between gap-2 border-b border-slate-50 pb-3">
                            <div>
                              <h4 className="font-bold text-slate-900 text-sm leading-tight">{c.name}</h4>
                              <p className="text-slate-500 text-xs font-semibold flex items-center gap-1.5 mt-1 font-mono">
                                <Phone className="w-3.5 h-3.5 text-slate-400" />
                                {c.phone}
                              </p>
                            </div>
                            <div className="text-right">
                              <span className="inline-block px-2 py-0.5 bg-indigo-50 text-indigo-700 font-bold rounded text-[10px]">
                                {c.visits} {c.visits === 1 ? "návštěva" : c.visits < 5 ? "návštěvy" : "návštěv"}
                              </span>
                              <p className="text-slate-950 font-mono font-bold text-xs mt-1">Celkem utraceno {c.spent} Kč</p>
                            </div>
                          </div>

                          <div className="space-y-1.5">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
                              <FileText className="w-3 h-3 text-slate-400" /> Historie poznámek ošetření:
                            </span>

                            {c.notesHistory.length === 0 ? (
                              <p className="text-xs text-slate-400 italic">Pro tohoto klienta zatím nemáte zadány žádné speciální poznámky.</p>
                            ) : (
                              <div className="space-y-1 pl-2 border-l border-indigo-100 max-h-32 overflow-y-auto">
                                {c.notesHistory.map((nh, i) => (
                                  <p key={i} className="text-xs text-slate-600 flex items-start gap-1">
                                    <CornerDownRight className="w-3 h-3 text-indigo-500 shrink-0 mt-0.5" />
                                    <span>{nh}</span>
                                  </p>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                </div>
              )}

              {/* TAB 5: SETTINGS */}
              {activeTab === "settings" && (
                <div className="space-y-6 animate-fadeIn">
                  <div>
                    <h2 className="text-xl font-extrabold text-slate-950 tracking-tight">Nastavení vašeho profilu</h2>
                    <p className="text-sm text-slate-500 mt-1">Zde si upravte název a typ vaší provozovny, které se ihned zobrazí klientům při rezervaci.</p>
                  </div>

                  <form onSubmit={handleSaveProfile} className="space-y-5">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Název podniku / salonu</label>
                        <input
                          type="text"
                          required
                          value={profile.businessName}
                          onChange={(e) => setProfile(prev => ({ ...prev, businessName: e.target.value }))}
                          className="w-full px-3.5 py-2.5 border border-slate-200 focus:border-indigo-500 focus:outline-hidden rounded-xl text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Celé jméno ohlášené osoby</label>
                        <input
                          type="text"
                          required
                          value={profile.ownerName}
                          onChange={(e) => setProfile(prev => ({ ...prev, ownerName: e.target.value }))}
                          className="w-full px-3.5 py-2.5 border border-slate-200 focus:border-indigo-500 focus:outline-hidden rounded-xl text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Kontaktní telefon (pro rezervace)</label>
                        <input
                          type="text"
                          required
                          value={profile.phone}
                          onChange={(e) => setProfile(prev => ({ ...prev, phone: e.target.value }))}
                          className="w-full px-3.5 py-2.5 border border-slate-200 focus:border-indigo-500 focus:outline-hidden rounded-xl text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Obor podnikání</label>
                        <select
                          value={profile.segment}
                          onChange={(e) => setProfile(prev => ({ ...prev, segment: e.target.value }))}
                          className="w-full px-3.5 py-2.5 border border-slate-200 focus:border-indigo-500 focus:outline-hidden rounded-xl text-sm bg-white"
                        >
                          {INDUSTRIES.map(ind => (
                            <option key={ind.id} value={ind.id}>{ind.label}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="pt-2">
                      <button
                        type="submit"
                        disabled={savingProfile}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs px-6 py-3 rounded-xl shadow-md transition-all active:scale-[0.98] cursor-pointer"
                      >
                        {savingProfile ? "Ukládám nastavení..." : "Uložit změny profilu"}
                      </button>
                    </div>
                  </form>

                  {/* Public link info block */}
                  <div className="pt-6 border-t border-slate-100 space-y-4">
                    <h3 className="text-sm font-bold text-slate-950 uppercase tracking-wider">Veřejná vizitka a rezervační odkaz</h3>
                    <div className="p-4 bg-slate-50 rounded-xl flex items-center justify-between">
                      <code className="text-xs text-indigo-700 block select-all font-mono">
                        {window.location.origin}/booking/{user.uid}
                      </code>
                      <button
                        onClick={() => {
                          const url = `${window.location.origin}/booking/${user.uid}`;
                          navigator.clipboard.writeText(url);
                          alert("Odkaz zkopírován:\n" + url);
                        }}
                        className="text-xs font-bold text-indigo-600 hover:text-indigo-800"
                      >
                        Kopírovat
                      </button>
                    </div>
                  </div>

                </div>
              )}

            </>
          )}

        </main>

      </div>

      {/* MODAL 1: NEW BOOKING MANUAL FORM */}
      {isNewBookingOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md p-6 relative overflow-hidden animate-fadeIn">
            <h3 className="text-lg font-bold text-slate-950 mb-4">Ruční zápis schůzky do kalendáře</h3>
            
            <form onSubmit={handleCreateManualBooking} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Jméno zákazníka</label>
                <input
                  type="text"
                  required
                  placeholder="Např. Jan Novák"
                  value={manualName}
                  onChange={(e) => setManualName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Telefon</label>
                <input
                  type="tel"
                  required
                  placeholder="+420 777 111 222"
                  value={manualPhone}
                  onChange={(e) => setManualPhone(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Den / Datum</label>
                  <select
                    value={manualDay}
                    onChange={(e) => setManualDay(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white"
                  >
                    <option value="Dnes">Dnes</option>
                    <option value="Zítra">Zítra</option>
                    <option value="Pondělí">Pondělí</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Čas slotu</label>
                  <select
                    value={manualTime}
                    onChange={(e) => setManualTime(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white font-mono"
                  >
                    <option value="09:00">09:00</option>
                    <option value="10:00">10:00</option>
                    <option value="11:30">11:30</option>
                    <option value="13:00">13:00</option>
                    <option value="14:00">14:00</option>
                    <option value="15:00">15:00</option>
                    <option value="16:15">16:15</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Služba</label>
                <select
                  value={manualService}
                  onChange={(e) => setManualService(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white"
                >
                  {services.map(s => (
                    <option key={s.id} value={s.name}>{s.name} ({s.price} Kč)</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Poznámka pro obsluhu</label>
                <textarea
                  placeholder="Např. Alergie na krémy, barvicí receptura..."
                  rows={2}
                  value={manualNote}
                  onChange={(e) => setManualNote(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white resize-none"
                />
              </div>

              <div className="flex justify-end gap-2 text-xs font-semibold pt-2">
                <button
                  type="button"
                  onClick={() => setIsNewBookingOpen(false)}
                  className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-lg"
                >
                  Zrušit
                </button>
                <button
                  type="submit"
                  disabled={savingManual}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow-sm"
                >
                  {savingManual ? "Zakládám..." : "Přidat schůzku"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: DETAILED APPOINTMENT CRM INFO & STATE CONTROLLER */}
      {selectedBookingDetails && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg p-6 relative overflow-hidden animate-fadeIn space-y-5">
            
            {/* Header info */}
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-3">
              <div>
                <span className="text-[10px] font-bold text-indigo-700 uppercase bg-indigo-50 px-2 py-0.5 rounded font-mono">
                  {selectedBookingDetails.time} — {selectedBookingDetails.day}
                </span>
                <h3 className="text-lg font-bold text-slate-950 mt-1">{selectedBookingDetails.clientName}</h3>
                <p className="text-xs text-slate-500 font-bold flex items-center gap-1.5 mt-0.5">
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  {selectedBookingDetails.clientPhone}
                </p>
              </div>
              <button
                onClick={() => setSelectedBookingDetails(null)}
                className="text-slate-400 hover:text-slate-600 font-bold text-xl leading-none p-1"
              >
                ✕
              </button>
            </div>

            {/* Service & price info details */}
            <div className="p-4 bg-slate-50 rounded-2xl flex items-center justify-between">
              <div>
                <h5 className="font-bold text-sm text-slate-900">{selectedBookingDetails.service}</h5>
                <p className="text-xs text-slate-500">Stav rezervace: {selectedBookingDetails.status}</p>
              </div>
              <div className="text-right">
                <span className="font-mono font-black text-slate-950 text-base">
                  {services.find(s => s.name === selectedBookingDetails.service)?.price || 500} Kč
                </span>
                <p className="text-[10px] text-slate-400 font-semibold font-mono">Standardní cena</p>
              </div>
            </div>

            {/* CRM Notes view */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-slate-400" />
                Interaktivní klientská karta (Poznámky k návštěvě):
              </label>

              {editingNoteId === selectedBookingDetails.id ? (
                <div className="space-y-2">
                  <textarea
                    rows={3}
                    value={noteText}
                    onChange={(e) => setNoteText(e.target.value)}
                    className="w-full text-xs font-medium bg-white border border-indigo-200 outline-hidden focus:ring-2 focus:ring-indigo-500 p-2.5 rounded-lg"
                    placeholder="Např. Použili jsme odstín barvy 4A, pleť byla mírně začervenalá..."
                  />
                  <div className="flex justify-end gap-2.5 text-xs font-semibold">
                    <button
                      onClick={() => setEditingNoteId(null)}
                      className="px-3 py-1.5 border border-slate-200 rounded text-slate-600"
                    >
                      Storno
                    </button>
                    <button
                      onClick={() => handleSaveInternalNote(selectedBookingDetails.id, noteText)}
                      className="px-3 py-1.5 bg-indigo-600 text-white rounded shadow-xs"
                    >
                      Uložit poznámku
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-indigo-50/20 border border-indigo-100 rounded-xl space-y-2">
                  {selectedBookingDetails.note ? (
                    <p className="text-xs text-slate-700 leading-normal font-medium">{selectedBookingDetails.note}</p>
                  ) : (
                    <p className="text-xs text-slate-400 italic">Zatím nebyly uloženy žádné poznámky ošetření pro tuto schůzku.</p>
                  )}
                  <button
                    onClick={() => {
                      setEditingNoteId(selectedBookingDetails.id);
                      setNoteText(selectedBookingDetails.note || "");
                    }}
                    className="text-xs text-indigo-600 hover:text-indigo-800 font-bold underline"
                  >
                    {selectedBookingDetails.note ? "Upravit poznámku" : "+ Přidat poznámku k ošetření"}
                  </button>
                </div>
              )}
            </div>

            {/* Quick Actions state modifiers */}
            <div className="space-y-2.5">
              <span className="block text-xs font-bold text-slate-400 uppercase tracking-widest">Akce s rezervací:</span>
              <div className="flex flex-wrap gap-2 text-xs font-semibold select-none">
                
                {selectedBookingDetails.status === "přijato" && (
                  <button
                    onClick={() => handleUpdateBookingStatus(selectedBookingDetails.id, "potvrzeno")}
                    className="inline-flex items-center gap-1 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-xs transition-all cursor-pointer"
                  >
                    <CheckCircle className="w-4 h-4" /> Schválit a potvrdit SMSkou
                  </button>
                )}

                {selectedBookingDetails.status !== "hotovo" && selectedBookingDetails.status !== "stornováno" && (
                  <button
                    onClick={() => handleUpdateBookingStatus(selectedBookingDetails.id, "hotovo")}
                    className="inline-flex items-center gap-1 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl border border-slate-250 transition-all cursor-pointer"
                  >
                    <CheckCircle className="w-4 h-4 text-emerald-600" /> Označit za vyřízené
                  </button>
                )}

                {selectedBookingDetails.status !== "stornováno" && (
                  <button
                    onClick={() => handleUpdateBookingStatus(selectedBookingDetails.id, "stornováno")}
                    className="inline-flex items-center gap-1 px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl transition-all cursor-pointer animate-pulse"
                  >
                    <XCircle className="w-4 h-4" /> Stornovat termín
                  </button>
                )}

                <button
                  onClick={() => handleDeleteBooking(selectedBookingDetails.id)}
                  className="font-bold text-xs text-neutral-400 hover:text-rose-600 px-3 py-2 hover:bg-slate-50 rounded ml-auto transition-all cursor-pointer"
                >
                  Smazat
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
