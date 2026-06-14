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
  Smartphone
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

  // Restart the booking simulation
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
      // 1. Persist the booking directly using Firestore client SDK
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

      // 2. Clear state and trigger simulator responses
      setIsSubmitting(false);
      setIsBooked(true);
      
      // Simulate SMS receiving after 1.2s to show beautiful UI experience
      setTimeout(() => {
        setSmsTimer(true);
        setSmsIncoming(true);
        // Turn off sound or active ring indicator after 3s
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

  // Switch industries and update recommended default service
  const selectIndustryHandler = (ind: typeof INDUSTRIES[0]) => {
    setSelectedIndustry(ind);
    setIsBooked(false);
    setSmsTimer(false);
  };

  return (
    <div id="demo-showcase" className="w-full max-w-6xl mx-auto bg-white rounded-3xl border border-neutral-100 shadow-xl overflow-hidden">
      
      {/* Upper header explanatory header block */}
      <div className="bg-neutral-900 text-white p-6 md:p-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="inline-block bg-emerald-500/20 text-emerald-300 font-mono text-xs uppercase px-3 py-1 rounded-full font-semibold tracking-wider mb-2">
            Interaktivní ukázka
          </span>
          <h3 className="text-2xl md:text-3xl font-display font-bold tracking-tight">
            Vyzkoušejte si, jak snadno to funguje
          </h3>
          <p className="text-neutral-400 mt-1 text-sm md:text-base max-w-2xl">
            Zkuste si zarezervovat termín v levém sloupci jako zákazník. V pravém sloupci ihned spatříte, jak systém Spinly zaeviduje schůzku a rozešle SMS upozornění.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {INDUSTRIES.map((ind) => {
            const isSelected = selectedIndustry.id === ind.id;
            return (
              <button
                key={ind.id}
                onClick={() => selectIndustryHandler(ind)}
                className={`p-2.5 rounded-xl transition-all duration-200 relative group flex items-center gap-1 ${
                  isSelected 
                    ? "bg-indigo-600 text-white shadow-md scale-105" 
                    : "bg-neutral-800 text-neutral-400 hover:bg-neutral-700 hover:text-neutral-200"
                }`}
                title={ind.label}
              >
                {ind.id === "salon" && <Sparkles className="w-4 h-4" />}
                {ind.id === "hair" && <Scissors className="w-4 h-4" />}
                {ind.id === "massage" && <Activity className="w-4 h-4" />}
                {ind.id === "physio" && <HeartPulse className="w-4 h-4" />}
                {ind.id === "other" && <CalendarCheck className="w-4 h-4" />}
                <span className="text-xs font-medium hidden lg:inline">{ind.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Sandbox Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-neutral-100">
        
        {/* Left Column: Client Booking Widget Form */}
        <div className="p-6 md:p-10 bg-neutral-50/50">
          <div className="max-w-md mx-auto">
            <div className="flex items-center gap-3 mb-6 bg-white py-2 px-3.5 rounded-full border border-neutral-100 w-fit shadow-xs">
              <span className="w-2.5 h-2.5 bg-indigo-600 rounded-full animate-ping" />
              <p className="text-xs font-semibold text-neutral-600 uppercase tracking-wider">
                Rezervační widget pro vaše klienty
              </p>
            </div>

            {!isBooked ? (
              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="block text-xs font-bold text-neutral-500 uppercase tracking-wider mb-2">
                    Vybraná služba
                  </label>
                  <div className="p-4 bg-white rounded-2xl border border-neutral-200 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="bg-indigo-50 p-2.5 rounded-xl text-indigo-600">
                        {selectedIndustry.id === "salon" && <Sparkles className="w-5 h-5" />}
                        {selectedIndustry.id === "hair" && <Scissors className="w-5 h-5" />}
                        {selectedIndustry.id === "massage" && <Activity className="w-5 h-5" />}
                        {selectedIndustry.id === "physio" && <HeartPulse className="w-5 h-5" />}
                        {selectedIndustry.id === "other" && <CalendarCheck className="w-5 h-5" />}
                      </div>
                      <div>
                        <h4 className="font-semibold text-sm text-neutral-900">{selectedIndustry.service}</h4>
                        <p className="text-xs text-neutral-500">Doba trvání: 60 minut</p>
                      </div>
                    </div>
                    <span className="text-xs font-semibold px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-full">
                      Volno
                    </span>
                  </div>
                </div>

                {/* Day selection */}
                <div>
                  <label className="block text-xs font-bold text-neutral-500 uppercase tracking-wider mb-2">
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
                          className={`py-3 px-2 text-center rounded-xl font-medium text-sm transition-all duration-200 border ${
                            isSelected 
                              ? "bg-indigo-600 border-indigo-600 text-white shadow-xs" 
                              : "bg-white border-neutral-200 text-neutral-700 hover:border-neutral-300"
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
                  <label className="block text-xs font-bold text-neutral-500 uppercase tracking-wider mb-2">
                    Dostupné termíny
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {["09:00", "11:30", "14:00", "16:15"].map((time) => {
                      const isSelected = selectedTime === time;
                      return (
                        <button
                          type="button"
                          key={time}
                          onClick={() => setSelectedTime(time)}
                          className={`py-2 px-1 text-center font-mono text-xs rounded-lg transition-all duration-200 border ${
                            isSelected 
                              ? "bg-indigo-600 border-indigo-600 text-white shadow-xs" 
                              : "bg-white border-neutral-200 text-neutral-700 hover:border-neutral-300"
                          }`}
                        >
                          {time}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Basic client info */}
                <div className="space-y-3 pt-2">
                  <div>
                    <label className="block text-xs font-bold text-neutral-500 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-neutral-400" />
                      Vaše Jméno a Příjmení
                    </label>
                    <input
                      type="text"
                      required
                      value={clientName}
                      onChange={(e) => setClientName(e.target.value)}
                      placeholder="Např. Martin Dvořák"
                      className="w-full px-4 py-2.5 rounded-xl border border-neutral-200 bg-white placeholder-neutral-400 text-sm focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all font-medium text-neutral-800"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-neutral-500 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-neutral-400" />
                      Telefonní číslo (pro testovací SMS)
                    </label>
                    <input
                      type="tel"
                      required
                      value={clientPhone}
                      onChange={(e) => setClientPhone(e.target.value)}
                      placeholder="Např. +420 777 123 456"
                      className="w-full px-4 py-2.5 rounded-xl border border-neutral-200 bg-white placeholder-neutral-400 text-sm focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all font-medium text-neutral-800"
                    />
                  </div>
                </div>

                {submitError && (
                  <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs font-semibold rounded-xl text-center">
                    {submitError}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full mt-2 bg-indigo-600 hover:bg-indigo-700 text-white py-3.5 px-6 rounded-xl font-medium text-sm flex items-center justify-center gap-2 shadow-lg shadow-indigo-100 transition-all active:scale-[0.98] cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/35 border-t-white rounded-full animate-spin" />
                      Odesílám rezervaci...
                    </>
                  ) : (
                    <>
                      Odeslat rezervaci zdarma
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            ) : (
              <div className="py-8 text-center space-y-6">
                <div className="mx-auto w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-500 shadow-inner">
                  <Check className="w-8 h-8 stroke-[3]" />
                </div>
                <div>
                  <h4 className="text-xl font-bold text-neutral-900">Zákazník právě odeslal objednávku!</h4>
                  <p className="text-sm text-neutral-500 mt-2 max-w-sm mx-auto">
                    Na simulátoru vpravo se podívejte na okamžitou automatickou reakci rezervačního systému Spinly.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleReset}
                  className="text-xs font-bold text-indigo-600 hover:text-indigo-800 underline uppercase tracking-wider cursor-pointer"
                >
                  Zkusit jinou simulaci
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Owner Calendar & SMS phone mockup display */}
        <div className="p-6 md:p-10 bg-neutral-900 text-white flex flex-col gap-6 justify-between select-none">
          
          {/* Top Panel: Salon Calendar dashboard view */}
          <div className="border border-neutral-800 rounded-2xl bg-neutral-950 p-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3 mb-3">
              <div className="flex items-center gap-2">
                <CalendarDays className="w-4 h-4 text-indigo-400" />
                <span className="text-xs font-bold font-mono text-neutral-300">ADMINISTRACE SPINLY ({selectedIndustry.label})</span>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 bg-neutral-800 rounded text-neutral-400 font-semibold tracking-wider">
                LIVE STAV
              </span>
            </div>

            {/* Simulated schedule slots */}
            <div className="space-y-2">
              <div className="grid grid-cols-5 text-[10px] font-bold text-neutral-500 uppercase tracking-widest pb-1 border-b border-neutral-900">
                <span className="col-span-1">Čas</span>
                <span className="col-span-2">Klient</span>
                <span className="col-span-2 text-right">Stav</span>
              </div>

              {[
                { time: "09:00", name: "Klára Svobodová", status: "Hotovo", bg: "bg-neutral-800/60" },
                { time: "11:30", name: "Aneta Veselá", status: "Hotovo", bg: "bg-neutral-800/60" },
                { 
                  time: selectedTime, 
                  name: isBooked ? clientName : "— Volný slot —", 
                  status: isBooked ? "Přijato (Zaslána SMS)" : "Schváleno",
                  isActiveSlot: true
                },
                { time: "16:15", name: "Monika Novotná", status: "Naplánováno", bg: "bg-neutral-850" }
              ].map((slot, index) => {
                const isActive = slot.isActiveSlot && isBooked;
                return (
                  <div 
                    key={index} 
                    className={`grid grid-cols-5 py-2 px-2.5 rounded-lg text-xs items-center transition-all duration-300 ${
                      isActive 
                        ? "bg-indigo-900/40 border border-indigo-500/30 text-white scale-[1.02] shadow-md shadow-indigo-900/10" 
                        : "text-neutral-300 bg-neutral-900/50"
                    }`}
                  >
                    <span className="font-mono font-bold text-neutral-400 col-span-1">{slot.time}</span>
                    <span className={`col-span-2 truncate font-medium ${isActive ? "text-indigo-200 font-bold" : ""}`}>
                      {slot.name}
                    </span>
                    <span className="col-span-2 text-right">
                      {isActive ? (
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-emerald-500/20 text-emerald-300 font-semibold rounded text-[10px] animate-pulse">
                          <Check className="w-3 h-3 stroke-[3]" /> Nová Rezervace
                        </span>
                      ) : slot.name === "— Volný slot —" ? (
                        <span className="px-2 py-0.5 bg-neutral-800 text-neutral-400 rounded text-[10px] font-medium">
                          Volno
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 bg-neutral-800/70 text-neutral-400 rounded text-[10px] font-medium">
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
          <div className="relative mx-auto w-full max-w-[270px]">
            {/* Visual vibration highlight animation on incoming SMS */}
            <div className={`transition-all duration-200 relative ${smsIncoming ? "animate-bounce" : ""}`}>
              
              {/* Phone Wrapper structure */}
              <div className="w-full bg-neutral-950 rounded-3xl border-4 border-neutral-800 shadow-2xl p-3 pb-4">
                
                {/* Physical top speaker & notch */}
                <div className="w-24 h-4 bg-neutral-800 rounded-full mx-auto mb-3 flex items-center justify-center">
                  <div className="w-1.5 h-1.5 bg-neutral-700 rounded-full" />
                </div>

                <div className="flex items-center justify-between border-b border-neutral-900 pb-2 mb-2">
                  <div className="flex items-center gap-1">
                    <Smartphone className="w-3.5 h-3.5 text-neutral-500" />
                    <span className="text-[10px] text-neutral-400 font-mono">SMS Připomínka</span>
                  </div>
                  <span className="text-[9px] text-indigo-400 font-bold font-mono">Spinly Engine</span>
                </div>

                {/* SMS Window screen area */}
                <div className="min-h-[140px] bg-neutral-900 rounded-xl p-2.5 flex flex-col justify-end">
                  
                  {!smsTimer ? (
                    <div className="h-full flex flex-col items-center justify-center text-center p-2 text-neutral-500 space-y-1">
                      <MessageSquare className="w-6 h-6 stroke-[1.5] text-neutral-600 animate-pulse" />
                      <p className="text-[10px] font-medium leading-relaxed">
                        Čeká se na potvrzení rezervace klientem...
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2.5 animate-fadeIn">
                      
                      {/* Incoming alert badge */}
                      {smsIncoming && (
                        <div className="text-center py-1 bg-emerald-500/10 rounded-lg text-emerald-400 text-[9px] font-bold animate-pulse">
                          📳 SMS doručena na: {clientPhone}
                        </div>
                      )}

                      {/* Outgoing simulated gray message bubble */}
                      <div className="self-start max-w-[85%] bg-neutral-800 text-neutral-300 text-[10px] rounded-2xl rounded-bl-sm p-2 leading-relaxed">
                        Chytrý SMS asistent Spinly posílá automatickou zprávu klienta.
                      </div>

                      {/* Real Customer automated text */}
                      <div className="self-end max-w-[90%] bg-indigo-600 text-white text-[10px] font-medium rounded-2xl rounded-br-sm p-2.5 shadow-md shadow-indigo-950/40 relative">
                        <div className="font-bold text-[9px] text-indigo-100 flex items-center gap-1 mb-1">
                          <ShieldCheck className="w-3 h-3 text-emerald-400" /> SPINLY POTVRZENÍ
                        </div>
                        <p className="leading-relaxed">
                          Dobrý den, {clientName}. Vaše rezervace na službu <strong className="text-emerald-300 font-semibold">{selectedIndustry.service}</strong> v {selectedDay} v <strong className="font-bold underline text-white">{selectedTime}</strong> byla úspěšně schválena. Těšíme se na vás!
                        </p>
                      </div>

                    </div>
                  )}

                </div>
              </div>

              {/* Ping notification circle pointer */}
              {smsIncoming && (
                <div className="absolute -top-3 -right-3 w-6 h-6 bg-emerald-500 text-neutral-950 rounded-full font-bold text-xs flex items-center justify-center animate-bounce shadow-lg shadow-emerald-500/20">
                  !
                </div>
              )}

            </div>
          </div>

          {/* Micro stats banner bottom */}
          <div className="text-center pt-2">
            <p className="text-[11px] text-neutral-500 leading-normal">
              Toto automatické SMS upozornění se odešle ihned po schválení bez vašeho zásahu. <strong>Úspora času: 100 %!</strong>
            </p>
          </div>

        </div>

      </div>

    </div>
  );
}
