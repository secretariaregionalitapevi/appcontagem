# Confirmação pública — reunião de 28/11/2026

URL: `/confirmar-presenca`. Evento: Reunião de Aprimoramento Musical, 28/11/2026 às 9h, Central de Itapevi.

## Fluxo ativo

A página consulta `ram_public_catalog` e `ram_public_people` para selecionar município, comum e pessoa sem login. Quando uma busca concluída não encontra nomes e o nome completo digitado é válido, libera automaticamente o botão de confirmar, sem mensagem ou etapa extra de inclusão manual. O registro mantém a observação `SAM Desatualizado` em `ANOTACOES` na planilha. Não cria pessoas em `cadastro`.

A confirmação envia diretamente aos mesmos serviços do sistema raiz:

Para nomes encontrados, a página consulta o cadastro pelo ID selecionado e valida nome, município e comum antes do envio. Nível e instrumento vêm desse cadastro. As funções compartilhadas do app raiz normalizam o nível, calculam o naipe e preenchem instrumento `ÓRGÃO`, naipe `TECLADO` e classe para os cargos de organistas. Os campos `nivel`, `instrumento`, `naipe_instrumento` e `classe_organista` são enviados ao Supabase e às colunas correspondentes da planilha. Para nomes sem cadastro, esses campos permanecem vazios, conforme a preferência definida para esta página.

1. Aba `Dados` de https://docs.google.com/spreadsheets/d/1LGoW7lbYS4crpEdTfGR2evuH9kArZgqrvVbmi6buBoQ/edit, usando o Apps Script já configurado em `SHEETS_ENDPOINT_URL`, operação `append`.
2. Tabela `public.presencas` do projeto `wfqehmdawhfjqbqpjapp`, usando a credencial pública já configurada e as permissões existentes dessa tabela.

A página não chama mais `ram_public_confirm` nem grava em `confirmacoes_reuniao`. Não exige novo gatilho, chave administrativa no navegador ou instalação de outro Apps Script.

O registro é primeiro salvo numa fila local persistente, com verificação da escrita. A tela de confirmação original aparece imediatamente e o botão `Confirmar outra pessoa` já pode ser usado, enquanto o envio segue em segundo plano. Não há aviso amarelo de fila. Pendências sobrevivem à recarga e são retomadas ao abrir a página, a cada oito segundos e quando a conexão volta. A fila só remove um item após o serviço confirmar a entrega. Se o navegador for fechado, o processamento retoma quando a página for aberta novamente.

O UUID é derivado do evento, município, comum e nome normalizado. A planilha é enviada antes do Supabase porque o Apps Script raiz pode bloquear append quando a presença já está no banco. Não há marca antiga de entrega no navegador para pular o Sheets: uma nova confirmação após exclusão no banco envia novamente aos dois destinos. Novas tentativas mantêm o UUID para deduplicação. O recibo do Sheets precisa confirmar esse UUID, `master.ok`, a planilha e a aba `Dados`.

Quando o registro já existe, o serviço retorna o recibo existente sem repetir a inserção. A confirmação visual mantém o desenho original, sem toast.

O envio aos dois serviços é sequencial, sem transação distribuída. Uma falha pode deixar somente a planilha gravada; o formulário mantém a seleção para repetir a operação e concluir o banco. Se a conexão cair antes de receber o recibo do Sheets, a repetição depende da deduplicação do endpoint. A página não informa sucesso para uma resposta ambígua.

`data_ensaio` indica o evento, e `created_at` indica quando a confirmação foi recebida. O marcador é `CONFIRMACAO PUBLICA 2026-11-28` em `registrado_por`.

Na planilha, `DATA_ENSAIO` e `SYNCED_AT` são exibidos em `DD/MM/AAAA HH:mm:ss`, no fuso `America/Sao_Paulo`, usando as funções de data compartilhadas do sistema raiz. No Supabase, os instantes permanecem em ISO, com fuso preservado.

## Publicação e teste local

Publicar a versão atual do aplicativo. Não é necessário reaplicar o SQL para ativar este envio direto quando os RPCs de catálogo/busca e as permissões do sistema raiz já estão disponíveis.

Para desenvolvimento local no PowerShell:

```powershell
$env:EXPO_OFFLINE='1'
node node_modules/expo/bin/cli start --web --localhost --port 8081
```

Abrir http://localhost:8081/confirmar-presenca e recarregar a página para obter o código atualizado.

## Exclusões e registros antigos

Exclusões ficam sob controle do administrador na planilha e/ou no Supabase. A página não apaga registros nem propaga exclusões. Ao encontrar o UUID em `presencas`, devolve o recibo existente sem reenviar à planilha. Assim, repetir a confirmação não restaura uma linha que o administrador apagou da planilha. Confirmar explicitamente depois de excluir do Supabase pode criar uma nova presença.

As confirmações históricas em `confirmacoes_reuniao` não são apagadas. `docs/RECUPERAR_CONFIRMACOES_REUNIAO_2026-11-28.sql` permite recuperá-las pontualmente com acesso administrativo, preservando a data original. O arquivo também gera a exportação para a planilha. Não instalar a recuperação como tarefa periódica, pois isso poderia restaurar exclusões manuais.

`docs/LISTA_CONFIRMACOES_REUNIAO_2026-11-28.sql` gera a lista de controle a partir de `presencas`.

## Verificações

- `node node_modules/jest/bin/jest.js --runInBand src/__tests__/publicMeetingService.test.ts`: destinos, UUID, observação manual, falhas parciais, repetição, fechamento e recibos inválidos.
- `npm run build`: exportação web e preparação do PWA.
- `node scripts/test-public-meeting-browser.cjs`: fluxo real do bundle com serviços simulados, incluindo inclusão manual e falha de banco após envio à planilha.
- `node scripts/test-public-meeting-sql.cjs`: compatibilidade do SQL opcional com PostgreSQL/PGlite isolado.

As verificações automatizadas usam pessoas fictícias e não inserem presenças em produção. Consultas de disponibilidade do ambiente real devem limitar-se à leitura e ao `ping` do Apps Script.
