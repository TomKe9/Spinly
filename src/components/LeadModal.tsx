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
  CalendarCheck
} from "lucide-react";
import { INDUSTRIES } from "../types";

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

  if (!isOpen) return null;

  const handleNextStep = () => {
    if (step === 1 && !businessName.trim()) {
      return; // Validation helper
    }
    setStep(step + 1);
  };

  const handlePrevStep = () => {
    setStep(step - 1);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !phone.trim() || !name.trim()) return;

    setIsLoading(true);

    // Simulate database persistent store simulation
    setTimeout(() => {
      setIsLoading(false);
      setStep(3); // Success step
    }, 1500);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
      {/* Background backdrop blur */}
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div 
          className="fixed inset-0 transition-opacity bg-neutral-900/60 backdrop-blur-xs" 
          aria-hidden="true"
          onClick={onClose}
        />

        {/* Trick to center the modal contents */}
        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

        {/* Modal panel container */}
        <div className="inline-block align-bottom bg-white rounded-3xl text-left overflow-hidden shadow-2xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full border border-neutral-100">
          
          {/* Header */}
          <div className="px-6 py-4 bg-neutral-50/50 border-b border-neutral-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 bg-indigo-600 rounded-full" />
              <p className="text-xs font-bold text-neutral-500 uppercase tracking-widest">
                Registrace zkušební verze
              </p>
            </div>
            <button 
              onClick={onClose}
              className="text-neutral-400 hover:text-neutral-600 p-1 bg-white rounded-full border border-neutral-100 hover:scale-105 transition-all cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Modal Content */}
          <div className="p-6 md:p-8">
            
            {/* Step 1: Business name and segment */}
            {step === 1 && (
              <div className="space-y-6">
                <div className="text-center sm:text-left">
                  <h3 className="text-2xl font-display font-bold text-neutral-950">
                    Pojďme nastavit váš kalendář
                  </h3>
                  <p className="text-sm text-neutral-500 mt-1">
                    Založte si účet s balíčkem <strong className="text-indigo-600">Spinly {initialPlanName}</strong> na 14 dní zdarma. Bez platební karty.
                  </p>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-neutral-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <Building className="w-3.5 h-3.5 text-neutral-400" />
                      Název vašeho podniku / salonu
                    </label>
                    <input
                      type="text"
                      className="w-full px-4 py-3 rounded-xl border border-neutral-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 focus:outline-hidden text-sm font-medium text-neutral-800 placeholder-neutral-400"
                      placeholder="Např. Studio Krása nebo Dentální péče"
                      value={businessName}
                      onChange={(e) => setBusinessName(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-neutral-500 uppercase tracking-wider mb-2">
                      Obor podnikání
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {INDUSTRIES.map((ind) => (
                        <button
                          key={ind.id}
                          type="button"
                          onClick={() => setSegment(ind.id)}
                          className={`p-3 text-left rounded-xl border text-xs font-medium transition-all flex items-center gap-2 ${
                            segment === ind.id 
                              ? "bg-indigo-50 border-indigo-200 text-indigo-700" 
                              : "bg-white border-neutral-200 text-neutral-600 hover:border-neutral-300"
                          }`}
                        >
                          <span className="shrink-0">
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
                    className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white py-3 px-6 rounded-xl font-medium text-sm flex items-center justify-center gap-2 shadow-lg shadow-indigo-100 transition-all cursor-pointer"
                  >
                    Pokračovat k registraci
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* Step 2: Contact Info */}
            {step === 2 && (
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="text-center sm:text-left">
                  <h3 className="text-2xl font-display font-bold text-neutral-950">
                    Osobní a kontaktní údaje
                  </h3>
                  <p className="text-sm text-neutral-500 mt-1">
                    Vytvoříme vám profil a zašleme přístupové údaje.
                  </p>
                </div>

                <div className="space-y-3.5">
                  <div>
                    <label className="block text-xs font-bold text-neutral-500 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-neutral-400" />
                      Vaše jméno
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Např. Mgr. Klára Nováková"
                      className="w-full px-4 py-2.5 rounded-xl border border-neutral-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 focus:outline-hidden text-sm font-medium text-neutral-800"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-neutral-500 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5 text-neutral-400" />
                      E-mailová adresa (přihlašovací jméno)
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="jmeno@salon.cz"
                      className="w-full px-4 py-2.5 rounded-xl border border-neutral-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 focus:outline-hidden text-sm font-medium text-neutral-800"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-neutral-500 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-neutral-400" />
                      Telefonní číslo (pro SMS synchronizace)
                    </label>
                    <input
                      type="tel"
                      required
                      placeholder="+420 777 555 666"
                      className="w-full px-4 py-2.5 rounded-xl border border-neutral-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 focus:outline-hidden text-sm font-medium text-neutral-800"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                    />
                  </div>

                  {/* Consents */}
                  <div className="flex items-start gap-2.5 pt-2">
                    <input
                      type="checkbox"
                      id="termsAndGdpr"
                      checked={agreedToTerms}
                      onChange={(e) => setAgreedToTerms(e.target.checked)}
                      className="mt-1 rounded-sm border-neutral-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                    />
                    <label htmlFor="termsAndGdpr" className="text-xs text-neutral-500 leading-normal cursor-pointer select-none">
                      Souhlasím se zpracováním osobních údajů (GDPR) a obchodními podmínkami rezervačního systému Spinly. Bezpečnost dat je naší prioritou.
                    </label>
                  </div>
                </div>

                {/* Progress dot indicators */}
                <div className="flex items-center justify-between pt-4 gap-4">
                  <button
                    type="button"
                    onClick={handlePrevStep}
                    className="px-4 py-2.5 text-xs font-semibold text-neutral-500 hover:text-neutral-800 transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    Zpět
                  </button>

                  <button
                    type="submit"
                    disabled={isLoading || !agreedToTerms}
                    className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white py-3 px-6 rounded-xl font-medium text-sm flex items-center gap-2 shadow-lg shadow-indigo-100 transition-all cursor-pointer"
                  >
                    {isLoading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/35 border-t-white rounded-full animate-spin" />
                        Nastavuji kalendář...
                      </>
                    ) : (
                      <>
                        Aktivovat Spinly {initialPlanName}
                        <Check className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}

            {/* Step 3: Success Confirmation */}
            {step === 3 && (
              <div className="text-center py-6 space-y-6">
                <div className="mx-auto w-20 h-20 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center shadow-inner">
                  <CheckCircle className="w-12 h-12 stroke-[2.5]" />
                </div>
                
                <div className="space-y-2">
                  <span className="inline-block px-3 py-1 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-full uppercase tracking-wider font-mono">
                    Účet úspěšně nastaven
                  </span>
                  <h3 className="text-2xl font-display font-bold text-neutral-950">
                    Vítejte ve světě bez stresu!
                  </h3>
                  <p className="text-sm text-neutral-500 max-w-sm mx-auto leading-relaxed">
                    Váš zkušební kalendář pro podnikání <strong>&quot;{businessName}&quot;</strong> s balíčkem <strong>{initialPlanName}</strong> byl vytvořen. Na zadaný e-mail <strong>{email}</strong> jsme vám zaslali odkaz pro nastavení hesla.
                  </p>
                </div>

                <div className="bg-neutral-50 p-4 rounded-2xl text-left border border-neutral-100 space-y-2">
                  <p className="text-xs font-bold text-neutral-500 uppercase tracking-widest">Co teď udělat:</p>
                  <ul className="text-xs text-neutral-600 space-y-1.5 list-disc pl-4 leading-normal">
                    <li>Otevřete e-mail a klikněte na aktivační odkaz.</li>
                    <li>Přidejte své první služby a pracovní dobu.</li>
                    <li>Sdílejte odkaz se svými stávajícími zákazníky, aby viděli, jak snadno to jde!</li>
                  </ul>
                </div>

                <div className="pt-2 flex flex-col gap-2">
                  <button
                    onClick={onClose}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-3.5 px-6 rounded-xl font-medium text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-100 transition-all cursor-pointer"
                  >
                    Vstoupit do administrace
                    <CalendarCheck className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => {
                        setStep(1);
                        setBusinessName("");
                        setEmail("");
                        setPhone("");
                        setName("");
                    }}
                    className="text-xs font-bold text-neutral-400 hover:text-neutral-600 tracking-wider transition-all pt-1 cursor-pointer"
                  >
                    Vytvořit partnerskou registraci pro jiný obor
                  </button>
                </div>
              </div>
            )}

          </div>

          {/* Dialog footer hint */}
          <div className="bg-neutral-50 border-t border-neutral-100 px-6 py-3.5 text-center text-[11px] text-neutral-400 flex items-center justify-center gap-1.5">
            <span>🔒 Šifrováno SSL přenosem bankovní úrovně</span>
          </div>

        </div>
      </div>
    </div>
  );
}
