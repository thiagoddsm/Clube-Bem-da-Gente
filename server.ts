import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function startServer() {
  const app = express();
  // Altere esta linha para ler a porta do ambiente ou usar 8080 como padrão
  const PORT = parseInt(process.env.PORT || '8080', 10);

  app.use(express.json());

  // API routes
  app.post("/api/stone/payment", async (req, res) => {
    // Placeholder for Stone API call
    console.log("Stone payment request:", req.body);
    res.json({ status: "success", message: "Payment processed" });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // Altere aqui para usar a variável PORT dinâmica
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();