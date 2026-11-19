# Atualizações automáticas do PWA — versão 1.5.2

## Resultado da investigação

Antes desta revisão, o cache do service worker era fixo (`app-presenca-v22`), sem vínculo com o conteúdo exportado. Alterar componentes e publicar novamente não garantia mudança no arquivo `sw.js`. Não havia cabeçalhos explícitos no Vercel para revalidar o service worker, HTML e configuração. O HTML também forçava reload em qualquer `controllerchange`, inclusive na primeira instalação, sem proteger formulários ou sincronizações.

## Fluxo depois da correção

1. O Vercel executa `npm run vercel-build`, que chama `npm run build`.
2. O Expo exporta a web; `scripts/prepare-pwa.cjs` calcula um hash dos arquivos e do service worker, combinando-o com a versão do pacote. Mesmo sem alterar o número comercial, uma mudança de código gera outra identidade de build.
3. A lista de arquivos necessários para uso offline é gravada no worker. HTML, bundle, fontes, ícones, configuração inicial e atualizador são preparados antes da ativação. Arquivo faltando, HTML devolvido no lugar de um asset ou falha de download impedem ativar a nova versão.
4. HTML, atualizador e bundles da versão instalada são servidos juntos. A configuração da regional é consultada pela rede com fallback offline. Requisições de APIs, gravações, Supabase, Google Sheets e mapas externos não entram nesse cache.
5. O worker novo assume o controle após concluir a instalação. A página compara sua identidade com a do worker e se recarrega uma única vez, automaticamente, quando estiver segura.
6. A checagem ocorre na abertura, no retorno ao primeiro plano, em `pageshow`, ao recuperar a rede e a cada 60 segundos enquanto o app estiver visível. O registro usa `updateViaCache: 'none'`.
7. Formulários preenchidos, campos focados, modais, confirmação de local, cadastro manual, edição de registros e sincronização da fila adiam o reload. A mudança de tela libera o bloqueio daquela tela. A atualização pode ser baixada enquanto a pessoa trabalha; não é preciso reinstalar.
8. O fluxo não apaga localStorage, IndexedDB, sessão, local do ensaio nem fila offline. Preserva também o cache da versão anterior e não remove caches de outras aplicações na mesma origem.

A configuração de cache no Vercel mantém o worker e a configuração sem armazenamento HTTP e revalida os arquivos de entrada. Assets com nomes contendo hash podem ter cache longo. Essas decisões seguem o [ciclo de vida de service workers](https://web.dev/articles/service-worker-lifecycle) e a [configuração de cabeçalhos do Vercel](https://vercel.com/docs/project-configuration/vercel-json).

## Versão e publicação

- `package.json`, metadados raiz de `package-lock.json` e `app.config.js`: **1.5.2**.
- O aviso de atualização usa a versão do pacote, eliminando uma constante manual separada.
- O rodapé do login usa a configuração Expo/versão do pacote.
- `dist/release.json` identifica a versão comercial e o hash da build publicada.
- O Docker também usa `npm run build`, para não publicar templates sem preparação.
- Não alterar `start_url`, `scope`, domínio ou identidade do manifesto para atualizar: instalações existentes continuam vinculadas à mesma origem.
- Não foi feito push nem deploy nesta tarefa. As mudanças passam a valer depois que os arquivos forem enviados e o deployment de produção do Vercel concluir com sucesso.

## Verificações reproduzíveis

`npm run test:pwa` executa testes do pipeline, preparação offline, falha de instalação, cache de APIs, preservação de versões anteriores, comparação de builds, ausência de reload inicial, proteção de formulário/modal, retomada e conectividade.

`node scripts/pwa-browser-test.cjs` testa service workers reais no Chromium com perfil temporário isolado. Simula três publicações: A, B e C com um bundle ausente. Confere instalação inicial sem reload, adiamento enquanto há formulário preenchido, atualização automática A → B, persistência de um registro de teste em storage, recusa da publicação incompleta C e reabertura offline na B. Não acessa dados de produção. O executável pode ser definido em `PWA_CHROME`.

O arquivo gerado `dist/sw.js` precisa conter um build ID real e um array de assets, sem os marcadores `__PWA_*`. O HTML gerado deve carregar `/pwa-update.js` e apenas um fluxo de registro do worker. Nunca publicar uma exportação feita apenas com `expo export`; usar `npm run build`.

## Limites que precisam ficar claros

Um site não consegue obrigar iOS/Android a executar código enquanto o PWA está totalmente fechado, suspenso ou sem rede. A garantia implementada é a checagem e atualização automática quando o navegador volta a executar o app e consegue baixar a publicação. Os 60 segundos são a frequência solicitada enquanto visível, não um prazo absoluto de entrega do sistema operacional.

Na migração de uma versão antiga para 1.5.2, uma página que já estava aberta ainda executa o código antigo de reload agressivo; não é possível reescrever esse JavaScript remotamente antes da primeira atualização. Depois que 1.5.2 estiver carregada, as proteções novas passam a valer. Não se exige desinstalar ou limpar dados.

Os testes locais validam o mecanismo em Chromium e os artefatos de publicação. A confirmação final de cabeçalhos no domínio real e testes físicos em Safari/iPhone e Chrome/Android dependem do deployment e dos aparelhos, e não foram apresentados como já realizados.
