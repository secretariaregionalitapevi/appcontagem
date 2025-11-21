# ⚠️ IMPORTANTE: Criar arquivo .env

O arquivo `.env` não pode ser criado automaticamente porque está no `.gitignore` (por segurança).

## ✅ Solução Temporária

As credenciais já foram configuradas no `app.config.js` como valores padrão, então o app deve funcionar agora mesmo sem o `.env`.

## 📝 Para criar o .env (recomendado)

Crie manualmente um arquivo chamado `.env` na raiz do projeto com o seguinte conteúdo:

```env
SUPABASE_URL=https://wfqehmdawhfjqbqpjapp.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndmcWVobWRhd2hmanFicXBqYXBwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc0NDI0ODIsImV4cCI6MjA3MzAxODQ4Mn0.lFfEZKIVS7dqk48QFW4IvpRcJsgQnMjYE3iUqsrXsFg
SHEETS_ENDPOINT_URL=https://script.google.com/macros/s/AKfycbxPtvi86jPy7y41neTpIPvn3hpycd3cMjbgjgifzLD6qRwrJVPlF9EDulaQp42nma-i/exec
```

## 🔄 Próximos Passos

1. **Reinicie o servidor Expo** para carregar as novas configurações:
   ```bash
   # Pare o servidor (Ctrl+C) e inicie novamente
   npx expo start -c
   ```

2. **Recarregue a página no navegador** (F5)

3. O app agora deve funcionar completamente com autenticação e banco de dados!

## ✅ Status

- ✅ Credenciais configuradas no `app.config.js`
- ✅ Supabase URL: `https://wfqehmdawhfjqbqpjapp.supabase.co`
- ✅ Google Sheets Endpoint configurado
- ⚠️ Crie o `.env` manualmente para melhor prática (opcional, já funciona sem ele)

