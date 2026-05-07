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
const indexPath = path.join(distPath, 'index.html');

// Verificação de inicialização para o log do Hostinger
import fs from 'fs';
if (!fs.existsSync(distPath)) {
  console.error(`ERRO CRÍTICO: Pasta 'dist' não encontrada em: ${distPath}`);
  console.error('Certifique-se de que "npm run build" foi executado antes de iniciar o servidor.');
} else if (!fs.existsSync(indexPath)) {
  console.error(`AVISO: 'index.html' não encontrado em: ${indexPath}`);
}

// Rota de Diagnóstico / Saúde
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV,
    distExists: fs.existsSync(distPath)
  });
});

// Serve arquivos estáticos
app.use(express.static(distPath));

// Tratamento para favicon
app.get('/favicon.ico', (req, res) => {
  if (fs.existsSync(path.join(distPath, 'favicon.svg'))) {
    res.sendFile(path.join(distPath, 'favicon.svg'));
  } else {
    res.status(404).end();
  }
});

// Fallback para SPA (Single Page Application)
app.get('*', (req, res) => {
  // Ignora chamadas de assets que falharam no static para não servir o HTML por engano
  if (req.path.startsWith('/assets/') || req.path.includes('.')) {
    console.log(`404 Asset: ${req.path}`);
    return res.status(404).send('Not found');
  }
  
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(500).send('Erro Interno: index.html não encontrado no servidor.');
  }
});

const portToListen = Number(PORT);
app.listen(portToListen, '0.0.0.0', () => {
  console.log(`[EcoMaps] Servidor iniciado com sucesso!`);
  console.log(`[EcoMaps] Porta: ${portToListen}`);
  console.log(`[EcoMaps] Root: ${distPath}`);
});
