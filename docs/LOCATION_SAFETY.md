# Conferência do local da contagem

A seleção do operador continua sendo o destino dos registros. O sistema nunca muda esse destino silenciosamente. A conferência roda no login e imediatamente antes das novas gravações, incluindo registro manual/visita, confirmação de duplicidade e organistas. Não é executada na sincronização da fila: registros anteriores mantêm seu local original.

## Fluxo discreto com mapa

- Sem banners no formulário, toasts de conferência, digitação de local ou confirmações sucessivas. O calendário não interrompe contagens.
- Só uma **divergência geográfica confiável** abre automaticamente o painel. O mapa real compara o local selecionado (pin vermelho) com o aparelho (ponto azul), e apresenta o ensaio próximo como sugestão.
- A pessoa escolhe **Usar [local sugerido]** ou **Manter [local atual]** em um toque. A correção devolve o novo destino ao mesmo envio, atualiza o cabeçalho e preserva os campos. Não há troca silenciosa ou reinício do formulário.
- Tocar no local no cabeçalho permite abrir o mapa e escolher outro ensaio a qualquer momento nas telas de contagem.
- Durante os envios, GPS negado, ausente, lento ou impreciso **não é evidência de divergência**. O envio aguarda no máximo 900 ms pela leitura; o pedido pode terminar em segundo plano. Na entrada, a confirmação obrigatória descrita abaixo aguarda o resultado efetivo e informa a indisponibilidade do GPS.
- O raio inicial é 500 m, somado à precisão informada. Há margem inconclusiva de 200 m na borda; apenas leitura de até dois minutos e precisão de até 1.000 m permite concluir divergência. Distância mostrada é em linha reta, sem inventar rota ou tempo de viagem.
- Decidir manter o mesmo local não gera novos painéis para cada participante. A escolha vale por até uma hora para o mesmo destino, data, região detectada e configuração. Outra região/data/configuração ou sair da conta invalida a decisão.
- O mapa usa tiles OpenStreetMap apenas enquanto está aberto, com créditos visíveis e cache normal HTTP. Sem chave do Google, sem downloads antecipados de cidades e sem biblioteca de mapas no caminho normal da contagem. Falha de rede no mapa não desativa as escolhas.

## Endereços e pontos iniciais

Endereços fornecidos pelo responsável em 19/11/2026. Os pontos foram cruzados com links de mapas das congregações correspondentes. Não foram usados centros dos municípios ou os primeiros resultados de ruas do geocodificador. Validar em um aparelho no estacionamento de cada local é recomendado antes do próximo evento grande; o raio pode ser ajustado sem mudança no fluxo.

| Local | Endereço informado | Latitude | Longitude | Referência |
| --- | --- | --- | --- | --- |
| Cotia | R. Ernesto Lemos Leite, 440, Vila Monte Serrat, Cotia | -23.6054025 | -46.9217495 | [Vila Monte Serrat — BR-22-0413](https://congregacoes.com.br/ccb/br/sp/cotia), link Maps do endereço |
| Caucaia do Alto | R. Adriano Pires de Oliveira, 40, Centro, Caucaia do Alto, Cotia | -23.6824552 | -47.0214911 | [Caucaia — BR-22-0423](https://congregacoes.com.br/ccb/br/sp/cotia), link Maps do endereço |
| Fazendinha | R. Gabriel Jorge Salomão, 576, Santana de Parnaíba | -23.4098685 | -46.8850686 | [Fazendinha — BR-22-0272](https://congregacoes.com.br/ccb/br/sp/santana-de-parnaiba), link Maps do endereço |
| Itapevi | Av. Ana Araújo de Castro, 815, Jardim Itapevi, Itapevi | -23.5457193 | -46.9280331 | [Centro — BR-21-1039](https://congregacoes.com.br/ccb/br/sp/itapevi), link Maps do endereço |
| Jandira | Av. André Vidal de Negreiros, 96, Vila Anita Costa, Jandira | -23.5324510 | -46.9031498 | [Central de Jandira](https://www.benditoguia.com.br/empresa/congregacao-crista-no-brasil-central-de-jandira-centro-sp), coordenadas do endereço |
| Pirapora | Estr. das Goiabeiras, 680, Pirapora do Bom Jesus | -23.3986875 | -47.0239375 | Plus Code fornecido: `JX2G+GC`, completado na região de Pirapora como `588JJX2G+GC`; centro da célula de aproximadamente 14 m |
| Vargem Grande | Av. Geraldo dos Santos, 236, Jardim Portão Vermelho, Vargem Grande Paulista | -23.6072249 | -47.0076642 | [Portão Vermelho — BR-22-0417](https://congregacoes.com.br/ccb/br/sp/vargem-grande-paulista), link Maps do endereço |

O ponto de Pirapora usa o Plus Code enviado pelo responsável, e não o endereço da Central antiga encontrado em diretórios. A conversão segue a [especificação Open Location Code](https://github.com/google/open-location-code/blob/main/Documentation/Specification/olc_definition.adoc).

## Configuração e outras regionais

Os valores iniciais estão em `src/config/ensaioVenues.ts`, usados na web e em builds nativos. `window.APP_CONFIG.LOCAIS_ENSAIO` continua definindo a lista disponível; os pontos padrão são combinados **pelo nome**, nunca por um ID numérico de outra regional.

É possível configurar ponto, raio e meses individualmente no `public/config.js` ou no JSON de locais do Docker:

```js
{ id: '4', nome: 'Itapevi',
  geo: { latitude: -23.5457193, longitude: -46.9280331, radiusMeters: 500 },
  mesesEnsaio: [1, 5, 9] }
```

Uma localidade nova sem coordenadas continua utilizável, sem inventar posição ou interromper a contagem. `mesesEnsaio: []` desativa a orientação mensal para aquele local. Raios válidos: 50 a 10.000 m; valor ausente ou inválido usa 500 m. Depois de alterar o padrão compilado, gerar novamente `dist`; em Docker, o mesmo objeto pode ser fornecido em `LOCAIS_ENSAIO_JSON`.

## Permissões, privacidade e implantação

- Web/PWA: requer HTTPS (localhost é uma exceção de desenvolvimento) e permissão de localização do navegador. A política de permissões do host/iframe deve permitir geolocalização. A [API do navegador](https://developer.mozilla.org/en-US/docs/Web/API/Geolocation/getCurrentPosition) pode falhar ou retornar posição imprecisa, especialmente em computadores sem GPS.
- Android/iOS: módulo oficial `expo-location` compatível com Expo 50, com permissão somente em uso. Builds próprios precisam ser recompilados para incluir o módulo e a mensagem de permissão em português; clientes antigos sem o módulo continuam contando sem verificação geográfica automática.
- Coordenadas do operador ficam apenas em memória por curto período; não são gravadas no banco, na fila, no localStorage ou em logs. A exibição do mapa solicita somente tiles da área visível ao provedor OpenStreetMap; os pins são desenhados no aparelho. Não há geocodificação reversa ou requisição com coordenadas precisas do aparelho na URL. As referências dos locais ficam no código/configuração, sem depender de uma API de mapas durante a contagem.
- A escolha do local pelo mapa mantém a sessão e os campos, aplica o destino ao envio atual e não altera registros anteriores ou da fila. `MAP_TILE_URL` permite configurar outro provedor XYZ; respeitar a [política de tiles](https://operations.osmfoundation.org/policies/tiles/), o cache e a atribuição. Não usar a marca Google para identificar este mapa.

## Validação

Testes automatizados cobrem o caso aparelho em Caucaia com Itapevi selecionado, GPS negado/impreciso/antigo, borda do raio, calendário, confirmação adicional, mudança de configuração/data e expiração do cache. Não usam localização real ou alteram registros de produção.

No evento, testar com um aparelho no local: conceder permissão, abrir o mapa pelo local no cabe?alho, selecionar propositalmente outro ensaio e verificar o painel de diverg?ncia. Depois negar a permissão e conferir que a contagem continua sem bloqueio ou alerta fixo. O objetivo é evitar erros operacionais; GPS não constitui prova infalível de presença.

## Confirmação obrigatória na entrada

O login usa `confirmEntry`: aguarda o resultado efetivo do GPS (limite de 12 segundos do provedor), abre o mapa e só autentica/navega após uma decisão explícita. Divergência mostra os dois pontos, coordenadas, precisão e distância; é possível corrigir o destino com um toque ou confirmar a exceção. Fechar cancela a entrada. GPS negado, impreciso ou indisponível não é tratado como convergente: o painel informa a limitação e exige confirmar o destino ou tentar novamente. A regra rápida de 900 ms aplica-se apenas aos envios durante a contagem, nunca à entrada.
