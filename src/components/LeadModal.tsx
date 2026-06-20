import React, { useState } from "react";
import { 
  X, 
  CheckCircle,
  Building, 
  Mail, 
  Phone, 
  Sparkles, 
  ArrowRight, 
  ArrowLeft,
  Check,
  CalendarCheck,
  CheckCircle2
} from "lucide-react";
import { INDUSTRIES } from "../types";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { db, handleFirestoreError, OperationType } from "../firebase";

interface LeadModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialPlanName?: string;
}

export default function LeadModal({ isOpen, onClose, initialPlanName = "Pro" }: LeadModalProps) {
  const [step, setStep] = useState(1);
  const [businessName, setBusinessName] = useState("");
  const [segment, setSegment] = useState(INDUSTRIES[0].id);
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [agreedToTerms, setAgreedToTerms] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleNextStep = () => {
    if (step === 1 && !businessName.trim()) {
      return;
    }
    setStep(step + 1);
  };

  const handlePrevStep = () => {
    setStep(step - 1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !phone.trim() || !name.trim() || !businessName.trim()) return;

    setIsLoading(true);
    setSubmitError(null);
    
    const randomSuffix = Math.random().toString(36).substring(2, 12);
    const leadId = "lead-" + randomSuffix;

    try {
      try {
        await setDoc(doc(db, "leads", leadId), {
          businessName: businessName.trim(),
          segment: segment,
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim(),
          plan: initialPlanName,
          createdAt: serverTimestamp()
        });
      } catch (firestoreError) {
        handleFirestoreError(firestoreError, OperationType.WRITE, `leads/${leadId}`);
      }

      setIsLoading(false);
      setStep(3); // Success step
    } catch (err: any) {
      console.error("Lead submission error:", err);
      setIsLoading(false);
      setSubmitError(err.message || "Registrace se nezdařila. Zkuste to prosím znovu.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div 
          className="fixed inset-0 transition-opacity bg-stone-900/40 backdrop-blur-sm" 
          aria-hidden="true"
          onClick={onClose}
        />

        {/* Trick to center the modal contents */}
        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

        {/* Modal panel container */}
        <div className="inline-block align-bottom bg-[#fbfbf9] rounded-3xl text-left overflow-hidden shadow-2xl transform transition-all sm:my-8 sm:align-middle sm:max-w-md sm:w-full border border-stone-200 relative">
          <div className="absolute top-0 left-0 w-full h-1.5 bg-brand-600" />
          
          {/* Header */}
          <div className="px-6 py-4 bg-stone-100/50 border-b border-stone-200/80 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 bg-brand-500 rounded-full animate-pulse" />
              <p className="text-[10px] font-bold text-stone-500 uppercase tracking-widest font-mono">
                Registrace zkušební doby • Spinly
              </p>
            </div>
            <button 
              onClick={onClose}
              className="text-stone-400 hover:text-stone-700 p-1 hover:scale-105 transition-all cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Modal Content */}
          <div className="p-6">
            
            {/* Step 1: Business name and segment */}
            {step === 1 && (
              <div className="space-y-5">
                <div>
                  <h3 className="text-xl font-display font-black text-stone-900 leading-tight">
                    Pojďme nastavit váš kalendář
                  </h3>
                  <p className="text-xs text-stone-500 mt-1.5 leading-relaxed font-semibold">
                    Založte si zkušební kalendář <strong className="text-brand-600 font-bold">Spinly {initialPlanName}</strong> na 14 dní zdarma. Bez zadávání platební karty.
                  </p>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-bold text-stone-500 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                      <Building className="w-3.5 h-3.5 text-brand-500" />
                      Název vašeho podniku / salonu
                    </label>
                    <input
                      type="text"
                      className="w-full px-4 py-2.5 rounded-xl border border-stone-250 bg-white focus:outline-none text-xs font-bold text-stone-900 placeholder-stone-400"
                      placeholder="Např. Studio Glamour nebo Kadeřnictví Elegance"
                      value={businessName}
                      onChange={(e) => setBusinessName(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-stone-500 uppercase tracking-widest mb-1.5">
                      Obor podnikání
                    </label>
                    <div className="grid grid-cols-2 gap-1.5">
                      {INDUSTRIES.map((ind) => (
                        <button
                          key={ind.id}
                          type="button"
                          onClick={() => setSegment(ind.id)}
                          className={`p-2.5 text-left rounded-xl border text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                            segment === ind.id 
                              ? "bg-brand-50 text-brand-700 border-brand-300 font-extrabold shadow-xs" 
                              : "bg-white border-stone-200 text-stone-600 hover:border-stone-300 hover:bg-stone-50"
                          }`}
                        >
                          <span className="shrink-0 text-sm">
                            {ind.id === "salon" && "✨"}
                            {ind.id === "hair" && "💇"}
                            {ind.id === "massage" && "💆"}
                            {ind.id === "physio" && "🩺"}
                            {ind.id === "other" && "📅"}
                          </span>
                          <span className="truncate">{ind.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    onClick={handleNextStep}
                    disabled={!businessName.trim()}
                    className="w-full bg-brand-600 hover:bg-brand-700 disabled:opacity-40 text-white py-3 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer"
                  >
                    Pokračovat k údajům
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}

            {/* Step 2: Contact Info */}
            {step === 2 && (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <h3 className="text-xl font-display font-black text-stone-900">
                    Kontaktní údaje podniku
                  </h3>
                  <p className="text-xs text-stone-500 mt-1 leading-relaxed font-semibold">
                    Vytvoříme vám bezplatný profil a okamžitě získáte přístup.
                  </p>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block text-[10px] font-bold text-stone-500 uppercase tracking-widest mb-1 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-brand-500" />
                      Vaše celé jméno
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Klára Rychlá"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-stone-250 bg-white focus:outline-none text-xs font-bold text-stone-900 placeholder-stone-400"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-stone-500 uppercase tracking-widest mb-1 flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5 text-brand-500" />
                      Přihlašovací E-mail
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="krasatvoria@seznam.cz"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-stone-250 bg-white focus:outline-none text-xs font-bold text-stone-900 placeholder-stone-400 font-mono"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-stone-500 uppercase tracking-widest mb-1 flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-brand-500" />
                      Vaše telefonní číslo
                    </label>
                    <input
                      type="tel"
                      required
                      placeholder="+420 777 555 666"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-stone-250 bg-white focus:outline-none text-xs font-bold text-stone-900 placeholder-stone-400 font-mono"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                    />
                  </div>

                  {/* Consents */}
                  <div className="flex items-start gap-2 pt-1">
                    <input
                      type="checkbox"
                      id="termsAndGdpr"
                      checked={agreedToTerms}
                      onChange={(e) => setAgreedToTerms(e.target.checked)}
                      className="mt-0.5 rounded border-stone-300 text-brand-600 focus:ring-brand-500 w-3.5 h-3.5 cursor-pointer"
                    />
                    <label htmlFor="termsAndGdpr" className="text-[10px] text-stone-500 leading-snug cursor-pointer select-none font-medium">
                      Souhlasím se zpracováním osobních údajů (GDPR) a obchodními podmínkami rezervačního systému Spinly. Bezpečnost dat je zaručena.
                    </label>
                  </div>
                </div>

                {submitError && (
                  <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs font-semibold rounded-xl text-center">
                    {submitError}
                  </div>
                )}

                {/* Progress indicators */}
                <div className="flex items-center justify-between pt-2 gap-3">
                  <button
                    type="button"
                    onClick={handlePrevStep}
                    className="px-3 py-2 text-xs font-bold text-stone-500 hover:text-stone-800 transition-all flex items-center gap-1 cursor-pointer"
                  >
                    <ArrowLeft className="w-3 h-3" />
                    Zpět
                  </button>

                  <button
                    type="submit"
                    disabled={isLoading || !agreedToTerms}
                    className="bg-brand-600 hover:bg-brand-700 disabled:opacity-45 text-white py-2.5 px-5 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 cursor-pointer shadow-md transition-all"
                  >
                    {isLoading ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-white/35 border-t-white rounded-full animate-spin" />
                        Provádím...
                      </>
                    ) : (
                      <>
                        Dokončit {initialPlanName}
                        <Check className="w-3.5 h-3.5" />
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}

            {/* Step 3: Success Confirmation */}
            {step === 3 && (
              <div className="text-center py-4 space-y-5">
                <div className="mx-auto w-16 h-16 bg-brand-50 text-brand-600 rounded-full flex items-center justify-center border border-brand-100 shadow-inner">
                  <CheckCircle2 className="w-9 h-9" />
                </div>
                
                <div className="space-y-1.5">
                  <span className="inline-block px-2.5 py-0.5 bg-brand-50 text-brand-700 text-[10px] font-bold rounded-full uppercase tracking-widest font-mono border border-brand-100">
                    Aktivace Dokončena
                  </span>
                  <h3 className="text-xl font-display font-black text-stone-900 leading-tight">
                    Vítejte ve světě bez stresu!
                  </h3>
                  <p className="text-xs text-stone-500 max-w-xs mx-auto leading-relaxed font-semibold">
                    Váš zkušební kalendář pro podnikání <strong className="text-stone-800 font-bold">&quot;{businessName}&quot;</strong> s balíčkem <strong className="text-brand-600">{initialPlanName}</strong> byl vytvořen. Na e-mail <strong>{email}</strong> jsme vám zaslali aktivační odkaz.
                  </p>
                </div>

                <div className="bg-stone-50 p-4 rounded-2xl text-left border border-stone-200/60 space-y-2">
                  <p className="text-[10px] font-bold text-stone-500 uppercase tracking-widest font-mono">Další kroky k pohodlí:</p>
                  <ul className="text-xs text-stone-600 space-y-1.5 list-disc pl-4 leading-relaxed font-semibold">
                    <li>Otevřete přihlašovací e-mail a zvolte si heslo.</li>
                    <li>Nastavte své oblíbené služby a pracovní dobu.</li>
                    <li>Pověste rezervační odkaz na web a Instagram!</li>
                  </ul>
                </div>

                <div className="pt-1.5 flex flex-col gap-1.5">
                  <button
                    onClick={onClose}
                    className="w-full bg-brand-600 hover:bg-brand-700 text-white py-3 px-5 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-md cursor-pointer transition-all"
                  >
                    Otevřít Administraci
                    <CalendarCheck className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => {
                        setStep(1);
                        setBusinessName("");
                        setEmail("");
                        setPhone("");
                        setName("");
                    }}
                    className="text-[10px] font-bold text-stone-400 hover:text-stone-600 uppercase tracking-widest transition-all pt-1 cursor-pointer font-mono"
                  >
                    Vytvořit registraci pro jinou pobočku
                  </button>
                </div>
              </div>
            )}

          </div>

          {/* Dialog footer hint */}
          <div className="bg-stone-100/50 border-t border-stone-200/80 px-6 py-3.5 text-center text-[10px] text-stone-500 flex items-center justify-center gap-1.5 font-bold">
            <span>🛡️ Zabezpečení přenosu bankovní úrovně SSL / GDPR</span>
          </div>

        </div>
      </div>
    </div>
  );
}
