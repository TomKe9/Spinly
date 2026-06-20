import React, { useState, useEffect } from "react";
import { 
  Sparkles, 
  Scissors, 
  Activity, 
  HeartPulse, 
  CalendarCheck, 
  Check, 
  Clock, 
  User, 
  Phone, 
  ArrowRight,
  MessageSquare,
  ShieldCheck,
  CalendarDays,
  Smartphone,
  CheckCircle2,
  AlertCircle
} from "lucide-react";
import { INDUSTRIES } from "../types";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { db, handleFirestoreError, OperationType } from "../firebase";

export default function InteractiveShowcase() {
  const [selectedIndustry, setSelectedIndustry] = useState(INDUSTRIES[0]);
  const [selectedDay, setSelectedDay] = useState("Zítra");
  const [selectedTime, setSelectedTime] = useState("14:00");
  const [clientName, setClientName] = useState("Petr Horák");
  const [clientPhone, setClientPhone] = useState("+420 777 123 456");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isBooked, setIsBooked] = useState(false);
  const [smsTimer, setSmsTimer] = useState<boolean>(false);
  const [smsIncoming, setSmsIncoming] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const handleReset = () => {
    setIsBooked(false);
    setIsSubmitting(false);
    setSmsTimer(false);
    setSmsIncoming(false);
    setSubmitError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientName.trim() || !clientPhone.trim()) return;
    
    setIsSubmitting(true);
    setSubmitError(null);
    
    const randomSuffix = Math.random().toString(36).substring(2, 12);
    const bookingId = "book-" + randomSuffix;

    try {
      try {
        await setDoc(doc(db, "bookings", bookingId), {
          service: selectedIndustry.service,
          day: selectedDay,
          time: selectedTime,
          clientName: clientName.trim(),
          clientPhone: clientPhone.trim(),
          status: "přijato",
          industry: selectedIndustry.id,
          createdAt: serverTimestamp()
        });
      } catch (firestoreError) {
        handleFirestoreError(firestoreError, OperationType.WRITE, `bookings/${bookingId}`);
      }

      setIsSubmitting(false);
      setIsBooked(true);
      
      setTimeout(() => {
        setSmsTimer(true);
        setSmsIncoming(true);
        setTimeout(() => {
          setSmsIncoming(false);
        }, 3000);
      }, 1000);

    } catch (err: any) {
      console.error("Booking error:", err);
      setIsSubmitting(false);
      setSubmitError(err.message || "Přihlášení rezervace se nezdařilo. Zkuste to prosím znovu.");
    }
  };

  const selectIndustryHandler = (ind: typeof INDUSTRIES[0]) => {
    setSelectedIndustry(ind);
    setIsBooked(false);
    setSmsTimer(false);
  };

  return (
    <div id="demo-showcase" className="w-full max-w-5xl mx-auto rounded-3xl border border-stone-200/80 bg-white shadow-xl overflow-hidden relative">
      <div className="absolute top-0 left-0 w-full h-1.5 bg-brand-600" />
      
      {/* Upper header explanatory header block */}
      <div className="p-6 md:p-8 border-b border-stone-100 flex flex-col md:flex-row md:items-center justify-between gap-5 bg-stone-50/50 relative overflow-hidden">
        <div>
          <span className="inline-flex items-center gap-1.5 bg-brand-50 text-brand-700 font-mono text-[10px] uppercase px-3 py-1 rounded-full font-bold tracking-widest mb-3 border border-brand-100">
            <Sparkles className="w-3 h-3 text-brand-600" /> Interaktivní simulátor
          </span>
          <h3 className="text-2xl md:text-3xl font-display font-black tracking-tight text-stone-900 leading-none">
            Vyzkoušejte si objednávku na 2 kliknutí
          </h3>
          <p className="text-stone-500 mt-1.5 text-xs md:text-sm max-w-2xl leading-relaxed font-semibold">
            Vyberte obor, vyplňte jméno a hned uvidíte, jak Spinly automaticky zaznamená rezervaci do kalendáře a okamžitě odešle potvrzovací SMS.
          </p>
        </div>
        
        {/* Industry fast switcher */}
        <div className="flex flex-wrap items-center gap-1.5 bg-stone-100/80 p-1.5 rounded-2xl border border-stone-200/60 shrink-0 self-start md:self-auto">
          {INDUSTRIES.map((ind) => {
            const isSelected = selectedIndustry.id === ind.id;
            return (
              <button
                key={ind.id}
                onClick={() => selectIndustryHandler(ind)}
                className={`px-3 py-2 rounded-xl transition-all duration-200 flex items-center gap-1.5 text-xs font-bold cursor-pointer ${
                  isSelected 
                    ? "bg-brand-600 text-white shadow-xs scale-[1.03]" 
                    : "text-stone-500 hover:text-stone-800 hover:bg-stone-50"
                }`}
              >
                <span>
                  {ind.id === "salon" && "✨"}
                  {ind.id === "hair" && "💇"}
                  {ind.id === "massage" && "💆"}
                  {ind.id === "physio" && "🩺"}
                  {ind.id === "other" && "📅"}
                </span>
                <span>{ind.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Sandbox Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-stone-100">
        
        {/* Left Column: Client Booking Widget Form (Width: 7/12) */}
        <div className="lg:col-span-7 p-6 md:p-8 bg-white">
          <div className="max-w-md mx-auto">
            <div className="flex items-center gap-2 mb-6 bg-stone-100 py-1.5 px-3 rounded-full border border-stone-200/40 w-fit">
              <span className="w-2 h-2 bg-brand-500 rounded-full animate-ping" />
              <p className="text-[10px] font-bold text-brand-700 uppercase tracking-widest font-mono">
                Z pohledu vašeho klienta
              </p>
            </div>

            {!isBooked ? (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-1.5 font-mono">
                    Služba
                  </label>
                  <div className="p-3.5 bg-stone-50 rounded-2xl border border-stone-200/60 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="bg-brand-50 p-2 rounded-xl text-brand-700">
                        {selectedIndustry.id === "salon" && <Sparkles className="w-4 h-4" />}
                        {selectedIndustry.id === "hair" && <Scissors className="w-4 h-4" />}
                        {selectedIndustry.id === "massage" && <Activity className="w-4 h-4" />}
                        {selectedIndustry.id === "physio" && <HeartPulse className="w-4 h-4" />}
                        {selectedIndustry.id === "other" && <CalendarCheck className="w-4 h-4" />}
                      </div>
                      <div>
                        <h4 className="font-extrabold text-xs text-stone-900 uppercase tracking-tight">{selectedIndustry.service}</h4>
                        <p className="text-[11px] text-stone-500 font-mono">Doba trvání: 60 minut</p>
                      </div>
                    </div>
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 bg-brand-50 text-brand-700 border border-brand-200 rounded-full">
                      Volný termín
                    </span>
                  </div>
                </div>

                {/* Day selection */}
                <div>
                  <label className="block text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-1.5 font-mono">
                    Vyberte den
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {["Dnes", "Zítra", "Pondělí"].map((day) => {
                      const isSelected = selectedDay === day;
                      return (
                        <button
                          type="button"
                          key={day}
                          onClick={() => setSelectedDay(day)}
                          className={`py-2.5 px-1 text-center rounded-xl font-bold text-xs transition-all duration-200 border cursor-pointer ${
                            isSelected 
                              ? "bg-brand-600 border-brand-500 text-white shadow-xs" 
                              : "bg-white border-stone-200 text-stone-600 hover:border-stone-300 hover:bg-stone-50"
                          }`}
                        >
                          {day}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Hours selection */}
                <div>
                  <label className="block text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-1.5 font-mono">
                    Vyberte čas
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {["09:00", "11:30", "14:00", "16:15"].map((time) => {
                      const isSelected = selectedTime === time;
                      return (
                        <button
                          type="button"
                          key={time}
                          onClick={() => setSelectedTime(time)}
                          className={`py-2 px-1 text-center font-mono text-xs rounded-xl transition-all duration-200 border cursor-pointer ${
                            isSelected 
                              ? "bg-brand-600 border-brand-500 text-white shadow-xs" 
                              : "bg-white border-stone-200 text-stone-600 hover:border-stone-300 hover:bg-stone-50"
                          }`}
                        >
                          {time}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Basic client info */}
                <div className="space-y-2.5 pt-1.5">
                  <div>
                    <label className="block text-[10px] font-bold text-stone-500 uppercase tracking-widest mb-1 flex items-center gap-1.5 font-mono">
                      <User className="w-3.5 h-3.5 text-stone-400" />
                      Jméno a Příjmení
                    </label>
                    <input
                      type="text"
                      required
                      value={clientName}
                      onChange={(e) => setClientName(e.target.value)}
                      placeholder="Např. Martin Dvořák"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-stone-250 bg-white placeholder-stone-400 text-xs focus:outline-none text-stone-900 font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-stone-500 uppercase tracking-widest mb-1 flex items-center gap-1.5 font-mono">
                      <Phone className="w-3.5 h-3.5 text-stone-400" />
                      Telefonní číslo (pro testovací SMS)
                    </label>
                    <input
                      type="tel"
                      required
                      value={clientPhone}
                      onChange={(e) => setClientPhone(e.target.value)}
                      placeholder="Např. +420 777 123 456"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-stone-250 bg-white placeholder-stone-400 text-xs focus:outline-none text-stone-900 font-bold font-mono"
                    />
                  </div>
                </div>

                {submitError && (
                  <div className="p-3 bg-red-50 border border-red-100 text-red-700 text-xs font-semibold rounded-xl text-center">
                    {submitError}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full mt-3 bg-brand-600 hover:bg-brand-700 text-white py-3 px-6 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-md transition-all active:scale-[0.98] cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Odesílám rezervaci...
                    </>
                  ) : (
                    <>
                      Odeslat rezervaci
                      <ArrowRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </form>
            ) : (
              <div className="py-12 text-center space-y-6">
                <div className="mx-auto w-14 h-14 bg-brand-50 rounded-full flex items-center justify-center text-brand-600 border border-brand-100">
                  <CheckCircle2 className="w-7 h-7" />
                </div>
                <div>
                  <h4 className="text-lg font-black text-stone-900 font-display">Klient odeslal rezervaci!</h4>
                  <p className="text-xs text-stone-505 mt-2 max-w-xs mx-auto leading-relaxed font-semibold">
                    Zaslaná žádost byla doručena. Na mobilním náhledu vpravo vidíte, jak ihned pípne potvrzující SMS zpráva.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleReset}
                  className="text-xs font-bold text-brand-600 hover:text-brand-700 underline uppercase tracking-widest cursor-pointer"
                >
                  Smazat a zkusit znovu
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Owner Calendar & SMS phone mockup display (Width: 5/12) */}
        <div className="lg:col-span-5 p-6 md:p-8 bg-stone-50/50 flex flex-col gap-6 justify-between select-none">
          
          {/* Top Panel: Salon Calendar dashboard view */}
          <div className="border border-stone-200/80 rounded-2xl bg-white p-4 shadow-xs">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3 mb-3">
              <div className="flex items-center gap-2">
                <CalendarDays className="w-3.5 h-3.5 text-brand-600" />
                <span className="text-[10px] font-bold font-mono text-stone-500">ADMINISTRACE SPINLY • kalendář</span>
              </div>
              <span className="text-[9px] font-mono px-2 py-0.5 bg-emerald-50 text-emerald-700 font-bold border border-emerald-200 rounded">
                AKTIVNÍ rozvrh
              </span>
            </div>

            {/* Simulated schedule slots */}
            <div className="space-y-1.5">
              <div className="grid grid-cols-5 text-[9px] font-bold text-stone-400 uppercase tracking-widest pb-1 border-b border-stone-100">
                <span className="col-span-1">Čas</span>
                <span className="col-span-2">Klient</span>
                <span className="col-span-2 text-right font-semibold">Stav SMS</span>
              </div>

              {[
                { time: "09:00", name: "Klára Svobodová", status: "Odesláno", bg: "bg-[#fbfbf9]" },
                { time: "11:30", name: "Aneta Veselá", status: "Odesláno", bg: "bg-[#fbfbf9]" },
                { 
                  time: selectedTime, 
                  name: isBooked ? clientName : "• Neobsazeno •", 
                  status: isBooked ? "Nová" : "Volno",
                  isActiveSlot: true
                },
                { time: "16:15", name: "Monika Novotná", status: "Čeká", bg: "bg-[#fbfbf9]" }
              ].map((slot, index) => {
                const isActive = slot.isActiveSlot && isBooked;
                return (
                  <div 
                    key={index} 
                    className={`grid grid-cols-5 py-2 px-2.5 rounded-lg text-xs items-center transition-all duration-300 border ${
                      isActive 
                        ? "bg-brand-50/50 border-brand-300 text-stone-900 scale-[1.01] shadow-xs" 
                        : "text-stone-600 bg-stone-50 border-transparent"
                    }`}
                  >
                    <span className="font-mono font-bold text-stone-400 col-span-1 text-[11px]">{slot.time}</span>
                    <span className={`col-span-2 truncate font-bold text-xs ${isActive ? "text-brand-700 font-extrabold" : "text-stone-700"}`}>
                      {slot.name}
                    </span>
                    <span className="col-span-2 text-right font-semibold">
                      {isActive ? (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-brand-50 text-brand-700 font-bold rounded text-[9px] border border-brand-200 animate-pulse">
                          ✓ Připraveno
                        </span>
                      ) : slot.name === "• Neobsazeno •" ? (
                        <span className="px-1.5 py-0.5 bg-stone-100 text-stone-400 rounded text-[9px] font-bold border border-stone-200/40">
                          Volno
                        </span>
                      ) : (
                        <span className="px-1.5 py-0.5 bg-stone-50 text-stone-500 rounded text-[9px] font-bold border border-stone-100">
                          {slot.status}
                        </span>
                      )}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Bottom Panel: Physical Smartphone device wrapper */}
          <div className="relative mx-auto w-full max-w-[240px]">
            {/* Visual vibration highlight animation on incoming SMS */}
            <div className={`transition-all duration-200 relative ${smsIncoming ? "scale-[1.03]" : ""}`}>
              
              {/* Phone Wrapper structure */}
              <div className="w-full bg-[#18181b] rounded-3xl border-4 border-stone-800 shadow-xl p-2.5 pb-3">
                
                {/* Physical top speaker & notch */}
                <div className="w-20 h-3 bg-stone-900 rounded-full mx-auto mb-2 flex items-center justify-center">
                  <div className="w-1.5 h-1 bg-stone-800 rounded-full" />
                </div>

                <div className="flex items-center justify-between border-b border-stone-800 pb-1.5 mb-2 px-1 text-stone-300">
                  <div className="flex items-center gap-1">
                    <Smartphone className="w-2.5 h-2.5 text-stone-400" />
                    <span className="text-[8px] font-bold font-mono text-stone-400">SMS ZPRÁVA</span>
                  </div>
                  <span className="text-[8px] text-brand-400 font-bold tracking-wider font-mono">Spinly.cz</span>
                </div>

                {/* SMS Window screen area */}
                <div className="min-h-[110px] bg-stone-900 rounded-xl p-2 flex flex-col justify-end">
                  
                  {!smsTimer ? (
                    <div className="h-full flex flex-col items-center justify-center text-center p-2 text-stone-500 space-y-1">
                      <MessageSquare className="w-4 h-4 text-stone-700 animate-pulse" />
                      <p className="text-[9px] font-semibold leading-normal">
                        Krok 1: Odešlete rezervaci nalevo...
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-1.5 animate-fadeIn text-left">
                      
                      {/* Incoming alert badge */}
                      {smsIncoming && (
                        <div className="text-center py-1 bg-brand-950/40 rounded-lg text-emerald-400 text-[8px] font-bold animate-pulse border border-brand-500/10">
                          💬 SMS doručena na mobil!
                        </div>
                      )}

                      {/* Outgoing simulated message bubble */}
                      <div className="self-start max-w-[90%] bg-stone-800 text-stone-300 text-[8.5px] rounded-xl rounded-bl-sm p-1.5 leading-normal border border-stone-750 font-semibold">
                        Nezávislý asistent uložil booking:
                      </div>

                      {/* Real Customer automated text */}
                      <div className="self-end max-w-[98%] bg-brand-600 text-white text-[9px] font-bold rounded-xl rounded-br-sm p-2 shadow-md relative leading-snug">
                        <div className="text-[8px] text-white/90 uppercase tracking-widest flex items-center gap-1 mb-1 font-mono font-black">
                          <Check className="w-2.5 h-2.5 stroke-[4]" /> SPINLY INFO
                        </div>
                        <p className="font-semibold text-[8.5px]">
                          Ahoj {clientName}. Tvoje schůzka na <strong className="underline">{selectedIndustry.service}</strong> v {selectedDay} v <strong className="underline">{selectedTime}</strong> byla potvrzena.
                        </p>
                      </div>

                    </div>
                  )}

                </div>
              </div>

              {/* Ping notification circle pointer */}
              {smsIncoming && (
                <div className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-550 text-white rounded-full font-black text-[9px] flex items-center justify-center animate-ping">
                  •
                </div>
              )}

            </div>
          </div>

          {/* Micro stats banner bottom */}
          <div className="text-center">
            <p className="text-[10px] text-stone-400 leading-normal max-w-xs mx-auto font-medium">
              Zákazník ví termín, vy máte volné ruce pro své podnikání. <strong>Míra nepřítomnosti klesne o 92 %!</strong>
            </p>
          </div>

        </div>

      </div>

    </div>
  );
}
