import json,collections,re,unicodedata,openpyxl,functools
from pathlib import Path
D=Path('scratch/sam-2026-11-12')
@functools.lru_cache(maxsize=None)
def norm(s):
 s=''.join(c for c in unicodedata.normalize('NFD',str(s or '')) if unicodedata.category(c)!='Mn')
 return re.sub(r'[^A-Z0-9]+',' ',s.upper()).strip()
@functools.lru_cache(maxsize=None)
def loc(s): return norm(re.sub(r'^BR-\d{2}-\d+\s*-\s*','',str(s or ''),flags=re.I))
w=openpyxl.load_workbook(r'C:\Users\Usuário\Downloads\RELATORIO_GERAL_SAM_COMPLETO.xlsx',read_only=True,data_only=True)
rows=[dict(zip(['nome','instrumento','localidade','cargo','nivel'],r),row=i) for i,r in enumerate(w.active.values,1) if i>1 and any(r)]
D.joinpath('source.json').write_text(json.dumps(rows,ensure_ascii=False,indent=2),encoding='utf8')
db=json.loads(D.joinpath('before.json').read_text(encoding='utf8'))
commons=collections.defaultdict(collections.Counter)
for x in db: commons[loc(x['comum'])][(x['comum'],x['cidade'])]+=1
missing=collections.Counter(x['localidade'] for x in rows if loc(x['localidade']) not in commons)
print('source',len(rows),'db',len(db),'missing_commons',ascii(missing))
print('existing_excluded',ascii([x for x in db if 'BARBACENA' in norm(x['comum']) or norm(x['nome'])=='LINDAURA']))
import difflib,uuid,csv,hashlib
aliases={
 'CAUCAIA DO ALTO CENTRAL':'BR-22-0423',
 'JARDIM BELA VISTA CAUCAIA DO ALTO':'BR-22-3911',
 'LAGEADO':'BR-22-2797',
 'PEDRAS CHACARA SANTA MARIA':'BR-22-0424',
 'RECANTO DOS PASSAROS JARDIM NOVA COTIA':'BR-21-1481',
}
def code(x):
 m=re.match(r'BR-\d{2}-\d+',str(x or ''));return m.group() if m else None
byname=collections.defaultdict(list)
for x in db:byname[norm(x['nome'])].append(x)
source_names=collections.Counter(norm(x['nome']) for x in rows)
source_pairs=collections.Counter((norm(x['nome']),loc(x['localidade'])) for x in rows)
bycode=collections.defaultdict(list)
bylocal=collections.defaultdict(list)
for x in db:
 bylocal[loc(x['comum'])].append(x)
 if code(x['comum']): bycode[code(x['comum'])].append(x)
def common_options(p):
 k=loc(p['localidade'])
 if k in aliases:
  opts=bycode[aliases[k]]
 else:opts=bylocal[k]
 groups=collections.defaultdict(list)
 for x in opts:groups[code(x['comum']) or x['comum']].append(x)
 return groups
updates=[];inserts=[];pending=[];excluded=[];unchanged=[];used=set()
def hold(p,reason,candidates=()):pending.append({'source':p,'reason':reason,'candidates':list(candidates)})
for p in rows:
 nk=norm(p['nome']);lk=loc(p['localidade'])
 if lk=='JARDIM BARBACENA' or nk=='LINDAURA':excluded.append(p);continue

 groups=common_options(p)
 if not groups:hold(p,'Localidade sem correspondencia validada');continue
 if source_pairs[nk,lk]>1:
  equal=[x for x in byname[nk] if code(x['comum']) in groups and all(norm(x[k])==norm({'EUPHONIUM':'EUF?NIO'}.get(p[k],p[k]) if k=='instrumento' else p[k]) for k in ['cargo','nivel']) and norm(x['instrumento'])==norm(p['instrumento'])]
  if len(equal)==1 and equal[0]['id'] not in used:
   used.add(equal[0]['id']);unchanged.append(equal[0]['id']);continue
  hold(p,'Nome repetido na mesma localidade na fonte',byname[nk]);continue
 candidates=byname[nk]
 exact=[x for x in candidates if (code(x['comum']) in groups if code(x['comum']) else loc(x['comum'])==lk)]
 method='nome+comum'
 if len(exact)>1:
  strict=[x for x in exact if norm(x['instrumento'])==norm(p['instrumento']) and norm(x['cargo'])==norm(p['cargo'])]
  if len(strict)==1:exact=strict;method='nome+comum+instrumento+cargo'
 if len(exact)==1:old=exact[0]
 elif not exact and len(candidates)==1 and source_names[nk]==1 and len(nk.split())>=3:
  old=candidates[0];method='nome-unico-transferencia'
 elif candidates:hold(p,'Identidade ambigua',candidates);continue
 else:old=None
 if old and old['id'] in used:hold(p,'ID ja usado por outra linha',[old]);continue
 if len(groups)>1:
  if old and code(old['comum']) in groups:target=groups[code(old['comum'])]
  else:hold(p,'Localidade associada a mais de um codigo BR');continue
 else:target=next(iter(groups.values()))
 if not old:
  if len(nk.split())<2:hold(p,'Novo cadastro com nome curto');continue
  near=[]
  for x in target:
   ratio=difflib.SequenceMatcher(None,nk,norm(x['nome'])).ratio()
   if ratio>=.88:near.append(x)
  if near:hold(p,'Possivel variacao de nome ja cadastrado',near);continue
 inst=str(p['instrumento'] or '').strip().upper()
 inst={'EUPHONIUM':'EUFÔNIO'}.get(inst,inst)
 cargo=str(p['cargo'] or '').strip().upper()
 if cargo=='SECRETÁRIO (A) DA MÚSICA':
  cargo=old['cargo'] if old and old['cargo'] in ('SECRETÁRIO DA MÚSICA','SECRETÁRIA DA MÚSICA') else ('SECRETÁRIA DA MÚSICA' if inst=='ÓRGÃO' else 'SECRETÁRIO DA MÚSICA')
 common,city=collections.Counter((x['comum'],x['cidade']) for x in target).most_common(1)[0][0]
 if old and code(old['comum'])==code(common):common,city=old['comum'],old['cidade'] or city
 new={'nome':str(p['nome']).strip().upper(),'instrumento':inst,'comum':common,'cidade':city,'cargo':cargo,'nivel':str(p['nivel']).strip().upper()}
 if old:
  used.add(old['id'])
  changes={k:v for k,v in new.items() if norm(v)!=norm(old.get(k))}
  if changes:updates.append({'id':old['id'],'before':old,'changes':changes,'after':dict(old,**changes),'method':method,'source_row':p['row']})
  else:unchanged.append(old['id'])
 else:
  new['id']=str(uuid.uuid5(uuid.NAMESPACE_URL,'sam-20261112:'+nk+':'+str(code(common))))
  inserts.append({'after':new,'source_row':p['row']})
assert len(set(x['id'] for x in updates))==len(updates)
assert len(rows)==len(updates)+len(inserts)+len(pending)+len(excluded)+len(unchanged)
summary={'source_rows':len(rows),'database_rows':len(db),'updates':len(updates),'inserts':len(inserts),'unchanged':len(unchanged),'pending':len(pending),'excluded':len(excluded),'fields':dict(collections.Counter(k for x in updates for k in x['changes'])),'pending_reasons':dict(collections.Counter(x['reason'] for x in pending))}
plan={'summary':summary,'source_sha256':hashlib.sha256(Path(r'C:\Users\Usuário\Downloads\RELATORIO_GERAL_SAM_COMPLETO.xlsx').read_bytes()).hexdigest(),'before_sha256':hashlib.sha256(D.joinpath('before.json').read_bytes()).hexdigest(),'updates':updates,'inserts':inserts,'pending':pending,'excluded':excluded}
D.joinpath('plan.json').write_text(json.dumps(plan,ensure_ascii=False,indent=2),encoding='utf8')
for filename,records,fields in [('changes.csv',[{'id':u['id'],'nome':u['after']['nome'],'campo':k,'antes':u['before'][k],'depois':v,'linha':u['source_row']} for u in updates for k,v in u['changes'].items()],['id','nome','campo','antes','depois','linha']),('pending.csv',[dict(x['source'],motivo=x['reason'],candidatos=' | '.join(y['id']+' '+y['nome'] for y in x['candidates'])) for x in pending],['row','nome','instrumento','localidade','cargo','nivel','motivo','candidatos'])]:
 with D.joinpath(filename).open('w',encoding='utf-8-sig',newline='') as f:
  wr=csv.DictWriter(f,fieldnames=fields,delimiter=';');wr.writeheader();wr.writerows(records)
print(json.dumps(summary,ensure_ascii=True))

