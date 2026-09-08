const fs=require('fs');
const g=fs.readFileSync('backend-separado/00_Globals.gs','utf8');
const url=g.match(/SUPABASE_URL = '([^']+)'/)[1];
const key=g.match(/SUPABASE_ANON_KEY = '([^']+)'/)[1];
(async()=>{let all=[];for(let from=0;;from+=1000){const res=await fetch(url+`/rest/v1/cadastro?select=*&order=id&offset=${from}&limit=1000`,{headers:{apikey:key,Authorization:'Bearer '+key}});if(!res.ok)throw Error(await res.text());const rows=await res.json();all.push(...rows);if(rows.length<1000)break;}fs.writeFileSync('scratch/current_cadastro.json',JSON.stringify(all,null,2),'utf8');console.log(JSON.stringify({rows:all.length,columns:all[0]?Object.keys(all[0]):[]}));})().catch(e=>{console.error(e);process.exit(1)});