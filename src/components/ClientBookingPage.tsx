import React, { useState, useEffect } from "react";
import { 
  Calendar, 
  Clock, 
  Check, 
  User, 
  Phone, 
  Sparkles, 
  Scissors, 
  ShieldCheck, 
  ChevronLeft, 
  MessageSquare,
  Building,
  Award,
  Wallet
} from "lucide-react";
import { 
  doc, 
  setDoc, 
  getDoc, 
  collection, 
  query, 
  where, 
  getDocs, 
  onSnapshot, 
  serverTimestamp 
} from "firebase/firestore";
import { db, auth } from "../firebase";

interface ClientBookingPageProps {
  businessId: string;
  onBackToLanding: () => void;
}

export default function ClientBookingPage({ businessId, onBackToLanding }: ClientBookingPageProps) {
  const [profile, setProfile] = useState<any>({
    businessName: "Nahrávám...",
    ownerName: "Provozovatel",
    email: "",
    phone: "+420 601 234 567",
    segment: "salon"
  });
  
  const [loading, setLoading] = useState(true);
  const [services, setServices] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);

  // Booking form states
  const [selectedService, setSelectedService] = useState<any | null>(null);
  const [selectedDay, setSelectedDay] = useState<string>("Dnes");
  const [selectedTime, setSelectedTime] = useState<string>("");
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  
  // Successful checkout screen states
  const [bookedRecord, setBookedRecord] = useState<any | null>(null);
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [saving, setSaving] = useState(false);
  const [smsVisible, setSmsVisible] = useState(false);

  // Spinly Pay Wallet Integration hooks
  const [currentUserProfile, setCurrentUserProfile] = useState<any>(null);
  const [bookingPaid, setBookingPaid] = useState(false);
  const [isPayingInline, setIsPayingInline] = useState(false);

  // Listen to logged-in client wallet balance
  useEffect(() => {
    if (!auth.currentUser || !bookingSuccess) return;
    const unsubscribe = onSnapshot(doc(db, "leads", auth.currentUser.uid), (snap) => {
      if (snap.exists()) {
        setCurrentUserProfile(snap.data());
      }
    });
    return () => unsubscribe();
  }, [auth.currentUser, bookingSuccess]);

  const handleInlinePayment = async () => {
    if (!auth.currentUser || !bookedRecord) return;
    const price = selectedService?.price || 500;
    const currentBalance = currentUserProfile?.walletBalance ?? 1000;
    
    if (currentBalance < price) {
      alert(`Nedostatečný zůstatek. Na zaplacení této služby potřebujete mít alespoň ${price} Kč (váš zůstatek je ${currentBalance} Kč).`);
      return;
    }

    setIsPayingInline(true);
    try {
      const parentTxId = "tx-pay-sent-" + Math.random().toString(36).substring(2, 11);
      const receivTxId = "tx-pay-received-" + Math.random().toString(36).substring(2, 11);

      // 1. Subtract balance from client
      await setDoc(doc(db, "leads", auth.currentUser.uid), {
        walletBalance: currentBalance - price
      }, { merge: true });

      // 2. Add balance to merchant
      const merchantSnap = await getDoc(doc(db, "leads", businessId));
      const merchantBalance = merchantSnap.exists() ? (merchantSnap.data().walletBalance ?? 1000) : 1050;
      await setDoc(doc(db, "leads", businessId), {
        walletBalance: merchantBalance + price
      }, { merge: true });

      // 3. Create 'Sent' transaction
      await setDoc(doc(db, "walletTransactions", parentTxId), {
        id: parentTxId,
        userId: auth.currentUser.uid,
        userEmail: auth.currentUser.email || "",
        type: "payment_sent",
        amount: -price,
        description: `Platba za službu: ${bookedRecord.service} v salonu ${profile.businessName}`,
        targetUid: businessId,
        targetName: profile.businessName,
        bookingId: bookedRecord.id,
        createdAt: serverTimestamp()
      });

      // 4. Create 'Received' transaction
      await setDoc(doc(db, "walletTransactions", receivTxId), {
        id: receivTxId,
        userId: businessId,
        userEmail: profile.email || "",
        type: "payment_received",
        amount: price,
        description: `Přijatá platba: ${auth.currentUser.displayName || "Zákazník"} - ${bookedRecord.service}`,
        targetUid: auth.currentUser.uid,
        targetName: auth.currentUser.displayName || "Zákazník",
        bookingId: bookedRecord.id,
        createdAt: serverTimestamp()
      });

      // 5. Update booking paymentStatus
      await setDoc(doc(db, "bookings", bookedRecord.id), {
        paymentStatus: "zaplaceno",
        paymentAmount: price,
        paidAt: serverTimestamp()
      }, { merge: true });

      setBookingPaid(true);

    } catch (err) {
      console.error("Inline payment failed:", err);
      alert("Platba se nezdařila.");
    } finally {
      setIsPayingInline(false);
    }
  };

  const isCourts = profile?.segment === "courts";
  const isFitness = profile?.segment === "fitness";
  
  const step1Label = isCourts 
    ? "1. Vyberte kurt / hrací plochu" 
    : isFitness 
      ? "1. Vyberte požadovaný trénink / lekci" 
      : "1. Vyberte požadované ošetření / službu";

  const step2Label = isCourts 
    ? "2. Zvolte den rezervace" 
    : "2. Zvolte den návštěvy";

  const step3Label = isCourts 
    ? "3. Vyberte si hrací časový slot" 
    : "3. Vyberte si dostupný volný čas";

  // Load business profile and details
  useEffect(() => {
    async function getProfile() {
      try {
        const docSnap = await getDoc(doc(db, "leads", businessId));
        if (docSnap.exists()) {
          const data = docSnap.data();
          setProfile(data);
          
          // Load custom services for this business UID
          const localServicesKey = `spinly_services_${businessId}`;
          const savedServices = localStorage.getItem(localServicesKey);
          if (savedServices) {
            const list = JSON.parse(savedServices);
            setServices(list);
            if (list.length > 0) setSelectedService(list[0]);
          } else {
            const defaultServices = getDefaultServicesForSegment(data.segment);
            setServices(defaultServices);
            if (defaultServices.length > 0) setSelectedService(defaultServices[0]);
          }
        } else {
          // fallback to demo profile if not registered yet
          setProfile({
            businessName: "Ateliér Krásy & Stylu",
            ownerName: "Nikola Novotná",
            phone: "+420 776 543 210",
            segment: "salon"
          });
          const defaults = getDefaultServicesForSegment("salon");
          setServices(defaults);
          if (defaults.length > 0) setSelectedService(defaults[0]);
        }
      } catch (err) {
        console.error("Error loading client booking profile:", err);
      } finally {
        setLoading(false);
      }
    }

    getProfile();
  }, [businessId]);

  // Load existing bookings real-time to prevent collisions
  useEffect(() => {
    const matchSegmentKey = `${profile.segment}__${businessId}`;
    const q = query(
      collection(db, "bookings"),
      where("industry", "==", matchSegmentKey)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: any[] = [];
      snapshot.forEach((doc) => {
        list.push(doc.data());
      });
      setBookings(list);
    }, (error) => {
      console.error("Failed to load live availability slots:", error);
    });

    return () => unsubscribe();
  }, [profile.segment, businessId]);

  // Helper defaults
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
      case "fitness":
        return [
          { id: "f1", name: "Formování postavy (Osobní trénink)", price: 600, duration: 60 },
          { id: "f2", name: "Kondiční kruhový trénink (Lekce)", price: 250, duration: 60 },
          { id: "f3", name: "Sestavení tréninkového plánu online", price: 1200, duration: 30 }
        ];
      case "courts":
        return [
          { id: "c1", name: "Pronájem vnitřního kurtu (Antuka)", price: 400, duration: 60 },
          { id: "c2", name: "Pronájem venkovního kurtu (Tráva)", price: 300, duration: 60 },
          { id: "c3", name: "Tréninková lekce s profesionálem", price: 800, duration: 60 }
        ];
      default:
        return [
          { id: "o1", name: "Osobní konzultace", price: 500, duration: 45 },
          { id: "o2", name: "Základní služba", price: 400, duration: 30 }
        ];
    }
  };

  // Available slots configuration
  const TIME_SLOTS = ["09:00", "10:00", "11:30", "13:00", "14:00", "15:00", "16:15", "17:30"];

  // Check if slot is already occupied
  const isSlotBooked = (day: string, time: string) => {
    return bookings.some(bk => 
      bk.day === day && 
      bk.time === time && 
      bk.status !== "stornováno"
    );
  };

  // Submit client booking
  const handleClientSubmitBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedService || !selectedTime || !clientName.trim() || !clientPhone.trim()) {
      alert("Prosím vyplňte všechny údaje a zvolte volný čas slot!");
      return;
    }

    setSaving(true);
    const bookingId = "client-bk-" + Math.random().toString(36).substring(2, 11);
    const matchSegmentKey = `${profile.segment}__${businessId}`;

    const newBooking = {
      service: selectedService.name,
      day: selectedDay,
      time: selectedTime,
      clientName: clientName.trim(),
      clientPhone: clientPhone.trim(),
      status: "přijato",
      industry: matchSegmentKey,
      businessId: businessId,
      createdAt: serverTimestamp()
    };

    try {
      await setDoc(doc(db, "bookings", bookingId), newBooking);
      
      setBookedRecord({ id: bookingId, ...newBooking });
      setBookingSuccess(true);
      
      setTimeout(() => {
        setSmsVisible(true);
      }, 1500);

    } catch (err) {
      console.error("Booking submission error:", err);
      alert("Došlo k chybě při zakládání rezervace.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#020617] flex items-center justify-center p-4">
        <div className="flex flex-col items-center justify-center space-y-3">
          <div className="w-8 h-8 border-3 border-emerald-500/20 border-t-emerald-400 rounded-full animate-spin" />
          <p className="text-xs font-bold text-slate-400 font-mono uppercase tracking-widest">Načítám Spinly portál...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#020617] flex flex-col font-sans antialiased text-slate-200 bg-grid-pattern">
      
      {/* Client header banner */}
      <nav className="bg-[#020617]/85 backdrop-blur-md border-b border-slate-900 py-4 px-4 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <button 
            onClick={onBackToLanding}
            className="text-slate-400 hover:text-white border border-slate-800 bg-slate-900/60 rounded-xl px-3.5 py-2 text-xs font-bold flex items-center gap-1 shadow-2xs transition-all pointer-events-auto cursor-pointer"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            Zpět na Spinly.cz
          </button>
          
          <div className="flex items-center gap-1.5">
            <Building className="w-4 h-4 text-emerald-400 animate-pulse" />
            <span className="text-[10px] font-bold bg-emerald-500/10 text-emerald-400 px-2.5 py-1 rounded-full border border-emerald-500/20 font-mono uppercase tracking-wider">
              Online rezervační brána
            </span>
          </div>
        </div>
      </nav>

      {/* Main interactive stage */}
      <div className="flex-grow max-w-4xl w-full mx-auto px-4 py-8 md:py-12 flex flex-col justify-center">
        
        {!bookingSuccess ? (
          <div className="bg-slate-950/80 border border-slate-900 rounded-3xl overflow-hidden shadow-2xl grid grid-cols-1 md:grid-cols-12">
            
            {/* Left Column Salon Profile Display */}
            <div className="md:col-span-4 bg-slate-950 p-6 md:p-8 flex flex-col justify-between relative overflow-hidden border-b md:border-b-0 md:border-r border-slate-900">
              <div className="absolute top-0 right-0 p-16 bg-emerald-500/10 rounded-full blur-3xl" />
              
              <div className="space-y-6">
                <div className="p-3 bg-slate-900 rounded-2xl w-fit border border-slate-800 text-emerald-400">
                  <Scissors className="w-7 h-7 text-emerald-400" />
                </div>
                <div>
                  <h1 className="text-xl md:text-2xl font-black tracking-tight leading-tight text-white">{profile.businessName}</h1>
                  <p className="text-xs text-slate-400 mt-1 font-semibold underline decoration-emerald-500/30">Správce: {profile.ownerName}</p>
                </div>
              </div>

              <div className="pt-8 space-y-4 border-t border-slate-900/80 text-xs">
                <div>
                  <p className="text-slate-500 font-bold uppercase tracking-widest text-[9px] font-mono">Telefon pro ověření</p>
                  <p className="text-emerald-400 font-mono font-bold mt-1 text-sm">{profile.phone}</p>
                </div>
                <div className="bg-emerald-500/5 rounded-xl p-3.5 border border-emerald-500/10 flex items-start gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <p className="text-[10px] text-slate-400 leading-normal font-semibold">
                    Vaše rezervace bude ihned doručena. Na zadané číslo zašleme potvrzující SMS.
                  </p>
                </div>
              </div>
            </div>

            {/* Right Column Booking Form Scheduler */}
            <form onSubmit={handleClientSubmitBooking} className="md:col-span-8 p-6 md:p-8 space-y-6 bg-slate-950/40">
              
              {/* Step 1: Service selector */}
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2.5 font-mono">
                  {step1Label}
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {services.map((ser) => {
                    const isSelected = selectedService?.id === ser.id;
                    return (
                      <div
                        key={ser.id}
                        onClick={() => setSelectedService(ser)}
                        className={`p-3.5 border rounded-2xl cursor-pointer transition-all flex flex-col justify-between gap-1 shadow-sm ${
                          isSelected 
                            ? "bg-emerald-500 border-emerald-400 text-slate-950 font-extrabold" 
                            : "bg-slate-900/40 border-slate-900 text-slate-300 hover:border-slate-800"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-extrabold text-xs">{ser.name}</span>
                          <div className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                            isSelected ? "bg-slate-950 border-slate-950" : "border-slate-700"
                          }`}>
                            {isSelected && <Check className="w-3 h-3 text-emerald-450 stroke-[3]" />}
                          </div>
                        </div>
                        <div className="flex items-center justify-between text-[11px] mt-2 font-semibold">
                          <span className={isSelected ? "text-slate-900" : "text-slate-500 font-mono"}>⏱️ {ser.duration} min</span>
                          <span className={`font-bold font-mono ${isSelected ? "text-slate-950 text-sm font-black" : "text-emerald-400"}`}>{ser.price} Kč</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Step 2: Date Selector */}
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2.5 font-mono">
                  {step2Label}
                </label>
                <div className="flex gap-2.5">
                  {["Dnes", "Zítra", "Pondělí"].map((day) => {
                    const isSelected = selectedDay === day;
                    return (
                      <button
                        key={day}
                        type="button"
                        onClick={() => {
                          setSelectedDay(day);
                          setSelectedTime("");
                        }}
                        className={`flex-1 py-2.5 px-3 rounded-xl border text-xs font-bold transition-all text-center cursor-pointer ${
                          isSelected 
                            ? "bg-emerald-500 border-emerald-400 text-slate-950 font-black shadow-md shadow-emerald-500/10" 
                            : "bg-slate-900/60 border-slate-900 text-slate-400 hover:border-slate-800 hover:text-white"
                        }`}
                      >
                        {day}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Step 3: Hour Slots selector */}
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2.5 font-mono">
                  {step3Label}
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {TIME_SLOTS.map((time) => {
                    const booked = isSlotBooked(selectedDay, time);
                    const isSelected = selectedTime === time;

                    return (
                      <button
                        key={time}
                        type="button"
                        disabled={booked}
                        onClick={() => setSelectedTime(time)}
                        className={`py-2 text-xs font-bold font-mono rounded-xl border text-center transition-all cursor-pointer ${
                          booked 
                            ? "bg-slate-950 border-slate-950 text-slate-650 cursor-not-allowed opacity-30" 
                            : isSelected
                              ? "bg-emerald-500 border-emerald-400 text-slate-950 font-black"
                              : "bg-slate-900/60 border-slate-900 text-slate-350 hover:border-slate-800 hover:text-white"
                        }`}
                      >
                        {time}
                        {booked && <div className="text-[8px] opacity-60 leading-none">Plno</div>}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Step 4: Client contact details */}
              <div className="border-t border-slate-900 pt-6 space-y-4">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 font-mono">
                  4. Kontaktní údaje pro okamžité schválení
                </label>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="relative">
                    <User className="absolute left-3.5 top-3 w-4 h-4 text-emerald-450" />
                    <input
                      type="text"
                      required
                      placeholder="Jméno a příjmení"
                      value={clientName}
                      onChange={(e) => setClientName(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-900/60 border border-slate-900 focus:outline-none focus:border-slate-800 text-xs text-white font-bold placeholder-slate-500 rounded-xl"
                    />
                  </div>

                  <div className="relative">
                    <Phone className="absolute left-3.5 top-3 w-4 h-4 text-emerald-450" />
                    <input
                      type="tel"
                      required
                      placeholder="Mobil (pro SMS potvrzení)"
                      value={clientPhone}
                      onChange={(e) => setClientPhone(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-900/60 border border-slate-900 focus:outline-none focus:border-slate-800 text-xs text-white font-bold placeholder-slate-500 rounded-xl font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Submit trigger button */}
              <button
                type="submit"
                disabled={saving || !selectedTime}
                className={`w-full py-3.5 rounded-2xl font-bold text-xs shadow-md tracking-wider transition-all uppercase flex items-center justify-center gap-1.5 cursor-pointer ${
                  !selectedTime 
                    ? "bg-slate-900 border border-slate-900 text-slate-500 cursor-not-allowed" 
                    : "bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black active:scale-[0.98]"
                }`}
              >
                {saving ? "Odesílám rezervaci..." : "Rezervovat termín"}
              </button>

            </form>

          </div>
        ) : (
          /* Successful client checkout view + Simulated smartphone live alert popup */
          <div className="max-w-md mx-auto space-y-8 animate-fadeIn">
            
            <div className="bg-slate-950 border border-slate-900 rounded-3xl p-6 md:p-8 text-center space-y-5 shadow-2xl relative">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-600" />
              
              <div className="w-14 h-14 bg-emerald-500/10 text-emerald-400 rounded-full flex items-center justify-center mx-auto border border-emerald-500/20">
                <Check className="w-7 h-7 stroke-[3]" />
              </div>

              <div>
                <h2 className="text-xl font-display font-black text-white tracking-tight">Rezervace odeslána!</h2>
                <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
                  Vaše žádost byla doručena do systému partnera <b>{profile.businessName}</b>.
                </p>
              </div>

              {/* Details ticket summary */}
              <div className="bg-slate-900/50 border border-slate-900 rounded-2xl p-4 text-left space-y-2.5 font-semibold text-xs text-slate-300">
                <div className="flex justify-between border-b border-slate-900 pb-2">
                  <span className="text-slate-500">Klient:</span>
                  <span className="text-white">{bookedRecord?.clientName}</span>
                </div>
                <div className="flex justify-between border-b border-slate-900 pb-2">
                  <span className="text-slate-500">Termín:</span>
                  <span className="text-emerald-400 font-bold font-mono">{bookedRecord?.day} v {bookedRecord?.time}</span>
                </div>
                <div className="flex justify-between border-b border-slate-900 pb-2">
                  <span className="text-slate-500">Zvolená služba:</span>
                  <span className="text-white truncate max-w-[200px]">{bookedRecord?.service}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Cena k úhradě:</span>
                  <span className="text-emerald-400 font-bold font-mono">{selectedService?.price || 500} Kč</span>
                </div>
              </div>

              {/* Spinly Pay Inline Payment Terminal */}
              <div className="bg-[#030712] border border-slate-900 rounded-2xl p-4 text-center space-y-3 shadow-inner">
                <div className="flex items-center justify-center gap-1.5 text-[#d5af66] font-mono text-[10px] font-bold uppercase tracking-widest font-semibold">
                  <Wallet className="w-3.5 h-3.5" />
                  Spinly Pay Terminál
                </div>
                
                {!auth.currentUser ? (
                  <div className="space-y-1.5 p-1">
                    <p className="text-[11px] text-slate-400 leading-normal font-semibold">
                      Chcete zaplatit hned přes mobil? Přihlaste se do své Spinly Peněženky a plaťte jedním kliknutím!
                    </p>
                    <p className="text-[10px] text-[#d5af66] font-bold font-mono">
                      Bezhotovostně • Hned připsáno • 1 000 Kč bonus k registraci!
                    </p>
                  </div>
                ) : bookingPaid ? (
                  <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3 text-emerald-400 text-[11px] font-bold flex items-center justify-center gap-2">
                    <Check className="w-4 h-4 stroke-[3]" />
                    <span>Platba byla úspěšně odeslána kadeřníkovi!</span>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex justify-between items-center text-[11px] font-semibold px-1">
                      <span className="text-slate-400">Váš zůstatek v peněžence:</span>
                      <span className="text-white font-mono font-bold">{(currentUserProfile?.walletBalance ?? 1000).toLocaleString("cs-CZ")} Kč</span>
                    </div>
                    <button
                      type="button"
                      onClick={handleInlinePayment}
                      disabled={isPayingInline}
                      className="w-full py-2.5 bg-gradient-to-r from-[#d5af66] to-[#b38f4d] hover:brightness-110 text-slate-950 font-black text-xs rounded-xl tracking-wider uppercase transition-all shadow-md cursor-pointer flex items-center justify-center gap-2"
                    >
                      {isPayingInline ? "Zpracovávám platbu..." : `Zaplatit ${selectedService?.price || 500} Kč`}
                    </button>
                    <p className="text-[9px] text-slate-500 leading-none">Částka se okamžitě přesune do peněženky salónu.</p>
                  </div>
                )}
              </div>

              <button
                onClick={onBackToLanding}
                className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl tracking-wider uppercase transition-all border border-slate-800 cursor-pointer"
              >
                Zpět na hlavní web
              </button>
            </div>

            {/* Interactive confirmation SMS alert inside smartphone bezel */}
            <div className="max-w-[310px] mx-auto bg-slate-950 p-2.5 rounded-[38px] border-4 border-slate-800 shadow-2xl relative overflow-hidden flex flex-col justify-between">
              
              {/* Smartphone speaker notch */}
              <div className="w-24 h-4 bg-slate-950 absolute top-0 left-1/2 -translate-x-1/2 rounded-b-xl z-20 flex items-center justify-center">
                <div className="w-10 h-1 bg-slate-800 rounded-full" />
              </div>

              {/* StatusBar layout */}
              <div className="h-6 flex items-center justify-between px-4 text-[9px] font-bold text-slate-400 select-none pb-1 mt-0.5 font-mono">
                <span>09:41</span>
                <div className="flex items-center gap-1">
                  <span>5G</span>
                  <div className="w-3.5 h-1.5 bg-slate-400 rounded-xs" />
                </div>
              </div>

              {/* Screen stage area */}
              <div className="bg-slate-900 rounded-[28px] overflow-hidden min-h-[160px] p-3 flex flex-col justify-center relative border border-slate-850">
                <div className="absolute inset-0 bg-gradient-to-tr from-slate-950 via-emerald-950/20 to-slate-900 opacity-60" />
                
                {smsVisible ? (
                  <div className="relative z-10 animate-slideDown bg-slate-950/90 backdrop-blur-md rounded-2xl p-3 border border-slate-800 shadow-xl space-y-2 text-left">
                    <div className="flex justify-between items-center text-[8px] font-bold text-slate-400 uppercase tracking-wider font-mono">
                      <span className="flex items-center gap-1 text-emerald-400">💬 ZPRÁVA • SPINLY</span>
                      <span>Nyní</span>
                    </div>
                    <p className="text-[10px] text-slate-200 leading-relaxed font-semibold">
                      Ahoj {bookedRecord?.clientName || "kliente"}, tvoje rezervace v <b>{profile.businessName}</b> na {bookedRecord?.day} v {bookedRecord?.time} byla <b>úspěšně potvrzena!</b> Těšíme se na tebe.
                    </p>
                  </div>
                ) : (
                  <div className="relative z-10 text-center text-[10px] text-slate-500 font-bold uppercase tracking-wider py-4">
                    <div className="w-5 h-5 border-2 border-slate-700 border-t-emerald-400 rounded-full animate-spin mx-auto mb-2" />
                    Čekám na odeslání SMS...
                  </div>
                )}
                
              </div>

              {/* Bottom bar indicator */}
              <div className="h-4 flex items-center justify-center pt-2">
                <div className="w-20 h-1 bg-slate-800 rounded-full" />
              </div>

            </div>

          </div>
        )}

      </div>
    </div>
  );
}
