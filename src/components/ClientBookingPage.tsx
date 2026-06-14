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
  Building
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
      status: "přijato", // Client submissions are pending validation ("přijato") until confirmed by merchant
      industry: matchSegmentKey,
      businessId: businessId,
      createdAt: serverTimestamp()
    };

    try {
      await setDoc(doc(db, "bookings", bookingId), newBooking);
      
      setBookedRecord(newBooking);
      setBookingSuccess(true);
      
      // Delay SMS arrival animation slightly for ultimate realism mockup
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
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="flex flex-col items-center justify-center space-y-3">
          <div className="w-8 h-8 border-3 border-indigo-150 border-t-indigo-600 rounded-full animate-spin" />
          <p className="text-xs font-bold text-slate-500">Načítám rezervační portál...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans antialiased text-slate-800">
      
      {/* Client header banner */}
      <nav className="bg-white border-b border-slate-150 py-4 px-4 shadow-xs sticky top-0 z-10">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <button 
            onClick={onBackToLanding}
            className="text-slate-500 hover:text-slate-900 border border-slate-200 hover:bg-slate-50 rounded-xl px-3 py-1.5 text-xs font-semibold flex items-center gap-1 shadow-2xs transition-all"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            Zpět na Spinly.app
          </button>
          
          <div className="flex items-center gap-1.5">
            <Building className="w-4 h-4 text-indigo-600" />
            <span className="text-xs font-bold bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-sm">
              Online Rezervace
            </span>
          </div>
        </div>
      </nav>

      {/* Main interactive stage */}
      <div className="flex-grow max-w-4xl w-full mx-auto px-4 py-8 md:py-12 flex flex-col justify-center">
        
        {!bookingSuccess ? (
          <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-md grid grid-cols-1 md:grid-cols-12">
            
            {/* Left Column Salon Profile Display */}
            <div className="md:col-span-4 bg-slate-900 text-white p-6 md:p-8 flex flex-col justify-between relative overflow-hidden">
              <div className="absolute top-0 right-0 p-16 bg-indigo-600/10 rounded-full blur-3xl" />
              
              <div className="space-y-6">
                <div className="p-3 bg-white/10 rounded-2xl w-fit">
                  <Scissors className="w-7 h-7 text-indigo-400" />
                </div>
                <div>
                  <h1 className="text-xl md:text-2xl font-black tracking-tight leading-tight">{profile.businessName}</h1>
                  <p className="text-xs text-slate-400 mt-1 font-semibold">Provozovatel: {profile.ownerName}</p>
                </div>
              </div>

              <div className="pt-8 space-y-4 border-t border-white/10 text-xs">
                <div>
                  <p className="text-slate-500 font-bold uppercase tracking-wider text-[10px]">Telefon podniku</p>
                  <p className="text-slate-200 font-mono font-bold mt-1 text-sm">{profile.phone}</p>
                </div>
                <div className="bg-white/5 rounded-xl p-3.5 border border-white/5 flex items-start gap-2">
                  <ShieldCheck className="w-4.5 h-4.5 text-emerald-400 shrink-0 mt-0.5" />
                  <p className="text-[11px] text-slate-300 leading-normal">
                    Vaše rezervace bude ihned odeslána k potvrzení. Obdržíte bezplatnou SMS notifikaci o schválení.
                  </p>
                </div>
              </div>
            </div>

            {/* Right Column Booking Form Scheduler */}
            <form onSubmit={handleClientSubmitBooking} className="md:col-span-8 p-6 md:p-8 space-y-6">
              
              {/* STep 1: Service selector */}
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2.5">
                  1. Vyberte požadovanou ošetření / službu
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {services.map((ser) => {
                    const isSelected = selectedService?.id === ser.id;
                    return (
                      <div
                        key={ser.id}
                        onClick={() => setSelectedService(ser)}
                        className={`p-3.5 border rounded-2xl cursor-pointer transition-all flex flex-col justify-between gap-1 ${
                          isSelected 
                            ? "bg-indigo-50 border-indigo-500 text-indigo-950" 
                            : "bg-white border-slate-200 hover:border-slate-300 text-slate-800"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-bold text-xs">{ser.name}</span>
                          <div className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                            isSelected ? "bg-indigo-600 border-indigo-600" : "border-slate-300"
                          }`}>
                            {isSelected && <Check className="w-3.5 h-3.5 text-white" />}
                          </div>
                        </div>
                        <div className="flex items-center justify-between text-[11px] text-slate-500 mt-2 font-medium">
                          <span>⏱️ {ser.duration} min</span>
                          <span className="font-bold text-slate-900 font-mono">{ser.price} Kč</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Step 2: Date Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2.5">
                  2. Zvolte den návštěvy
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
                          setSelectedTime(""); // Reset slot when day changes
                        }}
                        className={`flex-1 py-3 px-3 rounded-2xl border text-xs font-bold transition-all text-center cursor-pointer ${
                          isSelected 
                            ? "bg-indigo-600 border-indigo-600 text-white shadow-xs" 
                            : "bg-white border-slate-200 hover:border-slate-350 text-slate-700 hover:bg-slate-50"
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
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2.5">
                  3. Vyberte si dostupný volný čas
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
                            ? "bg-slate-50 border-slate-100 text-slate-300 cursor-not-allowed" 
                            : isSelected
                              ? "bg-indigo-600 border-indigo-600 text-white shadow-xs"
                              : "bg-white border-slate-150 hover:bg-slate-50 hover:border-slate-300 text-slate-700"
                        }`}
                      >
                        {time}
                        {booked && <div className="text-[8px] opacity-60 leading-none">Obsazeno</div>}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Step 4: Client contact details */}
              <div className="border-t border-slate-100 pt-6 space-y-4">
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">
                  4. Kontaktní údaje pro odeslání rezervace
                </label>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="relative">
                    <User className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      required
                      placeholder="Vaše jméno a příjmení"
                      value={clientName}
                      onChange={(e) => setClientName(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 border border-slate-200 focus:border-indigo-500 rounded-xl text-xs font-medium"
                    />
                  </div>

                  <div className="relative">
                    <Phone className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                    <input
                      type="tel"
                      required
                      placeholder="Mobilní telefon (pro SMS)"
                      value={clientPhone}
                      onChange={(e) => setClientPhone(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 border border-slate-200 focus:border-indigo-500 rounded-xl text-xs font-mono font-medium"
                    />
                  </div>
                </div>
              </div>

              {/* Submit trigger button */}
              <button
                type="submit"
                disabled={saving || !selectedTime}
                className={`w-full py-3.5 rounded-2xl font-bold text-xs shadow-md tracking-wide transition-all uppercase flex items-center justify-center gap-1.5 cursor-pointer ${
                  !selectedTime 
                    ? "bg-slate-100 border border-slate-200 text-slate-400 cursor-not-allowed" 
                    : "bg-indigo-600 hover:bg-indigo-700 text-white active:scale-[0.98]"
                }`}
              >
                {saving ? "Odesílám rezervaci..." : "Rezervovat termín"}
              </button>

            </form>

          </div>
        ) : (
          /* Successful custom checkout view + SMS popup */
          <div className="max-w-md mx-auto space-y-8 animate-fadeIn">
            
            <div className="bg-white border border-slate-200 rounded-3xl p-6 md:p-8 text-center space-y-5 shadow-lg">
              <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto border border-emerald-150">
                <Check className="w-8 h-8 stroke-[3]" />
              </div>

              <div>
                <h2 className="text-xl font-extrabold text-slate-950 tracking-tight">Rezervace úspěšně odeslána!</h2>
                <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
                  Žádost o termín byla zaznamenána salonem <b>{profile.businessName}</b>. Prosím vyčkejte na potvrzení.
                </p>
              </div>

              {/* Details ticket summary */}
              <div className="bg-slate-50 border border-slate-150 rounded-2xl p-4 text-left space-y-3 font-medium">
                <div className="flex justify-between text-xs border-b border-slate-200/60 pb-2">
                  <span className="text-slate-400">Klient:</span>
                  <span className="text-slate-900 font-bold">{bookedRecord?.clientName}</span>
                </div>
                <div className="flex justify-between text-xs border-b border-slate-200/60 pb-2">
                  <span className="text-slate-400">Termín:</span>
                  <span className="text-indigo-700 font-bold font-mono">{bookedRecord?.day} v {bookedRecord?.time}</span>
                </div>
                <div className="flex justify-between text-xs pb-1">
                  <span className="text-slate-400">Služba:</span>
                  <span className="text-slate-900 font-bold">{bookedRecord?.service}</span>
                </div>
              </div>

              <button
                onClick={onBackToLanding}
                className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl tracking-wide uppercase transition-all"
              >
                Zpět na domovskou stránku
              </button>
            </div>

            {/* Interactive Incoming confirmation SMS simulator inside smartphone bezel */}
            <div className="max-w-[310px] mx-auto bg-slate-950 p-2.5 rounded-[38px] border-4 border-slate-800 shadow-2xl relative overflow-hidden flex flex-col justify-between">
              
              {/* Smartphone speaker notch */}
              <div className="w-24 h-4 bg-slate-950 absolute top-0 left-1/2 -translate-x-1/2 rounded-b-xl z-20 flex items-center justify-center">
                <div className="w-10 h-1 bg-neutral-800 rounded-full" />
              </div>

              {/* Status bar */}
              <div className="h-6 flex items-center justify-between px-4 text-[9px] font-bold text-white/70 select-none pb-1 mt-0.5">
                <span>09:41</span>
                <div className="flex items-center gap-1 font-mono">
                  <span>5G</span>
                  <div className="w-3.5 h-1.5 bg-white/70 rounded-xs" />
                </div>
              </div>

              {/* Screen stage area */}
              <div className="bg-slate-900 rounded-[28px] overflow-hidden min-h-[160px] p-3 flex flex-col justify-center relative">
                
                {/* Simulated lockscreen wallpaper design */}
                <div className="absolute inset-0 bg-gradient-to-tr from-slate-950 via-indigo-950 to-slate-900 opacity-60" />
                
                {/* Instant message balloon comes slide down */}
                {smsVisible ? (
                  <div className="relative z-10 bg-white/95 text-slate-950 p-3.5 rounded-2xl shadow-xl border border-white/20 animate-slideDown space-y-1.5 select-none text-left">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
                      <div className="flex items-center gap-1.5">
                        <MessageSquare className="w-4 h-4 text-indigo-600 shrink-0" />
                        <span className="font-extrabold text-[10px] tracking-tight text-slate-800">SPINLY NOTIFIKACE</span>
                      </div>
                      <span className="text-[8px] text-slate-400 font-bold font-mono">Právě teď</span>
                    </div>
                    <p className="text-[11px] font-semibold text-slate-700 leading-normal">
                      Vážený kliente, Vaše rezervace v salonu <b>{profile.businessName}</b> dne <b>{bookedRecord?.day}</b> v <b>{bookedRecord?.time}</b> byla úspěšně odeslána obsluze ke schválení.
                    </p>
                  </div>
                ) : (
                  <div className="relative z-10 text-center py-6 text-slate-400 select-none font-bold">
                    <p className="text-[10px] animate-pulse">Čekám na simulační přenos SMS...</p>
                  </div>
                )}

              </div>

            </div>

          </div>
        )}

      </div>

    </div>
  );
}
