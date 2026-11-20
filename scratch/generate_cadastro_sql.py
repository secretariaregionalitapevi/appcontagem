import json,csv,os
p=json.load(open(r'scratch/cadastro_update_plan.json',encoding='utf8'))
rows=p['updates']+p['inserts']
cols=['id','nome','instrumento','comum','cidade','cargo','nivel']
def q(v):
 return "'"+str(v or '').replace("'","''")+"'"
parts=['BEGIN;']
for i in range(0,len(rows),100):
 b=rows[i:i+100]
 values=',\n'.join('('+', '.join(q(x.get(c)) for c in cols)+')' for x in b)
 updates=',\n'.join('  '+c+' = EXCLUDED.'+c for c in cols if c!='id')
 parts.append('INSERT INTO public.cadastro ('+', '.join(cols)+') VALUES\n'+values+'\nON CONFLICT (id) DO UPDATE SET\n'+updates+';')
parts.extend(['COMMIT;',''])
open(r'migrations/ATUALIZAR-CADASTRO-SAM-2026-09-08.sql','w',encoding='utf8',newline='\n').write('\n\n'.join(parts))
with open(r'data/reports/CADASTRO-SAM-PENDENCIAS-2026-09-08.csv','w',encoding='utf-8-sig',newline='') as f:
 w=csv.writer(f,delimiter=';')
 w.writerow(['TIPO','PAGINA','NOME','INSTRUMENTO','LOCALIDADE','CARGO','NIVEL','CANDIDATE_IDS'])
 for x in p['ambiguous']:
  r=x['pdf']; w.writerow(['AMBIGUO',r['pagina'],r['nome'],r['instrumento'],r['localidade'],r['cargo'],r['nivel'],','.join(x['candidate_ids'])])
 for r in p['missing_common']:
  w.writerow(['COMUM_NAO_CADASTRADA',r['pagina'],r['nome'],r['instrumento'],r['localidade'],r['cargo'],r['nivel'],''])
print(json.dumps({'total':len(rows),'updates':len(p['updates']),'inserts':len(p['inserts']),'pending':len(p['ambiguous'])+len(p['missing_common'])}))