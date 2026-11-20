-- LISTA DE CONTROLE — Reunião de Aprimoramento Musical
-- 28/11/2026, às 9h — Central de Itapevi
-- Execute no SQL Editor do Supabase. Esta consulta apenas lê os registros.
-- No resultado, use Export > CSV para abrir no Excel ou preparar a impressão.

select
  row_number() over (order by cidade, comum, nome_completo) as "Nº",
  nome_completo as "Nome completo",
  cidade as "Município",
  comum as "Comum congregação",
  coalesce(cargo, '') as "Cargo / ministério",
  to_char(created_at at time zone 'America/Sao_Paulo', 'DD/MM/YYYY HH24:MI') as "Confirmado em",
  ''::text as "Presença no dia",
  ''::text as "Assinatura"
from public.presencas
where registrado_por = 'CONFIRMACAO PUBLICA 2026-11-28'
order by cidade, comum, nome_completo;

-- Para consultar somente o total, execute separadamente:
-- select count(*) as "Total de confirmações"
-- from public.presencas
-- where registrado_por = 'CONFIRMACAO PUBLICA 2026-11-28';
