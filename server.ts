import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = process.env.PORT || 3000;

  // Middleware para JSON
  app.use(express.json());

  if (process.env.NODE_ENV !== "production") {
    // Configuração para DESENVOLVIMENTO (Vite Middleware)
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
    console.log("Servidor rodando em modo de DESENVOLVIMENTO");
  } else {
    // Configuração para PRODUÇÃO (Hostinger)
    const distPath = path.resolve(__dirname, 'dist');
    
    // Serve os arquivos estáticos da pasta dist
    app.use(express.static(distPath));

    // Fallback para SPA (necessário para React Router ou rotas complexas)
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
    console.log("Servidor rodando em modo de PRODUÇÃO");
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Servidor pronto na porta ${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Erro ao iniciar o servidor:", err);
});
