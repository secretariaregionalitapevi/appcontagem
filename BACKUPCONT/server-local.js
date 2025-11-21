/**
 * Servidor Local para CCB Presença
 * Resolve problemas de CORS ao executar via file://
 * 
 * Como usar:
 * 1. Instale Node.js (https://nodejs.org)
 * 2. Execute: node server-local.js
 * 3. Acesse: http://localhost:3000
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = 3000;
const HOST = 'localhost';

// MIME types para diferentes extensões
const mimeTypes = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.eot': 'application/vnd.ms-fontobject'
};

// Função para obter MIME type
function getMimeType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return mimeTypes[ext] || 'application/octet-stream';
}

// Função para servir arquivos estáticos
function serveStaticFile(res, filePath) {
  fs.readFile(filePath, (err, data) => {
    if (err) {
      if (err.code === 'ENOENT') {
        res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>404 - Arquivo não encontrado</title>
            <style>
              body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
              h1 { color: #e74c3c; }
            </style>
          </head>
          <body>
            <h1>404 - Arquivo não encontrado</h1>
            <p>O arquivo solicitado não foi encontrado.</p>
            <a href="/">← Voltar ao início</a>
          </body>
          </html>
        `);
      } else {
        res.writeHead(500, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>500 - Erro interno do servidor</title>
            <style>
              body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
              h1 { color: #e74c3c; }
            </style>
          </head>
          <body>
            <h1>500 - Erro interno do servidor</h1>
            <p>Ocorreu um erro ao processar sua solicitação.</p>
            <a href="/">← Voltar ao início</a>
          </body>
          </html>
        `);
      }
      return;
    }

    const mimeType = getMimeType(filePath);
    res.writeHead(200, { 
      'Content-Type': mimeType + '; charset=utf-8',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    });
    res.end(data);
  });
}

// Função para proxy de requisições para Google Apps Script
function proxyToGoogleScript(req, res) {
  const postData = [];
  
  req.on('data', chunk => {
    postData.push(chunk);
  });
  
  req.on('end', async () => {
    try {
      const body = Buffer.concat(postData).toString();
      const googleScriptUrl = 'https://script.google.com/macros/s/AKfycbxPtvi86jPy7y41neTpIPvn3hpycd3cMjbgjgifzLD6qRwrJVPlF9EDulaQp42nma-i/exec';
      
      console.log('🔄 Fazendo proxy para Google Apps Script...');
      console.log('📤 Dados enviados:', body.substring(0, 200) + '...');
      
      const fetch = (await import('node-fetch')).default;
      const response = await fetch(googleScriptUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8'
        },
        body: body
      });
      
      const responseData = await response.text();
      
      console.log('✅ Resposta do Google Apps Script:', response.status);
      console.log('📥 Dados recebidos:', responseData.substring(0, 200) + '...');
      
      res.writeHead(response.status, {
        'Content-Type': 'application/json; charset=utf-8',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
      });
      res.end(responseData);
      
    } catch (error) {
      console.error('❌ Erro no proxy:', error);
      res.writeHead(500, {
        'Content-Type': 'application/json; charset=utf-8',
        'Access-Control-Allow-Origin': '*'
      });
      res.end(JSON.stringify({ 
        ok: false, 
        error: 'Erro no servidor proxy: ' + error.message 
      }));
    }
  });
}

// Criar servidor
const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;
  
  // Log da requisição
  console.log(`${new Date().toISOString()} - ${req.method} ${pathname}`);
  
  // CORS headers para todas as respostas
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  // Responder a requisições OPTIONS (preflight)
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }
  
  // Proxy para Google Apps Script
  if (pathname === '/api/google-script' && req.method === 'POST') {
    proxyToGoogleScript(req, res);
    return;
  }
  
  // Rota raiz - servir index.html
  if (pathname === '/') {
    serveStaticFile(res, path.join(__dirname, 'index.html'));
    return;
  }
  
  // Servir arquivos estáticos
  const filePath = path.join(__dirname, pathname);
  
  // Verificar se o arquivo existe
  fs.access(filePath, fs.constants.F_OK, (err) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>404 - Arquivo não encontrado</title>
          <style>
            body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
            h1 { color: #e74c3c; }
          </style>
        </head>
        <body>
          <h1>404 - Arquivo não encontrado</h1>
          <p>O arquivo solicitado não foi encontrado.</p>
          <a href="/">← Voltar ao início</a>
        </body>
        </html>
      `);
      return;
    }
    
    serveStaticFile(res, filePath);
  });
});

// Iniciar servidor
server.listen(PORT, HOST, () => {
  console.log('🚀 Servidor CCB Presença iniciado!');
  console.log(`📍 URL: http://${HOST}:${PORT}`);
  console.log('📋 Funcionalidades:');
  console.log('   • Servidor de arquivos estáticos');
  console.log('   • Proxy para Google Apps Script');
  console.log('   • CORS habilitado');
  console.log('   • Cache desabilitado para desenvolvimento');
  console.log('');
  console.log('💡 Para parar o servidor: Ctrl+C');
  console.log('🔄 Para reiniciar após mudanças: Ctrl+C e execute novamente');
});

// Tratamento de erros
server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`❌ Erro: Porta ${PORT} já está em uso.`);
    console.log('💡 Tente uma das seguintes soluções:');
    console.log('   1. Feche outros servidores na porta 3000');
    console.log('   2. Altere a variável PORT neste arquivo');
    console.log('   3. Execute: netstat -ano | findstr :3000 (Windows)');
  } else {
    console.error('❌ Erro no servidor:', err);
  }
});

// Tratamento de sinais para encerramento limpo
process.on('SIGINT', () => {
  console.log('\n🛑 Encerrando servidor...');
  server.close(() => {
    console.log('✅ Servidor encerrado com sucesso!');
    process.exit(0);
  });
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Encerrando servidor...');
  server.close(() => {
    console.log('✅ Servidor encerrado com sucesso!');
    process.exit(0);
  });
});
