# Relatorio do Teste de Carga - Ensaio Regional Itapevi

Data do evento: 17/05/2026  
Local principal: Itapevi  
Local simultaneo: Pirapora  
Objetivo: validar se o sistema suporta o fluxo previsto de registros simultaneos durante o horario de pico.

```txt
RESULTADOS DO TESTE DE CARGA:
================================

[OK] Sucessos simulados: 2.350/2.350 (100.0%)
[OK] Falhas simuladas: 0/2.350 (0.0%)
[OK] Cenario principal: Itapevi 2.000 pessoas + Pirapora 350 pessoas
[OK] Horario de registro: 07h30 as 10h00
[OK] Horario critico avaliado: 08h40 as 09h00
[OK] Pico estimado no periodo critico: 940 registros em 20 minutos

METRICAS DE ATENDIMENTO:
--------------------------------
- Atendentes digitando em Itapevi: 22
- Atendentes digitando em Pirapora: 4
- Cadastros estimados no pico: 47.0 por minuto
- Tempo medio de atendimento: 18.2s
- Atendimento p95: 37.2s
- Espera media simulada: 0.1s
- Espera p95 simulada: 0.0s
- Maior espera simulada: 18.1s

METRICAS TECNICAS:
--------------------------------
- Concorrencia maxima em validacao/salvamento local: 5
- Concorrencia maxima em sincronizacao em segundo plano: 10
- Tamanho esperado da fila online: 0
- Taxa de erro simulada: 0.0%
- Circuit breaker: CLOSED
- Sincronizacao offline/background: OK

TESTES ADICIONAIS:
--------------------------------
[OK] Cenario com equipe reduzida tambem aprovado
     Itapevi 18 atendentes + Pirapora 3 atendentes

[OK] Cenario de stress 1.5x tambem aprovado tecnicamente
     Itapevi 3.000 pessoas + Pirapora 525 pessoas

[ATENCAO] Rajada simultanea muito alta gera fila operacional
          Exemplo testado: +150 pessoas chegando juntas em Itapevi
          Resultado: sistema suportou, mas a espera humana subiu para ate 131.7s

SEGURANCA E CONFIABILIDADE:
--------------------------------
[OK] Login e perfil validados em producao pelo teste manual
[OK] Salvamento local rapido antes da sincronizacao
[OK] Protecao contra duplo clique no envio
[OK] Verificacao de duplicidade local e remota
[OK] Fila offline preparada para instabilidade de internet
[OK] Build de producao executado com sucesso

SISTEMA PRONTO PARA O EVENTO:
================================
[OK] Todos os criterios tecnicos foram atendidos no cenario previsto.
[OK] O sistema suporta o pico estimado de Itapevi e Pirapora simultaneamente.
[OK] O principal risco identificado nao e tecnico, e sim operacional:
     chegada de muitas pessoas ao mesmo tempo em uma unica fila.

RECOMENDACOES PARA A EQUIPE:
--------------------------------
1. Todos os atendentes devem abrir o sistema antes das 07h30.
2. Confirmar login, local do ensaio e carregamento das listas antes do pico.
3. Manter triagem separando Regional Itapevi, fora da regional e casos manuais.
4. Evitar que muitos cadastros manuais se acumulem entre 08h40 e 09h00.
5. Suporte tecnico deve monitorar internet, fila offline e duplicidades durante o pico.
6. Em caso de instabilidade, continuar registrando; o sistema salva na fila e sincroniza depois.

CONCLUSAO:
--------------------------------
Teste de carga concluido com sucesso.
Sistema aprovado para uso no evento, considerando a equipe prevista e o fluxo planejado.
```

