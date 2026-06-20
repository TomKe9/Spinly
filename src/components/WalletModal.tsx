import React, { useState, useEffect } from "react";
import { 
  Wallet, 
  Plus, 
  Send, 
  History, 
  CreditCard, 
  Check, 
  X, 
  Sparkles, 
  ShieldCheck, 
  ArrowRight,
  Info,
  ChevronRight,
  AlertCircle
} from "lucide-react";
import { 
  doc, 
  setDoc, 
  getDoc, 
  updateDoc,
  collection, 
  query, 
  where, 
  getDocs, 
  onSnapshot, 
  serverTimestamp,
  increment
} from "firebase/firestore";
import { db, auth } from "../firebase";

interface WalletModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenAuth: (mode: "login" | "register") => void;
}

export default function WalletModal({ isOpen, onClose, onOpenAuth }: WalletModalProps) {
  const [userProfile, setUserProfile] = useState<any>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [activeSubTab, setActiveSubTab] = useState<"overview" | "topup" | "pay" | "history">("overview");
  
  // Top up states
  const [topUpAmount, setTopUpAmount] = useState<number>(500);
  const [cardNumber, setCardNumber] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvv, setCardCvv] = useState("");
  const [topUpSubmitting, setTopUpSubmitting] = useState(false);
  const [topUpSuccess, setTopUpSuccess] = useState(false);

  // Pay states
  const [salons, setSalons] = useState<any[]>([]);
  const [loadingSalons, setLoadingSalons] = useState(false);
  const [selectedSalon, setSelectedSalon] = useState<any | null>(null);
  const [payAmount, setPayAmount] = useState<string>("");
  const [payMessage, setPayMessage] = useState<string>("");
  const [paySubmitting, setPaySubmitting] = useState(false);
  const [paySuccess, setPaySuccess] = useState(false);
  const [payError, setPayError] = useState("");

  // Bookings list for active payment
  const [clientBookings, setClientBookings] = useState<any[]>([]);
  const [selectedBookingToPay, setSelectedBookingToPay] = useState<any | null>(null);

  // Transactions log
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loadingTransactions, setLoadingTransactions] = useState(true);

  const currentUser = auth.currentUser;

  // Real-time listener for current logged-in user profile balance
  useEffect(() => {
    if (!currentUser || !isOpen) {
      setLoadingProfile(false);
      return;
    }

    setLoadingProfile(true);
    const docRef = doc(db, "leads", currentUser.uid);
    
    const unsubscribe = onSnapshot(docRef, async (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        // If walletBalance is completely undefined or missing, bootstrap a 1000 Kč starting gift
        if (data.walletBalance === undefined) {
          await updateDoc(docRef, {
            walletBalance: 1000
          });
          setUserProfile({ ...data, walletBalance: 1000 });
        } else {
          setUserProfile(data);
        }
      } else {
        // Fallback or setup profile if missing
        const newProfile = {
          businessName: currentUser.displayName ? `${currentUser.displayName} Salon` : "Osobní profil",
          segment: "other",
          name: currentUser.displayName || "Zákazník",
          email: currentUser.email || "",
          phone: "+420 601 234 567",
          plan: "Pro",
          walletBalance: 1000,
          createdAt: serverTimestamp()
        };
        await setDoc(docRef, newProfile);
        setUserProfile(newProfile);
      }
      setLoadingProfile(false);
    }, (error) => {
      console.error("Error loading wallet profile real-time:", error);
      setLoadingProfile(false);
    });

    return () => unsubscribe();
  }, [currentUser, isOpen]);

  // Read transactions list real-time
  useEffect(() => {
    if (!currentUser || !isOpen) return;

    setLoadingTransactions(true);
    const q = query(
      collection(db, "walletTransactions"),
      where("userId", "==", currentUser.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: any[] = [];
      snapshot.forEach((doc) => {
        list.push({ id: doc.id, ...doc.data() });
      });
      // Sort newest first
      list.sort((a, b) => {
        const dateA = a.createdAt?.seconds || 0;
        const dateB = b.createdAt?.seconds || 0;
        return dateB - dateA;
      });
      setTransactions(list);
      setLoadingTransactions(false);
    }, (error) => {
      console.error("Error loading transactions:", error);
      setLoadingTransactions(false);
    });

    return () => unsubscribe();
  }, [currentUser, isOpen]);

  // Load all available businesses to pay
  useEffect(() => {
    if (!currentUser || activeSubTab !== "pay") return;

    async function loadBusinessesAndBookings() {
      setLoadingSalons(true);
      try {
        // Load salons
        const snapshot = await getDocs(collection(db, "leads"));
        const list: any[] = [];
        snapshot.forEach((d) => {
          if (d.id !== currentUser?.uid) { // Don't pay to yourself
            list.push({ id: d.id, ...d.data() });
          }
        });
        setSalons(list);
        if (list.length > 0 && !selectedSalon) {
          setSelectedSalon(list[0]);
        }

        // Live list of unpaid bookings
        const bqSnapshot = await getDocs(collection(db, "bookings"));
        const bookingsList: any[] = [];
        bqSnapshot.forEach((bDoc) => {
          const bData = bDoc.data();
          // Match by name or just general listing if they relate to some business
          // To make testing extremely fun, show bookings that match businessIds of other salons
          if (bData.status !== "stornováno") {
            const salonInfo = list.find(s => s.id === bData.businessId);
            bookingsList.push({
              id: bDoc.id,
              ...bData,
              salonName: salonInfo?.businessName || "Kadeřnický salon"
            });
          }
        });
        setClientBookings(bookingsList);

      } catch (err) {
        console.error("Error loading partners:", err);
      } finally {
        setLoadingSalons(false);
      }
    }

    loadBusinessesAndBookings();
  }, [currentUser, activeSubTab]);

  // Pre-fill amount when a booking is selected
  useEffect(() => {
    if (selectedBookingToPay) {
      // Find matching salon to pay
      const matchSalon = salons.find(s => s.id === selectedBookingToPay.businessId);
      if (matchSalon) {
        setSelectedSalon(matchSalon);
      }
      // Simple mock service lookup or default to a reasonable amount
      setPayAmount("450"); // Czech haircut basic format
    }
  }, [selectedBookingToPay, salons]);

  // Submit mock topup
  const handleTopUpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    setTopUpSubmitting(true);
    try {
      const txId = "tx-topup-" + Math.random().toString(36).substring(2, 11);
      
      // Update balance
      await updateDoc(doc(db, "leads", currentUser.uid), {
        walletBalance: increment(topUpAmount)
      });

      // Write Transaction document
      await setDoc(doc(db, "walletTransactions", txId), {
        id: txId,
        userId: currentUser.uid,
        userEmail: currentUser.email || "",
        type: "topup",
        amount: topUpAmount,
        description: "Dobití peněženky platební kartou",
        createdAt: serverTimestamp()
      });

      setTopUpSuccess(true);
      setTimeout(() => {
        setTopUpSuccess(false);
        setCardNumber("");
        setCardExpiry("");
        setCardCvv("");
        setActiveSubTab("overview");
      }, 2000);

    } catch (err) {
      console.error("Top up write error:", err);
      alert("Chyba při dobíjení kreditu.");
    } finally {
      setTopUpSubmitting(false);
    }
  };

  // Submit Pay to Salon
  const handlePaySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPayError("");
    if (!currentUser || !selectedSalon) return;

    const amountNum = parseFloat(payAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      setPayError("Zadejte prosím platnou částku k úhradě.");
      return;
    }

    const currentBalance = userProfile?.walletBalance || 0;
    if (currentBalance < amountNum) {
      setPayError(`Nedostatečný zůstatek. Na zaplacení potřebujete mít alespoň ${amountNum} Kč (aktuálně máte ${currentBalance} Kč).`);
      return;
    }

    setPaySubmitting(true);
    try {
      const parentTxId = "tx-pay-sent-" + Math.random().toString(36).substring(2, 11);
      const receivTxId = "tx-pay-received-" + Math.random().toString(36).substring(2, 11);

      // 1. Subtract balance from client
      await updateDoc(doc(db, "leads", currentUser.uid), {
        walletBalance: increment(-amountNum)
      });

      // 2. Add balance to merchant (the target salon / business)
      await updateDoc(doc(db, "leads", selectedSalon.id), {
        walletBalance: increment(amountNum)
      });

      // 3. Create 'Sent' transaction for client
      await setDoc(doc(db, "walletTransactions", parentTxId), {
        id: parentTxId,
        userId: currentUser.uid,
        userEmail: currentUser.email || "",
        type: "payment_sent",
        amount: -amountNum,
        description: `Platba salonu / barberovi: ${selectedSalon.businessName} ${payMessage ? `(${payMessage})` : ""}`,
        targetUid: selectedSalon.id,
        targetName: selectedSalon.businessName,
        bookingId: selectedBookingToPay?.id || null,
        createdAt: serverTimestamp()
      });

      // 4. Create 'Received' transaction for salon (so it appears on their list!)
      await setDoc(doc(db, "walletTransactions", receivTxId), {
        id: receivTxId,
        userId: selectedSalon.id, // Recipient receives this
        userEmail: selectedSalon.email || "",
        type: "payment_received",
        amount: amountNum,
        description: `Přijatá platba přes Spinly Pay: ${userProfile?.name || "Zákazník"} (${currentUser.email})`,
        targetUid: currentUser.uid,
        targetName: userProfile?.name || "Zákazník",
        bookingId: selectedBookingToPay?.id || null,
        createdAt: serverTimestamp()
      });

      // 5. If booking selected, update booking's status
      if (selectedBookingToPay) {
        await updateDoc(doc(db, "bookings", selectedBookingToPay.id), {
          paymentStatus: "zaplaceno",
          paymentAmount: amountNum,
          paidAt: serverTimestamp()
        });
      }

      setPaySuccess(true);
      setTimeout(() => {
        setPaySuccess(false);
        setPayAmount("");
        setPayMessage("");
        setSelectedBookingToPay(null);
        setActiveSubTab("overview");
      }, 2000);

    } catch (err) {
      console.error("Payment error:", err);
      setPayError("Platba selhala. Prověřte připojení k internetu.");
    } finally {
      setPaySubmitting(false);
    }
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return "Nyní";
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleString("cs-CZ", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="bg-[#fbfbf9] text-stone-900 w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl border border-stone-200/60 flex flex-col max-h-[85vh]">
        
        {/* Header container */}
        <div className="px-6 py-5 bg-stone-50 border-b border-stone-200/50 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-brand-50 rounded-xl text-brand-600 border border-brand-200/80">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-black uppercase tracking-wider text-stone-900">Spinly Pay Peněženka</h3>
              <p className="text-[10px] text-stone-500 font-bold font-mono">OKAMŽITÉ BEZKONTAKTNÍ PLATBY</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 hover:bg-stone-200/50 rounded-lg text-stone-550 transition-all cursor-pointer"
          >
            <X className="w-5 h-5 stroke-[2.5]" />
          </button>
        </div>

        {/* Content body switcher */}
        <div className="flex-grow overflow-y-auto p-6 space-y-6">
          
          {!currentUser ? (
            /* Auth missing invitation screen with 1000 Kč bonus marketing */
            <div className="text-center py-6 space-y-5">
              <div className="w-16 h-16 bg-brand-50 text-brand-600 rounded-full flex items-center justify-center mx-auto border border-brand-200/80">
                <Sparkles className="w-8 h-8 animate-pulse" />
              </div>
              <div className="space-y-2">
                <h4 className="text-lg font-black tracking-tight text-stone-900">Vyzkoušejte online peněženku</h4>
                <p className="text-xs text-stone-500 max-w-sm mx-auto leading-relaxed">
                  Založte si účet zdarma během 15 vteřin a získejte okamžitý <b>uvítací bonus 1 000 Kč</b> pro testování doručování platieb přímo v aplikaci!
                </p>
              </div>

              <div className="bg-emerald-50 border border-emerald-200/50 rounded-2xl p-4 text-emerald-800 text-xs font-bold font-mono max-w-sm mx-auto flex items-start gap-2.5">
                <ShieldCheck className="w-5 h-5 shrink-0 text-emerald-600" />
                <div className="text-left space-y-0.5">
                  <p className="uppercase text-[9px] tracking-widest text-emerald-600 font-black">BONUS K REGISTRACI</p>
                  <p>Můžete simulačně platit svým zarezervovaným kadeřníkům a barberům, peníze se jim hned připíšou.</p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-2 max-w-sm mx-auto">
                <button
                  onClick={() => {
                    onClose();
                    onOpenAuth("register");
                  }}
                  className="flex-1 bg-brand-600 hover:bg-brand-700 text-white font-black py-3 px-4 rounded-xl text-xs uppercase tracking-wider shadow-sm cursor-pointer"
                >
                  Registrace (+1000 Kč)
                </button>
                <button
                  onClick={() => {
                    onClose();
                    onOpenAuth("login");
                  }}
                  className="flex-1 bg-white border border-stone-200 text-stone-700 hover:bg-stone-50 font-bold py-3 px-4 rounded-xl text-xs uppercase tracking-wider cursor-pointer"
                >
                  Přihlásit se
                </button>
              </div>
            </div>
          ) : loadingProfile ? (
            /* Loading view spinner */
            <div className="py-20 flex flex-col items-center justify-center space-y-2.5">
              <div className="w-6 h-6 border-2 border-brand-600/20 border-t-brand-600 rounded-full animate-spin" />
              <p className="text-[10px] font-mono text-stone-500 uppercase tracking-widest">Ověřuji zůstatek...</p>
            </div>
          ) : (
            /* Authenticated user balance operations */
            <div className="space-y-6">
              
              {/* Tabs list inside modal */}
              <div className="grid grid-cols-4 gap-1 p-1 bg-stone-100 rounded-xl">
                {[
                  { id: "overview", label: "Přehled", icon: Wallet },
                  { id: "topup", label: "Dobít", icon: Plus },
                  { id: "pay", label: "Zaplatit", icon: Send },
                  { id: "history", label: "Historie", icon: History }
                ].map((tb) => {
                  const Icon = tb.icon;
                  const isAct = activeSubTab === tb.id;
                  return (
                    <button
                      key={tb.id}
                      onClick={() => {
                        setActiveSubTab(tb.id as any);
                        setPayError("");
                      }}
                      className={`py-2 text-[10px] sm:text-xs font-bold rounded-lg cursor-pointer flex flex-col items-center justify-center gap-1 transition-all ${
                        isAct 
                          ? "bg-white text-stone-900 shadow-xs ring-1 ring-stone-950/5" 
                          : "text-stone-500 hover:text-stone-800"
                      }`}
                    >
                      <Icon className="w-4 h-4 shrink-0 stroke-[2.2]" />
                      <span>{tb.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* VIEW 1: OVERVIEW */}
              {activeSubTab === "overview" && (
                <div className="space-y-5 animate-fadeIn">
                  
                  {/* Elegant Golden Visa-style Card */}
                  <div className="bg-gradient-to-br from-stone-900 via-stone-850 to-stone-950 text-white rounded-2xl p-5 shadow-lg border border-stone-800 relative overflow-hidden">
                    <div className="absolute -right-10 -bottom-10 p-24 bg-brand-500/10 rounded-full blur-2xl" />
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-[9px] font-mono font-bold tracking-widest text-[#d5af66] uppercase">PRE-PAID SECURE CARD</p>
                        <h4 className="text-xs font-black font-mono tracking-wider mt-1">Spinly Pay • CZ</h4>
                      </div>
                      <Sparkles className="w-5 h-5 text-[#d5af66]" />
                    </div>

                    <div className="mt-7">
                      <p className="text-[10px] text-stone-400 font-bold uppercase tracking-wider font-mono">Dostupný zůstatek</p>
                      <h2 className="text-3xl font-mono font-black tracking-tight mt-0.5 text-white flex items-baseline gap-1.5">
                        {(userProfile?.walletBalance ?? 1000).toLocaleString("cs-CZ")}
                        <span className="text-sm font-black text-[#d5af66]">Kč</span>
                      </h2>
                    </div>

                    <div className="mt-6 pt-4 border-t border-stone-800 flex justify-between items-end text-[10px] font-mono text-stone-400 font-semibold uppercase">
                      <div>
                        <p className="text-[8px] text-stone-500 font-bold leading-none">Uživatel</p>
                        <p className="text-stone-200 mt-1 truncate max-w-[170px]">{userProfile?.name || "Registrovaný parťák"}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[8px] text-stone-500 font-bold leading-none">Aktivováno</p>
                        <p className="text-[#d5af66] mt-1 font-bold">SPINLY VIP</p>
                      </div>
                    </div>
                  </div>

                  {/* Actions summary widget or fast buttons */}
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => setActiveSubTab("topup")}
                      className="p-3.5 bg-white border border-stone-200/80 hover:bg-stone-50 rounded-xl cursor-pointer flex items-center gap-3 transition-colors text-left"
                    >
                      <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                        <Plus className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-xs font-black text-stone-900">Dobít peníze</p>
                        <p className="text-[9px] text-stone-550 mt-0.5">Platební kartou online</p>
                      </div>
                    </button>

                    <button
                      onClick={() => setActiveSubTab("pay")}
                      className="p-3.5 bg-white border border-stone-200/80 hover:bg-stone-50 rounded-xl cursor-pointer flex items-center gap-3 transition-colors text-left"
                    >
                      <div className="p-2 bg-brand-50 text-brand-600 rounded-lg">
                        <Send className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-xs font-black text-stone-900">Zaplatit salonu</p>
                        <p className="text-[9px] text-stone-550 mt-0.5">Bezhotovostní převod</p>
                      </div>
                    </button>
                  </div>

                  {/* Quick helpful information */}
                  <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200/50 flex gap-3 text-xs text-stone-550 font-semibold leading-relaxed">
                    <Info className="w-4.5 h-4.5 text-brand-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-stone-850 font-black">Jak Spinly Pay funguje?</p>
                      <p className="mt-1">Peníze uložené v peněžence můžete kdykoliv poslat partnerskému salonu po dokončení vaší služby. V salonu okamžitě na obrazovce uvidí, že byl termín zaplacen.</p>
                    </div>
                  </div>

                </div>
              )}

              {/* VIEW 2: TOP UP CREDIT */}
              {activeSubTab === "topup" && (
                <form onSubmit={handleTopUpSubmit} className="space-y-4 animate-fadeIn">
                  <h4 className="text-xs font-black text-stone-900 uppercase tracking-wider font-mono">Dobít kredity online</h4>
                  
                  {topUpSuccess ? (
                    <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 text-center space-y-3 animate-scaleUp">
                      <div className="w-10 h-10 bg-emerald-500/10 text-emerald-600 rounded-full flex items-center justify-center mx-auto border border-emerald-200">
                        <Check className="w-5 h-5 stroke-[2.5]" />
                      </div>
                      <div>
                        <p className="text-sm font-black text-stone-905">Dobití úspěšné!</p>
                        <p className="text-[10px] text-stone-500 font-semibold mt-1">Částka {topUpAmount} Kč byla připsána do peněženky.</p>
                      </div>
                    </div>
                  ) : (
                    <>
                      {/* Choose amount quick selects */}
                      <div className="grid grid-cols-4 gap-2">
                        {[200, 500, 1000, 2000].map((val) => (
                          <button
                            key={val}
                            type="button"
                            onClick={() => setTopUpAmount(val)}
                            className={`py-2 px-2 border text-xs font-mono font-bold rounded-xl text-center transition-all cursor-pointer ${
                              topUpAmount === val
                                ? "bg-stone-900 border-stone-900 text-white"
                                : "bg-white border-stone-200 hover:border-stone-400 text-stone-700"
                            }`}
                          >
                            +{val} Kč
                          </button>
                        ))}
                      </div>

                      <div className="pt-2">
                        <label className="block text-[10px] font-bold text-stone-500 uppercase tracking-widest mb-1.5 font-mono">Vlastní částka (Kč)</label>
                        <div className="relative">
                          <input
                            type="number"
                            min="50"
                            max="50000"
                            value={topUpAmount}
                            onChange={(e) => setTopUpAmount(parseInt(e.target.value) || 0)}
                            className="w-full px-4 py-2.5 bg-white border border-stone-200 focus:outline-none focus:border-stone-500 font-mono font-bold text-sm text-stone-900 rounded-xl"
                          />
                          <span className="absolute right-4 top-3 text-stone-400 font-bold text-xs uppercase">Kč</span>
                        </div>
                      </div>

                      {/* Hardened Simulated Card Form fields */}
                      <div className="bg-stone-100/80 rounded-2xl p-4 space-y-3.5 border border-stone-200/50">
                        <p className="text-[9px] font-mono font-bold tracking-widest text-stone-500 uppercase flex items-center gap-1">
                          <CreditCard className="w-3.5 h-3.5" />
                          ZABEZPEČENÁ PLATEBNÍ BRÁNA
                        </p>
                        
                        <div>
                          <input
                            type="text"
                            required
                            placeholder="Číslo platební karty (16 číslic)"
                            value={cardNumber}
                            onChange={(e) => setCardNumber(e.target.value.replace(/\D/g, "").substring(0, 16))}
                            className="w-full px-3 py-2 bg-white border border-stone-200 rounded-xl text-xs placeholder-stone-400 outline-none focus:border-stone-400 text-stone-850 font-bold font-mono"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <input
                            type="text"
                            required
                            placeholder="MM/YY"
                            value={cardExpiry}
                            onChange={(e) => setCardExpiry(e.target.value.replace(/[^0-9/]/g, "").substring(0, 5))}
                            className="px-3 py-2 bg-white border border-stone-200 rounded-xl text-xs placeholder-stone-400 outline-none focus:border-stone-400 text-stone-850 font-bold font-mono"
                          />
                          <input
                            type="password"
                            required
                            placeholder="CVC / CVV"
                            value={cardCvv}
                            onChange={(e) => setCardCvv(e.target.value.replace(/\D/g, "").substring(0, 3))}
                            className="px-3 py-2 bg-white border border-stone-200 rounded-xl text-xs placeholder-stone-400 outline-none focus:border-stone-400 text-stone-850 font-bold font-mono"
                          />
                        </div>
                      </div>

                      <button
                        type="submit"
                        disabled={topUpSubmitting || topUpAmount < 50}
                        className="w-full bg-brand-600 hover:bg-brand-700 text-white font-extrabold py-3.5 rounded-xl text-xs uppercase tracking-wider shadow-sm flex items-center justify-center gap-2 cursor-pointer transition-all"
                      >
                        {topUpSubmitting ? "Autorizuji platbu..." : `Zaplatit ${topUpAmount} Kč`}
                      </button>
                    </>
                  )}
                </form>
              )}

              {/* VIEW 3: PAY SALON */}
              {activeSubTab === "pay" && (
                <form onSubmit={handlePaySubmit} className="space-y-4 animate-fadeIn">
                  <h4 className="text-xs font-black text-stone-900 uppercase tracking-wider font-mono">Zaplatit kadeřníkovi nebo salónu</h4>
                  
                  {paySuccess ? (
                    <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 text-center space-y-3 animate-scaleUp">
                      <div className="w-10 h-10 bg-emerald-500/10 text-emerald-600 rounded-full flex items-center justify-center mx-auto border border-emerald-250">
                        <Check className="w-5 h-5 stroke-[2.5]" />
                      </div>
                      <div>
                        <p className="text-sm font-black text-stone-900">Platba úspěšně odeslána!</p>
                        <p className="text-[10px] text-stone-500 font-semibold mt-1">Částka {payAmount} Kč byla převedena na účet <b>{selectedSalon?.businessName}</b>.</p>
                      </div>
                    </div>
                  ) : (
                    <>
                      {/* Active Bookings quick select */}
                      {clientBookings.length > 0 && (
                        <div>
                          <label className="block text-[10px] font-black text-stone-500 uppercase tracking-widest mb-1.5 font-mono">Zvolte vaši rezervaci k platbě</label>
                          <div className="space-y-1.5 max-h-24 overflow-y-auto pr-1">
                            {clientBookings.map((bk) => {
                              const isSelected = selectedBookingToPay?.id === bk.id;
                              const isPaid = bk.paymentStatus === "zaplaceno";
                              return (
                                <div
                                  key={bk.id}
                                  onClick={() => {
                                    if (!isPaid) setSelectedBookingToPay(bk);
                                  }}
                                  className={`p-2 rounded-xl border text-[11px] font-bold flex items-center justify-between transition-colors cursor-pointer ${
                                    isPaid 
                                      ? "bg-stone-50 border-stone-200 opacity-60 cursor-not-allowed" 
                                      : isSelected
                                        ? "bg-brand-50 border-brand-400 text-brand-800"
                                        : "bg-white border-stone-200 hover:border-stone-300 text-stone-700"
                                  }`}
                                >
                                  <div>
                                    <p className="font-extrabold">{bk.salonName} • {bk.service}</p>
                                    <p className="text-[9px] text-stone-400 font-mono mt-0.5">{bk.day} v {bk.time}</p>
                                  </div>
                                  <div>
                                    {isPaid ? (
                                      <span className="text-[9px] bg-emerald-100 text-emerald-700 py-0.5 px-2 rounded-full uppercase tracking-wider font-extrabold">✓ Zaplaceno</span>
                                    ) : isSelected ? (
                                      <span className="text-[10px] text-brand-600 font-mono font-black">Vybráno</span>
                                    ) : (
                                      <span className="text-[10px] text-emerald-600 font-mono font-black">Mám uhradit →</span>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Select Salon from database leads */}
                      <div>
                        <label className="block text-[10px] font-bold text-stone-500 uppercase tracking-widest mb-1.5 font-mono">Příjemce (Zvolte salon / barbera)</label>
                        {loadingSalons ? (
                          <div className="py-2.5 text-center text-xxs font-mono text-stone-400 uppercase tracking-widest">Hledám salony partnerské sítě...</div>
                        ) : (
                          <select
                            value={selectedSalon?.id || ""}
                            onChange={(e) => {
                              const match = salons.find(s => s.id === e.target.value);
                              if (match) setSelectedSalon(match);
                            }}
                            className="w-full px-3 py-2 bg-white border border-stone-200 focus:outline-none focus:border-stone-400 text-xs text-stone-900 font-bold rounded-xl"
                          >
                            <option value="" disabled>Vyberte obchodníka</option>
                            {salons.map((salon) => (
                              <option key={salon.id} value={salon.id}>
                                {salon.businessName} (Správce: {salon.name})
                              </option>
                            ))}
                          </select>
                        )}
                      </div>

                      {/* Choose custom amount */}
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[10px] font-bold text-stone-500 uppercase tracking-widest mb-1.5 font-mono">Částka (Kč)</label>
                          <input
                            type="number"
                            required
                            min="1"
                            value={payAmount}
                            onChange={(e) => setPayAmount(e.target.value)}
                            placeholder="Zadejte cenu, např. 450"
                            className="w-full px-3.5 py-2.5 bg-white border border-stone-200 focus:outline-none focus:border-stone-400 font-mono font-extrabold text-sm text-stone-900 rounded-xl"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-stone-500 uppercase tracking-widest mb-1.5 font-mono">Interní vzkaz (nepovinné)</label>
                          <input
                            type="text"
                            value={payMessage}
                            onChange={(e) => setPayMessage(e.target.value)}
                            placeholder="Např: dýško, střih barber"
                            className="w-full px-3.5 py-2.5 bg-white border border-stone-200 focus:outline-none focus:border-stone-400 text-xs text-stone-900 font-bold rounded-xl"
                          />
                        </div>
                      </div>

                      {/* Display validation errors */}
                      {payError && (
                        <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xxs font-bold uppercase tracking-wider rounded-xl flex items-start gap-2 animate-shake">
                          <AlertCircle className="w-4 h-4 shrink-0" />
                          <span>{payError}</span>
                        </div>
                      )}

                      <button
                        type="submit"
                        disabled={paySubmitting || !selectedSalon || !payAmount}
                        className="w-full bg-brand-600 hover:bg-brand-700 text-white font-extrabold py-3.5 rounded-xl text-xs uppercase tracking-wider shadow-sm flex items-center justify-center gap-2 cursor-pointer transition-all"
                      >
                        {paySubmitting ? "Odesílám platbu..." : `Odeslat ${payAmount || "0"} Kč příjemci`}
                      </button>
                    </>
                  )}
                </form>
              )}

              {/* VIEW 4: TRANSACTION HISTORY */}
              {activeSubTab === "history" && (
                <div className="space-y-4 animate-fadeIn">
                  <h4 className="text-xs font-black text-stone-900 uppercase tracking-wider font-mono">Historie transakcí</h4>
                  
                  {loadingTransactions ? (
                    <div className="py-10 text-center text-xxs font-mono text-stone-400 uppercase tracking-widest animate-pulse">Počítám transakční deník...</div>
                  ) : transactions.length === 0 ? (
                    <div className="py-12 text-center text-xs text-stone-450 font-bold uppercase space-y-2">
                      <p>Zatím zde nemáte žádné pohyby.</p>
                      <button 
                        onClick={() => setActiveSubTab("topup")}
                        className="text-[10px] text-brand-650 font-mono hover:underline cursor-pointer"
                      >
                        Chci si dobít kredit →
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-[30vh] overflow-y-auto pr-1">
                      {transactions.map((tx) => {
                        const isPlus = tx.type === "topup" || tx.type === "payment_received";
                        return (
                          <div 
                            key={tx.id} 
                            className="p-3 bg-white border border-stone-200/80 rounded-xl flex justify-between items-center text-xs"
                          >
                            <div className="max-w-[70%]">
                              <p className="font-extrabold text-stone-850 truncate">{tx.description}</p>
                              <p className="text-[9px] text-stone-400 font-mono mt-0.5">{formatDate(tx.createdAt)}</p>
                            </div>
                            <span className={`font-mono font-black text-sm text-right leading-none shrink-0 ${
                              isPlus ? "text-emerald-600 font-extrabold" : "text-stone-900"
                            }`}>
                              {isPlus ? `+${tx.amount}` : tx.amount} Kč
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}

                </div>
              )}

            </div>
          )}

        </div>

        {/* Footer info lock banner */}
        <div className="bg-stone-50 border-t border-stone-200/50 px-6 py-4 flex items-center justify-between text-[10px] font-bold font-mono text-stone-400 uppercase tracking-widest">
          <span className="flex items-center gap-1.5 text-stone-500">
            <ShieldCheck className="w-4 h-4 text-brand-600" />
            Všechny platby v aplikaci jsou simulační
          </span>
          <span className="text-[#d5af66] font-black">SSL SECURE</span>
        </div>

      </div>
    </div>
  );
}
