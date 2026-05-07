import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Log de diagnóstico na inicialização
console.log('--- EcoMaps Diagnostic ---');
console.log('CWD:', process.cwd());
console.log('__dirname:', __dirname);
console.log('NODE_ENV:', process.env.NODE_ENV);

// Tenta encontrar a pasta 'dist' em locais prováveis
let distPath = path.resolve(__dirname, 'dist');
if (!fs.existsSync(distPath)) {
    distPath = path.resolve(process.cwd(), 'dist');
}

const indexPath = path.join(distPath, 'index.html');

console.log('Resolved distPath:', distPath);
console.log('dist exists:', fs.existsSync(distPath));
console.log('index.html exists:', fs.existsSync(indexPath));
console.log('--------------------------');

// Middleware de log para requisições
app.use((req, res, next) => {
  const now = new Date().toISOString();
  console.log(`${now} - ${req.method} ${req.url}`);
  next();
});

// Serve arquivos estáticos primeiro
app.use(express.static(distPath));

// Rota de Diagnóstico / Saúde
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    dist: distPath,
    exists: fs.existsSync(indexPath)
  });
});

// Tratamento específico para favicon
app.get('/favicon.ico', (req, res) => {
  const faviconPath = path.join(distPath, 'favicon.svg');
  if (fs.existsSync(faviconPath)) {
    res.sendFile(faviconPath);
  } else {
    // Tenta favicon.ico padrão se existir
    const icoPath = path.join(distPath, 'favicon.ico');
    if (fs.existsSync(icoPath)) {
        res.sendFile(icoPath);
    } else {
        res.status(404).end();
    }
  }
});

// Fallback para SPA (Single Page Application)
app.get('*', (req, res) => {
  // Se for uma requisição de asset (contém ponto no nome ou está em /assets/)
  // que não foi pega pelo static, retornamos 404
  if (req.path.includes('.') || req.path.startsWith('/assets/')) {
    console.log(`404 Asset Fail: ${req.path}`);
    return res.status(404).send('Resource not found');
  }
  
  // Para qualquer outra rota (navegação SPA), enviamos o index.html
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    const errorMsg = `Erro: Arquivo index.html não encontrado em ${indexPath}. Verifique se a pasta 'dist' foi gerada corretamente.`;
    console.error(errorMsg);
    res.status(500).send(errorMsg);
  }
});

const portToListen = Number(PORT);
app.listen(portToListen, '0.0.0.0', () => {
  console.log(`[EcoMaps] Servidor rodando na porta ${portToListen}`);
});
