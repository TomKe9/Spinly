import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { initializeApp, getApps, getApp } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import firebaseConfig from "./firebase-applet-config.json" assert { type: "json" };

function getFirestoreDb() {
  if (getApps().length === 0) {
    initializeApp({
      projectId: firebaseConfig.projectId,
    });
  }
  // Using modular getFirestore(app, databaseId) syntax
  return getFirestore(getApp(), firebaseConfig.firestoreDatabaseId);
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Health check endpoint
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // REST API Endpoint to save user bookings securely via server
  app.post("/api/bookings", async (req, res) => {
    try {
      const { id, service, day, time, clientName, clientPhone, status, industry } = req.body;
      
      if (!id || !service || !day || !time || !clientName || !clientPhone || !status || !industry) {
        return res.status(400).json({ error: "Chybí povinná pole rezervačního formuláře." });
      }

      const db = getFirestoreDb();
      await db.collection("bookings").doc(id).set({
        service,
        day,
        time,
        clientName,
        clientPhone,
        status,
        industry,
        createdAt: FieldValue.serverTimestamp()
      });

      res.json({ success: true, bookingId: id });
    } catch (error: any) {
      console.error("Chyba při ukládání rezervace na serveru:", error);
      res.status(500).json({ error: error.message || "Interní chyba serveru při registraci rezervace." });
    }
  });

  // REST API Endpoint to save lead registrations securely via server
  app.post("/api/leads", async (req, res) => {
    try {
      const { id, businessName, segment, name, email, phone, plan } = req.body;
      
      if (!id || !businessName || !segment || !name || !email || !phone || !plan) {
        return res.status(400).json({ error: "Chybí povinná pole registračního formuláře." });
      }

      const db = getFirestoreDb();
      await db.collection("leads").doc(id).set({
        businessName,
        segment,
        name,
        email,
        phone,
        plan,
        createdAt: FieldValue.serverTimestamp()
      });

      res.json({ success: true, leadId: id });
    } catch (error: any) {
      console.error("Chyba při registraci leadu na serveru:", error);
      res.status(500).json({ error: error.message || "Interní chyba serveru při registraci partnera." });
    }
  });

  // Vite development server asset pipeline or production build serve middleware
  if (process.env.NODE_ENV !== "production") {
    console.log("Starting server in development mode with Vite middleware...");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    console.log("Starting server in production mode serving static dist folder...");
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Spinly Server running on port ${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Fatal exception during server boot:", err);
});
