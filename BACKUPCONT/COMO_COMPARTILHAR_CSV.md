# Como Compartilhar o CSV para Análise

## 📤 Opções para Compartilhar

### Opção 1: Copiar Primeiras Linhas (Mais Rápido)
1. Abra o arquivo `MUSICOS_ORGANISTAS_REG_ITAPEVI_FINAL.csv`
2. Copie as **primeiras 20-30 linhas** (incluindo o cabeçalho)
3. Cole aqui no chat

### Opção 2: Upload para Cloud Storage
1. Upload para Google Drive, OneDrive ou Dropbox
2. Compartilhe o link público
3. Envie o link aqui

### Opção 3: Usar Script de Importação (Recomendado)
Use um dos scripts criados (`importar_csv_supabase.js` ou `importar_csv_supabase.py`) que:
- ✅ Aceita colunas em MAIÚSCULAS ou minúsculas
- ✅ Remove caracteres especiais automaticamente (incluindo ◆)
- ✅ Normaliza os dados
- ✅ Importa em lotes para evitar timeout

## 🔍 O que Precisamos Verificar

Ao compartilhar, precisamos verificar:

1. **Cabeçalho do CSV**: Quais são os nomes exatos das colunas?
2. **Primeiras linhas**: Como estão os dados?
3. **Encoding**: O arquivo está em UTF-8?
4. **Delimitador**: Vírgula ou ponto e vírgula?

## 🚀 Usando os Scripts de Importação

### Para Node.js:
```bash
# Instale as dependências
npm install csv-parser @supabase/supabase-js

# Execute o script
node importar_csv_supabase.js MUSICOS_ORGANISTAS_REG_ITAPEVI_FINAL.csv
```

### Para Python:
```bash
# Instale as dependências
pip install supabase python-csv

# Execute o script
python importar_csv_supabase.py MUSICOS_ORGANISTAS_REG_ITAPEVI_FINAL.csv
```

## 📋 Formato Esperado do CSV

O CSV deve ter uma dessas estruturas:

**Formato 1 (minúsculas - ideal):**
```csv
nome,instrumento,localidade,cidade
CRISTIANE OLIVEIRA,TROMPETE,BR-22-0413 - VILA MONT SERI,COTIA
```

**Formato 2 (maiúsculas - aceito pelo script):**
```csv
NOME,INSTRUMENTO,LOCALIDADE,CIDADE
CRISTIANE OLIVEIRA,TROMPETE,BR-22-0413 - VILA MONT SERI,COTIA
```

## ⚠️ Problemas Comuns

1. **BOM (Byte Order Mark)**: Se o CSV começar com caracteres estranhos, abra no Excel e salve novamente
2. **Delimitador errado**: Se usar ponto e vírgula, o script detecta automaticamente
3. **Encoding**: Se tiver caracteres estranhos, abra no Notepad++ e converta para UTF-8

