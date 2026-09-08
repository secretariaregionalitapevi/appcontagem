import json,re,unicodedata,collections,difflib,uuid
pdf=json.load(open(r'scratch/sam_pdf_rows.json',encoding='utf8')); db=json.load(open(r'scratch/current_cadastro.json',encoding='utf8'))
def norm(s):
 s=unicodedata.normalize('NFD',str(s or '')); s=''.join(c for c in s if unicodedata.category(c)!='Mn'); s=s.upper(); s=re.sub(r'[^A-Z0-9]+',' ',s); return re.sub(r'\s+',' ',s).strip()
def loc(s): return norm(re.sub(r'^BR-\d{2}-\d+\s*-\s*','',str(s or ''),flags=re.I))
alias={'LAGEADO':'BR-22-2797 - LAGEADO - COTIA','JARDIM BELA VISTA CAUCAIA DO ALTO':'BR-22-3911 - JARDIM BELA VISTA - PUNUNDUVA','PEDRAS CHACARA SANTA MARIA':'BR-22-0424 - PEDRAS - COTIA'}
commons={}
for x in db:
 k=loc(x.get('comum')); commons.setdefault(k,[]).append((x.get('comum') or '',x.get('cidade') or ''))
common_best={k:collections.Counter(v).most_common(1)[0][0] for k,v in commons.items() if k}
for k,v in alias.items():
 found=next(((x.get('comum'),x.get('cidade')) for x in db if x.get('comum')==v),None)
 if found: common_best[k]=found
by_comp=collections.defaultdict(list); by_name=collections.defaultdict(list); by_loc=collections.defaultdict(list)
for x in db:
 by_comp[(norm(x.get('nome')),loc(x.get('comum')))].append(x);by_name[norm(x.get('nome'))].append(x);by_loc[loc(x.get('comum'))].append(x)
used=set(); plan=[]; inserts=[]; ambiguous=[]; missing=[]
def canon_inst(s):
 u=str(s or '').strip().upper(); return {'EUPHONIUM':'EUFÔNIO'}.get(u,u)
def canon_cargo(s,inst,old=None):
 u=str(s or '').strip().upper()
 if u=='SECRETÁRIO (A) DA MÚSICA':
  oc=str((old or {}).get('cargo') or '').upper()
  if oc in ('SECRETÁRIO DA MÚSICA','SECRETÁRIA DA MÚSICA'): return oc
  return 'SECRETÁRIA DA MÚSICA' if canon_inst(inst)=='ÓRGÃO' else 'SECRETÁRIO DA MÚSICA'
 return u
for p in pdf:
 nk,lk=norm(p['nome']),norm(p['localidade']); best=common_best.get(lk)
 if not best: missing.append(p); continue
 exact=[x for x in by_comp[(nk,lk)] if x['id'] not in used]; cand=exact; method='name+common'
 if len(cand)!=1:
  uniq=[x for x in by_name[nk] if x['id'] not in used]
  if len(uniq)==1: cand=uniq; method='unique-name'
 if len(cand)!=1:
  scores=sorted([(difflib.SequenceMatcher(None,nk,norm(x.get('nome'))).ratio(),x) for x in by_loc[lk] if x['id'] not in used],reverse=True,key=lambda z:z[0])
  if scores and scores[0][0]>=.94 and (len(scores)==1 or scores[0][0]-scores[1][0]>=.03): cand=[scores[0][1]];method='fuzzy-name+common'
 if len(cand)>1: ambiguous.append({'pdf':p,'candidate_ids':[x['id'] for x in cand]});continue
 comum,cidade=best
 if not cand:
  inserts.append({'id':str(uuid.uuid4()),'nome':p['nome'].strip().upper(),'instrumento':canon_inst(p['instrumento']),'comum':comum,'cidade':cidade,'cargo':canon_cargo(p['cargo'],p['instrumento']),'nivel':p['nivel'].strip().upper()});continue
 old=cand[0];used.add(old['id']);new={'id':old['id'],'nome':p['nome'].strip().upper(),'instrumento':canon_inst(p['instrumento']),'comum':comum,'cidade':cidade,'cargo':canon_cargo(p['cargo'],p['instrumento'],old),'nivel':p['nivel'].strip().upper()};changes={k:{'old':old.get(k),'new':new[k]} for k in ['nome','instrumento','comum','cidade','cargo','nivel'] if norm(old.get(k))!=norm(new[k])};plan.append({'method':method,'old':old,'new':new,'changes':changes})
out={'summary':{'pdf':len(pdf),'db':len(db),'matched':len(plan),'changed':sum(bool(x['changes']) for x in plan),'unchanged':sum(not x['changes'] for x in plan),'inserts':len(inserts),'ambiguous':len(ambiguous),'missing_common':len(missing),'methods':dict(collections.Counter(x['method'] for x in plan)),'fields':dict(collections.Counter(k for x in plan for k in x['changes']))},'updates':[x['new'] for x in plan if x['changes']],'plan':plan,'inserts':inserts,'ambiguous':ambiguous,'missing_common':missing}
json.dump(out,open(r'scratch/cadastro_update_plan.json','w',encoding='utf8'),ensure_ascii=False,indent=2);print(json.dumps(out['summary'],ensure_ascii=False));print('ambiguities',json.dumps(ambiguous[:10],ensure_ascii=False));print('missing',json.dumps(collections.Counter(x['localidade'] for x in missing),ensure_ascii=False))