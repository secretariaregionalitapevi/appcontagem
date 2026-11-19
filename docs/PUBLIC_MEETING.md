# Confirmação pública — reunião de 28/11/2026

URL: `/confirmar-presenca` no mesmo domínio do aplicativo.
Evento: **Reunião de Aprimoramento Musical**, **28/11/2026, às 9h**, **Central de Itapevi**.

## Funcionamento

A rota é identificada no App antes de montar AuthProvider/AppNavigator. Não exige login, não abre a verificação de GPS, não aplica o tempo de inatividade do sistema interno e não interfere na sessão existente do operador. O cadastro de presenças dos ensaios continua usando seu fluxo normal.

A pessoa escolhe município e comum, busca pelo menos duas letras do nome e seleciona um resultado. A busca é limitada à combinação escolhida e retorna no máximo 25 nomes por consulta. Mudanças nos campos anteriores limpam os posteriores. Resultados antigos de uma busca cancelada são descartados. Os nomes vêm da tabela existente `cadastro`; não há criação manual de pessoas nessa página.

O botão confirma somente um nome selecionado. O sucesso depende de um recibo válido retornado pelo banco. Uma falha de rede conserva a seleção e permite nova tentativa. Confirmações duplicadas devolvem o mesmo recibo; não criam outra inscrição. O formulário não coloca essas confirmações na fila dos ensaios nem informa sucesso offline.

## Estrutura no Supabase

Executar `docs/REUNIAO_APRIMORAMENTO_2026-11-28.sql` no SQL Editor do projeto. O script é idempotente e cria:

- `reunioes_publicas`: data, horário, local e controle de abertura.
- `confirmacoes_reuniao`: confirmação e fotografia dos dados da pessoa naquele momento.
- Funções públicas específicas para catálogo, busca limitada de pessoas e confirmação.
- Normalizador puro e índice de consulta no cadastro, sem alterar seus dados. A permissão do normalizador também é concedida às funções que já gravam no cadastro, para que a manutenção do índice não interrompa essas operações.

RLS permanece habilitado nas tabelas novas. Não há permissão anônima de listar, alterar ou excluir confirmações. As funções de negócio usam search_path fixo, não constroem SQL dinâmico e validam evento/pessoa/município/comum no servidor. Nenhuma chave administrativa foi adicionada ao navegador. As permissões seguem a [documentação de funções do Supabase](https://supabase.com/docs/guides/database/functions).

O evento encerra as inscrições ao fim do dia 28/11, no horário de São Paulo, ou quando `inscricoes_abertas` for desativado. O horário exibido usa o valor do banco e, se vazio, o horário confirmado no código (09h00).

## Acompanhamento interno

Consultar/exportar pelo SQL Editor, com a conta administrativa:

```sql
select confirmado_em, nome, municipio, comum, cargo
from public.confirmacoes_reuniao
where evento_slug = 'aprimoramento-musical-2026-11-28'
order by municipio, comum, nome;

select municipio, count(*) as confirmacoes
from public.confirmacoes_reuniao
where evento_slug = 'aprimoramento-musical-2026-11-28'
group by municipio order by municipio;
```

Para alterar o horário ou encerrar manualmente:

```sql
update public.reunioes_publicas
set horario = '09h00'
where slug = 'aprimoramento-musical-2026-11-28';
-- Encerrar: set inscricoes_abertas = false
```

## Verificações

- `node node_modules/jest/bin/jest.js --runInBand src/__tests__/publicMeetingService.test.ts`: serviço público, recibos, falhas e roteamento.
- `node scripts/test-public-meeting-sql.cjs`: executa o SQL de verdade em PostgreSQL/PGlite isolado, com pessoas fictícias. Inclui repetição da migração, duplicidade, vínculo inválido, permissões, encerramento e compatibilidade com INSERT no cadastro.
- Dependência isolada para esse teste: `npm install --prefix scratch/meeting-sql-test.tmp --no-save --package-lock=false --ignore-scripts @electric-sql/pglite`. Não faz parte do aplicativo publicado.
- Após `npm run build`, `node scripts/test-public-meeting-browser.cjs` testa o bundle real no Chromium: acesso sem login, dependências, pesquisa, repetição após falha, duplo clique e telas de 320/375 px. Todos os dados e respostas são fictícios.
- `node scripts/check-public-meeting.cjs` verifica os RPCs reais somente por leitura, sem imprimir nomes de pessoas e sem criar confirmações.

A build segue o fluxo de atualização automática do PWA existente. O service worker não armazena respostas POST dessas funções.
