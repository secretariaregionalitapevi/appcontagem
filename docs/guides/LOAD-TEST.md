# 🧪 Guia de Teste de Carga

## 📋 Visão Geral

Este teste simula o cenário real de produção:
- **100 usuários simultâneos**
- **5000 registros em 2 horas**
- **Distribuição de carga**: 70% normal, 20% pico (2x), 10% baixa (0.5x)

## 🚀 Como Executar

### Pré-requisitos
```bash
npm install
# ou
yarn install
```

### Executar Teste
```bash
node scripts/load/load-test.js
```

### Executar com Variáveis de Ambiente
```bash
API_URL=https://sua-api.com node scripts/load/load-test.js
```

## 📊 Métricas Monitoradas

### Durante o Teste
- Total de registros enviados
- Taxa de sucesso/erro
- Throughput (registros/segundo)
- Latência média

### Após o Teste
- Estatísticas completas de latência (média, min, max, P95, P99)
- Erros por tipo
- Taxa de sucesso final
- Comparação com objetivos

## 🎯 Objetivos do Teste

### Taxa de Sucesso
- **Mínimo**: 98% dos registros devem ser enviados com sucesso
- **Ideal**: 99%+

### Latência
- **Média**: < 1000ms
- **P95**: < 2000ms
- **P99**: < 3000ms

### Throughput
- **Mínimo**: 0.6 registros/segundo (média)
- **Ideal**: 0.7+ registros/segundo

## 📈 Interpretação dos Resultados

### ✅ Teste Passou
- Taxa de sucesso ≥ 98%
- Latência P95 < 2000ms
- Throughput ≥ 0.6 reg/s

### ⚠️ Teste Passou com Avisos
- Taxa de sucesso 95-98%
- Latência P95 2000-3000ms
- Throughput 0.5-0.6 reg/s

### ❌ Teste Falhou
- Taxa de sucesso < 95%
- Latência P95 > 3000ms
- Throughput < 0.5 reg/s

## 🔧 Ajustes de Configuração

Edite `scripts/load/load-test.js` para ajustar:

```javascript
const CONFIG = {
  totalUsers: 100,        // Número de usuários simultâneos
  totalRegistros: 5000,   // Total de registros esperados
  durationHours: 2,       // Duração do teste em horas
  peakLoadPercent: 0.2,  // % de usuários em pico
  normalLoadPercent: 0.7, // % de usuários em carga normal
  lowLoadPercent: 0.1,    // % de usuários em carga baixa
};
```

## 📝 Notas Importantes

1. **Google Apps Script**: O teste envia diretamente para o Google Sheets
2. **Rate Limiting**: O Google Apps Script pode ter limites de execução simultânea
3. **Monitoramento**: Acompanhe o console durante o teste
4. **Ambiente**: Execute em ambiente de teste, não em produção

## 🐛 Troubleshooting

### Muitos Timeouts
- Verificar conexão de rede
- Verificar se Google Apps Script está respondendo
- Considerar aumentar timeout no código

### Taxa de Erro Alta
- Verificar logs do Google Apps Script
- Verificar quota de execuções
- Verificar formato dos dados enviados

### Throughput Baixo
- Verificar latência das requisições
- Verificar se há rate limiting no servidor
- Considerar otimizações no código

