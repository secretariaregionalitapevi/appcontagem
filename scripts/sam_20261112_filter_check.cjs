const fs=require('fs');const {url,key,dir}=require('./sam_20261112_fetch.cjs');
(async()=>{
 const plan=JSON.parse(fs.readFileSync(`${dir}/plan.json`,'utf8'));const row=plan.updates[0].before;
 for(const quoted of [true,false]){
  const params=new URLSearchParams({select:'*'});
  for(const [k,v] of Object.entries(row))params.set(k,v===null?'is.null':quoted?`eq."${String(v).replace(/\\/g,'\\\\').replace(/"/g,'\\"')}"`:`eq.${v}`);
  const res=await fetch(`${url}/rest/v1/cadastro?${params}`,{headers:{apikey:key,Authorization:`Bearer ${key}`},signal:AbortSignal.timeout(30000)});
  const body=await res.json();console.log(JSON.stringify({quoted,status:res.status,result:Array.isArray(body)?{rows:body.length,exact:body.length===1&&JSON.stringify(body[0])===JSON.stringify(row)}:body}));
 }
})().catch(e=>{console.error(e.message);process.exitCode=1});
