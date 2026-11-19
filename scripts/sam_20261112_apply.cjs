const fs=require('fs');
const crypto=require('crypto');
const {readCadastro,url,key,dir}=require('./sam_20261112_fetch.cjs');
const fields=['id','nome','instrumento','comum','cidade','cargo','nivel'];
const same=(a,b)=>fields.every(k=>a[k]===b[k]);
const norm=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase().replace(/[^A-Z0-9]+/g,' ').trim();
const sha=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
const plan=JSON.parse(fs.readFileSync(`${dir}/plan.json`,'utf8'));
const journal=`${dir}/journal.jsonl`;
const log=entry=>fs.appendFileSync(journal,JSON.stringify({time:new Date().toISOString(),...entry})+'\n');
const expected=new Map(plan.updates.map(x=>[x.id,x.after]));
for(const x of plan.inserts){if(expected.has(x.after.id))throw Error('Repeated plan ID');expected.set(x.after.id,x.after)}
async function main(){
 if(sha(fs.readFileSync(`${dir}/before.json`))!==plan.before_sha256)throw Error('Backup hash mismatch');
 if(sha(fs.readFileSync('C:/Users/Usuário/Downloads/RELATORIO_GERAL_SAM_COMPLETO.xlsx'))!==plan.source_sha256)throw Error('Source changed; regenerate plan');
 for(const row of expected.values())if(norm(row.comum).includes('BARBACENA')||norm(row.nome)==='LINDAURA')throw Error('Excluded record in plan');
 if(new Set(plan.updates.map(x=>x.id)).size!==plan.updates.length)throw Error('Repeated update ID');
 const live=await readCadastro();const byId=new Map(live.map(x=>[x.id,x]));
 for(const item of plan.updates){const row=byId.get(item.id);if(!row||(!same(row,item.before)&&!same(row,item.after)))throw Error(`Concurrent edit: ${item.id}`)}
 for(const {after} of plan.inserts){
  const row=byId.get(after.id);if(row&&!same(row,after))throw Error(`Insert ID conflict: ${after.id}`);
  if(!row&&live.some(x=>norm(x.nome)===norm(after.nome)))throw Error(`New name appeared since backup: ${after.nome}`);
 }
 const pendingUpdates=plan.updates.filter(x=>!same(byId.get(x.id),x.after));
 const pendingInserts=plan.inserts.filter(x=>!byId.has(x.after.id));
 console.log(JSON.stringify({preflight:'passed',update:pendingUpdates.length,insert:pendingInserts.length,mode:process.argv.includes('--apply')?'apply':'dry-run'}));
 if(!process.argv.includes('--apply'))return;
 const stamp=new Date().toISOString().replace(/[:.]/g,'-');
 fs.writeFileSync(`${dir}/pre-apply-${stamp}.json`,JSON.stringify(live,null,2),{flag:'wx'});
 let count=0;
 for(const item of pendingUpdates){
  const params=new URLSearchParams({select:'*'});
  for(const k of fields){const v=item.before[k];params.set(k,v===null?'is.null':`eq.${v}`)}
  log({phase:'intent',operation:'update',id:item.id,before:item.before,after:item.after});
  const res=await fetch(`${url}/rest/v1/cadastro?${params}`,{method:'PATCH',headers:{apikey:key,Authorization:`Bearer ${key}`,'Content-Type':'application/json',Prefer:'return=representation'},body:JSON.stringify(item.changes),signal:AbortSignal.timeout(30000)});
  if(!res.ok)throw Error(`Update failed ${item.id}: ${res.status} ${await res.text()}`);
  const rows=await res.json();if(rows.length!==1||!same(rows[0],item.after))throw Error(`Update not confirmed ${item.id}`);
  log({phase:'confirmed',operation:'update',id:item.id});
  if(++count%25===0)console.log(`Updated ${count}/${pendingUpdates.length}`);
 }
 for(let i=0;i<pendingInserts.length;i+=25){
  const batch=pendingInserts.slice(i,i+25).map(x=>x.after);
  log({phase:'intent',operation:'insert',rows:batch});
  const res=await fetch(`${url}/rest/v1/cadastro`,{method:'POST',headers:{apikey:key,Authorization:`Bearer ${key}`,'Content-Type':'application/json',Prefer:'return=representation'},body:JSON.stringify(batch),signal:AbortSignal.timeout(30000)});
  if(!res.ok)throw Error(`Insert batch failed: ${res.status}`);
  const rows=await res.json();const actual=new Map(rows.map(x=>[x.id,x]));
  if(rows.length!==batch.length||!batch.every(x=>actual.has(x.id)&&same(actual.get(x.id),x)))throw Error('Insert response mismatch');
  log({phase:'confirmed',operation:'insert',ids:batch.map(x=>x.id)});
  console.log(`Inserted ${Math.min(i+25,pendingInserts.length)}/${pendingInserts.length}`);
 }
 const after=await readCadastro();
 fs.writeFileSync(`${dir}/after-${stamp}.json`,JSON.stringify(after,null,2),{flag:'wx'});
 const afterById=new Map(after.map(x=>[x.id,x]));
 const failures=[];
 for(const [id,row] of expected)if(!afterById.has(id)||!same(afterById.get(id),row))failures.push(id);
 const untouchedChanged=live.filter(x=>!expected.has(x.id)&&(!afterById.has(x.id)||!same(x,afterById.get(x.id)))).map(x=>x.id);
 const report={verified:failures.length===0,updated:pendingUpdates.length,inserted:pendingInserts.length,before:live.length,after:after.length,expectedTotal:live.length+pendingInserts.length,missingOrMismatched:failures,untouchedChanged,excludedPresent:after.filter(x=>norm(x.comum).includes('BARBACENA')||norm(x.nome)==='LINDAURA').map(x=>x.id),pending:plan.pending.length};
 fs.writeFileSync(`${dir}/verification.json`,JSON.stringify(report,null,2));console.log(JSON.stringify(report));
 if(failures.length||report.excludedPresent.length||after.length!==report.expectedTotal)throw Error('Final verification failed');
}
main().catch(error=>{console.error(error.message);process.exitCode=1});
