# Instruções para Importação do CSV

## Problema Identificado

O CSV tem colunas em **MAIÚSCULAS** (`NOME`, `INSTRUMENTO`, `LOCALIDADE`, `CIDADE`) e a tabela PostgreSQL usa **minúsculas**. Além disso, há caracteres especiais como `◆` na coluna INSTRUMENTO.

## Soluções

### Solução 1: Renomear Colunas no CSV (RECOMENDADO)

1. Abra o arquivo `MUSICOS_ORGANISTAS_REG_ITAPEVI_FINAL.csv` no Excel ou editor de texto
2. Na primeira linha (cabeçalho), altere:
   - `NOME` → `nome`
   - `INSTRUMENTO` → `instrumento`
   - `LOCALIDADE` → `localidade`
   - `CIDADE` → `cidade`
3. Salve o arquivo
4. Tente importar novamente no Supabase

### Solução 2: Usar o Schema com Limpeza Automática

Execute o arquivo `schema_cadastro_solucao_completa.sql` que:
- Limpa automaticamente caracteres especiais (incluindo `◆`)
- Normaliza todos os campos
- Aceita dados em qualquer formato

Depois, importe o CSV original.

### Solução 3: Importação Manual via SQL

Se as soluções acima não funcionarem, você pode:

1. Exportar o CSV para formato SQL
2. Ou usar a função `importar_cadastro_csv()` criada no schema
3. Ou fazer um script Python/Node.js para importar linha por linha

## Verificação

Após a importação, verifique se:
- Os caracteres especiais foram removidos do campo `instrumento`
- O campo `comum` foi preenchido automaticamente com o valor de `localidade`
- Os campos `_norm` foram preenchidos corretamente

