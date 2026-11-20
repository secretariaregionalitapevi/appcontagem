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
  'REUNIAO APRIMORAMENTO MUSICAL - CENTRAL DE ITAPEVI',
  '2026-11-28 12:00:00+00','CONFIRMACAO PUBLICA 2026-11-28',r.confirmado_em
from public.confirmacoes_reuniao r
where r.evento_slug='aprimoramento-musical-2026-11-28'
on conflict (uuid) do nothing;
commit;

-- Depois, exporte as linhas recuperadas para envio à aba Dados, preservando UUID:
select uuid as "UUID",nome_completo as "NOME COMPLETO",comum as "COMUM",cidade as "CIDADE",
  cargo as "CARGO",local_ensaio as "LOCAL_ENSAIO",
  to_char(data_ensaio at time zone 'America/Sao_Paulo','DD/MM/YYYY HH24:MI') as "DATA_ENSAIO",
  registrado_por as "REGISTRADO_POR",'ATUALIZADO' as "SYNC_STATUS",
  created_at as "SYNCED_AT",'Confirmação recuperada do fluxo anterior' as "ANOTACOES"
from public.presencas
where registrado_por='CONFIRMACAO PUBLICA 2026-11-28'
order by created_at;
