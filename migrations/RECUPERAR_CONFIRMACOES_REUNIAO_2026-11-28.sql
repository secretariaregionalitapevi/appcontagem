-- Recuperação pontual das confirmações recebidas pelo fluxo antigo.
-- Execute no SQL Editor administrativo apenas para recuperar esses registros.
-- Não faz exclusões. Não instalar como gatilho nem executar periodicamente.
-- O aplicativo atualizado já grava novas confirmações em public.presencas.
begin;
insert into public.presencas (
  uuid,nome_completo,cidade,comum,cargo,local_ensaio,data_ensaio,registrado_por,created_at
)
select
  md5(r.evento_slug || '|' || r.municipio_chave || '|' || r.comum_chave || '|' || r.nome_chave)::uuid,
  upper(r.nome),upper(r.municipio),upper(r.comum),upper(r.cargo),
  'REUNIAO MUSICAL - CENTRAL DE ITAPEVI',
  '2026-11-28 12:00:00+00','Sistema',r.confirmado_em
from public.confirmacoes_reuniao r
where r.evento_slug='aprimoramento-musical-2026-11-28'
on conflict (uuid) do nothing;
commit;

-- Depois, exporte as linhas recuperadas para envio à aba Dados, preservando UUID:
select uuid as "UUID",nome_completo as "NOME COMPLETO",comum as "COMUM",cidade as "CIDADE",
  cargo as "CARGO",local_ensaio as "LOCAL_ENSAIO",
  to_char(data_ensaio at time zone 'America/Sao_Paulo','DD/MM/YYYY') as "DATA_ENSAIO",
  registrado_por as "REGISTRADO_POR",'ATUALIZADO' as "SYNC_STATUS",
  to_char(created_at at time zone 'America/Sao_Paulo','DD/MM/YYYY HH24:MI:SS') as "SYNCED_AT",''::text as "ANOTACOES"
from public.presencas
where data_ensaio >= timestamptz '2026-11-28 00:00:00-03'
  and data_ensaio < timestamptz '2026-11-29 00:00:00-03'
  and local_ensaio in ('REUNIAO MUSICAL - CENTRAL DE ITAPEVI','REUNIAO APRIMORAMENTO MUSICAL - CENTRAL DE ITAPEVI')
order by created_at;
