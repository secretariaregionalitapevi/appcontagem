# Relatorio corrigido do teste de carga - Ensaio Regional Itapevi

Data do evento: 17/05/2026

## Status

INVALIDADO.

O relatorio anterior concluiu que o sistema estava pronto para o evento, mas essa conclusao nao era sustentada por um teste ponta a ponta do fluxo real do aplicativo.

O teste apresentado simulava capacidade operacional e tecnica, mas nao provou robustez em celulares/PWA com internet oscilante, fila local, Supabase, Google Sheets, recarregamento do app e concorrencia real de atendentes.

## Falha de premissa

O contrato real do sistema e simples:

1. Consultar comum + cargo.
2. Exibir nomes.
3. Registrar a presenca.
4. Garantir persistencia em Supabase e Google Sheets.
5. Nao perder registro quando a internet cair, oscilar ou o usuario reiniciar o app.

O teste anterior nao mediu esse contrato de ponta a ponta.

## Evidencias de invalidacao

- O resultado salvo em `load_test_result.txt` mostra apenas 183 requisicoes, nao milhares.
- A latencia media observada foi de 23.329ms.
- Varias requisicoes passaram de 40s.
- O teste nao comprovou comportamento com queda de internet durante envio.
- O teste nao comprovou persistencia local apos fechamento/reabertura do app.
- O teste nao comprovou garantia simultanea Supabase + Google Sheets.
- O teste nao comprovou o fluxo "fora da regional" com instrumento em dispositivo movel.

## Vulnerabilidades encontradas apos o evento

- O envio podia aguardar checagem remota antes de salvar localmente, travando em rede instavel.
- A sincronizacao podia remover item da fila apos falhas repetidas.
- Se Supabase aceitasse e Google Sheets falhasse, uma tentativa posterior podia tratar o registro como duplicado no Supabase e remover da fila antes de garantir Google Sheets.
- A tela de Outras Localidades nao tinha pull-to-refresh nativo.
- A confirmacao de duplicidade em Outras Localidades podia tentar envio direto, bloqueando a tela.

## Correcoes aplicadas no app

- O registro agora prioriza salvamento local antes de qualquer chamada remota.
- Sincronizacao inicial e pull-to-refresh nao bloqueiam a tela aguardando rede.
- Itens pendentes nao sao descartados por limite de tentativas.
- A sincronizacao agora acompanha confirmacao independente para Supabase e Google Sheets; o item so sai da fila quando os dois destinos estiverem confirmados.
- Outras Localidades recebeu pull-to-refresh.
- Confirmar duplicidade em Outras Localidades salva localmente e sincroniza em segundo plano.

## Criterios minimos para novo aceite

O sistema so deve ser considerado pronto apos passar por testes que comprovem:

- Registro local em menos de 500ms, com rede boa, lenta e offline.
- Fila preservada apos fechar e abrir o app.
- Queda de internet durante envio sem perda de registro.
- Supabase OK + Google Sheets falhando: item permanece pendente para Sheets.
- Google Sheets OK + Supabase falhando: item permanece pendente para Supabase.
- Fora da Regional com cargo musical e instrumento selecionado em celular real.
- Pull-to-refresh funcional em Registro e Outras Localidades.
- Teste de pico com o fluxo real do app, nao apenas chamada isolada ao endpoint.

## Conclusao corrigida

O teste anterior nao deveria ter aprovado o sistema para o evento.

Qualquer novo relatorio de aprovacao precisa demonstrar o fluxo real e declarar explicitamente o que foi testado, em qual dispositivo, com qual condicao de rede e quais evidencias foram coletadas.
