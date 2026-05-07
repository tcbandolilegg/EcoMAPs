import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware de log para diagnóstico
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

// Caminho absoluto para a pasta dist
const distPath = path.resolve(__dirname, 'dist');

// Serve arquivos estáticos
app.use(express.static(distPath));

// Tratamento específico para favicon.ico para evitar 404 se não existir
app.get('/favicon.ico', (req, res) => {
  res.sendFile(path.join(distPath, 'favicon.svg'));
});

// Fallback para SPA (Single Page Application)
app.get('*', (req, res) => {
  // Se for uma requisição de assets que não foi pega pelo express.static, não manda o index.html
  if (req.url.startsWith('/assets/')) {
    console.log(`Asset não encontrado: ${req.url}`);
    return res.status(404).send('Asset not found');
  }
  
  console.log(`Servindo index.html para: ${req.url}`);
  res.sendFile(path.join(distPath, 'index.html'));
});

app.listen(Number(PORT), '0.0.0.0', () => {
  console.log(`Servidor rodando na porta ${PORT}`);
  console.log(`Servindo arquivos de: ${distPath}`);
});
