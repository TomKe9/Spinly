import express from "express";
import path from "path";
import fs from "fs";
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

  // Serve statically if running bundled distribution, or if in production env, or if server.ts is absent
  const isCjsBundle = typeof __dirname !== "undefined" && __dirname.endsWith("dist");
  const distPath = isCjsBundle ? __dirname : path.join(process.cwd(), "dist");
  const useStatic = process.env.NODE_ENV === "production" || isCjsBundle || (!fs.existsSync(path.join(process.cwd(), "server.ts")) && fs.existsSync(distPath));

  if (!useStatic) {
    console.log("Starting server in development / fallback mode with Vite middleware...");
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "custom",
    });
    app.use(vite.middlewares);

    // Dynamic HTML transformation catch-all fallback for SPA routing
    app.use("*", async (req, res, next) => {
      const url = req.originalUrl;
      try {
        const htmlFile = path.resolve(process.cwd(), "index.html");
        let html = fs.readFileSync(htmlFile, "utf-8");
        html = await vite.transformIndexHtml(url, html);
        res.status(200).set({ "Content-Type": "text/html" }).end(html);
      } catch (e) {
        vite.ssrFixStacktrace(e as Error);
        next(e);
      }
    });
  } else {
    console.log("Starting server in production mode serving static dist folder...");
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
