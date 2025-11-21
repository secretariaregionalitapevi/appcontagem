# 🚨 Instruções: Configurar Alerta de Duplicatas no Google Sheets

## 📋 Visão Geral

O sistema agora detecta automaticamente registros duplicados antes de enviá-los para o Google Sheets. Quando uma duplicata é detectada, o sistema adiciona campos especiais no registro que permitem destacar visualmente essas linhas na planilha.

## 🔍 Campos Adicionados

Quando uma duplicata é detectada, os seguintes campos são adicionados ao registro:

- **ALERTA_DUPLICATA**: Contém "SIM" se for duplicata, "NÃO" caso contrário
- **DUPLICATA_UUID**: UUID do registro original (se duplicata for detectada)
- **DUPLICATA_DATA**: Data do registro original (se duplicata for detectada)

## 🎨 Como Configurar Formatação Condicional no Google Sheets

### Passo 1: Abrir a Planilha
1. Acesse sua planilha do Google Sheets
2. Abra a aba "Dados" (ou a aba onde os registros são salvos)

### Passo 2: Selecionar a Área de Dados
1. Selecione todas as colunas de dados (ou pelo menos a coluna "ALERTA_DUPLICATA")
2. Clique em **Formato** → **Formatação condicional**

### Passo 3: Configurar a Regra
1. Na seção "Formato de células se...", selecione **"O texto contém"**
2. Digite: `SIM`
3. Escolha a cor de destaque (recomendado: **Vermelho claro** ou **Amarelo**)
4. Clique em **"Concluído"**

### Passo 4: Aplicar à Coluna ALERTA_DUPLICATA
1. Certifique-se de que a regra está aplicada à coluna "ALERTA_DUPLICATA"
2. Ou aplique à linha inteira para destacar todo o registro

### Passo 5: Formatação Alternativa (Linha Inteira)
Se quiser destacar a linha inteira quando houver duplicata:

1. Selecione todas as linhas de dados (excluindo cabeçalho)
2. Vá em **Formato** → **Formatação condicional**
3. Selecione **"Fórmula personalizada"**
4. Digite a fórmula: `=$ALERTA_DUPLICATA="SIM"` (ajuste a letra da coluna conforme necessário)
5. Escolha a cor de destaque
6. Clique em **"Concluído"**

## 📊 Exemplo de Fórmula para Linha Inteira

Se a coluna "ALERTA_DUPLICATA" estiver na coluna **P** (por exemplo):

```
=$P2="SIM"
```

**Nota:** O número da linha (2) deve corresponder à primeira linha de dados (não o cabeçalho).

## 🔔 Alertas no Console

O sistema também registra alertas críticos no console do navegador quando uma duplicata é detectada:

```
🚨🚨🚨 ALERTA CRÍTICO - DUPLICATA DETECTADA 🚨🚨🚨
📋 Registro duplicado será enviado para Google Sheets com ALERTA_DUPLICATA=SIM
📋 Configure formatação condicional no Google Sheets para destacar linhas com ALERTA_DUPLICATA="SIM"
```

## ✅ Verificação de Duplicatas

O sistema verifica duplicatas baseado em:
- **Nome completo** (normalizado e comparado sem diferenças de maiúsculas/minúsculas)
- **Comum** (comparação flexível que ignora acentos)
- **Cargo** (normalizado)
- **Data** (mesmo dia)

## 🛡️ Proteções Implementadas

1. **Verificação no Supabase**: Antes de enviar, verifica se já existe registro idêntico no banco
2. **Verificação Local**: Verifica registros já enviados no localStorage
3. **Campo de Alerta**: Adiciona campos especiais para destacar duplicatas
4. **Logs Detalhados**: Registra todas as duplicatas detectadas no console

## 📝 Notas Importantes

- As duplicatas **não são bloqueadas** automaticamente - elas são enviadas mas marcadas com alerta
- Isso permite que o administrador revise e decida o que fazer com cada duplicata
- A formatação condicional deve ser configurada manualmente no Google Sheets
- Recomenda-se revisar periodicamente as linhas destacadas para identificar padrões de duplicação

## 🔧 Troubleshooting

### A formatação condicional não está funcionando
1. Verifique se a coluna "ALERTA_DUPLICATA" existe na planilha
2. Verifique se a fórmula está correta (incluindo a letra da coluna)
3. Certifique-se de que a regra está aplicada à área correta

### Não vejo duplicatas sendo detectadas
1. Verifique o console do navegador para logs de duplicatas
2. Certifique-se de que o Supabase está conectado
3. Verifique se os dados estão sendo enviados corretamente

