// Servidor local para testar o PWA
// Execute com: node server.js

const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 3000;

// Middleware para CORS
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

// Middleware para parsing de dados
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static('.'));

// Arquivo para salvar os dados localmente
const DATA_FILE = 'dados-testes.json';

// Função para ler dados existentes
function readData() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const data = fs.readFileSync(DATA_FILE, 'utf8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Erro ao ler dados:', error);
  }
  return [];
}

// Função para salvar dados
function saveData(newData) {
  try {
    const existingData = readData();
    existingData.push({
      ...newData,
      id: Date.now(),
      receivedAt: new Date().toISOString()
    });
    
    fs.writeFileSync(DATA_FILE, JSON.stringify(existingData, null, 2));
    console.log('✅ Dados salvos:', newData);
    return { success: true, message: 'Dados salvos com sucesso' };
  } catch (error) {
    console.error('❌ Erro ao salvar dados:', error);
    return { success: false, error: error.message };
  }
}

// Rota POST (simula o doPost do Google Apps Script)
app.post('/api/save', (req, res) => {
  console.log('📥 POST recebido:', req.body);
  
  let data = null;
  
  // Tenta extrair dados do payload
  if (req.body.payload) {
    try {
      data = JSON.parse(req.body.payload);
    } catch (error) {
      console.error('Erro ao parsear payload:', error);
    }
  } else {
    data = req.body;
  }
  
  if (!data) {
    return res.status(400).json({ error: 'Dados não encontrados' });
  }
  
  const result = saveData(data);
  res.json(result);
});

// Rota GET (simula o doGet do Google Apps Script)
app.get('/api/save', (req, res) => {
  console.log('📥 GET recebido:', req.query);
  
  const data = {
    timestamp: new Date().toLocaleString('pt-BR', { 
      timeZone: 'America/Sao_Paulo',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    }),
    cargo: req.query.cargo || '',
    ministerio: req.query.ministerio || '',
    administracao: req.query.administracao || ''
  };
  
  const result = saveData(data);
  res.json(result);
});

// Rota para visualizar dados salvos
app.get('/api/data', (req, res) => {
  const data = readData();
  res.json({
    total: data.length,
    data: data
  });
});

// Rota para limpar dados de teste
app.delete('/api/data', (req, res) => {
  try {
    if (fs.existsSync(DATA_FILE)) {
      fs.unlinkSync(DATA_FILE);
    }
    res.json({ success: true, message: 'Dados de teste limpos' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Rota principal
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log('🚀 Servidor de teste rodando em:');
  console.log(`   http://localhost:${PORT}`);
  console.log(`   http://127.0.0.1:${PORT}`);
  console.log('');
  console.log('📊 Endpoints disponíveis:');
  console.log(`   POST http://localhost:${PORT}/api/save - Salvar dados`);
  console.log(`   GET  http://localhost:${PORT}/api/save - Salvar dados (GET)`);
  console.log(`   GET  http://localhost:${PORT}/api/data - Ver dados salvos`);
  console.log(`   DEL  http://localhost:${PORT}/api/data - Limpar dados`);
  console.log('');
  console.log('💡 Para testar o PWA:');
  console.log('   1. Abra http://localhost:3000 no navegador');
  console.log('   2. Teste o formulário');
  console.log('   3. Verifique os dados em http://localhost:3000/api/data');
});
