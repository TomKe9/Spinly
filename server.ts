import express from "express";
import path from "path";
import fs from "fs";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Health check endpoint
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
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
