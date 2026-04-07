const https = require('https');
const fs = require('fs');

const data = JSON.stringify({
  op: 'append',
  Sheet: 'Registros',
  data: {
    UUID: 'FORCE-TEST-NODE-' + Date.now(),
    'NOME COMPLETO': 'TESTE FORCADO NODE',
    COMUM: 'TESTE',
    CIDADE: 'GOIANIA',
    CARGO: 'MUSICO',
    'NÍVEL': 'OFICIALIZADO',
    INSTRUMENTO: 'ORGAO',
    LOCAL_ENSAIO: 'CENTRAL GOIANIA',
    DATA_ENSAIO: new Date().toLocaleString('pt-BR'),
    SYNC_STATUS: 'FORCE'
  }
});

const url = 'https://script.google.com/macros/s/AKfycbwf9OLoIMZdbd-pvYb332ldT4fGZqSyuhA5Nj1hC8PZWy5S4gOVq0X7sHxZiJNIwJW3/exec';

function post(targetUrl, payload) {
  console.log('Sending to:', targetUrl);
  const req = https.request(targetUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(payload)
    }
  }, (res) => {
    console.log('Status:', res.statusCode);
    if (res.statusCode === 302 || res.statusCode === 301 || res.statusCode === 307 || res.statusCode === 308) {
      console.log('Redirecting to:', res.headers.location);
      https.get(res.headers.location, (res2) => {
        let body = '';
        res2.on('data', (chunk) => body += chunk);
        res2.on('end', () => {
           const logContent = `Status: ${res2.statusCode}\nBody: ${body}`;
           fs.writeFileSync('c:/Users/Usuário/OneDrive/APLICATIVOS REGIONAL/APPEnR/gas_response.txt', logContent);
           console.log('--- RESPONSE WRITTEN TO gas_response.txt ---');
        });
      });
    } else {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => console.log('Response Body:', body));
    }
  });
  req.on('error', (e) => console.error('Error:', e));
  req.write(payload);
  req.end();
}

post(url, data);
