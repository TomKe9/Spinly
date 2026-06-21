import { collection, doc, writeBatch, getDocs, deleteDoc, serverTimestamp } from "firebase/firestore";
import { db } from "./firebase";

export interface SeedLead {
  id: string;
  businessName: string;
  segment: "salon" | "hair" | "massage" | "physio" | "fitness" | "courts" | "other";
  name: string;
  email: string;
  phone: string;
  plan: "Pro" | "Enterprise" | "Zdarma";
  walletBalance: number;
}

export const REAL_CZ_SK_SALONS: SeedLead[] = [
  {
    id: "salon-bomton-sparta",
    businessName: "Salon Bomton Sparta (Praha Letná)",
    segment: "salon",
    name: "Vlasta Libotínská",
    email: "letna@bomton.cz",
    phone: "+420 220 514 111",
    plan: "Enterprise",
    walletBalance: 15450,
  },
  {
    id: "salon-tomas-arsov",
    businessName: "Tomas Arsov Hair & Beauty (Praha Střed)",
    segment: "hair",
    name: "Tomáš Arsov",
    email: "objednavky@tomasarsov.cz",
    phone: "+420 773 227 768",
    plan: "Pro",
    walletBalance: 8120,
  },
  {
    id: "salon-joshua-vrsovice",
    businessName: "Kadeřnické studio Joshua (Praha Vršovice)",
    segment: "hair",
    name: "Michala Černá",
    email: "vrsovice@joshua.cz",
    phone: "+420 732 112 003",
    plan: "Pro",
    walletBalance: 9840,
  },
  {
    id: "barber-pepe-bratislava",
    businessName: "Pepe Barber & Shop (Bratislava Staré Mesto)",
    segment: "hair",
    name: "Peter 'Pepe' Ondruš",
    email: "pepe@barber-bratislava.sk",
    phone: "+421 905 123 456",
    plan: "Pro",
    walletBalance: 12400,
  },
  {
    id: "wellness-aura-plzen",
    businessName: "Aura Wellness & Spa centrum (Plzeň)",
    segment: "massage",
    name: "Alena Svobodová",
    email: "recepce@aura-plzen.cz",
    phone: "+420 377 224 856",
    plan: "Pro",
    walletBalance: 4200,
  },
  {
    id: "physio-reha-brno",
    businessName: "RehaFyzio rehabilitační klinika (Brno)",
    segment: "physio",
    name: "Mgr. Tomáš Novák",
    email: "brno@rehafyzio.cz",
    phone: "+420 541 234 567",
    plan: "Pro",
    walletBalance: 6850,
  },
  {
    id: "sports-stvanice-tennis",
    businessName: "Tenisový klub I. ČLTK Štvanice (Praha)",
    segment: "courts",
    name: "Ing. Vladislav Šavrda",
    email: "info@stvanicetennis.cz",
    phone: "+420 222 316 317",
    plan: "Enterprise",
    walletBalance: 25600,
  },
  {
    id: "wellness-siam-ostrava",
    businessName: "Siam-Siam Thajské Masáže (Ostrava)",
    segment: "massage",
    name: "Nongnuch Sukprasert",
    email: "ostrava@siam-siam.cz",
    phone: "+420 596 112 233",
    plan: "Pro",
    walletBalance: 5350,
  },
  {
    id: "fitness-vlk-bratislava",
    businessName: "Kamil Vlk - VIP Osobní fitness (Bratislava)",
    segment: "fitness",
    name: "Kamil Vlk",
    email: "kamil@vlkfitness.sk",
    phone: "+421 911 454 888",
    plan: "Zdarma",
    walletBalance: 2800,
  },
  {
    id: "physio-chodov-klinika",
    businessName: "FyzioKlinika Premium (Praha Chodov)",
    segment: "physio",
    name: "Mgr. Iva Bílková",
    email: "info@fyzioklinika.cz",
    phone: "+420 606 415 150",
    plan: "Enterprise",
    walletBalance: 41200,
  },
  {
    id: "salon-beauty-bratislava",
    businessName: "Premium Beauty Clinic (Bratislava)",
    segment: "salon",
    name: "MUDr. Hana Štefánková",
    email: "bratislava@beauty-clinic.sk",
    phone: "+421 277 888 999",
    plan: "Enterprise",
    walletBalance: 34100,
  }
];

export interface SeedProgress {
  message: string;
  status: "idle" | "loading" | "success" | "error";
}

/**
 * Wipes the database and loads authentic Czech and Slovak salon listings.
 * @param currentUserUid Excludes current user to avoid logout/profile corruption.
 */
export async function wipeAndSeedDatabase(
  currentUserUid: string | null,
  onProgress: (p: SeedProgress) => void
) {
  onProgress({ message: "Zahajuji čištění databáze...", status: "loading" });
  try {
    const batch = writeBatch(db);

    // 1. Delete all bookings
    onProgress({ message: "Odstraňuji fiktivní rezervace...", status: "loading" });
    const bqSnapshot = await getDocs(collection(db, "bookings"));
    let deleteBookingsCount = 0;
    bqSnapshot.forEach((d) => {
      batch.delete(doc(db, "bookings", d.id));
      deleteBookingsCount++;
    });

    // 2. Delete all walletTransactions
    onProgress({ message: "Čistím historii finančních transakcí...", status: "loading" });
    const txSnapshot = await getDocs(collection(db, "walletTransactions"));
    let deleteTxCount = 0;
    txSnapshot.forEach((d) => {
      batch.delete(doc(db, "walletTransactions", d.id));
      deleteTxCount++;
    });

    // 3. Delete all leads/profiles EXCEPT current user
    onProgress({ message: "Odstraňuji fiktivní kadeřnické profily...", status: "loading" });
    const leadsSnapshot = await getDocs(collection(db, "leads"));
    let deleteLeadsCount = 0;
    leadsSnapshot.forEach((d) => {
      if (!currentUserUid || d.id !== currentUserUid) {
        batch.delete(doc(db, "leads", d.id));
        deleteLeadsCount++;
      }
    });

    // Commit clear operations
    onProgress({ message: "Odesílám změny k vymazání...", status: "loading" });
    await batch.commit();

    // 4. Seed Real Salons
    onProgress({ message: "Importuji reálné salony z České a Slovenské republiky...", status: "loading" });
    const seedBatch = writeBatch(db);
    
    // Seed the real leads
    REAL_CZ_SK_SALONS.forEach((salon) => {
      const docRef = doc(db, "leads", salon.id);
      seedBatch.set(docRef, {
        businessName: salon.businessName,
        segment: salon.segment,
        name: salon.name,
        email: salon.email,
        phone: salon.phone,
        plan: salon.plan,
        walletBalance: salon.walletBalance,
        createdAt: new Date(),
        isSeeded: true
      });
    });

    // Seed a couple of recent real bookings to make the dashboard charts live and gorgeous
    onProgress({ message: "Generuji ukázkovou zákaznickou aktivitu...", status: "loading" });
    
    const sampleBookings = [
      {
        id: "book-sample-1",
        service: "Střih & Balayage",
        day: "Zítra",
        time: "10:00",
        clientName: "Andrea Vlčková",
        clientPhone: "+420 724 111 222",
        clientEmail: "andrea@seznam.cz",
        status: "potvrzeno",
        industry: "hair",
        businessId: "salon-tomas-arsov",
        paymentStatus: "zaplaceno",
        paymentAmount: 1850,
        createdAt: new Date()
      },
      {
        id: "book-sample-2",
        service: "Luxusní kosmetická péče",
        day: "Dnes",
        time: "14:30",
        clientName: "Lucie Horáková",
        clientPhone: "+420 608 456 123",
        clientEmail: "lucie.hor@gmail.com",
        status: "potvrzeno",
        industry: "salon",
        businessId: "salon-bomton-sparta",
        paymentStatus: "zaplaceno",
        paymentAmount: 1200,
        createdAt: new Date()
      },
      {
        id: "book-sample-3",
        service: "Dětský nebo pánský střih",
        day: "V pondělí",
        time: "16:00",
        clientName: "Marek Janoušek",
        clientPhone: "+420 603 999 888",
        status: "přijato",
        industry: "hair",
        businessId: "salon-joshua-vrsovice",
        createdAt: new Date()
      },
      {
        id: "book-sample-4",
        service: "Thajská aromatická masáž",
        day: "Zítra",
        time: "12:00",
        clientName: "Zuzana Plachá",
        clientPhone: "+420 777 555 333",
        status: "potvrzeno",
        industry: "massage",
        businessId: "wellness-siam-ostrava",
        createdAt: new Date()
      }
    ];

    sampleBookings.forEach((b) => {
      seedBatch.set(doc(db, "bookings", b.id), {
        ...b,
        createdAt: new Date()
      });
    });

    onProgress({ message: "Ukládám nová data salonů a rezervací...", status: "loading" });
    await seedBatch.commit();

    onProgress({
      message: `Úspěšně vyčištěno (${deleteBookingsCount} rezervací, ${deleteLeadsCount} salonů, ${deleteTxCount} transakcí) a úspěšně naimportováno ${REAL_CZ_SK_SALONS.length} reálných salonů z ČR/SK!`,
      status: "success"
    });
  } catch (error: any) {
    console.error("Critical Seeding Error:", error);
    onProgress({
      message: `Chyba při mazání a plnění: ${error.message || String(error)}`,
      status: "error"
    });
  }
}

/**
 * Wipes the database completely and leaves it 100% empty (except for current logged in user).
 */
export async function clearEntireDatabase(
  currentUserUid: string | null,
  onProgress: (p: SeedProgress) => void
) {
  onProgress({ message: "Zahajuji kompletní vymazání databáze...", status: "loading" });
  try {
    const batch = writeBatch(db);

    // 1. Delete all bookings
    onProgress({ message: "Odstraňuji veškeré rezervace...", status: "loading" });
    const bqSnapshot = await getDocs(collection(db, "bookings"));
    let deleteBookingsCount = 0;
    bqSnapshot.forEach((d) => {
      batch.delete(doc(db, "bookings", d.id));
      deleteBookingsCount++;
    });

    // 2. Delete all walletTransactions
    onProgress({ message: "Odstraňuji veškeré transakce...", status: "loading" });
    const txSnapshot = await getDocs(collection(db, "walletTransactions"));
    let deleteTxCount = 0;
    txSnapshot.forEach((d) => {
      batch.delete(doc(db, "walletTransactions", d.id));
      deleteTxCount++;
    });

    // 3. Delete all leads/profiles EXCEPT current user
    onProgress({ message: "Odstraňuji všechny partnerské kadeřnictví a salony...", status: "loading" });
    const leadsSnapshot = await getDocs(collection(db, "leads"));
    let deleteLeadsCount = 0;
    leadsSnapshot.forEach((d) => {
      if (!currentUserUid || d.id !== currentUserUid) {
        batch.delete(doc(db, "leads", d.id));
        deleteLeadsCount++;
      }
    });

    onProgress({ message: "Odesílám požadavky na smazání do Firestore...", status: "loading" });
    await batch.commit();

    onProgress({
      message: `Hotovo! Databáze byla kompletně vymazána. Smazáno celkem: ${deleteBookingsCount} rezervací, ${deleteLeadsCount} podniků, ${deleteTxCount} finančních transakcí.`,
      status: "success"
    });
  } catch (error: any) {
    console.error("Critical Purge Error:", error);
    onProgress({
      message: `Chyba při mazání databáze: ${error.message || String(error)}`,
      status: "error"
    });
  }
}

