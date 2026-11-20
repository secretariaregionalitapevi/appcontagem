import json,csv
from pathlib import Path
D=Path('scratch/sam-2026-11-12');p=json.loads(D.joinpath('plan.json').read_text(encoding='utf8'))
for r in p['updates']:
 assert 'BARBACENA' not in r['after']['comum'].upper() and r['after']['nome']!='LINDAURA'
for r in p['inserts']:
 assert 'BARBACENA' not in r['after']['comum'].upper() and r['after']['nome']!='LINDAURA'
payload=json.dumps({'updates':p['updates'],'inserts':p['inserts']},ensure_ascii=False,separators=(',',':'))
sql="""-- Atualizacao SAM: 161 ajustes, 139 inclusoes; 18 casos pendentes fora deste SQL.
-- Jardim Barbacena e LINDAURA excluidos. Nenhum cadastro sera removido.
-- Executar no SQL Editor administrativo do projeto wfqehmdawhfjqbqpjapp.
-- Backup anterior: scratch/sam-2026-11-12/before.json.
-- Uma transacao: erro ou conflito cancela todas as alteracoes.
-- Reexecucao segura: reconhece registros que ja estejam no estado esperado.
BEGIN;
SET LOCAL lock_timeout = '2s';
SET LOCAL statement_timeout = '30s';
DO $sam_import$
DECLARE
 payload jsonb := $sam_data$PAYLOAD$sam_data$::jsonb;
 item jsonb;
 target jsonb;
 affected integer;
 updated integer := 0;
 inserted integer := 0;
 unchanged integer := 0;
BEGIN
 IF NOT pg_try_advisory_xact_lock(20261112, 9404) THEN
  RAISE EXCEPTION 'Outra importacao SAM esta em andamento';
 END IF;
 FOR item IN SELECT value FROM jsonb_array_elements(payload->'updates') LOOP
  target := item->'after';
  IF target->>'nome' = 'LINDAURA' OR upper(target->>'comum') LIKE '%BARBACENA%' THEN
   RAISE EXCEPTION 'Registro excluido encontrado no lote';
  END IF;
  UPDATE public.cadastro AS c SET
   nome = target->>'nome', instrumento = target->>'instrumento',
   comum = target->>'comum', cidade = target->>'cidade',
   cargo = target->>'cargo', nivel = target->>'nivel'
  WHERE c.id = (item->>'id')::uuid AND to_jsonb(c) = item->'before';
  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected = 0 THEN
   IF NOT EXISTS (SELECT 1 FROM public.cadastro c WHERE c.id = (item->>'id')::uuid AND to_jsonb(c) = target) THEN
    RAISE EXCEPTION 'Cadastro alterado desde a conciliacao ou acesso sem UPDATE: %', item->>'id';
   END IF;
   unchanged := unchanged + 1;
  ELSE updated := updated + affected;
  END IF;
 END LOOP;
 FOR item IN SELECT value FROM jsonb_array_elements(payload->'inserts') LOOP
  target := item->'after';
  IF target->>'nome' = 'LINDAURA' OR upper(target->>'comum') LIKE '%BARBACENA%' THEN
   RAISE EXCEPTION 'Registro excluido encontrado no lote';
  END IF;
  IF EXISTS (SELECT 1 FROM public.cadastro c WHERE c.id = (target->>'id')::uuid) THEN
   IF NOT EXISTS (SELECT 1 FROM public.cadastro c WHERE c.id = (target->>'id')::uuid AND to_jsonb(c) = target) THEN
    RAISE EXCEPTION 'Conflito de ID em inclusao: %',target->>'id';
   END IF;
   unchanged := unchanged + 1;
  ELSE
   IF EXISTS (
    SELECT 1 FROM public.cadastro c WHERE
     btrim(regexp_replace(translate(upper(c.nome),'ÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇ','AAAAAEEEEIIIIOOOOOUUUUC'),'[^A-Z0-9]+',' ','g')) =
     btrim(regexp_replace(translate(upper(target->>'nome'),'ÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇ','AAAAAEEEEIIIIOOOOOUUUUC'),'[^A-Z0-9]+',' ','g'))
   ) THEN RAISE EXCEPTION 'Nome apareceu desde a conciliacao: %',target->>'nome'; END IF;
   INSERT INTO public.cadastro(id,nome,instrumento,comum,cidade,cargo,nivel)
    VALUES ((target->>'id')::uuid,target->>'nome',target->>'instrumento',target->>'comum',target->>'cidade',target->>'cargo',target->>'nivel');
   inserted := inserted + 1;
  END IF;
 END LOOP;
 FOR target IN
  SELECT value->'after' FROM jsonb_array_elements(payload->'updates')
  UNION ALL SELECT value->'after' FROM jsonb_array_elements(payload->'inserts')
 LOOP
  IF NOT EXISTS (SELECT 1 FROM public.cadastro c WHERE c.id=(target->>'id')::uuid AND to_jsonb(c)=target) THEN
   RAISE EXCEPTION 'Conferencia final falhou: %',target->>'id';
  END IF;
 END LOOP;
 RAISE NOTICE 'Conferido: % atualizados, % incluidos, % ja aplicados. 18 pendencias fora do lote.',updated,inserted,unchanged;
END;
$sam_import$;
COMMIT;
""".replace('PAYLOAD',payload)
output=Path('migrations/ATUALIZAR-CADASTRO-SAM-2026-11-12.sql');output.write_text(sql,encoding='utf8')
with D.joinpath('pending.csv').open('w',encoding='utf-8-sig',newline='') as f:
 fields=['linha_excel','nome','instrumento','localidade','cargo','nivel','motivo','cadastros_existentes','revisao_necessaria']
 wr=csv.DictWriter(f,fieldnames=fields,delimiter=';');wr.writeheader()
 for x in p['pending']:
  s=x['source'];wr.writerow(dict(linha_excel=s['row'],**{k:s[k] for k in ['nome','instrumento','localidade','cargo','nivel']},motivo=x['reason'],cadastros_existentes=' | '.join(' / '.join(str(y[k] or '') for k in ['id','nome','instrumento','comum','cargo','nivel']) for y in x['candidates']),revisao_necessaria='Confirmar se a pessoa da planilha corresponde a um cadastro existente ou e um novo ingresso.'))
report={'status':'not_applied','database_unchanged':True,'reason':'PATCH returned no affected row with available API credential; administrative access required','summary':p['summary'],'sql':str(output),'source_sha256':p['source_sha256']}
D.joinpath('status.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf8')
print('SQL pronto:',output,'bytes',output.stat().st_size)
print('Dados identicos:',json.loads(D.joinpath('before.json').read_text(encoding='utf8'))==json.loads(D.joinpath('diagnostic.json').read_text(encoding='utf8')))
