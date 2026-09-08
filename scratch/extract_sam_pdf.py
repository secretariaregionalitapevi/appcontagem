from pypdf import PdfReader
import json, re, unicodedata, sys
PDF=sys.argv[1]
OUT=r'scratch\sam_pdf_rows.json'
def clean(s): return re.sub(r'\s+',' ',s or '').strip()
r=PdfReader(PDF); rows=[]; bad=[]
for page_no,page in enumerate(r.pages,1):
    text=page.extract_text(extraction_mode='layout') or ''
    lines=text.splitlines(); header=next((x for x in lines if 'NOME' in x and 'INSTRUMENTO' in x and 'LOCALIDADE' in x),None)
    if not header:
        bad.append({'page':page_no,'reason':'header'}); continue
    pos=[header.index(x) for x in ['NOME','INSTRUMENTO','LOCALIDADE','CARGO/MINISTÉRIO','NIVEL']]
    for line in lines:
        if len(line)<=pos[1] or line==header: continue
        name=clean(line[pos[0]:pos[1]]).lstrip('*').strip()
        inst=clean(line[pos[1]:pos[2]])
        comum=clean(line[pos[2]:pos[3]])
        cargo=clean(line[pos[3]:pos[4]])
        nivel=clean(line[pos[4]:])
        if not name or not inst or not comum or not cargo: continue
        if name.startswith(('Sistema de','RELATÓRIO','Gerado em:','Página ')): continue
        rows.append({'nome':name,'instrumento':inst,'localidade':comum,'cargo':cargo,'nivel':nivel,'pagina':page_no})
with open(OUT,'w',encoding='utf-8') as f: json.dump(rows,f,ensure_ascii=False,indent=2)
from collections import Counter
print(json.dumps({'pages':len(r.pages),'rows':len(rows),'bad_pages':bad,'instruments':Counter(x['instrumento'] for x in rows).most_common(),'cargos':Counter(x['cargo'] for x in rows).most_common(),'levels':Counter(x['nivel'] for x in rows).most_common()},ensure_ascii=False))